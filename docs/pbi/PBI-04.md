# PBI-04: Complete local environment

Issue: #21. Tasks: #22, #23, #24, #25. Pull request: `pbi/04-local-environment` → `staging`.

## Goal

Make the whole local stack start with one command, with the backing services Orbit will need (PostgreSQL with pgvector, MongoDB, a place for the ML service), validated configuration, a fictional store dataset and a guide that was actually followed.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #22 Compose | #255 | `docker-compose.infra.yml` (PostgreSQL with pgvector, MongoDB 7, ML placeholder) included by both Compose files; `services/ml` (FastAPI with `/health`); real health checks; the API applies Prisma migrations on start; old package filters fixed. |
| #23 Configuration | #256 | The API and the BFF stop at startup naming the missing variable; `.env.example` lists every variable; Compose refuses to start without the database credentials. |
| #24 Seed data | #257 | `seed/store.json` (fictional store: 6 categories, 24 products with stock, 5 demo users) and `scripts/seed_data.py --check`. |
| #25 Setup docs | #258 | `docs/setup.md` and a corrected README. |

All four task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-14, after all tasks were merged. The content of `pbi/04-local-environment` is identical (same Git tree) to the branch that was followed on a fresh clone, except for one later documentation-only commit that only changed a troubleshooting row of `docs/setup.md`.

| AC | Result | Evidence |
|---|---|---|
| AC1 One command | **Pass** | On a fresh clone from GitHub: `cp .env.example .env` and `docker compose up -d --build --wait` built the images and started 6 services, all healthy, in about 2 minutes. The web answered 200 after its redirect to `/login`, the BFF served `/docs`, the API answered 200. The 4 Prisma migrations applied, and a user registered through the BFF was created. |
| AC2 pgvector | **Pass** | `vector` 0.8.7 is installed on a fresh volume. A `vector(3)` column was created and a nearest-neighbour query returned the two closest rows in the right order. |
| AC3 ML placeholder | **Pass** | `services/ml` has only `/health`, runs as a non-root user and has 2 tests. It answers from inside the Compose network and is not reachable from the host (a test also asserts it has no published port). |
| AC4 Configuration | **Pass** | `docker compose config` without `MONGO_PASSWORD` fails with `required variable MONGO_PASSWORD is missing a value`. The built BFF and API, started with an empty environment, exit with `Missing required environment variables: TASKS_API_URL` and `... DATABASE_URL`. A test keeps `.env.example` equal to the variables read by the apps, the Prisma schema and the Compose files. |
| AC5 Seed data | **Pass, partly deferred** | `seed_data.py --check`: 6 categories, 24 products, 5 users, 0 problems; a deliberately broken copy exits 1. The data is **not loaded** into the database: there is no product table or role column yet (PBI-06 and PBI-07). `seed/README.md` says so. |
| AC6 Setup docs | **Pass** | Every command in the guide was run on the fresh clone, in order, including the ML and vector checks, the missing-variable error and `docker compose down -v` (volumes removed). |
| AC7 Verified | **Pass** | This document. |

Tests on the PBI branch: `pnpm test:scripts` 70 passed (up from 43); `pnpm test:commitlint` 7 passed; `services/ml` pytest 2 passed; jest 5 passed in each of `@orbit/api-tasks` and `@orbit/bff`; `turbo run build` succeeded for the 3 apps; `import_backlog.py --verify` 235 items, 0 problems.

## Bugs found while validating

Most of these only showed up by running the stack, which had never been done since the template was imported.

- The Compose files and `Dockerfile.dev` still used the old package names (`--filter api-tasks`, `bff`, `web`), and the API has no `dev` script. The stack could not have started as written.
- `NEXT_PUBLIC_BFF_URL` is baked into the web bundle at build time, so setting it only at runtime did nothing. It is now a build argument and part of the turbo cache key.
- The new health checks first used `localhost`, which resolves to IPv6 inside the container while the API listens on IPv4: the API looked unhealthy. They now use `127.0.0.1`.
- CI failed on the first Compose tests: they read the local `.env`, which does not exist on a runner. They now render the files from a copy of `.env.example`, and the suite was run without `.env` to prove it.
- An error message with `: ` inside an unquoted YAML value broke the Compose file; found by the tests.
- A first version of the startup validation also required the `MAIL_*` variables, which made the API refuse to start with the owner's local `.env` (blank mail credentials) for an e-mail feature Orbit does not use yet. Narrowed to `DATABASE_URL`.
- The README described Orbit as a planning agent with a calendar and listed "JWT auth" for the API; neither is true. Corrected, in line with the rule that nothing unimplemented is listed.
- `.env.example` and the Compose files had no MongoDB variables, no ports and no way to know which variables are required.
- Environment, not product: my first verification folder was outside what the Docker daemon can see, so a bind mount came up empty. Redone inside the repository folder (ignored by Git). A few of my commands ran by mistake, with a wrong path, against the owner's own running database container; they only tried to create a table in a database without pgvector, failed and changed nothing.

## Decisions and limits

- The backing services live in one included file so the full-stack and development files cannot drift apart.
- The databases are published on `127.0.0.1` only (a change from all interfaces); the ML service is not published.
- The two NestJS services each carry a copy of ten lines of validation instead of a shared package.
- Switching an existing volume from the Alpine-based `postgres:16-alpine` to the Debian-based pgvector image worked in a test (the extension was created and rows were readable), but sort order can differ in theory between the two C libraries. For development data the guide recommends recreating the volume.
- Not verified: `docker-compose.dev.yml` was only validated with `docker compose config`, not started. The web app has no startup validation. The ML tests are not in CI yet (the Python workflow is PBI-05). The container name `orbit-postgres-db` is fixed, so two copies of the repository cannot run side by side without editing it; the verification runs edited that line.
- CORS was not touched; the owner will change it.
