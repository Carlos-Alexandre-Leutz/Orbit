# Orbit
Orbit is a conversational commerce agent: customers and sellers run a store through chat, with governed agent workflows, a full audit trail, RAG and scikit-learn forecasting. It is a portfolio project: the data is simulated and payments are in test mode. See [`docs/01-requirements.md`](docs/01-requirements.md) for what it must do.

## Status

Early foundation. The repository currently holds the planning docs and the base code
imported from a SaaS template. No Orbit-specific feature is implemented yet.
See [`docs/00-backlog.md`](docs/00-backlog.md) for the plan.

## Base from the SaaS template

The monorepo base comes from
[`production-saas-template`](https://github.com/Carlos-Alexandre-Leutz/production-saas-template)
(copied from its `main` branch, commit `71e18f8`). It provides:

- `apps/web`: Next.js (App Router), Tailwind CSS, login, register, password reset and a dashboard shell.
- `apps/bff`: NestJS backend-for-frontend with Swagger at `/docs`.
- `apps/api-tasks`: NestJS core API with Prisma, PostgreSQL, register, login and password recovery by e-mail (no token-based session yet).
- Docker Compose files, and a deploy workflow that is disabled until the deployment PBIs.

What came from the template and what was added is tracked in
[`docs/template-origin.md`](docs/template-origin.md).

## Local development

```bash
cp .env.example .env
docker compose up -d --build --wait
```

This starts PostgreSQL with pgvector, MongoDB, a placeholder ML service, the store API, the BFF and the web app (<http://localhost:3000>). Ports, reset, hot reload and troubleshooting are in [`docs/setup.md`](docs/setup.md).
