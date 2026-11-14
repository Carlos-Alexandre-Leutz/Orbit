# PBI-02: Base from the SaaS template

Issue: #10. Tasks: #11, #12, #13, #14. Pull request: #234 (`pbi/02-saas-template` → `staging`).

## Goal

Start Orbit from the monorepo base of the owner's `production-saas-template`, so later PBIs build on working auth, a BFF, a core API and a database instead of starting from zero.

## What was delivered

| Task | Result |
|---|---|
| #11 Copy the template and record its origin | Template files copied from `main` (commit `71e18f8`) without its history. Origin recorded in `README.md`. |
| #12 Run the template locally and fix what breaks | Database settings moved from hardcoded Compose values to `.env`. BFF unit tests fixed with a `ts-jest` setup. |
| #13 Rename packages and variables, remove unused parts | Packages are `@orbit/web`, `@orbit/bff`, `@orbit/api-tasks`. Removed `apps/bff/prisma.config.ts`, the `@prisma/config` dependency and three stray npm lockfiles. |
| #14 Write `docs/template-origin.md` | Done: what came from the template, what changed, what was verified, known gaps. |

## How it was verified

Node 20, pnpm 9.15.4, PostgreSQL 16 from the Compose file.

- `prisma migrate deploy` applies the 4 migrations.
- `turbo run build` passes for the three apps; `turbo prune` works with the new package names.
- Unit tests pass in `@orbit/bff` and `@orbit/api-tasks`.
- Register and login through the BFF return 201, and 401 for a wrong password.

Not verified: Docker image build, a full `docker compose up`, the web UI in a browser, the password reset e-mail, the deploy workflow.

## Decisions and deviations

- The tasks were committed directly on `pbi/02-saas-template`, without one `task/*` branch and PR each. Each task is still one commit (or part of one) in this branch.
- The template's CORS fallback now points to `http://localhost:3000`, not to the template's staging URL.
- The template's deploy workflow was left untouched. It runs on every push to `main` and `staging` and needs Render secrets this repository does not have, so it will fail until it is rewritten or disabled.

## Known gaps left for later PBIs

No JWT (login returns the user), password reset fields in auth responses, duplicate e-mail returns 500 through the BFF, Portuguese messages in code, and unpinned dependencies. Details in [`template-origin.md`](../template-origin.md).
