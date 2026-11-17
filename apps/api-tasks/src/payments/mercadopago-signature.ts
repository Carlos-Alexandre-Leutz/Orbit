import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Checks the `x-signature` header of a Mercado Pago notification. Mercado Pago signs
 * `id:<payment or subscription id>;request-id:<x-request-id>;ts:<ts>;` with the secret of the webhook.
 * Written from the public documentation and never run against Mercado Pago.
 */
export function isValidMercadoPagoSignature(
  secret: string,
  signature: string | undefined,
  requestId: string | undefined,
  dataId: string,
): boolean {
  const parts = Object.fromEntries(
    (signature ?? '').split(',').map((part) => part.trim().split('=', 2)),
  ) as Record<string, string | undefined>;
  const id = /^[A-Za-z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId ?? ''};ts:${parts.ts ?? ''};`;
  const expected = Buffer.from(
    createHmac('sha256', secret).update(manifest).digest('hex'),
    'hex',
  );
  const given = Buffer.from(parts.v1 ?? '', 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
