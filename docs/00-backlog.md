# Orbit: Product Backlog

Hierarchy: **Epic → PBI → Task**. Each item is a GitHub issue tracked in the Orbit GitHub Project.
Phases: F1 foundation and store, F2 RAG, ML and evals, F3 multi-agent and governance, F4 docs and launch.
Markers: `[must]` = never cut. `[cut]` = first to cut if the schedule slips.

## Workflow (adapted gitflow)

```
main        ← production (only receives releases from staging)
 └ staging  ← integration (staging deploy)
    └ pbi/<nn>-<slug>        ← one branch per PBI, branched from staging
       └ task/<nn>-<slug>    ← one branch per task, branched from its PBI branch
```

1. **Task:** `task/*` → PR into `pbi/*`. The PR description documents what was done.
2. **PBI:** when all tasks are merged, write `docs/pbi/PBI-nn.md`, then open `pbi/*` → `staging`.
3. **Release:** `staging` → `main`, tagged and deployed.
4. Conventional Commits, in English. No `Co-authored-by` trailers. AI usage is declared in the PR template.
5. Definition of Done (task): code, tests, docs in the PR, green CI. Definition of Done (PBI): acceptance criteria verified, PBI doc written, PR approved.

---

## E0. Process foundation [must]

### PBI-01 [F1] GitHub workflow
- T: Create the `staging` branch and protect `main` and `staging`
- T: Create the GitHub Project with fields and views
- T: Create labels for epic, PBI, task, phase and priority
- T: Add issue templates (PBI, Task) and the pull request template
- T: Write `CONTRIBUTING.md` with gitflow, branch names and commit rules
- T: Add commitlint and a hook that rejects `Co-authored-by`
- T: Add a script that imports this backlog as issues
- T: Ignore Python cache files
- T: Link issues as GitHub sub-issues and drop the PBI prefix from task titles
- T: Spread the web interface over the PBIs that feed it
- T: Add the support tickets with AI triage idea to the backlog
- T: Keep decisions, questions and the project state in the repository, not in the chat
- T: Add the parked cart recovery and WhatsApp ideas to the backlog

### PBI-02 [F1] Base from the SaaS template
- T: Copy the template into the repository and record its origin in the README
- T: Run the template locally and fix what breaks
- T: Rename packages and variables to Orbit and remove unused parts
- T: Write `docs/template-origin.md` (what came from the template vs what was added)

### PBI-03 [F1] Starting documentation
- T: Write `docs/01-requirements.md` (problem, personas, user stories, acceptance criteria)
- T: Write `CLAUDE.md` and `AGENTS.md` (project rules for AI sessions)
- T: Add the ADR template and ADR-001 (stack) and ADR-002 (ML in a separate Python service)
- T: Draft `docs/ai-assisted-development.md`

## E1. Platform and CI [must]

### PBI-04 [F1] Complete local environment
- T: Write `docker-compose.yml` with Postgres (pgvector), MongoDB and an empty ML service
- T: Add `.env.example` and startup config validation
- T: Add seed data for the fictional store
- T: Write setup docs so everything starts with one command

### PBI-05 [F1] Base CI/CD
- T: Add a lint, test and build workflow for TypeScript
- T: Add a Python workflow (ruff and pytest)
- T: Build Docker images in CI
- T: Add automatic deploy to staging (placeholder until E11)
- T: Add caching and track pipeline time

### PBI-62 [F1] Work flow and daily scripts
- T: Write the work flow document in Portuguese and point AGENTS.md at it
- T: Add `scripts/dev` (`test` for what changed, `pr` to open the pull request) with tests
- T: Record the scripts in the AI rules and in the flow document

### PBI-63 [F1] E-mail sending for the QA environment
- T: Send e-mail through a transport port with an SMTP adapter and an HTTP adapter for the owner's mail API
- T: Fix the forgot and reset password pages and the API answer when the e-mail cannot be sent
- T: Record the mail sender in the AI rules and in the docs

### PBI-64 [F1] Automatic QA deploy
- T: Trigger the Render redeploy of the three QA services after the images are published and the database is migrated
- T: Add tests that fail if the QA deploy trigger is removed
- T: Document the QA deploy and the rule that it is never removed (ADR, AI rules, flow document)

## E2. Store domain [must]

### PBI-06 [F1] Users, roles and authentication
- T: Model users and roles (customer, seller, admin)
- T: Add role guards to the API
- T: Add temporary anonymous users (base for demo mode)
- T: Keep helper scripts out of the API build output

