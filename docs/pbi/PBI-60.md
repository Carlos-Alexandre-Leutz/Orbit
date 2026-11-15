# PBI-60: Storefront at the store link

Issue: #333. Tasks: #334, #335, #336, #337. Pull request: `pbi/60-storefront` → `staging`. Builds on [PBI-59](PBI-59.md) and [ADR-005](../adr/ADR-005-stores-and-storefronts.md).

## Goal

Make the link a seller chose work for the buyer: `/<slug>` shows the store and its products, and the buyer logs in, fills a cart and buys inside that store, all under the same link.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #334 Store page and product pages | #354 | Public `GET /stores` and `GET /stores/:slug` (never the owner). `/<slug>` shows the name, description and the store's products with search, category, sort, stock filter and paging; `/<slug>/products/<id>` is the product page; the home page lists the stores. `seller` and `dashboard` became reserved links. |
| #335 Cart, checkout, orders under the link | #355 | `/<slug>/cart`, `/checkout`, `/orders`, `/orders/<id>`. An order carries its store and `GET /orders?store=<link>` lists one store's orders. The proxy gates only the pages that need a session. The menu follows the role and the store. Old `/catalog`, `/cart`, `/checkout`, `/orders` addresses redirect. The site is no longer pinned to the demo store. |
| #336 Missing and empty store pages | #354, #356 | A clear "not found" page for a link with no store and for a product that is not in the store; an empty store shows its name and "This store has no products yet." |
| #337 Menu by role | #355, #356 | Visitor: Stores and the store; customer in a store: its cart with the count and Orders; seller: Stores, "My store" and "Manage products", no cart; admin: "Manage products". |
| Fix found in the browser | #356 | See "Bugs found". |

The tasks #336 and #337 had no code of their own to add after #354 and #355, which already built them; they were checked in the browser and closed with the evidence below. All task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-15 on the full Compose stack from a fresh clone inside the repository folder (published ports 13000 to 13002, its own database; the owner's stack was not touched), rebuilt once after the fix of #356. The pages were driven in the built-in browser; the clone, containers, volumes and images were removed afterwards. A seller `loja-do-jao` ("Loja do Jão") with two products, an empty store `loja-vazia` and the demo store with 24 products were used.

| AC | Result | Evidence |
|---|---|---|
| AC1 Store page | **Pass** | The home page listed the three stores. `/loja-do-jao` showed only its 2 products; the search "caneca" found 1; the product page opened at `/loja-do-jao/products/<id>`. The rule that a product of another store is "not found" under this link is in the page code and was not exercised in the browser; the API side is covered by the PBI-59 isolation tests. |
| AC2 Buying under the link | **Pass** | As a visitor, "Sign in to buy" went to the login page with the product as `next`, and after signing in the browser came back to that product. Add 2 → the menu showed "Cart (2)" and "View cart" led to `/loja-do-jao/cart` ("Your cart at Loja do Jão", $50.00) → Checkout → "Place order" → `/loja-do-jao/orders/<id>` → "Pay now" with the test card → "Paid". `/loja-do-jao/orders` listed that order; `/demo-store/orders` said "no orders yet"; that order under `/demo-store/...` was "not found"; the old `/orders/<id>` redirected to the order under its store. With no session, the cart, checkout, orders and an order page each answered 307 to `/login?next=<the page>`. |
| AC3 Missing and empty stores | **Pass** | `/loja-inexistente` answered 404 with "Page not found ... pick a store from the list"; `/loja-vazia` showed its name and "This store has no products yet." |
| AC4 Menu by role | **Pass** | Visitor: Stores, the store, Sign in. Customer: Stores, the store, "Cart (2)", Orders. Seller: Stores, the store, "Manage products", and "My store" while looking at another store; no cart; the seller opening `/loja-do-jao/cart` got "not found". Old `/catalog` and `/cart` redirected to the home page (307). |
| AC5 Demo store and a seller's store | **Pass** | `/demo-store` worked with the 24 demo products; the store created through the API at sign-up was reachable at its own link with the products its seller created. |

Tests on the PBI branch: API 254 unit and 87 integration tests (PostgreSQL 16), BFF 26, web 65, `pnpm test:scripts` 86; `import_backlog.py --verify` 276 items, 0 problems; every task PR had all six checks green.

## Bugs found while doing this

- **The menu kept the previous store after a click.** The header lived in the root layout, which a client-side navigation keeps, so the login page showed the link of the store just left. The header now comes from `app/[store]/layout.tsx` (made again when the store changes) and `app/(site)/layout.tsx`. Found in the browser; checked again after the rebuild (store → home → another store → sign in showed the right menu each time).
- **The product page's tab title was the generic site name.** It now has its own title.
- A mistaken check of mine: the first click on a product link in the automation did not navigate; I opened the address directly. Not a site bug.
- A process slip: `gh pr create` failed with the "Projects classic" GraphQL error this repository has (AGENTS.md), so the pull request was created through the REST API.

## Decisions and limits

- **A store link may collide with a site page only if the API lets it:** the API's reserved words include every top-level page (`login`, `register`, `cart`, `seller`, `dashboard`, ...), and `lib/routes.ts` in the web app lists the same pages. A new top-level page must be added to both lists.
- **The cart and orders pages are for customers only**; a seller or admin who opens one gets "not found". An admin has no way to see a store's orders in the pages yet; the seller's order list is PBI-61.
- **Categories are still global**, so the category filter on a store page offers categories the store may not use.
- **The home page lists every store** (up to 100, by name) with no search or paging. Fine for a demo.
- **The order page of a seller or admin** is allowed by the API, but there is no link to it from the pages yet (PBI-61).
- **The seller's own store link, "My store", is shown on every page of a seller**, taken from `GET /auth/me`.
- **The disk** went from 35 GB to 29 GB free after the verification builds (Docker's build cache). Nothing else of it is left.
- **Stripe was never contacted**; payments ran on the fake provider, as before.
