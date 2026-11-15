'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const field = 'w-full p-2 border border-gray-300 rounded bg-transparent';

async function send(path: string, body: object): Promise<string | null> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const failure = await send('/api/session/login', { email, password });
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-black rounded shadow-md">
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            aria-label="E-mail"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            aria-label="Password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="flex justify-between text-sm text-blue-500 mt-4">
          <Link href="/register">Create Account</Link>
          <Link href="/forgot-password">Forgot Password</Link>
        </div>
      </div>
    </main>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [selling, setSelling] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    const failure = await send('/api/session/register', {
      name,
      email,
      password,
      ...(selling && {
        accountType: 'SELLER',
        storeName,
        ...(storeSlug && { storeSlug }),
      }),
    });
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    router.replace(selling ? '/seller' : next);
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-black rounded shadow-md">
        <h1 className="text-2xl font-bold text-center">Create Account</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            aria-label="Full Name"
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="E-mail"
            aria-label="E-mail"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (8 to 72 characters)"
            aria-label="Password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            maxLength={72}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            aria-label="Confirm Password"
            className={field}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selling}
              onChange={(e) => setSelling(e.target.checked)}
            />
            I want to sell: create my store
          </label>
          {selling && (
            <>
              <input
                type="text"
                placeholder="Store name"
                aria-label="Store name"
                className={field}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
              <input
                type="text"
                placeholder="Store link (optional, e.g. loja-do-joao)"
                aria-label="Store link"
                className={field}
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value.toLowerCase())}
                maxLength={40}
              />
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {busy
              ? 'Creating...'
              : selling
                ? 'Sign up and create store'
                : 'Sign up'}
          </button>
        </form>
        <p className="text-center text-sm mt-4">
          Do you already have an account?{' '}
          <Link href="/login" className="text-blue-500">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
