import Link from 'next/link';
import { imageSrc, safeColor } from '@/lib/images';
import { listStores } from '@/lib/stores';

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

export default async function HomePage() {
  const stores = await listStores();
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
            <Link
              href="#stores"
              className="rounded border border-gray-500 px-6 py-3 hover:bg-gray-800"
            >
              Browse the stores
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

      <section id="stores" className="mx-auto max-w-5xl space-y-4 px-4 pb-16">
        <h2 className="text-2xl font-bold">Stores on Orbit</h2>
        {stores === null ? (
          <p role="alert" className="text-red-400">
            The stores could not be loaded. Try again in a moment.
          </p>
        ) : stores.length === 0 ? (
          <p>There are no stores yet. Yours can be the first.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <li
                key={store.slug}
                className="overflow-hidden rounded-lg border border-gray-700 hover:border-gray-500"
              >
                <Link href={`/${store.slug}`} className="block">
                  <div
                    className="relative h-24"
                    style={{ backgroundColor: safeColor(store.primaryColor) }}
                  >
                    {store.coverImageId && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageSrc(store.coverImageId)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="flex items-center gap-2 font-semibold">
                      {store.logoImageId && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageSrc(store.logoImageId)}
                          alt=""
                          className="h-6 w-6 rounded object-cover"
                        />
                      )}
                      {store.name}
                    </p>
                    <p className="line-clamp-2 text-sm text-gray-400">
                      {store.tagline || store.description}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-gray-800 px-4 py-6 text-center text-sm text-gray-500">
        Orbit is a portfolio project: the stores and people are invented and
        payments are in test mode.
      </footer>
    </main>
  );
}
