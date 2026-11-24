import { BadRequestException } from '@nestjs/common';
import { AuditOutcome, Role } from '@prisma/client';
import { AuditService } from './audit.service';

function setup() {
  const create = jest.fn((args: { data: unknown }) =>
    Promise.resolve({ id: 'e1', ...(args.data as object) }),
  );
  const prisma = { auditEntry: { create } };
  const service = new AuditService(prisma as never);
  return { service, create };
}

describe('AuditService', () => {
  it('stores every field of a full entry', async () => {
    const { service, create } = setup();
    await service.record({
      actorId: 'u1',
      actorRole: Role.SELLER,
      tool: 'orders.ship',
      parameters: { orderId: 'o1' },
      result: { status: 'SHIPPED' },
      outcome: AuditOutcome.SUCCESS,
      approverId: 'u2',
      model: 'gemini-test',
      promptVersion: 'v1',
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        actorId: 'u1',
        actorRole: Role.SELLER,
        tool: 'orders.ship',
        parameters: { orderId: 'o1' },
        result: { status: 'SHIPPED' },
        outcome: AuditOutcome.SUCCESS,
        approverId: 'u2',
        model: 'gemini-test',
        promptVersion: 'v1',
      },
    });
  });

  it('fills what is left out: no actor, empty parameters and result', async () => {
    const { service, create } = setup();
    await service.record({ tool: 'webhook.payment', outcome: 'DENIED' });
    expect(create).toHaveBeenCalledWith({
      data: {
        actorId: null,
        actorRole: null,
        tool: 'webhook.payment',
        parameters: {},
        result: {},
        outcome: 'DENIED',
        approverId: null,
        model: null,
        promptVersion: null,
      },
    });
  });

  it('trims the tool name and refuses a blank one', async () => {
    const { service, create } = setup();
    await service.record({ tool: '  cart.add_item ', outcome: 'SUCCESS' });
    expect(create.mock.calls[0][0].data).toMatchObject({
      tool: 'cart.add_item',
    });
    expect(() => service.record({ tool: '   ', outcome: 'SUCCESS' })).toThrow(
      BadRequestException,
    );
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('writes through the transaction client when one is given', async () => {
    const { service, create } = setup();
    const txCreate = jest.fn().mockResolvedValue({ id: 'e2' });
    await service.record({ tool: 'cart.add_item', outcome: 'SUCCESS' }, {
      auditEntry: { create: txCreate },
    } as never);
    expect(txCreate).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
  });

  it('has no way to change or remove an entry', () => {
    const { service } = setup();
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(service) as object,
    );
    expect(methods).toEqual(['constructor', 'record']);
  });
});
