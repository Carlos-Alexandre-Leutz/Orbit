import { ConflictException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Tool, ToolContext, ToolInputError, ApprovalDecision } from './tool';
import { ToolExecutor } from './tool-executor';
import { ToolRegistry } from './tool-registry';

const customer: ToolContext = { actor: { id: 'u1', role: Role.CUSTOMER } };

function makeTool(
  overrides: Partial<Tool<{ n: number }, { doubled: number }>> = {},
) {
  const run = jest.fn((input: { n: number }) =>
    Promise.resolve({ doubled: input.n * 2 }),
  );
  const tool: Tool<{ n: number }, { doubled: number }> = {
    name: 'math.double',
    description: 'doubles',
    inputSchema: {},
    roles: [Role.CUSTOMER],
    sideEffect: false,
    requiresApproval: false,
    parse: (input) => {
      const n = (input as { n?: unknown })?.n;
      if (typeof n !== 'number') throw new ToolInputError('n must be a number');
      return { n };
    },
    run,
    auditInput: (input) => ({ n: input.n }),
    auditOutput: (output) => ({ doubled: output.doubled }),
    ...overrides,
  };
  return { tool, run };
}

function setup(
  tool: Tool,
  decision: ApprovalDecision = { status: 'approved', approverId: 'boss' },
) {
  const audit = { record: jest.fn().mockResolvedValue({}) };
  const runs = new Map<string, Record<string, unknown>>();
  const keyOf = (w: {
    actorId: string;
    tool: string;
    idempotencyKey: string;
  }) => `${w.actorId}|${w.tool}|${w.idempotencyKey}`;
  const prisma = {
    toolRun: {
      create: jest.fn(
        ({
          data,
        }: {
          data: { actorId: string; tool: string; idempotencyKey: string };
        }) => {
          if (runs.has(keyOf(data))) {
            return Promise.reject(
              new Prisma.PrismaClientKnownRequestError('dup', {
                code: 'P2002',
                clientVersion: 'x',
              }),
            );
          }
          const row = {
            id: `run${runs.size + 1}`,
            status: 'STARTED',
            result: null,
            ...data,
          };
          runs.set(keyOf(data), row);
          return Promise.resolve(row);
        },
      ),
      findUniqueOrThrow: jest.fn(
        ({
          where,
        }: {
          where: {
            actorId_tool_idempotencyKey: {
              actorId: string;
              tool: string;
              idempotencyKey: string;
            };
          };
        }) =>
          Promise.resolve(runs.get(keyOf(where.actorId_tool_idempotencyKey))),
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = [...runs.values()].find(
            (r) => r.id === where.id && r.status === 'FAILED',
          );
          if (row) Object.assign(row, data);
          return Promise.resolve({ count: row ? 1 : 0 });
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = [...runs.values()].find((r) => r.id === where.id);
          if (row) Object.assign(row, data);
          return Promise.resolve(row);
        },
      ),
    },
  };
  const gate = {
    check: jest.fn().mockResolvedValue(decision),
    complete: jest.fn().mockResolvedValue(undefined),
  };
  const executor = new ToolExecutor(
    new ToolRegistry([tool]),
    gate,
    audit as never,
    prisma as never,
  );
  return { executor, audit, prisma, gate, runs };
}

const audited = (audit: { record: jest.Mock }) =>
  audit.record.mock.calls.map((c) => c[0] as Record<string, unknown>);

