import Link from 'next/link';

export default function CatalogNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-8">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <p>It may have been removed.</p>
      <Link href="/catalog" className="text-blue-400 hover:underline">
        Back to the catalog
      </Link>
    </main>
  );
}
