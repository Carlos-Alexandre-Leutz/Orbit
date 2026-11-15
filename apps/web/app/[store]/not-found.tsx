import Link from 'next/link';

export default function StoreNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-8">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p>
        This store or product does not exist, or it was removed. Check the link
        or pick a store from the list.
      </p>
      <Link href="/" className="text-blue-400 hover:underline">
        See the stores
      </Link>
    </main>
  );
}
