# Orbit
AI-powered planning agent that manages your calendar, prioritizes tasks and automates follow-ups using LLM tool calling.

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
- `apps/api-tasks`: NestJS core API with Prisma, PostgreSQL, JWT auth and password recovery by e-mail.
- Docker Compose files for local development, and a deploy workflow.

What came from the template and what was added is tracked in
[`docs/template-origin.md`](docs/template-origin.md).

## Local development

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up --build
```

Web runs on `:3000`, BFF on `:3001`, API on `:3002`, PostgreSQL on `:5432`.
