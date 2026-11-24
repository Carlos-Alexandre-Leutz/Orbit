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
  it('formats events as server-sent events', () => {
    expect(formatEvent({ type: 'message', text: 'hi' })).toBe(
      'event: message\ndata: {"type":"message","text":"hi"}\n\n',
    );
  });

  it('streams the events of the orchestrator and ends the response', async () => {
    const written: string[] = [];
    const response = {
      status: () => response,
      set: () => response,
      flushHeaders: jest.fn(),
      write: (s: string) => written.push(s),
      end: jest.fn(),
    };
    const orchestrator = {
      handle: jest.fn(({ emit }: { emit: (e: AgentEvent) => void }) => {
        emit({ type: 'message', text: 'ok' });
        emit({ type: 'done', status: 'answered', steps: 1, costMicroUsd: 0 });
        return Promise.resolve();
      }),
    };
    const controller = new ChatController(orchestrator as never);
    await controller.stream(
      { message: 'hi', history: [] },
      { user: { id: 'u1', role: Role.CUSTOMER } } as never,
      response as never,
    );
    expect(written.map((w) => w.split('\n')[0])).toEqual([
      'event: message',
      'event: done',
    ]);
    expect(response.end).toHaveBeenCalled();
    expect(orchestrator.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 'u1', role: Role.CUSTOMER },
        message: 'hi',
      }),
    );
  });

  it('still ends the stream, with a safe message, when the orchestrator throws', async () => {
    const written: string[] = [];
    const response = {
      status: () => response,
      set: () => response,
      flushHeaders: jest.fn(),
      write: (s: string) => written.push(s),
      end: jest.fn(),
    };
    const controller = new ChatController({
      handle: () => Promise.reject(new Error('boom')),
    } as never);
    await controller.stream(
      { message: 'hi', history: [] },
      { user: { id: 'u1', role: Role.CUSTOMER } } as never,
      response as never,
    );
    expect(written.join('')).toMatch(/Something went wrong/);
    expect(JSON.stringify(written)).not.toMatch(/boom/);
    expect(response.end).toHaveBeenCalled();
  });
});
