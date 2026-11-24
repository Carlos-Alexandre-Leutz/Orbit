import { redirect } from 'next/navigation';

export default async function OldEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  redirect(`/panel/products/${encodeURIComponent((await params).id)}/edit`);
}
