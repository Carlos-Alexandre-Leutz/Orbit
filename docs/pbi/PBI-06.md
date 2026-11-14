# PBI-06: Users, roles and authentication

Issue: #33. Tasks: #34, #35, #36 and #280. Pull request: `pbi/06-users-roles-auth` → `staging`.

## Goal

Real accounts with roles and real sessions: registration, login that returns a signed token, routes that can require a role, and temporary visitor accounts for demo mode.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #34 Users and roles | #277 | `Role` enum (customer, seller, admin) and `role`, `isAnonymous`, `expiresAt` on `User`; register and login return a signed token; validated input; no password hash or reset field in any response; `JWT_SECRET` required; BFF keeps the API's status codes; `set-role` script. |
| #35 Role guards | #278 | `@Auth(...roles)` (token check plus role check); `GET /auth/me`; admin-only `GET /users` and `PATCH /users/:id/role`; the BFF forwards the session. |
| #36 Anonymous users | #279 | `POST /auth/anonymous`: a temporary customer that expires, cannot use a password, and whose token lasts as long as the account. |
| #280 Build fix | #281 | The API build output is flat again (`dist/main.js`), with a test. Added during validation, see below. |

All task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-14 on the full Compose stack, started from a fresh clone of the PBI branch (an isolated project, other ports and container name, removed afterwards), calling the **BFF** on port 3001.

| AC | Result | Evidence |
|---|---|---|
| AC1 Registration | **Pass** | Register answered 201 with role `CUSTOMER`; the same e-mail again answered **409** through the BFF (before: 500); a body with `"role":"ADMIN"` created a customer; a 5-character password answered 400; the response contains no password or reset field (0 matches). |
| AC2 Login | **Pass** | Right password: token. Wrong password and unknown e-mail: the same 401 and the same message. Unit tests decode the token: it holds the user id, the role and an expiry of the configured length. |
| AC3 Role guards | **Pass** | Through the stack: `me` without a token 401, as a customer 200; a customer calling `/users` 403. In the API tests, with real tokens: 401 for no header, a malformed token, another secret, an expired token, an unknown role and a non-Bearer header; and the 200 or 403 table for each of the three roles on three routes. |
| AC4 Role changes | **Pass** | `set-role` made the first admin (it also reports an unknown user). The admin listed users, made another user a seller (200), got 400 for an invalid role, 404 for an unknown user and 403 changing their own role. |
| AC5 Anonymous visitor | **Pass** | `POST /auth/anonymous` returned a customer with `isAnonymous` true and an expiry 24 hours away; its token worked for `me` (200), was refused on the admin route (403), and its address could not log in with any password (401). Expiry is covered by unit tests (token lifetime equals the account, an expired account is refused, the cleanup deletes only expired anonymous accounts); **waiting 24 hours was not done**. |
| AC6 Secret | **Pass, in the tests** | Without `JWT_SECRET` the API refuses to start naming it; in production it also refuses `change-me` and anything under 32 characters (unit tests). `.env.example` and both Compose files carry it, and a test keeps them in step. The production refusal was **not run in a container**: my first attempt used a wrong path, and the second check was not repeated. |
| AC7 Full stack and doc | **Pass** | This document. |

Tests on the PBI branch: `turbo run lint test build` 8 tasks passed; API 40 jest tests (5 before); BFF 10 (5 before); `pnpm test:scripts` 80 passed (79 before); `pnpm test:commitlint` 7 passed; `import_backlog.py --verify` 246 items, 0 problems.

## Bugs found while doing this

- **The inherited login returned no session at all**, and register and login returned the whole user record (including the reset token). Both fixed.
- **The BFF turned every register error into a 500**, hiding the 409 for a duplicate e-mail. It now keeps the status codes.
- **"Forgot password" revealed which e-mails exist** (404 for an unknown one). It now gives the same answer either way.
- **`@nestjs/jwt` 12 is ES-module only** and does not load in the Nest build or in jest; pinned to 11.
- **My own bug, found only by the full-stack run:** adding `scripts/set-role.ts` made the compiler write `dist/src/main.js` instead of `dist/main.js`. `pnpm start` still worked (that is why the stack came up healthy), but `start:prod` would have failed in production. Fixed and guarded by a test (#280).
- **My build filled the disk** (0 MB free) during validation. I removed only what I had created (my Compose project, my clone and old build cache); the disk is back to about 22 GB free. Nothing of the owner's was removed. The build cache of Docker on this machine is large (about 28 GB) and is the owner's to prune.

## Decisions and limits

- Sessions are stateless tokens (1 hour by default). There is no refresh token and no logout that revokes a token; a role change applies to the next login.
- The role is in the token, so the guard does not read the database on each request. `me` does, and refuses expired anonymous accounts.
- The type-safety lint rules stay warnings for the BFF and the API (see PBI-05); the new code is typed, the remaining warnings are in the older reset-password code and in tests.
- **Open risks, for the security PBI:** `POST /auth/anonymous` is public and creates a row per call; there is no request limit on login or registration; reset tokens are stored in plain text and do not expire on use of a wrong token; the API still has `enableCors()` open and its port is published (the owner is changing CORS).
- The web pages do not store or send the token yet; that is the web interface PBI. The demo users of `seed/store.json` are not loaded: they have no passwords, which a later seed step has to decide.
