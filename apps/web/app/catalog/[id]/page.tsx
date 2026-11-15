import { notFound, redirect } from 'next/navigation';
import { bffRequest } from '@/lib/bff';
import type { Product } from '@/lib/catalog';

/** An old product link: send it to the product under its store's link. */
export default async function OldProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await bffRequest<Product>(
    `/products/${encodeURIComponent(id)}`,
  );
  if (!result.ok) notFound();
  redirect(`/${result.data.store.slug}/products/${id}`);
}
