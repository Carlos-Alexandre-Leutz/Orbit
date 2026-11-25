'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  askStore,
  newVisitorId,
  type StoreChatMessage,
} from '@/lib/store-chat';

const VISITOR_KEY = 'orbit.visitor';

function visitorId(): string {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const id = newVisitorId();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Storage can be blocked: a new id for this page view still works, it only groups the limits.
    return newVisitorId();
  }
}

/**
 * The assistant of a store: a round button at the bottom right that opens a chat about this store's
 * products, prices, shipping and delivery. It cannot buy anything. The conversation lives in this page only.
 */
export function StoreChat({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<StoreChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useRef<string>('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy, open]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (!question || busy) return;
    id.current ||= visitorId();
    const before = messages;
    setMessages([...before, { role: 'user', content: question }]);
    setText('');
    setBusy(true);
    const answer = await askStore(slug, id.current, question, before);
    setMessages((now) => [...now, { role: 'assistant', content: answer.text }]);
    setBusy(false);
  }

  return (
    <>
      {open && (
        <section
          aria-label={`Chat with ${name}`}
          className="fixed bottom-24 right-4 z-40 flex h-[28rem] max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white text-neutral-900 shadow-xl"
        >
          <header
            className="flex items-center justify-between px-4 py-3 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--store-color)',
              color: 'var(--store-on-color)',
            }}
          >
            <span>Ask about {name}</span>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded px-2 text-lg leading-none"
            >
              ×
            </button>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && (
              <p className="text-neutral-500">
                Ask about products, prices, shipping or delivery time. I cannot
                place orders: use the cart to buy.
              </p>
            )}
            {messages.map((m, i) => (
              <p
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
                  m.role === 'user'
                    ? 'ml-auto bg-neutral-900 text-white'
                    : 'bg-neutral-100'
                }`}
              >
                {m.content}
              </p>
            ))}
            {busy && <p className="text-neutral-500">Thinking…</p>}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t p-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="Type your question"
              aria-label="Your question"
              className="min-w-0 flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'var(--store-color)',
                color: 'var(--store-on-color)',
              }}
            >
              Send
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        aria-label={open ? 'Close chat' : `Ask ${name}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: 'var(--store-color)',
          color: 'var(--store-on-color)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10 5.4-.6 9.4-4.6 10-10Z" />
        </svg>
      </button>
    </>
  );
}