describe('ToolExecutor: reading tools', () => {
  it('runs a tool and audits the call with the tool-chosen view of input and output', async () => {
    const { tool, run } = makeTool();
    const { executor, audit } = setup(tool);
    const result = await executor.execute('math.double', { n: 4 }, customer);
    expect(result).toEqual({
      ok: true,
      output: { doubled: 8 },
      replayed: false,
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(audited(audit)).toEqual([
      expect.objectContaining({
        actorId: 'u1',
        actorRole: Role.CUSTOMER,
        tool: 'math.double',
        parameters: { n: 4 },
        result: { doubled: 8 },
        outcome: 'SUCCESS',
      }),
    ]);
  });

  it('refuses an unknown tool and audits it as denied', async () => {
    const { tool } = makeTool();
    const { executor, audit } = setup(tool);
    const result = await executor.execute('nope.nothing', {}, customer);
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN_TOOL' },
    });
    expect(audited(audit)[0]).toMatchObject({
      tool: 'nope.nothing',
      outcome: 'DENIED',
    });
  });

  it('refuses a role that is not allowed, without running the tool', async () => {
    const { tool, run } = makeTool();
    const { executor, audit } = setup(tool);
    const result = await executor.execute(
      'math.double',
      { n: 1 },
      { actor: { id: 'a', role: Role.ADMIN } },
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(run).not.toHaveBeenCalled();
    expect(audited(audit)[0]).toMatchObject({
      outcome: 'DENIED',
      actorRole: Role.ADMIN,
    });
  });

  it('refuses invalid input with the reason and logs no input', async () => {
    const { tool, run } = makeTool();
    const { executor, audit } = setup(tool);
    const result = await executor.execute('math.double', { n: 'x' }, customer);
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'n must be a number' },
    });
    expect(run).not.toHaveBeenCalled();
    expect(audited(audit)[0]).toMatchObject({
      outcome: 'FAILURE',
      parameters: {},
    });
  });

  it('turns a refusal of the store into a readable result and an internal error into a vague one', async () => {
    const refusal = makeTool({
      run: () => Promise.reject(new ConflictException('Out of stock')),
    });
    const a = setup(refusal.tool);
    expect(await a.executor.execute('math.double', { n: 1 }, customer)).toEqual(
      {
        ok: false,
        error: { code: 'TOOL_FAILED', message: 'Out of stock' },
      },
    );
    expect(audited(a.audit)[0]).toMatchObject({ outcome: 'FAILURE' });

    const broken = makeTool({
      run: () =>
        Promise.reject(new Error('connection to db at 10.0.0.5 refused')),
    });
    const b = setup(broken.tool);
    expect(await b.executor.execute('math.double', { n: 1 }, customer)).toEqual(
      {
        ok: false,
        error: { code: 'TOOL_FAILED', message: 'The tool failed' },
      },
    );
  });

  it('keeps answering when the audit log cannot be written', async () => {
    const { tool } = makeTool();
    const { executor, audit } = setup(tool);
    audit.record.mockRejectedValue(new Error('db down'));
    await expect(
      executor.execute('math.double', { n: 1 }, customer),
    ).resolves.toMatchObject({ ok: true });
  });
});

describe('ToolExecutor: tools that change data', () => {
  const write = (
    extra: Partial<Tool<{ n: number }, { doubled: number }>> = {},
  ) => makeTool({ name: 'math.save', sideEffect: true, ...extra });

  it('needs an idempotency key', async () => {
    const { tool, run } = write();
    const { executor, audit } = setup(tool);
    const result = await executor.execute('math.save', { n: 1 }, customer);
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'IDEMPOTENCY_KEY_REQUIRED' },
    });
    expect(run).not.toHaveBeenCalled();
    expect(audited(audit)[0]).toMatchObject({ outcome: 'FAILURE' });
  });

  it('runs once per key and replays the stored answer after that', async () => {
    const { tool, run } = write();
    const { executor, runs } = setup(tool);
    const ctx = { ...customer, idempotencyKey: 'k1' };
    const first = await executor.execute('math.save', { n: 2 }, ctx);
    const second = await executor.execute('math.save', { n: 2 }, ctx);
    expect(first).toEqual({
      ok: true,
      output: { doubled: 4 },
      replayed: false,
    });
    expect(second).toEqual({
      ok: true,
      output: { doubled: 4 },
      replayed: true,
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect([...runs.values()][0]).toMatchObject({
      status: 'COMPLETED',
      result: { doubled: 4 },
    });
  });

  it('treats the same key of another actor as a different run', async () => {
    const { tool, run } = write();
    const { executor } = setup(tool);
    await executor.execute(
      'math.save',
      { n: 1 },
      { ...customer, idempotencyKey: 'k' },
    );
    await executor.execute(
      'math.save',
      { n: 1 },
      { actor: { id: 'u2', role: Role.CUSTOMER }, idempotencyKey: 'k' },
    );
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('says a run with the same key is in progress while it has not finished', async () => {
    const { tool, run } = write();
    const { executor, runs } = setup(tool);
    runs.set('u1|math.save|k', { id: 'r0', status: 'STARTED', result: null });
    const result = await executor.execute(
      'math.save',
      { n: 1 },
      { ...customer, idempotencyKey: 'k' },
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'IN_PROGRESS' } });
    expect(run).not.toHaveBeenCalled();
  });

  it('lets a failed run be tried again with the same key', async () => {
    const { tool, run } = write();
    const { executor, runs } = setup(tool);
    runs.set('u1|math.save|k', { id: 'r0', status: 'FAILED', result: null });
    const result = await executor.execute(
      'math.save',
      { n: 3 },
      { ...customer, idempotencyKey: 'k' },
    );
    expect(result).toMatchObject({ ok: true, replayed: false });
    expect(run).toHaveBeenCalledTimes(1);
    expect(runs.get('u1|math.save|k')).toMatchObject({ status: 'COMPLETED' });
  });

  it('marks the run failed when the tool fails', async () => {
    const { tool } = write({
      run: () => Promise.reject(new ConflictException('Out of stock')),
    });
    const { executor, runs } = setup(tool);
    await executor.execute(
      'math.save',
      { n: 1 },
      { ...customer, idempotencyKey: 'k' },
    );
    expect([...runs.values()][0]).toMatchObject({
      status: 'FAILED',
      error: 'Out of stock',
    });
  });
});

