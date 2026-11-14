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

## E2. Store domain [must]

### PBI-06 [F1] Users, roles and authentication
- T: Model users and roles (customer, seller, admin)
- T: Add role guards to the API
- T: Add temporary anonymous users (base for demo mode)

### PBI-07 [F1] Product catalog
- T: Add the Prisma model for product, stock and category
- T: Build REST CRUD with validation and OpenAPI
- T: Add simple text search
- T: Add API tests

### PBI-08 [F1] Cart
- T: Add the cart model and endpoints
- T: Enforce rules (stock, quantity, limits)
- T: [cut] Use Redis for cart and idempotency keys

### PBI-09 [F1] Orders and test payment
- T: Model orders and the order state machine
- T: Integrate Stripe in test mode and its webhook
- T: Make order creation and payment idempotent
- T: Implement order cancellation rules
- T: Add transactional email through a test provider

### PBI-10 [F1] Web interface
- T: Build the layout and catalog, cart and orders pages
- T: Build the chat page with streaming
- T: Build the seller pages (products, sales, stock)
- T: Add a "simulated data / test payments" banner

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
- T: Build the customer support agent (catalog, cart, orders)
- T: Stream responses to the chat
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

---

## Suggested execution order

- F1: 01, 02, 03, 04, 05, 06, 07, 11, 12, 17, 18, 08, 09, 13, 14, 19, 20, 21, 10
- F2: 22, 23, 24, 25, 26, 27, 28, 37, 38, 39, 42
- F3: 29, 30, 31, 32, 33, 34, 35, 36, 15, 16, 41
- F4: 40, 43, 44, 45, 46
- Parked, refine later: 47 to 54 (cart recovery and WhatsApp)

Cut order if needed: Redis, second connector, MCP, stockout-risk model.
