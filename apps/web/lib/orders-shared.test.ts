import { describe, expect, it } from 'vitest';
import { canCancel, canPay, statusLabel } from './orders-shared';

describe('canCancel', () => {
  it('lets a customer cancel only an order that waits for payment', () => {
    expect(canCancel('CUSTOMER', 'PENDING_PAYMENT')).toBe(true);
    for (const status of ['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const)
      expect(canCancel('CUSTOMER', status)).toBe(false);
  });

  it('lets a seller or admin also cancel a paid order, never a shipped one', () => {
    for (const role of ['SELLER', 'ADMIN'] as const) {
      expect(canCancel(role, 'PAID')).toBe(true);
      expect(canCancel(role, 'SHIPPED')).toBe(false);
      expect(canCancel(role, 'DELIVERED')).toBe(false);
      expect(canCancel(role, 'CANCELLED')).toBe(false);
    }
  });
});

describe('canPay and statusLabel', () => {
  it('offers payment only while waiting for it', () => {
    expect(canPay('PENDING_PAYMENT')).toBe(true);
    expect(canPay('PAID')).toBe(false);
    expect(canPay('CANCELLED')).toBe(false);
  });

  it('has a plain label for every status', () => {
    expect(statusLabel('PENDING_PAYMENT')).toBe('Waiting for payment');
    expect(statusLabel('CANCELLED')).toBe('Cancelled');
  });
});
