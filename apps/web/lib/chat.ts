/** What the store assistant streams to the page (server-sent events from `POST /chat/stream`). */
export type ChatEvent =
  | { type: 'conversation'; id: string }
  | { type: 'status'; text: string }
  | { type: 'tool_call'; tool: string }
  | { type: 'tool_result'; tool: string; ok: boolean; code?: string | undefined }
  | { type: 'approval_required'; approvalId?: string | undefined; tool: string }
  | { type: 'message'; text: string }
  | {
      type: 'done';
      status: string;
      steps: number;
      costMicroUsd: number;
    };

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  /** An approval the assistant is waiting for; the page shows its card under this message. */
  approvalId?: string | undefined;
}

export interface ChatState {
  conversationId?: string | undefined;
  messages: ChatMessage[];
  busy: boolean;
  /** What the assistant is doing right now, such as "Searching the catalog". */
  status?: string | undefined;
  pendingApprovalId?: string | undefined;
}

export const initialChat: ChatState = { messages: [], busy: false };

export type ChatAction =
  | { type: 'send'; text: string }
  | { type: 'event'; event: ChatEvent }
  | { type: 'fail'; text: string }
  | {
      type: 'load';
      conversationId: string;
      messages: { role: 'user' | 'assistant'; content: string }[];
    }
  | { type: 'reset' };

const TOOL_LABEL: Record<string, string> = {
  'catalog.search': 'Searching the catalog',
  'cart.view': 'Looking at your cart',
  'cart.add_item': 'Adding to your cart',
  'orders.place': 'Preparing your order',
  'orders.status': 'Checking your order',
  'orders.cancel': 'Preparing the cancellation',
};

export const toolLabel = (tool: string) => TOOL_LABEL[tool] ?? 'Working on it';

/**
 * Reads the events in a piece of the stream. A block is finished by a blank line, so what comes after the
 * last blank line is kept as `rest` and joined with the next piece. A block that is not valid is skipped.
 */
export function parseSse(buffer: string): { events: ChatEvent[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, '\n').split('\n\n');
  const rest = blocks.pop() ?? '';
  const events: ChatEvent[] = [];
  for (const block of blocks) {
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    try {
      const event = JSON.parse(data) as ChatEvent;
      if (event && typeof event.type === 'string') events.push(event);
    } catch {
      // A broken block is not worth stopping the chat for.
    }
  }
  return { events, rest };
}

const nextId = (state: ChatState) =>
  state.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'reset':
      return initialChat;
    case 'load':
      return {
        ...initialChat,
        conversationId: action.conversationId,
        messages: action.messages.map((m, i) => ({
          id: i + 1,
          role: m.role,
          text: m.content,
        })),
      };
    case 'send':
      return {
        ...state,
        busy: true,
        status: 'Thinking',
        pendingApprovalId: undefined,
        messages: [
          ...state.messages,
          { id: nextId(state), role: 'user', text: action.text },
        ],
      };
    case 'fail':
      return {
        ...state,
        busy: false,
        status: undefined,
        messages: [
          ...state.messages,
          { id: nextId(state), role: 'assistant', text: action.text },
        ],
      };
    case 'event': {
      const event = action.event;
      switch (event.type) {
        case 'conversation':
          return { ...state, conversationId: event.id };
        case 'status':
          return { ...state, status: event.text };
        case 'tool_call':
          return { ...state, status: toolLabel(event.tool) };
        case 'tool_result':
          return state;
        case 'approval_required':
          return { ...state, pendingApprovalId: event.approvalId };
        case 'message':
          return {
            ...state,
            messages: [
              ...state.messages,
              {
                id: nextId(state),
                role: 'assistant',
                text: event.text,
                approvalId: state.pendingApprovalId,
              },
            ],
            pendingApprovalId: undefined,
          };
        case 'done':
          return { ...state, busy: false, status: undefined };
      }
    }
  }
}
