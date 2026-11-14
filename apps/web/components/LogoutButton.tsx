'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch('/api/session/logout', { method: 'POST' }).catch(
      () => undefined,
    );
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="rounded border border-gray-500 px-3 py-1 text-sm hover:bg-gray-800 disabled:opacity-60"
    >
      {busy ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
