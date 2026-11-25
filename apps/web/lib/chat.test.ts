import { describe, expect, it } from 'vitest';
import {
  chatReducer,
  initialChat,
  parseSse,
  toolLabel,
  type ChatEvent,
} from './chat';

const block = (event: ChatEvent) =>
  `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

describe('parseSse', () => {
  it('reads every finished event', () => {
    const text =
      block({ type: 'status', text: 'Thinking' }) +
      block({ type: 'message', text: 'Hello' });
    const { events, rest } = parseSse(text);
    expect(events.map((e) => e.type)).toEqual(['status', 'message']);
    expect(rest).toBe('');
  });

  it('keeps an unfinished event for the next piece', () => {
    const whole = block({ type: 'message', text: 'Hello there' });
    const first = parseSse(whole.slice(0, 20));
    expect(first.events).toEqual([]);
    const second = parseSse(first.rest + whole.slice(20));
    expect(second.events).toEqual([{ type: 'message', text: 'Hello there' }]);
  });

  it('skips a block that is not valid and keeps going', () => {
    const { events } = parseSse(
      'event: x\ndata: {nope\n\n' + block({ type: 'status', text: 'ok' }),
    );
    expect(events).toEqual([{ type: 'status', text: 'ok' }]);
  });

  it('reads Windows line endings', () => {
    const text = block({ type: 'status', text: 'a' }).replace(/\n/g, '\r\n');
    expect(parseSse(text).events).toHaveLength(1);
  });
});

describe('chatReducer', () => {
  const run = (events: ChatEvent[]) =>
    events.reduce(
      (state, event) => chatReducer(state, { type: 'event', event }),
      chatReducer(initialChat, { type: 'send', text: 'find shoes' }),
    );

  it('shows the message of the person and starts working', () => {
    const state = chatReducer(initialChat, { type: 'send', text: 'hi' });
    expect(state).toMatchObject({ busy: true, status: 'Thinking' });
    expect(state.messages).toEqual([{ id: 1, role: 'user', text: 'hi' }]);
  });

  it('follows a whole answer: id, tool, message, done', () => {
    const state = run([
      { type: 'conversation', id: 'c1' },
      { type: 'tool_call', tool: 'catalog.search' },
    ]);
    expect(state).toMatchObject({
      conversationId: 'c1',
      status: toolLabel('catalog.search'),
      busy: true,
    });
    const done = chatReducer(
      chatReducer(state, {
        type: 'event',
        event: { type: 'message', text: 'Found one.' },
      }),
      {
        type: 'event',
        event: { type: 'done', status: 'answered', steps: 2, costMicroUsd: 1 },
      },
    );
    expect(done.busy).toBe(false);
    expect(done.status).toBeUndefined();
    expect(done.messages.map((m) => [m.role, m.text])).toEqual([
      ['user', 'find shoes'],
      ['assistant', 'Found one.'],
    ]);
  });

  it('hangs the approval on the message that follows it, once', () => {
    const state = run([
      { type: 'approval_required', approvalId: 'ap1', tool: 'orders.place' },
      { type: 'message', text: 'Please approve.' },
    ]);
    expect(state.messages.at(-1)?.approvalId).toBe('ap1');
    expect(state.pendingApprovalId).toBeUndefined();
  });

  it('turns a failure into a message and stops being busy', () => {
    const state = chatReducer(chatReducer(initialChat, { type: 'send', text: 'x' }), {
      type: 'fail',
      text: 'The assistant could not be reached.',
    });
    expect(state.busy).toBe(false);
    expect(state.messages.at(-1)?.text).toMatch(/could not be reached/);
  });

  it('loads an earlier conversation and starts a new one', () => {
    const loaded = chatReducer(initialChat, {
      type: 'load',
      conversationId: 'c9',
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
      ],
    });
    expect(loaded.conversationId).toBe('c9');
    expect(loaded.messages.map((m) => m.id)).toEqual([1, 2]);
    expect(chatReducer(loaded, { type: 'reset' })).toEqual(initialChat);
  });

  it('has a friendly label for a tool it does not know', () => {
    expect(toolLabel('something.new')).toBe('Working on it');
  });
});
