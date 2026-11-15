import { notFound, redirect } from 'next/navigation';
import { getOrder } from '@/lib/orders';

/** An old order link: send it to the order under the link of its store. */
export default async function OldOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  redirect(`/${order.store.slug}/orders/${id}`);
}
