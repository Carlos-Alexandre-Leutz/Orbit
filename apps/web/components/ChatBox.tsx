'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import {
  chatReducer,
  initialChat,
  parseSse,
  type ChatMessage,
} from '@/lib/chat';

const STORAGE_KEY = 'orbit.assistant.conversation';

function remembered(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(id: string | undefined) {
  try {
    if (id) sessionStorage.setItem(STORAGE_KEY, id);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Without storage the chat still works; it just starts new after a reload.
  }
}

interface ApprovalView {
  id: string;
  summary: string;
  amountCents: number | null;
  needsAmountConfirmation: boolean;
  status: string;
}

/** The call the assistant prepared and a person must approve before it runs. */
function ApprovalCard({ approvalId }: { approvalId: string }) {
  const [approval, setApproval] = useState<ApprovalView | null>(null);
  const [amount, setAmount] = useState('');
  const [outcome, setOutcome] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/bff/approvals/${encodeURIComponent(approvalId)}`)
      .then((r) => (r.ok ? (r.json() as Promise<ApprovalView>) : null))
      .then((data) => !cancelled && setApproval(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [approvalId]);

  async function decide(kind: 'approve' | 'reject') {
    setBusy(true);
    try {
      const body =
        kind === 'approve' && approval?.needsAmountConfirmation
          ? { confirmAmountCents: Math.round(Number(amount) * 100) }
          : {};
      const response = await fetch(
        `/api/bff/approvals/${encodeURIComponent(approvalId)}/${kind}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        result?: { ok: boolean; error?: { message: string } };
        status?: string;
      } | null;
      if (!response.ok) {
        setOutcome(data?.message ?? 'Could not save your decision.');
      } else if (kind === 'reject') {
        setOutcome('Rejected. Nothing was done.');
      } else {
        setOutcome(
          data?.result?.ok
            ? 'Approved and done.'
            : `Approved, but it did not work: ${data?.result?.error?.message ?? 'unknown error'}`,
        );
      }
    } catch {
      setOutcome('The server is not reachable. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!approval) {
    return <p className="mt-2 text-sm text-gray-400">Loading the approval…</p>;
  }
  const open = approval.status === 'PENDING' && outcome === null;
  return (
    <div
      className="mt-2 rounded border border-yellow-700 bg-yellow-950/40 p-3 text-sm"
      role="group"
      aria-label="Approval needed"
    >
      <p className="font-medium">Needs your approval</p>
      <p className="mt-1">{approval.summary}</p>
      {outcome ? (
        <p className="mt-2" role="status">
          {outcome}
        </p>
      ) : open ? (
        <div className="mt-2 space-y-2">
          {approval.needsAmountConfirmation && approval.amountCents !== null && (
            <label className="block">
              <span className="text-gray-300">
                This is a large amount. Type the total to confirm:
              </span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-40 rounded border border-gray-600 bg-gray-900 px-2 py-1"
                placeholder={(approval.amountCents / 100).toFixed(2)}
              />
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => decide('approve')}
              className="rounded bg-green-700 px-3 py-1 hover:bg-green-600 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide('reject')}
              className="rounded border border-gray-500 px-3 py-1 hover:bg-gray-800 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-gray-400">This approval is {approval.status.toLowerCase()}.</p>
      )}
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user';
  return (
    <li className={mine ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          mine ? 'bg-blue-700' : 'bg-gray-800'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        {message.approvalId && <ApprovalCard approvalId={message.approvalId} />}
      </div>
    </li>
  );
}

/** The chat with the store assistant: the answer arrives as a stream of events, shown as it comes. */
export function ChatBox() {
  const [state, dispatch] = useReducer(chatReducer, initialChat);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = remembered();
    if (!id) return;
    fetch(`/api/bff/conversations/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: {
          id: string;
          messages: { role: 'user' | 'assistant'; content: string }[];
        } | null) => {
          if (data) {
            dispatch({
              type: 'load',
              conversationId: data.id,
              messages: data.messages,
            });
          } else {
            remember(undefined);
          }
        },
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    remember(state.conversationId);
  }, [state.conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [state.messages.length, state.status]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message || state.busy) return;
    setText('');
    dispatch({ type: 'send', text: message });
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId: state.conversationId,
        }),
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        dispatch({
          type: 'fail',
          text: data?.message ?? 'The assistant is not available right now.',
        });
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSse(buffer);
        buffer = parsed.rest;
        for (const item of parsed.events) {
          dispatch({ type: 'event', event: item });
        }
      }
      dispatch({
        type: 'event',
        event: { type: 'done', status: 'closed', steps: 0, costMicroUsd: 0 },
      });
    } catch {
      dispatch({ type: 'fail', text: 'The connection was lost. Try again.' });
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assistant</h1>
        <button
          type="button"
          onClick={() => dispatch({ type: 'reset' })}
          disabled={state.busy || state.messages.length === 0}
          className="rounded border border-gray-600 px-3 py-1 text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          New chat
        </button>
      </div>
      <p className="text-sm text-gray-400">
        Ask about products, your cart and your orders. Buying and cancelling
        always wait for your approval.
      </p>
      <ol
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="min-h-64 flex-1 space-y-3 overflow-y-auto rounded border border-gray-800 p-3"
      >
        {state.messages.length === 0 && (
          <li className="text-gray-500">
            Try “find a gift under 50 dollars” or “where is my order?”.
          </li>
        )}
        {state.messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        {state.busy && state.status && (
          <li className="text-sm text-gray-400" role="status">
            {state.status}…
          </li>
        )}
        <div ref={endRef} />
      </ol>
      <form onSubmit={send} className="flex gap-2">
        <label className="sr-only" htmlFor="chat-message">
          Your message
        </label>
        <input
          id="chat-message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          autoComplete="off"
          placeholder="Write a message"
          className="flex-1 rounded border border-gray-600 bg-gray-900 px-3 py-2"
        />
        <button
          type="submit"
          disabled={state.busy || !text.trim()}
          className="rounded bg-blue-700 px-4 py-2 hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