### PBI-07 [F1] Product catalog
- T: Add the Prisma model for product, stock and category
- T: Build REST CRUD with validation and OpenAPI
- T: Add simple text search
- T: Add API tests

### PBI-55 [F1] Web session and catalog pages
- T: Add the web session (cookie set by the web server) with login, logout and protected routes
- T: Build the shared layout with a menu that follows the user's role
- T: Build the catalog pages (list with search, filters and paging, product detail)
- T: Build the seller product management pages
- T: Add a "simulated data / test payments" banner

### PBI-08 [F1] Cart
- T: Add the cart model and endpoints
- T: Enforce rules (stock, quantity, limits)
- T: Build the cart page
- T: Create the cart safely when the first requests arrive together
- T: [cut] Use Redis for cart and idempotency keys

### PBI-09 [F1] Orders and test payment
- T: Model orders and the order state machine
- T: Integrate Stripe in test mode and its webhook
- T: Make order creation and payment idempotent
- T: Implement order cancellation rules
- T: Add transactional email through a test provider
- T: Build the checkout and order pages

### PBI-59 [F1] Stores and ownership
- T: Add the store model (name, unique link, owner) and the reserved links
- T: Let a new seller create a store at sign-up
- T: Scope products to a store and move the existing data to a demo store
- T: Scope the cart and the orders to a store and keep sellers away from the cart
- T: Add isolation tests (a seller never reads or changes another store)

### PBI-60 [F1] Storefront at the store link
- T: Build the public store page with search and the product pages under the store link
- T: Move the cart, checkout and order pages under the store link
- T: Show a clear page for a store that does not exist or has no products
- T: Make the menu follow the role (customer: cart and orders; seller: panel)

### PBI-61 [F1] Seller panel
- T: Build the panel layout for the seller's own store
- T: Move the product management pages into the panel
- T: List the store's orders and let the seller ship and deliver them
- T: Edit the store's name and description
- T: Add the panel start page with a summary of orders and low stock
- T: Add a "publish your store" checklist

### PBI-10 [F1] Web interface
- T: Build the store chat widget (floating button on every store page)
- T: Build the seller sales and stock pages

## E3. Audit and governance [must]

### PBI-11 [F1] Append-only audit log
- T: Create the audit table and module
- T: Revoke UPDATE and DELETE at the database level and add a test that proves it
- T: Record actor, role, tool, parameters, result, approver, model and prompt version
- T: [cut] Add hash chaining for tamper evidence

### PBI-12 [F1] Correlation ID and tracing
- T: Add middleware that creates and propagates the correlation ID
- T: Propagate it to the LLM, tools, payments and email
- T: Store execution traces in MongoDB

### PBI-13 [F1] Human approval
- T: Create the approvals table
- T: Implement the propose, confirm or reject, execute flow
- T: Require extra confirmation above value limits

### PBI-14 [F1] Governance policy
- T: Create a versioned policy file (roles × tools × limits)
- T: Build the policy loader and validator
- T: Add permission tests per role

### PBI-15 [F3] PII redaction and retention
- T: Build the PII redactor for logs and prompts
- T: Define a retention policy per data type
- T: Add an expiration job (including anonymous users)

### PBI-16 [F3] Exportable evidence
- T: Add a query endpoint by order, user and period
- T: Add JSON and CSV export
- T: Build the admin evidence page
- T: Publish a sample full audit trail for the README

## E4. Agent core [must]

### PBI-17 [F1] LLM interface
- T: Add the `LlmProvider` port and the Gemini adapter
- T: Add timeout, retry and fallback between models
- T: Add schema-validated structured output (reject or retry invalid)
- T: Record tokens, cost and latency per call
- T: Cache repeated responses

### PBI-18 [F1] Tool layer
- T: Define the tool contract (schema, role, idempotency, side effect)
- T: Implement customer tools (search, cart, buy, status, cancel)
- T: Execute tools with auditing and approval for side effects
- T: Add unit tests per tool

### PBI-19 [F1] Intent router
- T: Build the classifier with a small model and structured output
- T: Add a confidence threshold that asks for clarification or escalates to a human
- T: Restrict routes by user role
- T: Audit every routing decision

### PBI-20 [F1] Orchestrator and customer agent
- T: Build the agent loop with step and cost limits
- T: Build the store assistant agent (read-only store tools)
- T: Add the public store chat endpoint with visitor limits
- T: Record the agent name on every audited step

