# Draft: cart recovery SaaS backlog

**Status: draft for the owner's review.** Not imported, no issues created, not part of `docs/00-backlog.md`. Ids are `S-nn` so they cannot be confused with the current PBIs.

## Decisions taken so far

- Product: WhatsApp recovery of abandoned carts for online stores; replenishment later.
- Pricing for the MVP: one monthly plan with every feature, trial, **no usage limits** (the owner will add them after launch if needed). No commission, so no billing-grade attribution.
- Meta's WhatsApp Business rules come first. No message is sent to a customer until consent, opt-out, approved templates and the 24-hour window are in place.
- Meta's own per-number sending limits still apply; the product respects them and shows the merchant when a message is waiting.
- Not decided yet: whether this lives in Orbit or in a new repository; which store platform comes first (Nuvemshop, Shopify or other). PBIs that depend on the platform say so.

## Meta rules the backlog must satisfy

Confirm each against the current Meta documentation when the PBI starts; rules change.

| Rule | Where it is delivered |
|---|---|
| Proactive messages need the customer's opt-in, and the merchant must be able to prove it | S-08, S-09 |
| Opt-out must be honoured at once | S-09 |
| Outside the 24-hour customer window only approved templates may be sent | S-07, S-10 |
| Templates are classified (marketing, utility) and must be approved | S-07 |
| Each number has a quality rating and a messaging limit that can drop | S-11 |
| Marketing messages are charged per message to the merchant | S-12 |
| AI assistants must be specific to the business, not general-purpose | S-22 |

## Phase 0: the basics (before any WhatsApp)

### S-01 Merchant account and tenant base
Sign-up, login with real sessions (the inherited template returns no token), a store per merchant, and isolation of every record by store.
- A user can register, log in and only see their own store.
- A test proves one store cannot read another store's data.

### S-02 Store platform connection
Install flow (OAuth) for the first platform. Depends on the platform choice.
- A merchant connects a test store and sees it connected.
- Disconnecting removes the access token.

### S-03 Webhook intake
Signed, idempotent intake of platform events, raw event stored, safe retries.
- An invalid signature is rejected.
- The same event delivered twice changes nothing the second time.

### S-04 Catalogue, customer and order import
Import products, customers and past orders.
- The import is repeatable without duplicates.
- Phone numbers are normalised to the international format.

## Phase 1: WhatsApp, compliance first

### S-05 WhatsApp Business connection
Connect a business account and number, store tokens safely, show status.
- A test number can be connected and disconnected.
- Tokens never appear in logs.

### S-06 Outbound queue
Queue with rate limiting, retries, idempotency and delivery status (sent, delivered, read, failed).
- A message is never sent twice for one event.
- A failure is recorded with its reason and is not retried forever.

### S-07 Message templates
Create templates, submit them for approval, track status, only approved ones can be sent.
- A template that is not approved cannot be queued.
- Marketing and utility categories are kept apart.

### S-08 Consent capture
Record opt-in per customer: source, date, wording shown. Customers with no recorded consent are not contacted.
- Sending to a customer with no consent is refused and logged.
- A merchant can export the consent record of a customer.

### S-09 Opt-out and suppression
Stop keyword, one-click opt-out, a suppression list checked before every send.
- After an opt-out no further message is sent, tested end to end.
- Re-opting in needs a new recorded consent.

### S-10 Conversation window
Track the 24-hour window per customer; outside it, only templates.
- A free-text message outside the window is refused.
- Inbound messages open the window and appear in a simple inbox.

### S-11 Quality and limits guard
Read the number's quality rating and messaging limit, slow down or pause sending when quality drops, tell the merchant.
- When the limit is reached messages wait and the merchant sees how many.
- A quality drop pauses marketing messages and raises an alert.

### S-12 Cost visibility
Show the merchant what each message category costs and a running estimate. Prices are read from configuration, not hardcoded.
- The estimate changes when the price table changes.

## Phase 2: cart recovery

### S-13 Abandonment detection
A checkout started with no purchase after a delay is an abandoned cart.
- A purchase before the delay cancels the abandonment.
- A cart with no phone or no consent is recorded but not contacted.

### S-14 Recovery flow engine
Steps with delays, quiet hours, stop when the customer buys or opts out.
- Quiet hours are respected in the customer's time zone.
- A purchase stops every pending step.

### S-15 Recovery link with one-click checkout
Link with the cart filled in and an optional coupon.
- The link restores the cart on the platform.
- The link is tracked for attribution.

### S-16 Smart rules
Frequency cap per customer, different flows by cart value, message built from the cart's products. Rules, not machine learning.
- A customer never gets more messages than the cap.
- Each rule has a test.

### S-17 Recovered-sale attribution
Simple rule: a purchase within N days of a tracked click. For the dashboard only, not billing.
- The rule is written in the product and applied identically to every store.

### S-18 Merchant dashboard
Abandoned carts, messages sent, delivered, read, recovered sales, conversion per flow.
- Numbers match the underlying records, checked by a test.

### S-19 Test mode
Send the whole flow to the merchant's own number before going live.
- Test messages never go to real customers.

### S-20 Message audit trail
Who was contacted, with which template, why and with which result.
- Every send has an entry; entries cannot be edited.

## Phase 3: subscription

### S-21 Monthly subscription
Trial, recurring card or Pix billing through one provider, plan cancellation, failed-payment notice and a written policy for late payment. One plan, no usage limits.
- A merchant can start a trial, subscribe and cancel.
- A failed payment warns the merchant before access changes.

## Phase 4: later

### S-22 Governed AI replies
Answers customer questions through validated tools, discount limits set by the merchant, hands over to a human when unsure, every action audited. Specific to the store's business.

### S-23 Pending Pix and boleto recovery
Reminder before an unpaid Pix or boleto expires.

### S-24 Purchase cycle by rule
Days of use per product, product median, customer median.

### S-25 Replenishment campaign
Message when a product is about to run out, with one-click reorder.

### S-26 Replenishment evaluation
Compare against the simple rule; add machine learning only if it wins on a time-based split.

## Order

S-01 → S-02 → S-03 → S-05 → S-08 → S-09 → S-07 → S-10 → S-06 → S-11 → S-13 → S-14 → S-15 → S-17 → S-18 → S-19 → S-20 → S-21, with S-04, S-12 and S-16 placed where the first real test needs them.
