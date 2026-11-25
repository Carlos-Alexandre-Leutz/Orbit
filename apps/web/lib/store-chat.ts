export interface StoreChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** The API keeps at most this many earlier messages of a conversation. */
export const MAX_HISTORY = 10;
export const MAX_MESSAGE_CHARS = 1000;

/** The last messages, which are what the API accepts as the conversation so far. */
export function recentHistory(
  messages: StoreChatMessage[],
): StoreChatMessage[] {
  return messages.slice(-MAX_HISTORY).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 2000),
  }));
}

/** A new id for a browser that has none; it only groups the limits of the chat, it proves nothing. */
export function newVisitorId(): string {
  return crypto.randomUUID();
}

/**
 * Asks the assistant of one store. The page talks to the web server's `/api/bff` route, never to the BFF
 * directly. Returns the answer, or a sentence to show when the assistant could not answer.
 */
export async function askStore(
  slug: string,
  visitorId: string,
  message: string,
  history: StoreChatMessage[],
  fetcher: typeof fetch = fetch,
): Promise<{ ok: true; text: string } | { ok: false; text: string }> {
  try {
    const response = await fetcher(
      `/api/bff/stores/${encodeURIComponent(slug)}/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          message: message.slice(0, MAX_MESSAGE_CHARS),
          history: recentHistory(history),
        }),
      },
    );
    const data = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const text = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    if (response.ok && text) return { ok: true, text };
    if (response.status === 429) {
      return {
        ok: false,
        text: text ?? 'Too many questions for now. Please try again later.',
      };
    }
    return { ok: false, text: 'The assistant is not available right now.' };
  } catch {
    return { ok: false, text: 'The assistant could not be reached.' };
  }
}
