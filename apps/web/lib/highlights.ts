// Safe to import from client components (no server-only code here).

export interface Highlight {
  id: string;
  text?: string;
}

/** What a seller can show in the strip under the banner. The seller may rewrite the text of each one. */
export const HIGHLIGHT_PRESETS = [
  {
    id: 'free_shipping',
    icon: '🚚',
    title: 'Free shipping',
    text: 'On eligible orders',
  },
  {
    id: 'fast_delivery',
    icon: '⚡',
    title: 'Fast delivery',
    text: 'Ships in 1 to 2 business days',
  },
  {
    id: 'pickup',
    icon: '🏬',
    title: 'Pick up at the store',
    text: 'Choose it at checkout',
  },
  {
    id: 'secure_checkout',
    icon: '💳',
    title: 'Secure checkout',
    text: 'Card payments, in test mode',
  },
  {
    id: 'installments',
    icon: '🧾',
    title: 'Pay in installments',
    text: 'Ask the store for the terms',
  },
  {
    id: 'easy_returns',
    icon: '↩️',
    title: 'Easy returns',
    text: 'Changed your mind? Send it back',
  },
  { id: 'warranty', icon: '🛡️', title: 'Warranty', text: 'On every product' },
  {
    id: 'support',
    icon: '💬',
    title: 'Customer support',
    text: 'We answer quickly',
  },
] as const;

export const MAX_HIGHLIGHTS = 4;

export function presetOf(id: string) {
  return HIGHLIGHT_PRESETS.find((preset) => preset.id === id);
}