### PBI-21 [F1] Short-term memory
- T: Store conversations in MongoDB isolated by `user_id`
- T: Add a message window with automatic summarization
- T: Add isolation tests

## E5. RAG and prompts [must]

### PBI-22 [F2] Versioned prompts
- T: Create the `prompts/v1...` structure and loader
- T: Record the prompt version on every run and audit entry
- T: Document the process for evolving a prompt (PR plus evals)

### PBI-23 [F2] RAG
- T: Add pgvector and the chunk schema
- T: Ingest catalog, policies and FAQ
- T: Add semantic search with source citations
- T: Add the `search_knowledge` tool to the agent
- T: Evaluate retrieval quality

## E6. Machine learning [must]

### PBI-24 [F2] Synthetic data
- T: Build the generator with seasonality, noise, promotions and delays
- T: Document that the data is simulated
- T: Ensure targets are never derived from features by formula

### PBI-25 [F2] Sales forecasting
- T: Build features (trend, weekday, lags, moving average)
- T: Train linear regression and a baseline
- T: Use time-based split and time-series cross-validation
- T: Report MAE, RMSE and MAPE against the baseline
- T: Add an exploration notebook

### PBI-26 [F2] Delivery time
- T: Build features and the linear regression model
- T: Add the baseline and metrics
- T: Add pytest tests for the pipeline

### PBI-27 [F2] ML FastAPI service
- T: Add prediction endpoints
- T: Persist models with joblib plus metadata (version, date, metrics, data hash)
- T: Write model cards in `docs/`
- T: Keep the service on the internal network in compose

### PBI-28 [F2] ML tools for the agent
- T: Add `forecast_demand` and `estimate_delivery` tools
- T: Audit model version, inputs and output

### PBI-29 [F3] Restock recommendation
- T: Compute reorder point, safety stock and order quantity
- T: Add the `recommend_restock` tool
- T: Create purchase orders with human approval
- T: Document in the README that this is a business formula on top of model forecasts

### PBI-30 [F3] Logistic models
- T: Model delivery delay risk
- T: [cut] Model stockout risk
- T: Report ROC-AUC, precision, recall and calibration

### PBI-31 [F3] Model lifecycle
- T: Add a CI gate that blocks promotion when metrics get worse
- T: Add weekly retraining with a report and approval step
- T: Add drift monitoring
- T: Publish the metrics report against the baseline

## E7. Seller, multi-agent and automations [must]

### PBI-32 [F3] Seller agent
- T: Add tools (create product, sales, stock)
- T: Add role permissions and tests

### PBI-33 [F3] Analysis agent and handoff
- T: Build the analysis agent with the ML tools
- T: Implement handoff with explicit context
- T: Enforce least privilege per agent
- T: Add a test proving there are no loops

### PBI-34 [F3] Long-term memory
- T: Store user-confirmed facts with their source
- T: Add the "forget" command with auditing that does not keep the content
- T: Block external content from being stored as instructions
- T: Add cross-user isolation tests

### PBI-35 [F3] Workflows and automations
- T: Build the multi-step workflow engine
- T: Build the weekly sales report (query, analyze, draft, approve, send)
- T: Add restock reminders, abandoned cart and stalled order follow-ups
- T: Schedule and approve automations from the chat

### PBI-36 [F3] Corporate connectors
- T: Define the `DataSourceConnector` interface
- T: Add the CSV and spreadsheet connector
- T: [cut] Add the simulated ERP connector

## E8. Security and evals [must]

### PBI-37 [F2] Security
- T: Defend against prompt injection (external content is data, not instructions)
- T: Add rate limiting and input validation
- T: Keep secrets out of Git
- T: Add security tests

### PBI-38 [F2] Eval suite
- T: Build the dataset (happy, ambiguous, malicious)
- T: Add tool and parameter evals
- T: Add routing evals
- T: Add multi-agent and memory evals
- T: Add prompt injection cases
- T: Run evals in CI with a gate on prompt changes
- T: Publish the report (accuracy, cost, latency)

## E9. Observability and demo mode

### PBI-39 [F2] LLM observability
- T: Add OpenTelemetry and/or Langfuse
- T: Build a step-by-step execution view

### PBI-40 [F4] Demo mode
- T: Add the "Try without signing up" button
- T: Add a demo seller with fictional data
- T: Add per-visitor and per-IP limits and a daily LLM budget
- T: Expire and delete anonymous users

