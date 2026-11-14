# ADR-001: Technology stack

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

Orbit needs a web app with chat, a store API with orders and payments, an agent layer, retrieval over the store's documents, an audit trail and machine learning (see [requirements](../01-requirements.md)). It is built by one owner with AI sessions, shown as a portfolio project and deployed on a single VPS.

Two constraints shape the stack: the owner already has a working base in TypeScript (`production-saas-template`, see [template origin](../template-origin.md)), and the project should run on one modest server, so every extra service has a cost.

## Decision

TypeScript for the web, BFF and store API; Python only for machine learning (see [ADR-002](ADR-002-ml-separate-python-service.md)). The table separates what is in the repository today from what is planned or still open.

| Area | Choice | State |
|---|---|---|
| Monorepo | pnpm 9 workspace with Turborepo | In the repository |
| Web | Next.js 16, React 19, Tailwind 4 (`apps/web`) | In the repository |
| BFF | NestJS 11 on Fastify (`apps/bff`) | In the repository |
| Store API | NestJS 11, Prisma 6, PostgreSQL 16 (`apps/api-tasks`) | In the repository |
| CI | GitHub Actions: commit and script checks | In the repository; build and test workflows in PBI-05 |
| Vector search | pgvector inside the same PostgreSQL | Planned: PBI-04, PBI-23 (the Compose image is plain `postgres:16-alpine` today) |
| Conversations and traces | MongoDB | Planned: PBI-04, PBI-12, PBI-21 |
| Model provider | Gemini behind an `LlmProvider` port | Planned: PBI-17 |
| Payments | Stripe in test mode | Planned: PBI-09 |
| Cart cache and idempotency keys | Redis | Cuttable: PBI-08 |
| LLM observability | OpenTelemetry and/or Langfuse | Open: PBI-39 |
| Reverse proxy and HTTPS | Caddy or Nginx | Open: PBI-42 |
| Deployment | Docker Compose on one VPS, deployed from GitHub Actions | Planned: PBI-42, PBI-43 |

The agent code depends on ports (for example `LlmProvider`, `DataSourceConnector`), not on a vendor, so a provider can be replaced without touching the agent logic.

## Alternatives considered

- **Python for the whole backend (FastAPI).** One language for agents and ML. Not chosen because the working base is already NestJS and Next.js, and the store API, auth and web code would have to be rewritten.
- **A single Next.js full-stack app.** Fewer moving parts. Not chosen because the BFF and store API boundary keeps the agent tools, roles and audit in a service that is separate from the UI.
- **A dedicated vector database (Qdrant, Pinecone).** Better at scale. Not chosen because the document volume is small and pgvector keeps vectors transactionally next to the catalog data, with one less service on the VPS.
- **Everything in PostgreSQL, no MongoDB.** One database to run. Not chosen yet for conversations and traces, which are flexible documents; this can be revisited if the second database proves not worth its cost.
- **Kubernetes or several servers.** Not chosen: Compose on one VPS is enough for a demo and keeps the operating cost low.

## Consequences

- Two languages (TypeScript and Python) mean two toolchains in CI and in the images.
- Several stateful services (PostgreSQL, MongoDB, maybe Redis) on one small VPS need a resource check (PBI-42) and backups (PBI-44).
- The inherited base has gaps to close before it can carry real use: `login` returns the user and no token (`jsonwebtoken` is installed in the BFF but unused), `register` and `login` return the whole user record except the password, including the password-reset fields, the BFF turns every `register` error into a 500 (so a duplicate e-mail, a 409 in the core API, reaches the client as a server error), some messages are in Portuguese, and dependencies are not pinned (`turbo` is `latest`). They are handled in the auth and platform PBIs, not hidden here.
- Choices marked planned or open are not decisions yet; each is settled in its own PBI and recorded in a new ADR if it changes this table.