describe('ToolExecutor: approval', () => {
  const needsApproval = () =>
    makeTool({ name: 'math.big', sideEffect: true, requiresApproval: true });
  const ctx = { ...customer, idempotencyKey: 'k' };

  it('holds the call until a human approves, without running or claiming the key', async () => {
    const { tool, run } = needsApproval();
    const { executor, audit, prisma } = setup(tool, {
      status: 'pending',
      approvalId: 'ap1',
    });
    const result = await executor.execute('math.big', { n: 1 }, ctx);
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'APPROVAL_REQUIRED',
        message: expect.any(String),
        approvalId: 'ap1',
      },
    });
    expect(run).not.toHaveBeenCalled();
    expect(prisma.toolRun.create).not.toHaveBeenCalled();
    expect(audited(audit)[0]).toMatchObject({ outcome: 'PENDING_APPROVAL' });
  });

  it('refuses when a human rejected it', async () => {
    const { tool, run } = needsApproval();
    const { executor, audit } = setup(tool, {
      status: 'rejected',
      reason: 'too much',
    });
    const result = await executor.execute('math.big', { n: 1 }, ctx);
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'APPROVAL_REJECTED', message: 'too much' },
    });
    expect(run).not.toHaveBeenCalled();
    expect(audited(audit)[0]).toMatchObject({ outcome: 'DENIED' });
  });

  it('runs after approval and records who approved', async () => {
    const { tool, run } = needsApproval();
    const { executor, audit } = setup(tool);
    const result = await executor.execute('math.big', { n: 5 }, ctx);
    expect(result).toMatchObject({ ok: true, output: { doubled: 10 } });
    expect(run).toHaveBeenCalledTimes(1);
    expect(audited(audit)[0]).toMatchObject({
      outcome: 'SUCCESS',
      approverId: 'boss',
    });
  });
});

describe('ToolRegistry', () => {
  it('refuses a duplicate name and an approval on a tool that changes nothing', () => {
    const { tool } = makeTool();
    expect(() => new ToolRegistry([tool, tool])).toThrow(/already registered/);
    expect(
      () =>
        new ToolRegistry([
          { ...tool, name: 'x.y', sideEffect: false, requiresApproval: true },
        ]),
    ).toThrow(/side effect/);
  });

  it('lists only the tools a role may call', () => {
    const { tool } = makeTool();
    const registry = new ToolRegistry([tool]);
    expect(registry.listFor(Role.CUSTOMER).map((t) => t.name)).toEqual([
      'math.double',
    ]);
    expect(registry.listFor(Role.ADMIN)).toEqual([]);
  });
});
