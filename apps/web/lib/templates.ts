// Safe to import from client components (no server-only code here).

export const TEMPLATES = [
  {
    id: 'classic',
    label: 'Classic',
    description:
      'A banner on top, three products per row. Works for almost anything.',
    color: '#2563eb',
  },
  {
    id: 'bold',
    label: 'Bold',
    description:
      'A big colored header and large product cards. Great for a few standout products.',
    color: '#dc2626',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description:
      'No banner, a quiet header and a tight grid. Great for a big catalog.',
    color: '#111827',
  },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]['id'];

export function templateOf(id: string | undefined): TemplateId {
  return TEMPLATES.some((t) => t.id === id) ? (id as TemplateId) : 'classic';
}

/** Columns of the product grid for each template. */
export const GRID_CLASS: Record<TemplateId, string> = {
  classic: 'grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4',
  bold: 'grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3',
  minimal: 'grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 lg:grid-cols-5',
};

export const SELLING_MODES = [
  {
    id: 'online',
    label: 'Sell online',
    description: 'Products shipped to customers.',
  },
  {
    id: 'physical',
    label: 'Sell in a physical store',
    description: 'A shop or stand that also wants an online catalog.',
  },
  {
    id: 'dropshipping',
    label: 'Dropshipping',
    description: 'A supplier ships the products for you.',
  },
  {
    id: 'print_on_demand',
    label: 'Print on demand',
    description: 'Products printed only when ordered.',
  },
  {
    id: 'digital',
    label: 'Digital products',
    description: 'Files, courses or downloads.',
  },
  {
    id: 'migrate',
    label: 'Move an existing store',
    description: 'Bring a store you already run elsewhere.',
  },
] as const;
