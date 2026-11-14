# PBI-55: Web session and catalog pages

Issue: #289. Tasks: #290, #291, #56, #292, #293. Pull request: `pbi/55-web-session-catalog` → `staging`.

## Goal

Give the back end that already exists (sessions and roles, catalog) a front end: log in and out, a menu that follows the role, the catalog pages, and the pages where a seller manages products. This PBI was created when the web interface was spread over the PBIs that feed it (it used to be one PBI at the end).

## What was delivered

| Task | PR | Result |
|---|---|---|
| #290 Session | #297 | The token lives in an httpOnly cookie set by the web server; login, register and logout routes; a Next 16 `proxy.ts` that sends visitors from protected pages to `/login?next=...`; a server-side BFF client; `/api/bff/...` forwarding with an allowlist. |
| #291 Layout and menu | #298 | A shared header with a role-aware menu, the user's name and role, and "Sign out". |
| #56 Banner | #299 | A banner on every page: simulated store, test payments. |
| #292 Catalog pages | #300 | `/catalog` with search, category, in-stock, sort and paging through the URL; `/catalog/[id]`. |
| #293 Seller pages | #301 | `/seller/products` (list, search, paging), `/seller/products/new` and `/seller/products/[id]/edit` (with removal). |

All task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-14 in a real browser (the built-in browser of the desktop app) against the full Compose stack, started from a fresh clone of the PBI branch with other published ports (13000 to 13002) because the owner's own stack was already running on 3000 to 3002. The stack and the clone were removed afterwards; the owner's stack was not touched.

| AC | Result | Evidence |
|---|---|---|
| AC1 Session and cookie | **Pass** | Opening `/seller/products` with no session went to `/login?next=%2Fseller%2Fproducts`; registering brought the browser back to that address. `document.cookie` was empty, `localStorage` and `sessionStorage` had no keys, and the login response sets `orbit_session` with `HttpOnly; SameSite=lax; Max-Age=3599`. `Secure` is only set when `APP_URL` is https, so it was not seen here. |
| AC2 Register, login, logout | **Pass** | Mismatched passwords showed "The passwords do not match." in the page; registering logged the user in; "Sign out" went to the login page and the header changed back to "Sign in"; a wrong password showed an error message in the page (see the language note below); the right one landed on the catalog. |
| AC3 Role-aware menu and refusal | **Pass** | A new customer saw only "Catalog" and got a 404 page on `/seller/products`. After the account was made a seller and logged in again, the menu gained "Manage products" and the page opened. `/api/bff/users` answered 404 (not on the allowlist); a product write with no cookie answered 401. |
| AC4 Catalog | **Pass** | `q=iron` found only the skillet; `category=kitchen&inStock=true&sort=price_asc` listed four kitchen products in price order; `page=2` showed the second page of 12; `q=100%` found nothing; a removed product's page showed "Product not found". The filters live in the address, so a link can be shared. |
| AC5 Seller can manage | **Pass** | Creating `KIT-901` with the price typed as `4,90` worked (listed, 490 cents in the database); an invalid price showed a message and a duplicate SKU showed "Já existe um produto com este SKU"; editing the stock to 7 saved; removing it (the confirmation was auto-accepted by a script) left the row with `active = false` in the database and a "not found" page for visitors. |
| AC6 Banner | **Pass** | Visible on the login, register, catalog and seller pages. |
| AC7 Verified | **Pass** | This document. |

Tests on the PBI branch: `turbo run lint test build` 9 tasks passed; web unit tests 47 (none before this PBI); API 85 and BFF 14 unchanged; `pnpm test:scripts` 81 passed; `import_backlog.py --verify` 253 items, 0 problems.

## Bugs and surprises while doing this

- `middleware` is called `proxy` in this Next version, `cookies()` is async and route params are promises; the code was written after reading the docs in `node_modules`, as `apps/web/AGENTS.md` asks.
- The existing pages called the BFF straight from the browser and ignored the token; they were rewritten to go through the web server.
- **The environment drift test did not look at the web `lib` folder**, so a new variable (`BFF_URL`) there was invisible to it. The test now reads `apps/web/lib` and `proxy.ts` too.
- The first build failed on `exactOptionalPropertyTypes` (passing `undefined` to optional fields); fixed with `undefined`-tolerant types.
- **The owner's stack was already using ports 3000 to 3002**, so my first start of the validation stack failed on port 3002 with nothing changed; I moved the ports of my own copy instead of stopping the owner's containers.

## Decisions and limits

- The browser only talks to its own site, which adds the token and forwards to the BFF. So the web app does **not** depend on the BFF's CORS settings (the owner is changing them).
- A customer who opens a seller page gets "404", as if it did not exist, because this Next version needs an experimental flag for a real 403 page. The API still returns a real 403 on writes.
- **Error messages from the API are in Portuguese** ("Credenciais inválidas", "Já existe um produto com este SKU") while the pages are in English. Translating them (or sending error codes) is not done.
- The login page keeps "Forgot password"; the reset flow was not reworked and still calls the BFF from the browser.
- A role change only applies at the next login (the role is inside the token).
- There are no product images and no "add to cart" yet (PBI-08).
- Disk: this validation (a full Docker build) pushed the free space on the machine down to about 10 GB; Docker's build cache is large and is the owner's to prune.
