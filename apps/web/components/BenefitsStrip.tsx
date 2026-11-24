import { formatPrice } from '@/lib/catalog';
import { presetOf } from '@/lib/highlights';
import { announcementFor } from '@/lib/shipping';
import type { Store } from '@/lib/stores';

/**
 * The strip of reassurances under the banner. The seller chooses which ones the store shows, and may rewrite
 * the text of each; a store that chose none shows no strip.
 */
export function BenefitsStrip({ store }: { store: Store }) {
  const items = (store.highlights ?? []).flatMap((highlight) => {
    const preset = presetOf(highlight.id);
    if (!preset) return [];
    // Free shipping says what the store really offers when the seller did not write something else.
    const fallback =
      highlight.id === 'free_shipping'
        ? (announcementFor(store, formatPrice) ?? preset.text)
        : preset.text;
    return [
      {
        id: preset.id,
        icon: preset.icon,
        title: preset.title,
        text: highlight.text || fallback,
      },
    ];
  });
  if (items.length === 0) return null;

  return (
    <ul
      aria-label="Why buy here"
      className="grid grid-cols-2 gap-4 border-y border-gray-700 py-5 text-center md:grid-cols-4"
    >
      {items.map((item) => (
        <li key={item.id} className="space-y-1 px-2">
          <p className="text-2xl" aria-hidden="true">
            {item.icon}
          </p>
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="break-words text-xs text-gray-400">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}
