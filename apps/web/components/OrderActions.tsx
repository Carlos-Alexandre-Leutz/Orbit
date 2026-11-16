'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { canCancel, canPay, type OrderStatus } from '@/lib/orders-shared';

async function post(path: string, body?: object): Promise<string | null> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    if (response.ok) return null;
    const data = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    return data?.message ?? 'Something went wrong. Try again.';
  } catch {
    return 'The server is not reachable. Try again.';
  }
}

/** Pay (test mode) and cancel for one order. The API decides; the buttons only follow its rules. */
export function OrderActions({
  orderId,
  status,
  role,
}: {
  orderId: string;
  status: OrderStatus;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/bff/orders/${orderId}`;
  const payPath = `${pathname}/pay`;

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const failure = await action();
    setBusy(false);
    setConfirming(false);
    if (failure) setError(failure);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canPay(status) && role === 'CUSTOMER' && (
        <Link
          href={`${payPath}`}
          className="inline-block rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500"
        >
          Pay now
        </Link>
      )}
      {canCancel(role, status) &&
        (confirming ? (
          <div className="flex items-center gap-3 text-sm">
            <span>Cancel this order?</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => post(`${base}/cancel`))}
              className="rounded border border-red-500 px-3 py-1 text-red-400 hover:bg-gray-800 disabled:opacity-60"
            >
              Yes, cancel it
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="hover:underline"
            >
              Keep it
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded border border-gray-500 px-3 py-1 text-sm hover:bg-gray-800"
          >
            Cancel order
          </button>
        ))}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
