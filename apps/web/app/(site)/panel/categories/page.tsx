import { CategoriesManager } from '@/components/CategoriesManager';
import { getOwnCategories } from '@/lib/panel';

export const metadata = { title: 'Categories | Seller panel | Orbit' };

export default async function PanelCategoriesPage() {
  const categories = await getOwnCategories();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Categories</h1>
      <p className="text-sm text-gray-400">
        Create the categories of what you sell. They show in the menu and on the
        home page of your store, and you pick one for each product.
      </p>
      {categories ? (
        <CategoriesManager categories={categories} />
      ) : (
        <p role="alert" className="text-red-400">
          The categories could not be loaded. Try again in a moment.
        </p>
      )}
    </div>
  );
}
