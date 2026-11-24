import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Orbit | Create your online store' };

const STEPS = [
  {
    title: 'Create your store',
    text: 'Sign up as a seller and pick the link of your store.',
  },
  {
    title: 'Make it yours',
    text: 'Add your logo, cover and colors, then your products and stock.',
  },
  {
    title: 'Share the link',
    text: 'Your customers shop at your link. Orders arrive in your panel.',
  },
];

/**
 * The home of Orbit: it sells the product to sellers and lists no store; a store is only reached by its link.
 * Whoever already has a store has nothing to buy here, so they land in the panel of their store.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (user?.role === 'SELLER' && user.store) redirect('/panel');
  return (
    <main className="flex-1">
      <section className="border-b border-gray-800 px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold md:text-5xl">
            Your online store, ready in minutes
          </h1>
          <p className="text-lg text-gray-400">
            Orbit gives every seller a store at their own link, with products,
            stock and orders in one panel. Customers keep one account that works
            in every store.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/sell"
              className="rounded bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Create your store
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-label="How it works"
        className="mx-auto grid max-w-5xl gap-4 px-4 py-12 md:grid-cols-3"
      >
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            className="space-y-2 rounded-lg border border-gray-700 p-5"
          >
            <p className="text-sm text-gray-400">Step {index + 1}</p>
            <h2 className="text-lg font-semibold">{step.title}</h2>
            <p className="text-sm text-gray-400">{step.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-gray-800 px-4 py-6 text-center text-sm text-gray-500">
        <Link href="/terms" className="underline">
          Terms of Use
        </Link>
        {' · '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        <br />
        Orbit is a portfolio project: the stores and people are invented and
        payments are in test mode.
      </footer>
    </main>
  );
}
