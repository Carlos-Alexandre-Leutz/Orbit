import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService, DatabaseApprovalGate } from './approvals.service';

type Row = Record<string, any>;

function setup(config = { highValueCents: 10_000, ttlHours: 24 }) {
  const rows: Row[] = [];
  const findUnique = jest.fn(({ where }: { where: Row }) => {
    const key = where.actorId_tool_idempotencyKey as Row | undefined;
    return Promise.resolve(
      rows.find((r) =>
        key
          ? r.actorId === key.actorId &&
            r.tool === key.tool &&
            r.idempotencyKey === key.idempotencyKey
          : r.id === where.id,
      ) ?? null,
    );
  });
  const prisma = {
    approval: {
      findUnique,
      findUniqueOrThrow: jest.fn(({ where }: { where: Row }) =>
        findUnique({ where }),
      ),
      create: jest.fn(({ data }: { data: Row }) => {
        if (
          rows.some(
            (r) =>
              r.actorId === data.actorId &&
              r.tool === data.tool &&
              r.idempotencyKey === data.idempotencyKey,
          )
        ) {
          return Promise.reject(
            new Prisma.PrismaClientKnownRequestError('dup', {
              code: 'P2002',
              clientVersion: 'x',
            }),
          );
        }
        const row = {
          id: `00000000-0000-4000-8000-00000000000${rows.length + 1}`,
          createdAt: new Date(),
          status: 'PENDING',
          approverId: null,
          decidedAt: null,
          reason: null,
          ...data,
        };
        rows.push(row);
        return Promise.resolve(row);
      }),
      updateMany: jest.fn(({ where, data }: { where: Row; data: Row }) => {
        const row = rows.find(
          (r) => r.id === where.id && r.status === where.status,
        );
        if (row) Object.assign(row, data);
        return Promise.resolve({ count: row ? 1 : 0 });
      }),
      findMany: jest.fn(() =>
        Promise.resolve(rows.filter((r) => r.status === 'PENDING')),
      ),
    },
  };
  const audit = { record: jest.fn().mockResolvedValue({}) };
  const service = new ApprovalsService(prisma as never, audit as never, config);
  return { service, rows, audit, prisma };
}

const owner = { id: 'u1', role: Role.CUSTOMER };
const proposal = (extra: Partial<{ amountCents: number }> = {}) => ({
  actor: owner,
  tool: 'orders.place',
  input: { storeId: 's' },
  idempotencyKey: 'k1',
  summary: { description: 'Buy 2 item(s) for 50.00', ...extra },
});

describe('ApprovalsService: proposing', () => {
  it('creates a pending approval and says it is pending, the same one for the same key', async () => {
    const { service, rows } = setup();
    const first = await service.request(proposal({ amountCents: 5000 }));
    const again = await service.request(proposal({ amountCents: 5000 }));
    expect(first).toEqual({ status: 'pending', approvalId: rows[0].id });
    expect(again).toEqual(first);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      amountCents: 5000,
      needsAmountConfirmation: false,
      status: 'PENDING',
    });
  });

  it('flags an amount above the limit for extra confirmation', async () => {
    const { service, rows } = setup();
    await service.request(proposal({ amountCents: 10_001 }));
    expect(rows[0].needsAmountConfirmation).toBe(true);
  });

  it('treats a pending approval past its time as expired and rejected', async () => {
    const { service, rows } = setup();
    await service.request(proposal());
    rows[0].expiresAt = new Date(Date.now() - 1000);
    expect(await service.request(proposal())).toEqual({
      status: 'rejected',
      reason: 'The approval expired',
    });
    expect(rows[0].status).toBe('EXPIRED');
  });
});

describe('ApprovalsService: per-tool limit', () => {
  it('uses the high-value limit the policy gives instead of the global one', async () => {
    const { service, rows } = setup();
    await service.request({
      ...proposal({ amountCents: 600 }),
      highValueCents: 500,
    });
    expect(rows[0].needsAmountConfirmation).toBe(true);
  });
});

