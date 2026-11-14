# PBI-08: Cart

Issue: #42. Tasks: #43, #44, #294, #306 (and #45, cut). Pull request: `pbi/08-cart` → `staging`.

## Goal

A cart for every logged-in user: add, change, remove and empty, with the stock and limit rules enforced on the server, and the pages to use it. Placing an order from it is PBI-09.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #43 Model and endpoints | #303 | `Cart` and `CartItem` tables, a migration with a check constraint, five routes for the logged-in user (also a temporary visitor), the same routes in the BFF with OpenAPI. |
| #44 Rules | #304 | `cart-rules.ts` (unavailable, out of stock, 10 units per product, stock, 20 products) and a transaction that locks the cart row, so parallel requests cannot break the rules. |
| #294 Cart page | #305 | `/cart`, the "Add to cart" button on the product page and the item count in the header. |
| #306 First-cart race | #307 | Found during validation: see below. |
| #45 Redis | none | **Cut**, as the backlog allowed. The cart lives in PostgreSQL. |

All task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-14 on the full Compose stack from a fresh clone of the PBI branch (other published ports, removed afterwards), through the BFF for the API and in the built-in browser for the pages. The first-cart race fix (#307) came after this run and is covered by an integration test, not by this run.

| AC | Result | Evidence |
|---|---|---|
| AC1 One cart per user | **Pass** | Without a session the cart answers 401. After adding to one user's cart, a second user's cart was `{"items":[],"itemCount":0,"totalCents":0}`. The integration tests cover isolation, emptying and a temporary visitor. |
| AC2 Prices and totals | **Pass** | 2 + 3 skillets and 1 board: lines of 17450 and 2190 cents, a total of 19640 and 6 units. After the board's stock fell to 3, its line showed `available: false` and the total dropped to 17450 (5 units). In the browser the line was struck through with "Only 3 left: not counted in the total". |
| AC3 Rules | **Pass** | 6 more skillets (5 in the cart) answered 409 "O limite é de 10 unidades por produto"; a set above the stock answered 409 "Só há 3 unidade(s) em estoque"; an unknown product 404; a quantity of 0 with a bad id 400. In the browser the product page showed the 409 message, then "Added to your cart." for a valid quantity. The 20-product limit and the removed or out-of-stock product are covered by integration tests. |
| AC4 Idempotent set, atomic add | **Pass, with a bug found** | Setting a quantity twice gave the same answer (9 units, 26210 cents). 15 parallel adds from a user with a cart ended at the limit (integration test: 10 accepted, 5 refused). **The same test on the real stack with a user who had no cart answered 8 times 500**, see below. |
| AC5 Web | **Pass** | In the browser: the cart page listed the lines, changing a quantity from 5 to 3 gave "Total (3 items): $104.70", "Remove" removed the unavailable line, "Add to cart" on the product page worked, the header went from "Cart (3)" to "Cart (5)", and "Empty cart" showed "Your cart is empty." |
| AC6 Redis cut | **Pass** | Issue #45 closed as not planned with the reason; the cart is in PostgreSQL. |
| AC7 Verified | **Pass** | This document. |

Tests on the PBI branch: `turbo run lint test build` 9 tasks passed; API 120 unit tests and 34 integration tests; BFF 16; web 52; `pnpm test:scripts` 81; `import_backlog.py --verify` 254 items, 0 problems.

## Bugs found while doing this

- **The first cart of a user was not safe under parallel requests.** On the real stack, 15 parallel adds from a new user gave 7 successes and 8 crashes: every request tried to create the cart, the unique key let one win, and the others answered 500. The in-process test had missed it because its user already had a cart. Fixed in #307 by reading the winner's cart; a new integration test reproduces it (it fails without the fix) and passes with it.
- **A component of the browser imported server-only code**, which made the web build fail (`next/headers` in a client bundle). The first CI run of the cart page passed on a stale check while my fix was being pushed, so the merged state was checked again: the final commit has all six checks green. The helpers used by the browser now live in their own file.
- A `window.confirm` dialog cannot be answered by the browser tool, so for "Empty cart" it was auto-accepted by a script before the click.

## Decisions and limits

- Prices are not stored in the cart: it shows the current price, and the price is frozen when an order is placed. If a price changes while a product sits in a cart, the total changes.
- The cart **warns** about stock, it does not reserve it: another customer or a seller can change it afterwards. PBI-09 must check and take stock atomically when an order is placed.
- Limits are constants in `cart-rules.ts` (10 units, 20 products), not settings.
- The API's error messages are in Portuguese and the pages in English, as noted in PBI-55.
- The race fix was **not** re-run through the full stack: the machine had about 7 GB of disk left, so only the integration test (on a throwaway PostgreSQL) proves it.
