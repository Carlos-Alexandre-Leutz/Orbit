# ADR-004: Payments behind a port, with a fake provider

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

Orders are paid through Stripe in test mode (PBI-09). No Stripe keys exist yet, so a real charge cannot be tried. Stripe may also send the same webhook event more than once, and the customer's call and the webhook can both confirm the same payment.

## Decision

- The store depends on an abstract class, `PaymentProvider` (`apps/api-tasks/src/payments`), with two operations: `charge` and `readEvent` (which checks the webhook signature on the raw body). Nothing else in the code imports `stripe`.
- Two implementations: `StripePaymentProvider` (test mode) and `FakePaymentProvider`, which decides the outcome by the payment method like Stripe's test cards and signs its own webhooks with an HMAC, so the whole webhook path runs in tests.
- The provider is chosen at startup: Stripe when `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set, the fake otherwise. With `NODE_ENV=production` and no keys the API refuses to start: the fake would accept every payment.
- The customer never sends a card number: the pay route takes a test payment method id (`pm_...`).
- Webhooks are applied once: the event id is stored in `ProcessedPaymentEvent` in the same transaction as its effect. An order moves from `PENDING_PAYMENT` to `PAID` with a conditional update, so the call and the webhook together pay it once.
- The webhook needs the exact bytes Stripe signed, so both the API and the BFF start with `rawBody: true`, and the BFF forwards the raw body and the `stripe-signature` header unchanged.

## Alternatives considered

- **Call Stripe directly from the service.** Simpler, but untestable without keys and it ties the order rules to one vendor.
- **Mock `stripe` in tests only.** Proves nothing about the webhook path, idempotency or the raw body.
- **Idempotency only through the order state.** It stops a second `PAID`, but not a repeated event that must be recorded; the table also gives an audit of what the provider sent.

## Consequences

- When keys arrive, only the Stripe adapter's `charge` needs a first real run; its webhook signature check is already tested with Stripe's own signing helper.
- The idempotency key of a charge is `order-<id>-<payment method>`: a retry with the same card never charges twice, a new card after a decline is a new attempt. Two parallel payments with two different cards could both succeed at the provider; the one that did not pay the order is refunded (a "stray" payment), and so is a payment confirmed after the order was cancelled. Refunds have their own idempotency key, `refund-<payment reference>`.
- The fake keeps its idempotency cache in memory, so it forgets on restart. That is fine for development.