describe('ApprovalsService: deciding', () => {
  it('approves for the owner, records who, audits it, and the gate then says approved', async () => {
    const { service, rows, audit } = setup();
    await service.request(proposal({ amountCents: 5000 }));
    await service.approve(rows[0].id, owner);
    expect(rows[0]).toMatchObject({ status: 'APPROVED', approverId: 'u1' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'approvals.approve', approverId: 'u1' }),
    );
    expect(await service.request(proposal({ amountCents: 5000 }))).toEqual({
      status: 'approved',
      approverId: 'u1',
      approvalId: rows[0].id,
    });
  });

  it('lets an admin decide for someone else, but hides the approval from other users', async () => {
    const { service, rows } = setup();
    await service.request(proposal());
    await expect(
      service.approve(rows[0].id, { id: 'u2', role: Role.CUSTOMER }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.approve(rows[0].id, { id: 'adm', role: Role.ADMIN }),
    ).resolves.toBeDefined();
    expect(rows[0].approverId).toBe('adm');
  });

  it('asks the approver to type the amount back above the limit', async () => {
    const { service, rows } = setup();
    await service.request(proposal({ amountCents: 20_000 }));
    await expect(service.approve(rows[0].id, owner)).rejects.toMatchObject({
      response: { code: 'AMOUNT_CONFIRMATION_REQUIRED' },
    });
    await expect(
      service.approve(rows[0].id, owner, 19_999),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rows[0].status).toBe('PENDING');
    await service.approve(rows[0].id, owner, 20_000);
    expect(rows[0].status).toBe('APPROVED');
  });

  it('rejects with a reason, and a rejected call stays rejected', async () => {
    const { service, rows } = setup();
    await service.request(proposal());
    await service.reject(rows[0].id, owner, 'changed my mind');
    expect(await service.request(proposal())).toEqual({
      status: 'rejected',
      reason: 'changed my mind',
    });
    await expect(service.approve(rows[0].id, owner)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('refuses to decide twice and to decide after the expiry', async () => {
    const { service, rows } = setup();
    await service.request(proposal());
    await service.approve(rows[0].id, owner);
    await expect(service.approve(rows[0].id, owner)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const other = { ...proposal(), idempotencyKey: 'k2' };
    await service.request(other);
    rows[1].expiresAt = new Date(Date.now() - 1000);
    await expect(service.reject(rows[1].id, owner)).rejects.toThrow(/expired/);
  });

  it('marks an approved call as executed, once', async () => {
    const { service, rows } = setup();
    await service.request(proposal());
    await service.approve(rows[0].id, owner);
    await new DatabaseApprovalGate(service).complete(rows[0].id);
    expect(rows[0].status).toBe('EXECUTED');
  });

  it('shows a list and a detail without the stored input', async () => {
    const { service, rows } = setup();
    await service.request(proposal({ amountCents: 100 }));
    const [item] = await service.pendingOf('u1');
    expect(item).toMatchObject({
      tool: 'orders.place',
      summary: 'Buy 2 item(s) for 50.00',
    });
    expect(JSON.stringify(item)).not.toMatch(/storeId/);
    expect(await service.get(rows[0].id, owner)).toMatchObject({
      status: 'PENDING',
    });
  });
});

describe('ApprovalsController', () => {
  it('approves and then runs the stored call as the person it acts for, with the same key', async () => {
    const approvals = {
      approve: jest.fn().mockResolvedValue({
        tool: 'orders.place',
        input: { storeId: 's' },
        actorId: 'u1',
        actorRole: Role.CUSTOMER,
        idempotencyKey: 'k1',
      }),
      get: jest.fn().mockResolvedValue({ status: 'EXECUTED' }),
    };
    const executor = {
      execute: jest
        .fn()
        .mockResolvedValue({ ok: true, output: { id: 'o1' }, replayed: false }),
    };
    const controller = new ApprovalsController(
      approvals as never,
      executor as never,
    );
    const out = await controller.approve('id1', { confirmAmountCents: 5 }, {
      user: { id: 'adm', role: Role.ADMIN },
    } as never);
    expect(approvals.approve).toHaveBeenCalledWith(
      'id1',
      { id: 'adm', role: Role.ADMIN },
      5,
    );
    expect(executor.execute).toHaveBeenCalledWith(
      'orders.place',
      { storeId: 's' },
      { actor: { id: 'u1', role: Role.CUSTOMER }, idempotencyKey: 'k1' },
    );
    expect(out).toMatchObject({
      approval: { status: 'EXECUTED' },
      result: { ok: true },
    });
  });
});
