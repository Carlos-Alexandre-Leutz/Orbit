# ADR-005: Many stores, each with its own link, seller panel and customers

- **Status:** Accepted (2026-11-15). The owner told the AI to run PBI-59, so the two defaults marked **to confirm** (a path link, one customer account for all stores) were adopted; either can still be changed.
- **Date:** 2026-11-15

## Context

Until PBI-09 Orbit is **one** store: one shared catalog, one cart per user, and roles (customer, seller, admin) that only decide who may edit that catalog. The requirements even listed multi-store operation as out of scope.

That is not the product the owner wants. The owner wants an ordinary online-store platform, like WooCommerce or Shopify, to be put online as a first deploy: a seller signs up, gets a store at its own link (for example `orbit.com/lojadojao`), manages products, stock and orders in a seller panel, and customers shop in that store, log in, keep a cart and buy. The cart belongs to customers, never to sellers. The chat and the agents (later PBIs) are features on top of this base, so they must know which store they are working for.

Constraints: the first deploy is one small VPS (PBI-42), payments are Stripe in test mode ([ADR-004](ADR-004-payments-behind-a-port.md)), and data from one store must never reach another store's seller.

## Decision

These are the proposed defaults. Two of them wait for the owner's answer (marked **to confirm**); the rest follow from the owner's description.

- **A `Store` entity** with a name, a unique `slug` and an owner (a seller). A seller owns one store for now. Sellers pick "I want to sell" at sign-up and the store is created there.
- **The link is a path, `/<slug>`** (**to confirm**; the alternative is a subdomain). Words the site itself uses (`login`, `register`, `cart`, `checkout`, `orders`, `panel`, `api`, and so on) are reserved and cannot be a slug. Slugs are lower case letters, digits and hyphens.
- **Products and orders belong to a store** (`storeId`). Existing products and orders move to a demo store owned by a demo seller, so nothing is lost.
- **One customer account works in every store** (**to confirm**; the alternative is separate customers per store). The cart is one per customer **and store**, and an order belongs to exactly one store. Sellers and admins have no cart and cannot check out.
- **The seller panel lives at `/panel`**, separate from the storefront. Every query behind it is scoped to the store of the logged-in seller. An admin of the platform may read every store.
- **Isolation is enforced in the API, not in the screens**: each seller endpoint takes the store from the session, never from the request, and has tests that a seller of store A cannot read or change anything of store B (404, as with orders today).
- **Payments stay on one test Stripe account.** Paying sellers out (Stripe Connect) is out of scope.
- **Agent tools** (PBI-18 onward) receive the store as part of their context, so a chat answers for one store only.

What is true today: nothing in this ADR is built. PBI-59 to PBI-61 implement it, before PBI-10.

## Alternatives considered

- **Keep one store and call the seller role "the owner".** No work, but it is not a platform where several sellers have their own shop, which is what the owner asked for.
- **A subdomain per store (`lojadojao.orbit.com`).** Looks more professional, but needs wildcard DNS and a wildcard certificate on the VPS and cookies that cross subdomains. A path works with one domain and one certificate. It can be added later without changing the data model, because the slug is the same.
- **A separate database or schema per store.** Strong isolation, but heavy to run on one small VPS and to migrate. A `storeId` column with scoped queries and tests is enough for a portfolio-sized platform.
- **Customers separate per store.** Closer to WooCommerce, but a person would sign up again in every store and the chat could not know them across stores. One account is simpler.
- **A multi-seller marketplace with one shared cart.** Different product (one order split among sellers, payouts, disputes). Not what was asked.

## Consequences

- The catalog, cart and order code written in PBI-07 to PBI-09 changes: new column, scoped queries, new URLs and pages. The payment, idempotency, refund and e-mail rules stay as they are.
- A mistake in scoping would leak one store's data to another, so the isolation tests are part of PBI-59, not an extra.
- Existing local data must be migrated to the demo store without loss; the migration is tested on a copy.
- More sign-up paths (customer or seller) and more pages to test in a real browser.
- Open risks are tracked in [`open-questions.md`](../open-questions.md): the answers marked **to confirm**, and which security and operations items must exist before the first public deploy.