## E10. MCP [cut]

### PBI-41 [F3] MCP server
- T: Expose the tools through MCP with the same permissions
- T: Document it with a usage example

## E11. VPS deployment [must]

### PBI-42 [F2] Production infrastructure
- T: Check VPS CPU and RAM and finalize the service set
- T: Write the production compose with Caddy or Nginx and HTTPS
- T: Expose only ports 80 and 443 and keep databases on an internal network
- T: Write the infrastructure ADR and `docs/deployment.md`

### PBI-43 [F4] Automatic deployment
- T: Add the GitHub Actions workflow (build, push, SSH, compose up)
- T: Add rollback to the previous image
- T: Keep secrets on the server

### PBI-44 [F4] Operations
- T: Add Postgres and MongoDB backups with an off-site copy and a restore test
- T: Harden the server (SSH keys, ufw, fail2ban, automatic updates)
- T: Add health checks and disk and memory alerts

## E12. Documentation and portfolio [must]

### PBI-45 [F4] README and evidence
- T: Write the English README with diagram, trade-offs and a "Requirements coverage" table
- T: State clearly that data is simulated and payments are in test mode
- T: Link the eval report, audit trail and ML metrics
- T: Finalize `docs/ai-assisted-development.md`
- T: Finish the remaining ADRs and `docs/governance.md`

### PBI-46 [F4] Launch
- T: Publish the live demo
- T: Record the 2 to 3 minute video
- T: Set the GitHub About text and topics
- T: Release `v1.0.0` (staging → main)

## E13. Cart recovery and WhatsApp (parked, to refine later) [cut]

Reminders only: these PBIs have no tasks and no acceptance criteria yet. The ideas, the Meta rules they must satisfy and a first ordering are in [`docs/ideas/cart-recovery-whatsapp.md`](ideas/cart-recovery-whatsapp.md). Meta's WhatsApp rules come first: no message is sent before consent, opt-out, approved templates and the 24-hour window exist. Pricing idea: one monthly plan, no usage limits, no commission.

### PBI-47 [F4] WhatsApp channel and Meta compliance
### PBI-48 [F4] Store platform connection and webhooks
### PBI-49 [F4] Abandoned cart detection and recovery flow
### PBI-50 [F4] One-click recovery link and recovered-sale attribution
### PBI-51 [F4] Pending Pix and boleto recovery
### PBI-52 [F4] Recovery dashboard, test mode and message audit trail
### PBI-53 [F4] Replenishment prediction and campaign
### PBI-54 [F4] Monthly subscription

## E14. Support tickets with AI triage (parked, to refine later) [cut]

Reminders only: these PBIs have no tasks and no acceptance criteria yet. The idea, the rules it must respect (an AI never deploys to `main` by itself, ticket text is data, every action is audited and side effects are approved by a person) and the open questions are in [`docs/ideas/support-tickets-ai.md`](ideas/support-tickets-ai.md).

### PBI-56 [F4] Support ticket screens inside the system
### PBI-57 [F4] AI triage of a ticket against the documentation
### PBI-58 [F4] From a confirmed bug to a fix, a QA pull request, an approved release and the reply

## E15. E-commerce platform [must]

The basic online-store platform that the agent work sits on: sellers sign up and set up a store, customers shop and keep one account across stores. Decisions in [ADR-007](adr/ADR-007-sign-up-flows-and-global-customer-account.md). PBI-61 (seller panel) belongs to this epic's work but stays under E2, where its issue already is.

### PBI-71 [F1] E-commerce platform plan
- T: Write the e-commerce plan (ADR-007, backlog and project state)

### PBI-65 [F1] Sign-up flows
- T: Add the seller sign-up page at `/sell` and remove the "I want to sell" checkbox
- T: Add customer sign-up and login inside the store, returning the customer to that store
- T: Allow one role per e-mail and say so in the sign-up messages
- T: Reserve the new top-level links (`sell`, `account`) and update the menu

### PBI-70 [F1] Global customer account
- T: Link each customer to the stores they joined or bought from
- T: Show a seller only their own store's customers and the data of their orders, with isolation tests
- T: Build the `/account` page with the orders of every store
- T: Record marketing consent per store
- T: Let a customer delete their account

