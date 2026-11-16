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

export interface FormStore {
  slug: string;
  name: string;
}

/** The login of the platform, or of a store when `store` is given: then it sends the customer back to the store. */
export function LoginForm({
  next,
  store,
}: {
  next: string;
  store?: FormStore;
}) {
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
        <h1 className="text-2xl font-bold text-center">
          {store ? `Sign in to ${store.name}` : 'Sign in'}
        </h1>
        {store && (
          <p className="text-center text-sm text-gray-400">
            Your Orbit account works in every store.
          </p>
        )}
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
          {store ? (
            <Link
              href={`/${store.slug}/register?next=${encodeURIComponent(next)}`}
            >
              Create an account to shop
            </Link>
          ) : (
            <Link href="/sell">Create your store</Link>
          )}
          <Link href="/forgot-password">Forgot Password</Link>
        </div>
      </div>
    </main>
  );
}

function Fields({
  values,
  set,
}: {
  values: { name: string; email: string; password: string; confirm: string };
  set: (key: 'name' | 'email' | 'password' | 'confirm', v: string) => void;
}) {
  return (
    <>
      <input
        type="text"
        placeholder="Full Name"
        aria-label="Full Name"
        className={field}
        value={values.name}
        onChange={(e) => set('name', e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="E-mail"
        aria-label="E-mail"
        className={field}
        value={values.email}
        onChange={(e) => set('email', e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password (8 to 72 characters)"
        aria-label="Password"
        className={field}
        value={values.password}
        onChange={(e) => set('password', e.target.value)}
        minLength={8}
        maxLength={72}
        required
      />
      <input
        type="password"
        placeholder="Confirm Password"
        aria-label="Confirm Password"
        className={field}
        value={values.confirm}
        onChange={(e) => set('confirm', e.target.value)}
        required
      />
    </>
  );
}

const EMPTY = { name: '', email: '', password: '', confirm: '' };

/** Sign-up inside a store: always a customer. The account works in every store. */
export function CustomerSignUpForm({
  store,
  next,
}: {
  store: FormStore;
  next: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (values.password !== values.confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    const failure = await send('/api/session/register', {
      name: values.name,
      email: values.email,
      password: values.password,
      accountType: 'CUSTOMER',
    });
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
        <h1 className="text-2xl font-bold text-center">
          Create your account to shop at {store.name}
        </h1>
        <p className="text-center text-sm text-gray-400">
          One Orbit account works in every store: you will find your orders from
          all of them in one place.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Fields
            values={values}
            set={(k, v) => setValues((o) => ({ ...o, [k]: v }))}
          />
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
            {busy ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm mt-4">
          Already have an account?{' '}
          <Link
            href={`/${store.slug}/login?next=${encodeURIComponent(next)}`}
            className="text-blue-500"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

/** Sign-up of a seller on the platform: creates the account and the store together. */
export function SellerSignUpForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (values.password !== values.confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    const failure = await send('/api/session/register', {
      name: values.name,
      email: values.email,
      password: values.password,
      accountType: 'SELLER',
      storeName,
      ...(storeSlug && { storeSlug }),
    });
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    router.replace('/seller/products');
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-black rounded shadow-md">
        <h1 className="text-2xl font-bold text-center">Create your store</h1>
        <p className="text-center text-sm text-gray-400">
          Sign up as a seller to set up your store, add products and get a link
          to share with your customers.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Fields
            values={values}
            set={(k, v) => setValues((o) => ({ ...o, [k]: v }))}
          />
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
          <p className="text-xs text-gray-500">
            An e-mail is either a seller or a customer. To shop in other stores
            too, use a different e-mail for that account.
          </p>
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
            {busy ? 'Creating...' : 'Create account and store'}
          </button>
        </form>
        <p className="text-center text-sm mt-4">
          Already a seller?{' '}
          <Link href="/login" className="text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
