# PBI-07: Product catalog

Issue: #37. Tasks: #38, #39, #40, #41. Pull request: `pbi/07-product-catalog` → `staging`.

## Goal

A catalog of products and categories that anyone can read and search and that only a seller or an admin can change, stored in PostgreSQL and tested against a real database.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #38 Model | #283 | `Category` and `Product` tables (price in cents, stock, `active` flag), a migration with check constraints, and `seed:catalog`, an idempotent loader for `seed/store.json`. |
| #39 CRUD | #284 | Products and categories endpoints in the store API, validated, with the role guards of PBI-06; the same routes in the BFF, described in its OpenAPI document. |
| #40 Search | #285 | `q`, `category`, `inStock`, `sort`, `page` and `pageSize` on `GET /products`. |
| #41 Tests | #286 | Integration tests against a real PostgreSQL, run in CI; they found and fixed a search bug. |

All task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-14 on the full Compose stack, from a fresh clone of the PBI branch (isolated project, removed afterwards), through the BFF on port 3001. The catalog was loaded with `seed:catalog` from the host.

| AC | Result | Evidence |
|---|---|---|
| AC1 Storage | **Pass** | The migrations applied on a fresh volume when the stack started; the catalog was empty before the seed. On a separate throwaway database a stock of -1 was rejected by the database and a category with products could not be deleted. |
| AC2 Who may do what | **Pass** | Reading products and categories without a session works. `POST /products` with no session: 401; as a customer: 403; as a seller: 201. |
| AC3 Validation and OpenAPI | **Pass** | A duplicate SKU: 409; a negative price: 400; an unknown category: 400; a malformed id: 400. The BFF's `/docs-json` lists `/products`, `/products/{id}` and `/categories`, with bearer security on the write operations. |
| AC4 Search | **Pass** | `q=cast skillet` found only "Cast iron skillet"; `category=kitchen&inStock=true&sort=price_desc` returned the three dearest kitchen items in order; page 3 of 10 returned 4 of 24; a page size of 101 and an unknown sort: 400; a search for `%` returned 0 products. |
| AC5 Seed | **Pass** | `seed:catalog` loaded 6 categories and 24 products; running it twice left 24. |
| AC6 Real database tests | **Pass** | 19 integration tests run in CI on a PostgreSQL service and passed on the final commit. Removing a product through the BFF answered 204, the product then answered 404, and the database row stayed with `active = f`. |
| AC7 Full stack and doc | **Pass** | This document. |

Tests on the PBI branch: `turbo run lint test build` 8 tasks passed; API 85 unit tests and 19 integration tests (5 unit tests before PBI-06); BFF 14; `pnpm test:scripts` 81 passed; `pnpm test:commitlint` 7 passed; `import_backlog.py --verify` 246 items, 0 problems.

## Bugs found while doing this

- **The search treated `%` and `_` as wildcards.** A search for `100%` also found "100 plain towel", because those characters are wildcards in a LIKE pattern and Prisma passes the text through. Found by the integration tests, not by the unit tests; now escaped, with tests at both levels.
- **My first lint run of the integration tests failed in CI** (untyped test code) because I started the pull request before the last local check had finished. Fixed in a second commit; the merged state has all checks green. Lesson kept: wait for the local lint before pushing.
- Two of my own test assumptions were wrong: SKUs must be upper case (the validation rejected my lower-case ones) and the order of names belongs to the database collation, not to JavaScript's sort. The test now asks the database for the expected order.
- `@nestjs/mapped-types` 12 is ES-module only, like `@nestjs/jwt` 12; pinned to 2.x.
- During validation the seed command was first run inside the clone, which has no installed packages, so it failed and the next calls returned empty results; it was re-run from the main checkout. This was the test setup, not the product.

## Decisions and limits

- Prices are integers in cents in one currency (the seed says USD); there is no currency column.
- Any seller can change any product: there is no per-seller ownership, because there is one store.
- The search is a plain case-insensitive `LIKE` over the name, description and SKU, with every word required. There is no ranking, typo tolerance or full-text index; fine for a few thousand products. Name sorting follows the database collation.
- Stock is a number on the product. Reserving stock for a cart or an order is not done here (carts and orders are PBI-08 and PBI-09, and they must decrement stock safely).
- The seed has to be run by hand (`seed:catalog`), from a checkout that has the packages installed; the Docker image does not carry `seed/`. Nothing loads it automatically at start.
- The demo users of the seed are still not loaded: they have no passwords.
