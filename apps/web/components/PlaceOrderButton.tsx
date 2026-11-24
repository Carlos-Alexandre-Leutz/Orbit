'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { formatPrice } from '@/lib/catalog';
import {
  addressLines,
  formatWindow,
  type SavedAddress,
} from '@/lib/orders-shared';
import {
  estimateWindow,
  shippingCents,
  type DeliveryMethod,
  type ShippingRules,
} from '@/lib/shipping';

const EMPTY_ADDRESS = {
  recipientName: '',
  recipientPhone: '',
  postalCode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
};
type Address = typeof EMPTY_ADDRESS;

const ADDRESS_FIELDS: {
  key: keyof Address;
  label: string;
  required: boolean;
  wide?: boolean;
}[] = [
  { key: 'recipientName', label: 'Recipient name', required: true, wide: true },
  { key: 'recipientPhone', label: 'Phone', required: true },
  { key: 'postalCode', label: 'Postal code (CEP)', required: true },
  { key: 'street', label: 'Street', required: true, wide: true },
  { key: 'number', label: 'Number', required: true },
  { key: 'complement', label: 'Complement', required: false },
  { key: 'district', label: 'District', required: true },
  { key: 'city', label: 'City', required: true },
  { key: 'state', label: 'State (2 letters)', required: true },
];

/**
 * Places the order from the cart. The idempotency key is made once per page, so a double click or a retry after
 * a lost answer gives the same order instead of a second one.
 */
export function PlaceOrderButton({
  store,
  itemsCents,
  rules,
  savedAddresses = [],
}: {
  store: string;
  itemsCents: number;
  rules: ShippingRules;
  /** The addresses the customer used before, the latest first. */
  savedAddresses?: SavedAddress[];
}) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryMethod>('SHIPPING');
  const fee = shippingCents(rules, itemsCents, delivery) ?? 0;
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  // The latest saved address is used unless the customer picks "another address" (or has none yet).
  const [choice, setChoice] = useState<string>(savedAddresses[0]?.id ?? 'new');
  const key = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = savedAddresses.find((a) => a.id === choice);
  const toSend: Address = picked
    ? {
        recipientName: picked.recipientName,
        recipientPhone: picked.recipientPhone,
        postalCode: picked.postalCode,
        street: picked.street,
        number: picked.number,
        complement: picked.complement ?? '',
        district: picked.district,
        city: picked.city,
        state: picked.state,
      }
    : address;

  async function place() {
    if (
      delivery === 'SHIPPING' &&
      ADDRESS_FIELDS.some((f) => f.required && !toSend[f.key].trim())
    ) {
      setError('Fill in the delivery address.');
      return;
    }
    key.current ??= crypto.randomUUID();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/bff/orders?store=${encodeURIComponent(store)}&delivery=${delivery}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': key.current,
          },
          body: JSON.stringify(
            delivery === 'SHIPPING'
              ? {
                  shippingAddress: {
                    ...toSend,
                    complement: toSend.complement.trim() || undefined,
                  },
                }
              : {},
          ),
        },
      );
      const data = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
      } | null;
      if (response.ok && data?.id) {
        router.push(`/${store}/orders/${data.id}/pay`);
        // The cart count in the header belongs to the layout, which a plain navigation keeps as it was.
        router.refresh();
        return;
      }
      // A refused order was not created, so the same key can be used again once the cart is fixed.
      setError(data?.message ?? 'Could not place the order. Try again.');
    } catch {
      setError('The server is not reachable. Try again.');
    }
    setBusy(false);
  }

  const shipFee = shippingCents(rules, itemsCents, 'SHIPPING') ?? 0;
  const windowOf = (method: DeliveryMethod): [Date, Date] => {
    // Once an address is chosen or typed, its state decides the trip; before that, the general days.
    const state = toSend.state.trim().length === 2 ? toSend.state : undefined;
    const { from, to } = estimateWindow(rules, method, new Date(), state);
    return [from, to];
  };
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-gray-400">Delivery</legend>
        <label className="flex cursor-pointer items-center gap-3 rounded border border-gray-700 p-3 text-sm hover:bg-gray-900">
          <input
            type="radio"
            name="delivery"
            checked={delivery === 'SHIPPING'}
            onChange={() => setDelivery('SHIPPING')}
          />
          <span className="flex-1">
            Ship to me
            <span className="block text-xs text-gray-400">
              Arrives {formatWindow(...windowOf('SHIPPING'))}
            </span>
          </span>
          <span>{shipFee === 0 ? 'Free' : formatPrice(shipFee)}</span>
        </label>
        {rules.pickupEnabled && (
          <label className="flex cursor-pointer items-center gap-3 rounded border border-gray-700 p-3 text-sm hover:bg-gray-900">
            <input
              type="radio"
              name="delivery"
              checked={delivery === 'PICKUP'}
              onChange={() => setDelivery('PICKUP')}
            />
            <span className="flex-1">
              Pick up at the store
              <span className="block text-xs text-gray-400">
                Ready on {formatWindow(...windowOf('PICKUP'))}
              </span>
            </span>
            <span>Free</span>
          </label>
        )}
      </fieldset>
      {delivery === 'SHIPPING' && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm text-gray-400">
            Delivery address
          </legend>
          {savedAddresses.map((saved) => (
            <label
              key={saved.id}
              className="flex cursor-pointer items-start gap-3 rounded border border-gray-700 p-3 text-sm hover:bg-gray-900"
            >
              <input
                type="radio"
                name="address"
                checked={choice === saved.id}
                onChange={() => setChoice(saved.id)}
              />
              <span>
                {addressLines(saved).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </label>
          ))}
          {savedAddresses.length > 0 && (
            <label className="flex cursor-pointer items-center gap-3 rounded border border-gray-700 p-3 text-sm hover:bg-gray-900">
              <input
                type="radio"
                name="address"
                checked={choice === 'new'}
                onChange={() => setChoice('new')}
              />
              Use another address
            </label>
          )}
          <div
            className={`grid gap-3 sm:grid-cols-2 ${choice === 'new' ? '' : 'hidden'}`}
          >
            {ADDRESS_FIELDS.map((f) => (
              <label
                key={f.key}
                className={`space-y-1 text-sm ${f.wide ? 'sm:col-span-2' : ''}`}
              >
                {f.label}
                {f.required ? '' : ' (optional)'}
                <input
                  className="w-full rounded border border-gray-500 bg-transparent p-2"
                  value={address[f.key]}
                  onChange={(e) =>
                    setAddress({ ...address, [f.key]: e.target.value })
                  }
                  autoComplete="off"
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <p className="text-xl">
        Total: <strong>{formatPrice(itemsCents + fee)}</strong>
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={place}
        className="rounded bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
      >
        {busy ? 'Placing order...' : 'Place order'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
