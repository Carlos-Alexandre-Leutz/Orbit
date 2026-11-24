# PBI-59: Stores and ownership

Issue: #327. Tasks: #328, #329, #330, #331, #332. Pull request: `pbi/59-stores-ownership` → `staging`. Decision: [ADR-005](../adr/ADR-005-stores-and-storefronts.md), accepted with its default choices.

## Goal

Turn Orbit from one store with roles into a platform of stores: a seller signs up and gets a store at its own link, products, carts and orders belong to a store, and a seller can never read or change another store. The storefront pages under the store link are PBI-60 and the seller panel is PBI-61; this PBI is the data and the API behind them.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #328 Store model | #347 | `Store` (name, description, unique `slug`, one owner) and its migration; the link rules (3 to 40 characters, lower case letters, digits and single hyphens, reserved words such as `login`, `panel`, `api`). ADR-005 accepted. |
| #329 Seller sign-up | #348 | `POST /auth/register` takes `accountType` (`CUSTOMER` or `SELLER`), `storeName` and an optional `storeSlug`; the seller and the store are created in one statement, a taken link answers 409. The role is never read from the request. The sign-up page has an "I want to sell" option. |
| #330 Products per store | #349 | `Product.storeId`; a SKU is unique **per store**; the migration creates the demo store (`demo-store`, owned by a seller that cannot log in) and moves every existing product into it. Writes are for sellers only and use the store found from the session; another store's product answers 404. `GET /products?store=<link>` lists one store. |
| #331 Cart and orders per store | #350 | One cart per customer **and** store, `Order.storeId`, existing carts and orders moved to the demo store. Cart and order calls name the store with `?store=<link>`. Only customers have a cart or place an order. An order is visible to its owner, an admin and the seller of its store; ship, deliver and cancel-after-payment work for that seller or an admin only. BFF and web were adapted (the web uses the demo store until PBI-60). |
| #332 Isolation tests | #351 | 13 integration tests with two sellers, two customers and an admin. |
| Fixes found in the browser | #352 | See "Bugs found". |

All task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-15 on the full Compose stack from a fresh clone inside the repository folder (published ports 13000 to 13002, its own database; the owner's stack on 3000 to 3002 was not touched), rebuilt once after the fixes of #352. The API was exercised **through the BFF** by a script (34 checks, 0 failed, run twice, on the first and on the rebuilt stack), the pages in the built-in browser. The clone, the containers, the volumes and the images were removed afterwards.

| AC | Result | Evidence |
|---|---|---|
| AC1 Store and link | **Pass** | `loja-do-joao-<n>` was made from the store name; `login`, `panel`, `Bad_Link` and `ab` answered 400 through the BFF. The 15 unit tests of the slug rules cover the edges (length 3 and 40, hyphens at the ends, every reserved word). |
| AC2 Seller sign-up | **Pass** | In the browser: "I want to sell", store name only, "Sign up and create store" → logged in as a seller, store `loja-da-maria`. Through the BFF: a taken link gave 409 and the second user could not log in (no half-made seller); a customer sign-up that sent `role: ADMIN` and a store name got a customer and no store. |
| AC3 Products | **Pass** | A seller created a product with SKU `KIT-001`, which the demo store already has, through the page and through the API. The rival seller got 404 on edit and delete, a customer 403. The demo store listed all 24 products and the other stores only their own. The migration was applied to a copy that already held products: all of them ended in the demo store. |
| AC4 Cart | **Pass** | A product of another store answered 404 when added to a cart. One customer had 2 units in one store's cart and 1 unit in the demo cart at the same time, and placing the order in one store left the other cart untouched. A seller got 403 on the cart and on placing an order. |
| AC5 Orders | **Pass** | The rival seller got 404 reading, shipping and cancelling the order; a customer got 403 shipping it; the seller of the store read it, shipped it and delivered it. The migration moved a copy's cart and order into the demo store. |
| AC6 Isolation tests | **Pass** | 13 tests. To check they are not empty, two rules were broken on purpose (the ownership check on product updates, the store check on orders): 1 and 2 tests failed; the changes were reverted. |
| AC7 Existing flows | **Pass** | In the browser: sign up as a customer → the catalog shows the 24 demo products → add 2 to the cart → cart $43.80 → checkout → "Place order" → "Waiting for payment" → "Pay now" → "Paid". Sellers see "Manage products" and no cart. |

Tests on the PBI branch: API 248 unit and 85 integration tests (on PostgreSQL 16), BFF 24, web 58, `pnpm test:scripts` 86, `pnpm test:commitlint` 7; `import_backlog.py --verify` 276 items, 0 problems; every task PR had all six checks green.

## Bugs found while doing this

- **The seller was sent to a page that does not exist.** After signing up as a seller the page redirected to `/seller` (404); it now goes to `/seller/products`. Found in the browser.
- **The menu offered a cart and orders to sellers and admins**, who now cannot buy (the API answers 403). Only customers see them. Found in the browser.
- **"Manage products" listed every store's products**, with "Edit" buttons that would answer 404. `GET /auth/me` now returns the seller's store and the page lists only that store. Found in the browser.
- **The first integration run of the products task failed** because its branch had been cut before the sign-up task was merged; the PBI branch was merged into it. A process slip, not a code bug.
- My own slips, caught before the PR: the hook that checks commit messages failed once because the default Node 16 was on the `PATH`; and the first draft of one PR body said CI does not run the integration tests, which is wrong (the `typescript` check does), so I corrected it.

## Decisions and limits

- **The two defaults of ADR-005 were adopted on the owner's instruction to run the PBI**, not from an explicit answer: a path link (`/<slug>`) and one customer account for all stores. Either can still be changed.
- **The web app shows one store, the demo store, until PBI-60** (`apps/web/lib/store.ts`): the catalog, cart and checkout pages use it. A seller's own store is reachable through the API and "Manage products", but a customer cannot browse it yet. PBI-60 replaces this with the link in the page address.
- **The demo store belongs to `demo-seller@orbit.invalid`**, whose password is not a valid hash, so nobody can log in as it. To manage the demo catalog, use the reset flow or give the account a password.
- **A seller owns exactly one store** (the owner column is unique). An admin has no store, so an admin cannot create or edit products for now; admins still read every order and can ship, deliver and cancel any.
- **The cart and orders pages are not guarded by role**: a seller who types `/cart` gets the API's refusal inside the page. PBI-60 builds the pages under the store link with the role check.
- **A seller still cannot list their store's orders**, only read one by id; the list is PBI-61.
- **Categories are shared by every store**; a seller may create one. Per-store categories are not planned.
- **The SKU pattern and per-store uniqueness**: renaming the SKU of an existing product is still not allowed.
- **The disk** was at 90% (24 GB free) after the verification; Docker's build cache grew again. Nothing of this PBI's verification is left, but the cache is not cleaned.
- **Stripe was never contacted**; payments ran on the fake provider, as before.
