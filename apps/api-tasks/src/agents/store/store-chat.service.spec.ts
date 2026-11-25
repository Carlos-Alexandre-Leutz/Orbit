import { HttpException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StoreChatService } from './store-chat.service';

const open = { id: 's1', slug: 'loja', published: true, suspendedAt: null };

function build(store: unknown = open) {
  const stores = { bySlug: jest.fn().mockResolvedValue(store) };
  const loop = {
    run: jest
      .fn()
      .mockResolvedValue({ status: 'answered', message: 'Yes, we have mugs.' }),
  };
  return {
    stores,
    loop,
    service: new StoreChatService(stores as never, loop as never),
  };
}

const ask = { visitorId: 'v1', message: 'Do you have mugs?' };

describe('StoreChatService', () => {
  it('runs the store agent for the store of the link, as a visitor', async () => {
    const { service, loop } = build();
    expect(await service.ask('loja', ask)).toEqual({
      status: 'answered',
      message: 'Yes, we have mugs.',
    });
    expect(loop.run).toHaveBeenCalledWith(
      expect.objectContaining({
        store: { id: 's1', slug: 'loja' },
        actor: { id: 'visitor:v1', role: Role.CUSTOMER },
        agent: expect.objectContaining({ name: 'store_agent' }),
      }),
    );
  });

  it.each([
    ['a draft store', { ...open, published: false }],
    ['a suspended store', { ...open, suspendedAt: new Date() }],
  ])('answers nothing for %s', async (_name, store) => {
    const { service, loop } = build(store);
    await expect(service.ask('loja', ask)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(loop.run).not.toHaveBeenCalled();
  });

  it('limits one visitor in one store', async () => {
    const { service } = build();
    const limit = Number(process.env.STORE_CHAT_PER_VISITOR_HOUR) || 30;
    for (let i = 0; i < limit; i++) await service.ask('loja', ask);
    await expect(service.ask('loja', ask)).rejects.toMatchObject({
      status: 429,
    });
    await expect(service.ask('loja', ask)).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});
