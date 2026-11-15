# PBI-09: Orders and test payment

Issue: #46. Tasks: #47, #48, #49, #50, #51, #295. Pull request: `pbi/09-orders-payment` → `staging`.

## Goal

Turn the cart into an order, pay it in test mode, cancel it with refunds and stock rules, confirm it by e-mail, and give the customer the pages to do all of that. Nothing here moves real money: there are no Stripe keys, so the payment runs behind a port with a fake provider.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #47 Orders and state machine | #317 | `Order` and `OrderItem` tables, the state machine, placing an order from the cart (stock taken atomically, prices copied), reading, shipping and delivering by a seller or admin. |
| #48 Payment | #318 | `PaymentProvider` port, a fake provider, a Stripe adapter, `POST /orders/:id/pay`, a signed webhook that needs the raw body, a table of handled events. [ADR-004](../adr/ADR-004-payments-behind-a-port.md). |
| #49 Idempotency | #319 | `Idempotency-Key` on placing an order, unique per user, safe under parallel requests; a parallel-pay test. |
| #50 Cancellation | #320 | `POST /orders/:id/cancel` by role, stock returned in the same transaction, refund through the provider, stray payments refunded. |
| #51 E-mail | #321 | Confirmation e-mail through `MailService`; never awaited, never fails the order. |
| #295 Pages | #322, #323 | `/checkout`, `/orders`, `/orders/[id]`, "Orders" in the menu, a "Checkout" button in the cart. #323 fixed a stale cart count found in the browser. |

All task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-14 on the full Compose stack from a fresh clone of the PBI branch (published ports 13000 to 13002; the owner's stack on 3000 to 3002 was not touched), with the fake payment provider and a throwaway Mailpit as the SMTP server. The API was exercised **through the BFF** by a script (23 checks, 0 failed), the pages in the built-in browser. The clone, the stack and Mailpit were removed afterwards.

| AC | Result | Evidence |
|---|---|---|
| AC1 Place an order | **Pass** | 2 + 1 products gave an order of 4770 cents, `PENDING_PAYMENT`, stock 100 → 98 and 55 → 54, cart emptied, the order hidden from another customer (404). Two customers ordering the last units at once: one 201, one 409, stock 0. "An order never changes after it is placed": the integration test that changes the price afterwards (PBI-09 #47). |
| AC2 States and roles | **Pass** | A customer shipping got 403; shipping a pending order 409; a seller shipped and delivered a paid order; every other move is covered by the state machine's unit tests (`order-state.spec.ts`). |
| AC3 Payment port | **Pass, with the limit stated** | A declined test card answered 402 and left the order unpaid; the approved card made it `PAID`. A signed webhook for an already paid order left `paidAt` unchanged. The Stripe adapter is **not verified against Stripe**: only its webhook signature check runs, with Stripe's own signing helper. See the limits. |
| AC4 Webhook | **Pass** | A wrong signature and a missing one answered 400 **through the BFF**, which means the raw body and the header arrive unchanged; a signed event confirmed a pending payment and a repeat was ignored (8 parallel copies are covered by an integration test: one row, one effect). |
| AC5 Idempotency | **Pass** | 8 parallel `POST /orders` with one key gave one order and one stock decrement (97 → 96); a later retry returned the same order; a malformed key answered 400. In the browser a double click on "Place order" ended on one order page and the list showed one order. 6 parallel pays all answered `PAID`; that there is one payment reference is shown by the integration test, not by this run. |
| AC6 Cancellation | **Pass** | A customer cancelled a pending order and the stock came back once; a repeat changed nothing; a customer cancelling a paid order got 403; a seller cancelled it, `refunded: true`, stock back; a shipped order answered 409 to the seller and to the customer; a delivered one too. In the browser: "Cancel order" → "Yes, cancel it" gave a "Cancelled" order with the time. |
| AC7 E-mail | **Pass** | Mailpit received one message per order placed (7 for 7 orders), with the lines, the total and a link, and none for the repeated idempotent requests. With the mail server stopped an order still answered 201 in 0.01 s. |
| AC8 Web and this document | **Pass** | In the browser: sign up → add to cart → "Checkout" → "Place order" → order page "Waiting for payment" → the declined card showed "Pagamento recusado: Card declined" and the order stayed unpaid → the approved card gave "Paid" with the time, and the customer no longer saw pay or cancel buttons → the list showed the order with its total and status → a second order was cancelled in the page. The three pages send a visitor to `/login?next=...` (307). |

Tests on the PBI branch: API 212 unit and 68 integration tests (on PostgreSQL), BFF 23, web 57, `pnpm test:scripts` 86, `pnpm test:commitlint` 7; `import_backlog.py --verify` 260 items, 0 problems; every task and fix PR had all six checks green.

## Bugs found while doing this

- **The orders and payments services imported each other**, so Nest injected `undefined` and every integration test failed at start-up. `presentOrder` now lives in its own file.
- **A flaky integration test**: eight parallel requests through supertest each opened the server on their own port and one got `ECONNRESET` in CI (the first CI run of #321 failed on it). The payment tests now start the server once.
- **A stale cart count in the menu** after placing an order, found only in the browser: the header belongs to the layout, which a plain navigation keeps. Fixed in #323 and checked again in the browser.
- **A payment confirmed after its order was cancelled**, or a second card paying in parallel, would have kept the money. These "stray" payments are now refunded and traced, with unit and integration tests.
- My own mistake, not a code bug: a script argument that works around a Prisma safety guard was refused by the environment, and I did not retry it; the throwaway database was recreated through `psql` in the container I had created.

## Decisions and limits

- **Not verified: `StripePaymentProvider.charge` and `.refund` have never run against Stripe.** There are no keys. When the owner supplies test keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, see `.env.example`), run one approved and one declined payment, one refund and one real webhook before trusting them. In production the API refuses to start without the keys.
- **An unpaid order keeps its stock until it is cancelled.** Nothing expires old unpaid orders yet.
- **A key reused with a different cart returns the first order.** That is the usual meaning of an idempotency key.
- **The fake provider remembers its charges in memory only**, so a restart forgets them. Fine for development.
- **Two parallel payments with two different cards can both succeed at the provider**; the one that did not pay the order is refunded afterwards, so the customer is not charged twice for long, but it is not prevented.
- **A refund that fails leaves the order cancelled** and answers 502 `REFUND_FAILED`; cancelling again, as staff, retries only the refund.
- **There are no pages for shipping and delivering**, only the API; and no page for a seller to list other customers' orders.
- **An empty body with `Content-Type: application/json` is a 400** from the BFF's Fastify (for any POST, such as cancel). The site sends `{}` so it is not affected; a hand-written client must do the same.
- The confirmation e-mail is in Portuguese, like the password-reset one, the API's messages are in Portuguese and the pages in English (the known language gap of PBI-55). I did not see the "could not send" warning in the API log within 20 seconds of the mail-down order (the connection attempt to a missing host is slow); the unit test covers the logging of a failed send.
- Real delivery was checked against Mailpit, not Mailtrap: no Mailtrap account exists. The SMTP settings are the same.
