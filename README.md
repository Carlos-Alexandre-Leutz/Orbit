# Orbit

> **Try it live and log in here: https://carlos-alexandre-leutz.github.io/Orbit/**
> The QA services sleep when idle, so the first visit can take about a minute while the page wakes them up and sends you to the login. See [Try it](#try-it-qa-login-and-test-card) for what to use there.

Orbit is a conversational commerce agent: customers and sellers run a store through chat, with governed agent workflows, a full audit trail, RAG and scikit-learn forecasting. It is a portfolio project: the data is simulated and payments are in test mode. See [`docs/01-requirements.md`](docs/01-requirements.md) for what it must do.

## What it does today

The store platform is running in the QA environment. The conversational agent is not built yet (see the next section).

- **Accounts.** One Orbit account works in every store. Sellers sign up at `/sell`; customers sign up and log in inside a store (`/<store>/register`, `/<store>/login`). Roles (customer, seller, admin), signed sessions, password recovery by e-mail, and `/account` with the customer's orders across stores.
- **Storefronts.** Each store lives at its own link, `/<store>`, with search, categories, product pages with photo galleries, a cart and checkout. Orbit does not list stores: you reach a store only through its link.
- **Seller panel (`/panel`).** Summary and checklist, products and stock (with low-stock and sold-out warnings), orders (ship and deliver), customers, and store settings: logo, cover, color, slogan and contact.
- **Orders and payments in test mode.** Order state machine, idempotent payments behind a port, cancellation with refund, confirmation e-mail. Each seller receives payments with their own provider (Stripe or Mercado Pago, keys pasted in the panel and stored encrypted).
- **Delivery.** Shipping address, tracking code, an estimated arrival window computed in business days from the store's handling and delivery days (optionally per destination state), and a link to the seller's invoice. There is no ZIP-code quote and no carrier integration.
- **Seller plan.** A monthly plan (R$ 15, 30 days free) charged by Orbit's own Mercado Pago account, with the card typed into Orbit's form. A store opens to the public only with an active plan.
- **Owner area.** A hidden admin area that registers each store's plan by hand and records every action in an audit table. It never shows payment keys.
- **Terms and privacy.** `/terms` and `/privacy` are templates that still need a lawyer's review.

Limits you should know about: the Stripe and Mercado Pago adapters have never run against a real provider account, and the screens have not been checked at every screen width. Details and evidence are in [`docs/project-state.md`](docs/project-state.md) and [`docs/pbi/`](docs/pbi).

## What it will do

Not implemented yet; this is the plan, tracked in [`docs/00-backlog.md`](docs/00-backlog.md):

- **Chat with the store.** Customers and sellers operate the store by conversation: search, cart, orders and store management through an agent.
- **Governed agent tools.** Everything an agent can do is a validated tool with per-role permissions and idempotency; tools with side effects need human approval. External content (products, reviews, documents) is treated as data, never as instructions.
- **Full audit trail** of what the agents did and why.
- **RAG** over store documents and policies.
- **Forecasting with scikit-learn** (demand and sales), with time-based splits, a baseline to beat and honest reporting of the results.

## Try it (QA login and test card)

Open https://carlos-alexandre-leutz.github.io/Orbit/ and wait for the page to wake the services up. Everything there is simulated and no real money moves.

**Account.** There is no shared public login. Create your own test account, which takes a minute:

- As a seller: go to `/sell`, sign up and build a store in `/panel`.
- As a customer: open a store link, then use that store's `/register` page.

Use any e-mail you can read (password recovery sends a real e-mail) and a throwaway password.

**Test card (Mercado Pago test mode).** Where a card form asks for a payer e-mail, use the Mercado Pago test user `test_user_8835720489044059430@testuser.com`. Mercado Pago in test mode only accepts a test payer ("Both payer and collector must be real or test users"). Then use Mercado Pago's published test card:

| Field | Value |
|---|---|
| Card number | `5031 4332 1540 6351` (Mastercard) |
| Expiry | `11/30` |
| CVV | `123` |
| Cardholder name | `APRO` (approves the payment; `OTHE` is declined) |
| Document (CPF) | `12345678909` |

Never type a real card number or a password you use elsewhere. The same applies to the seller plan form. A store that receives with Stripe instead needs Stripe's test card `4242 4242 4242 4242`, and only works if its seller put Stripe **test** keys in the panel.

## Base from the SaaS template

The monorepo base comes from
[`production-saas-template`](https://github.com/Carlos-Alexandre-Leutz/production-saas-template)
(copied from its `main` branch, commit `71e18f8`). It provides:

- `apps/web`: Next.js (App Router), Tailwind CSS, login, register, password reset and a dashboard shell.
- `apps/bff`: NestJS backend-for-frontend with Swagger at `/docs`.
- `apps/api-tasks`: NestJS core API with Prisma and PostgreSQL.
- Docker Compose files.

What came from the template and what was added is tracked in
[`docs/template-origin.md`](docs/template-origin.md).

## QA environment

The QA link is https://carlos-alexandre-leutz.github.io/Orbit/
The QA services run on Render's free plan and sleep when idle. The page is a
[wake-up page](index.html): it calls every service and sends you to the login once they all answer, which can take about a minute. It is served by GitHub Pages from the repository root. How the QA deploys itself is in [`docs/qa-deploy.md`](docs/qa-deploy.md).

## Local development

```bash
cp .env.example .env

# To start the containers, just run the script below. It brings everything up in the right
# dependency order (database, API, BFF, web) and reloads the code on save. With `--built` it uses the built images.
scripts/dev up

# Build the images and start the whole stack without the script (plain Docker Compose):
docker compose up -d --build --wait
```

This starts PostgreSQL with pgvector, MongoDB, a placeholder ML service, the store API, the BFF and the web app (<http://localhost:3000>). Ports, reset, hot reload and troubleshooting are in [`docs/setup.md`](docs/setup.md).
