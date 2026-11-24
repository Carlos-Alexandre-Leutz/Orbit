import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AgentEvent } from './agent';
import { ChatController, formatEvent } from './chat.controller';
import { CUSTOMER_AGENT } from './customer/customer-agent';
import { Orchestrator } from './orchestrator';

const actor = { id: 'u1', role: Role.CUSTOMER };

function setup(decision: unknown) {
  const router = { route: jest.fn().mockResolvedValue(decision) };
  const loop = {
    run: jest.fn().mockResolvedValue({
      status: 'answered',
      message: 'from agent',
      steps: 1,
      costMicroUsd: 3,
    }),
  };
  const events: AgentEvent[] = [];
  const orchestrator = new Orchestrator(router as never, loop as never);
  return {
    orchestrator,
    router,
    loop,
    events,
    handle: (message = 'hi') =>
      orchestrator.handle({ actor, message, emit: (e) => events.push(e) }),
  };
}

describe('Orchestrator', () => {
  it.each(['catalog', 'cart', 'orders', 'general'])(
    'sends the %s route to the customer agent',
    async (route) => {
      const { handle, loop } = setup({
        action: 'route',
        route,
        confidence: 0.9,
      });
      const result = await handle();
      expect(result.message).toBe('from agent');
      expect(loop.run).toHaveBeenCalledWith(
        expect.objectContaining({ agent: CUSTOMER_AGENT, actor }),
      );
    },
  );

  it('answers a clarifying question without running an agent', async () => {
    const { handle, loop, events } = setup({
      action: 'clarify',
      question: 'Which order?',
      confidence: 0.5,
    });
    expect(await handle()).toMatchObject({
      status: 'clarify',
      message: 'Which order?',
    });
    expect(loop.run).not.toHaveBeenCalled();
    expect(events.map((e) => e.type)).toEqual(['message', 'done']);
  });

  it('tells the person a human will take over when the router escalates', async () => {
    const { handle, loop } = setup({ action: 'escalate', reason: 'low' });
    expect(await handle()).toMatchObject({ status: 'escalated' });
    expect(loop.run).not.toHaveBeenCalled();
  });

  it('refuses without an agent', async () => {
    const { handle, loop } = setup({ action: 'refuse', message: 'No.' });
    expect(await handle()).toMatchObject({ status: 'refused', message: 'No.' });
    expect(loop.run).not.toHaveBeenCalled();
  });

  it('is honest that the seller assistant does not exist yet', async () => {
    const { handle, loop } = setup({
      action: 'route',
      route: 'seller_tools',
      confidence: 0.9,
    });
    expect((await handle()).message).toMatch(/not available yet/);
    expect(loop.run).not.toHaveBeenCalled();
  });
});

describe('customer agent', () => {
  it('is limited to the six customer tools', () => {
    expect(CUSTOMER_AGENT.tools).toEqual([
      'catalog.search',
      'cart.view',
      'cart.add_item',
      'orders.place',
      'orders.status',
      'orders.cancel',
    ]);
    expect(CUSTOMER_AGENT.name).toBe('customer_agent');
  });
});

describe('ChatController', () => {
  const ID = '11111111-1111-4111-8111-111111111111';
  const user = { user: { id: 'u1', role: Role.CUSTOMER } } as never;

  function chat(
    opts: { existing?: boolean; handle?: jest.Mock; remember?: jest.Mock } = {},
  ) {
    const written: string[] = [];
    const response = {
      status: () => response,
      set: () => response,
      flushHeaders: jest.fn(),
      write: (s: string) => written.push(s),
      end: jest.fn(),
    };
    const orchestrator = {
      handle:
        opts.handle ??
        jest.fn(({ emit }: { emit: (e: AgentEvent) => void }) => {
          emit({ type: 'message', text: 'ok' });
          emit({ type: 'done', status: 'answered', steps: 1, costMicroUsd: 0 });
          return Promise.resolve({
            status: 'answered',
            message: 'ok',
            steps: 1,
            costMicroUsd: 0,
          });
        }),
    };
    const memory = {
      get: jest.fn().mockResolvedValue(opts.existing ? { id: ID } : null),
      contextFor: jest.fn().mockResolvedValue({
        summary: 'earlier: shoes',
        history: [{ role: 'user', content: 'before' }],
      }),
      remember: opts.remember ?? jest.fn().mockResolvedValue(undefined),
    };
    return {
      controller: new ChatController(orchestrator as never, memory as never),
      written,
      response,
      orchestrator,
      memory,
    };
  }

  it('formats events as server-sent events', () => {
    expect(formatEvent({ type: 'message', text: 'hi' })).toBe(
      'event: message\ndata: {"type":"message","text":"hi"}\n\n',
    );
  });

  it('starts a conversation, tells the page its id, streams the events and remembers the exchange', async () => {
    const { controller, written, response, orchestrator, memory } = chat();
    await controller.stream({ message: 'hi' }, user, response as never);
    expect(written.map((w) => w.split('\n')[0])).toEqual([
      'event: conversation',
      'event: message',
      'event: done',
    ]);
    const id = (JSON.parse(written[0].split('data: ')[1]) as { id: string }).id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(orchestrator.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 'u1', role: Role.CUSTOMER },
        message: 'hi',
      }),
    );
    expect(memory.remember).toHaveBeenCalledWith('u1', id, 'hi', 'ok');
    expect(response.end).toHaveBeenCalled();
  });

  it('continues a conversation with the history and summary kept on the server', async () => {
    const { controller, response, orchestrator, memory } = chat({
      existing: true,
    });
    await controller.stream(
      { message: 'and now?', conversationId: ID },
      user,
      response as never,
    );
    expect(memory.contextFor).toHaveBeenCalledWith('u1', ID);
    expect(orchestrator.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'earlier: shoes',
        history: [{ role: 'user', content: 'before' }],
      }),
    );
  });

  it("answers 404 before streaming when the conversation is not the user's", async () => {
    const { controller, response } = chat({ existing: false });
    await expect(
      controller.stream(
        { message: 'x', conversationId: ID },
        user,
        response as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(response.flushHeaders).not.toHaveBeenCalled();
  });

  it('still answers when the exchange cannot be remembered', async () => {
    const { controller, response } = chat({
      remember: jest.fn().mockRejectedValue(new Error('mongo down')),
    });
    await controller.stream({ message: 'hi' }, user, response as never);
    expect(response.end).toHaveBeenCalled();
  });

  it('still ends the stream, with a safe message, when the orchestrator throws', async () => {
    const { controller, written, response } = chat({
      handle: jest.fn().mockRejectedValue(new Error('boom')),
    });
    await controller.stream({ message: 'hi' }, user, response as never);
    expect(written.join('')).toMatch(/Something went wrong/);
    expect(JSON.stringify(written)).not.toMatch(/boom/);
    expect(response.end).toHaveBeenCalled();
  });
});
