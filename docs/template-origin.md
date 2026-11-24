# Template origin

Orbit's monorepo base was copied from
[`production-saas-template`](https://github.com/Carlos-Alexandre-Leutz/production-saas-template),
branch `main`, commit `71e18f8`. The template's git history was not imported.

## What came from the template

| Area | Content |
|---|---|
| `apps/web` | Next.js 16 (App Router), React 19, Tailwind. Pages: home, login, register, forgot/reset password, dashboard shell. |
| `apps/bff` | NestJS 11 on Fastify. Proxies auth calls to the core API. Swagger at `/docs`. |
| `apps/api-tasks` | NestJS 11, Prisma 6, PostgreSQL. Register, login, forgot/reset password, Mailtrap SMTP. 4 migrations. |
| Root | pnpm workspace, Turborepo, `Dockerfile`, `Dockerfile.dev`, two Compose files, `.github` PR template and a deploy workflow. |

## What was changed for Orbit

- Packages renamed to `@orbit/web`, `@orbit/bff` and `@orbit/api-tasks`; root package is `orbit`.
- Database container, user and database renamed to `orbit`. Credentials are no longer hardcoded in the Compose files: they come from `.env` (see `.env.example`).
- BFF: Swagger title and description updated; CORS fallback origin is now `http://localhost:3000` instead of the template's staging URL.
- Removed `apps/bff/prisma.config.ts` and the `@prisma/config` dependency: the BFF does not use Prisma, and the file held an old connection string.
- Removed three stray `package-lock.json` files. The repo uses pnpm only.
- Added `ts-jest` configuration to the BFF so its unit test runs. It did not run in the template.
- Replaced the template README with the Orbit one.

## Verified locally

Node 20, pnpm 9.15.4, PostgreSQL 16 from the Compose file.

- `prisma migrate deploy` applies the 4 migrations.
- `turbo run build` builds web, BFF and API.
- Unit tests pass in `@orbit/bff` and `@orbit/api-tasks`.
- With API and BFF running, register and login through the BFF return 201 and the user; a wrong password returns 401.
- `turbo prune` with the new package names works.

Not verified: the Docker image build and the full `docker compose up`, the web UI in a browser, the password reset e-mail, and the deploy workflow.

## Known gaps in the template (not fixed yet)

- **No JWT.** The template README claimed JWT auth; the API has no JWT code. Login returns the user object and no token.
- **Sensitive fields in responses.** Register and login return `passwordResetToken` and `passwordResetExpires`.
- **Duplicate e-mail returns 500** through the BFF (the API answers 409, the BFF's register handler turns every error into 500).
- **Deploy workflow** (`.github/workflows/deploy.yml`) came from the template with Render hooks and secrets this repo does not have. Its push trigger was replaced by a manual `workflow_dispatch` until the real deployment exists (PBI-43).
- Error messages and log lines are in Portuguese, and the PR template mentions Azure and Sonar.
- Dependencies are not pinned to the latest: Prisma 6 (current major is newer) and `turbo` is `latest`.

These are for later PBIs, when auth and the API are reworked for Orbit.