### PBI-66 [F1] Store appearance
- T: Add logo, cover, main color, tagline and contact to the store
- T: Build the store settings page in the panel
- T: Apply the store's look to the storefront and to the store's sign-in pages
- T: Add tests for color and image validation

### PBI-67 [F1] Product images and stock
- T: Add the product image model and an image storage port with a local disk adapter
- T: Upload images in the product form and show a gallery on the product page
- T: Warn about low stock in the panel and mark sold-out products in the storefront
- T: Add tests for image type and size limits

### PBI-68 [F1] Storefront and platform look
- T: Build the storefront home with cover, category navigation and product cards with photos
- T: Redesign the product page and the cart page
- T: Build the platform home page that invites sellers to create a store
- T: Check the pages on a phone

### PBI-69 [F1] Simulated payment
- T: Build the simulated payment screen (approve or decline with test cards) on top of the fake payment provider
- T: Show the test payment mode in the panel and on the order pages
- T: Document how the real payment provider replaces the simulation

### PBI-72 [F1] Store platform ready for QA
- T: Deliver the store platform work done since PR #414 (paid stores, delivery, legal pages and the owner area) in one change

### PBI-73 [F1] Seller billing with a card form inside Orbit
- T: Replace the Mercado Pago redirect with a card form on the billing page, so no Mercado Pago account is needed
- T: Let the seller choose the e-mail that Mercado Pago bills, prefilled with the account e-mail
- T: Offer the free trial when a seller publishes a store that has no plan yet
- T: Hide the "My store" link from the admin

### PBI-74 [F1] Friendly error messages and alerts
- T: Map provider and API error codes (such as `unsupported_credit_card_for_recurring_payment` and `local_rate_limited`) to plain English messages the user can act on, in one shared module
- T: Make the API answer errors in one shape (`statusCode`, a stable `code` and a safe `message`) and stop passing raw provider text through
- T: Add an alert component (SweetAlert-style modal or toast) and a `showError` helper in the web app
- T: Use the alert in the card forms (billing and checkout), sign-in, sign-up and the panel forms instead of the inline red text
- T: Add tests for the code-to-message map and for the alert on the error paths

---

## Suggested execution order

- F1: 01, 02, 03, 04, 05, 06, 07, 55, 08, 09, 59, 60, 71, 65, 70, 61, 66, 67, 68, 69, 72, 73, 74, 11, 12, 17, 18, 13, 14, 19, 20, 21, 10
- F2: 22, 23, 24, 25, 26, 27, 28, 37, 38, 39, 42
- F3: 29, 30, 31, 32, 33, 34, 35, 36, 15, 16, 41
- F4: 40, 43, 44, 45, 46
- First deploy (a basic store online, before the agent work): 01 to 09, 55, 59, 60, 71, 65, 70, 61, 66, 67, 68, 69, 72, then 42 and 43 with the owner. What else must come first (backups, hardening, rate limits) is an open question in `open-questions.md`.
- Parked, refine later: 47 to 54 (cart recovery and WhatsApp), 56 to 58 (support tickets with AI triage)
- To refine (no number yet): seller payouts, where each seller pastes the keys of their own Stripe or Mercado Pago account and pays the provider fees, so the owner pays nothing per sale (see ADR-008). The code is written but was never run against a real account; it still needs a PBI, a run with test accounts and a currency per store. It comes before fraud validation and before real card payments.
- To refine (no number yet): fraud validation on purchase. The owner will check an order for signs of fraud before it is paid or shipped. What counts as a signal, whether it blocks or only flags, and who reviews a flagged order are still open. It sits on top of the real payment provider, so it comes after the Stripe test-mode integration.
- To refine (no number yet): seller subscription. The code charges the monthly plan (R$ 15, with 30 free days) through Orbit's own Mercado Pago account and suspends a store whose card keeps failing (see ADR-009); it was never run against Mercado Pago. It still needs a PBI, a run with a test account, plan limits and a way for the seller to cancel inside Orbit.
- To refine (no number yet): disputes and buyer complaints. A buyer who does not receive an order needs a way to report it; the platform notifies the seller and waits for an answer, and a store that does not answer can be suspended (the draft state `published=false`, as an admin action). Money is refunded by the seller from their own provider account, and a card chargeback is opened by the buyer at their bank, not by Orbit (see ADR-008). Needs terms of use that say Orbit is an intermediary and the seller answers for the product and the refund. Related to the parked E14 (support tickets).

Cut order if needed: Redis, second connector, MCP, stockout-risk model.
