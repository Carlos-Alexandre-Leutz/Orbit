# Orbit: requirements

This document says what Orbit must do. It is a plan, not a status report: a story here is **not** implemented until the README says so. Each story names the PBI in [`00-backlog.md`](00-backlog.md) that delivers it.

## Problem

Running a small online store means jumping between a catalog admin, an order list, a payment dashboard, spreadsheets and support messages. Customers, in turn, must learn the store's pages to find a product, build a cart and follow an order.

Orbit lets customers and sellers do these things by chat. The hard part is not the chat: it is letting an AI agent act on a store without losing control. Every action an agent takes has to be permitted for the user's role, approved by a human when it has side effects, and recorded so it can be explained later.

## Scope and honesty rules

- Orbit is a portfolio project. All data is **simulated** and payments run in the payment provider's **test mode**. No real customer data or real money is involved.
- Content that comes from outside the system (product descriptions, reviews, documents) is data, never instructions to the agent.
- Machine learning is judged against a baseline and reported honestly, including when it does not beat the baseline.

## Personas

| Persona | Who they are | What they need |
|---|---|---|
| **Customer** | Someone buying from the store. | Find products, manage a cart, pay, track or cancel an order and get answers about policies, quickly and in plain language. |
| **Seller** | The person who runs the store. | Keep products and stock up to date, understand sales, decide what to restock and automate repeated reports, without leaving the chat. |
| **Admin** | The person responsible for control and compliance. | See exactly what each agent did and why, decide what agents may do, approve risky actions and export evidence. |
| **Visitor** | Someone trying the demo without an account. | Try the product in a short, limited, anonymous session. |

## User stories

Each story has acceptance criteria that can be checked by running something. "Delivered by" names the PBI that will implement it.

### Accounts and access

#### US-01 Sign up and sign in with a role
As a user, I want to create an account and sign in, so that the system knows whether I am a customer, a seller or an admin.

Acceptance criteria:
- A new account gets the customer role by default.
- An endpoint reserved for a role rejects a user of another role.
- A user cannot read another user's data.

Delivered by: PBI-06

#### US-19 Try the product without signing up
As a visitor, I want to start a session with one click, so that I can see what Orbit does before creating an account.

Acceptance criteria:
- An anonymous session can use the customer chat and a demo seller with fictional data.
- Limits per visitor and per IP and a daily model budget stop abuse.
- Anonymous users and their data expire and are deleted.

Delivered by: PBI-40

### Customer

#### US-02 Browse and search the catalog
As a customer, I want to browse products and search by text, so that I can find what I want without chatting.

Acceptance criteria:
- The catalog lists products with price and availability.
- A text search returns the products that match.
- The pages say that data is simulated and payments are in test mode.

Delivered by: PBI-07, PBI-10

#### US-03 Build a cart by chat
As a customer, I want to ask the chat to find products and add them to my cart, so that I do not have to navigate pages.

Acceptance criteria:
- The agent finds products by description and adds the chosen one to the cart.
- A quantity above the available stock or above the limit is refused, and the reason is explained.
- Adding the same request twice does not change the cart twice.

Delivered by: PBI-08, PBI-18, PBI-20

#### US-04 Buy with explicit confirmation
As a customer, I want to confirm before the agent pays, so that nothing is charged by surprise.

Acceptance criteria:
- The agent proposes the order and waits for me to confirm or reject it.
- Confirming creates one order and one test payment, even if the request is repeated.
- An amount above the configured limit asks for an extra confirmation.

Delivered by: PBI-09, PBI-13, PBI-18

#### US-05 Track and cancel an order
As a customer, I want to ask for the status of an order and cancel it when the rules allow, so that I stay in control after buying.

Acceptance criteria:
- The agent shows the status of my orders and only mine.
- Cancelling follows the order state machine; a state that cannot be cancelled is refused with the reason.
- A cancellation needs my confirmation and is recorded.

Delivered by: PBI-09, PBI-18

#### US-06 Get answers about policies, with sources
As a customer, I want answers about shipping, returns and other policies, so that I do not have to read long pages.

Acceptance criteria:
- Answers are based on the store's own documents and cite the source.
- When the documents do not cover the question, the agent says so instead of inventing an answer.

Delivered by: PBI-23

#### US-07 Know the estimated delivery time
As a customer, I want an estimate of the delivery time, so that I can decide before buying.

Acceptance criteria:
- The estimate comes from a delivery-time model and says which model version produced it.
- The model is reported against a baseline.

Delivered by: PBI-26, PBI-28

### Seller

#### US-08 Manage products and stock by chat
As a seller, I want to create products and check stock by chat, so that I can run the catalog quickly.

Acceptance criteria:
- A seller can create a product and see stock and sales; a customer cannot.
- Creating a product needs the seller's confirmation and is recorded.

Delivered by: PBI-07, PBI-32

#### US-09 Understand sales and expected demand
As a seller, I want a sales summary and a demand forecast, so that I can plan.

Acceptance criteria:
- The forecast is compared with a simple baseline, and the report shows where it is worse or better.
- Each answer shows the model version, inputs and output.

Delivered by: PBI-25, PBI-28, PBI-33

#### US-10 Get a restock recommendation
As a seller, I want a recommendation of what and how much to reorder, so that I avoid stockouts and excess stock.

Acceptance criteria:
- The recommendation is a business formula (reorder point, safety stock, quantity) applied to model forecasts, and is documented as such.
- A purchase order is created only after the seller approves it.

Delivered by: PBI-29

#### US-11 Automate a recurring report
As a seller, I want a weekly sales report prepared for me, so that I do not build it by hand.

Acceptance criteria:
- The workflow queries, analyzes and drafts the report; sending it needs approval.
- An automation can be scheduled and approved from the chat.

Delivered by: PBI-35

#### US-12 Bring data from a spreadsheet
As a seller, I want to import data from a CSV or spreadsheet, so that Orbit works with what I already have.

Acceptance criteria:
- A connector reads a CSV or spreadsheet through a common data-source interface.
- Imported content is treated as data, never as instructions.

Delivered by: PBI-36

### Admin

#### US-13 See what every agent did
As an admin, I want a record of each agent action, so that I can explain it later.

Acceptance criteria:
- Each action records who acted, the role, the tool, its parameters, the result, the approver, the model and the prompt version.
- The audit log accepts inserts only: an update or delete is refused by the database.
- One correlation ID links the request, the model call, the tools, the payment and the email.

Delivered by: PBI-11, PBI-12

#### US-14 Approve or reject risky actions
As an admin, I want side-effect actions to wait for a human decision, so that an agent cannot act alone on money or data.

Acceptance criteria:
- A side-effect tool proposes first; it runs only after approval.
- Rejecting leaves the system unchanged and is recorded.

Delivered by: PBI-13

#### US-15 Decide what agents may do
As an admin, I want a versioned policy of roles, tools and limits, so that permissions are explicit and reviewable.

Acceptance criteria:
- A policy file lists which role can use which tool and with which limits.
- An invalid policy is rejected at load time.
- A test per role proves that the policy is enforced.

Delivered by: PBI-14

#### US-16 Export evidence
As an admin, I want to query and export the audit trail, so that I can show evidence of what happened.

Acceptance criteria:
- The trail can be queried by order, user and period.
- It can be exported as JSON and CSV.

Delivered by: PBI-16

#### US-17 Protect personal data
As an admin, I want personal data redacted from logs and prompts and removed when no longer needed, so that the system keeps only what it must.

Acceptance criteria:
- Personal data does not appear in logs or in prompts sent to a model.
- Each data type has a retention rule, and an expiration job applies it.

Delivered by: PBI-15

### Cross-cutting

#### US-18 Remember across sessions, under user control
As a user, I want the agent to remember what I confirmed and to forget it on request, so that it is helpful without keeping what I do not want.

Acceptance criteria:
- Conversations and remembered facts are isolated per user, proven by tests.
- Each remembered fact has a source and was confirmed by the user.
- "Forget" removes the fact, and the audit entry does not keep its content.

Delivered by: PBI-21, PBI-34

#### US-20 Resist hostile content
As an owner of the store, I want text inside products, reviews and documents to never change what the agent does, so that outsiders cannot hijack it.

Acceptance criteria:
- A product description or review with instructions in it is treated as data.
- Prompt-injection cases are part of an eval set that runs in CI.

Delivered by: PBI-37, PBI-38

#### US-21 Show evidence of quality
As a reader of the project, I want published measurements, so that quality claims can be checked.

Acceptance criteria:
- A report shows accuracy, cost and latency of the agent evals.
- A model whose metrics get worse than the baseline is blocked from promotion.

Delivered by: PBI-31, PBI-38

#### US-22 Expose the tools through MCP *(cuttable)*
As a developer, I want the same tools available through MCP with the same permissions, so that other clients can use them safely.

Acceptance criteria:
- A tool called through MCP goes through the same role check, approval and audit as in the chat.

Delivered by: PBI-41

## Non-functional requirements

- **Governance:** every tool an agent can call is validated, role-checked, idempotent and audited; tools with side effects need human approval.
- **Security:** secrets never go to Git; input is validated; requests are rate limited.
- **Cost and latency:** each model call records tokens, cost and latency, and agent runs have step and cost limits.
- **Reliability:** order creation and payment are idempotent; model calls have timeout, retry and fallback.
- **Observability:** every agent step can be followed from the correlation ID.
- **Honesty:** the README lists only implemented features and only measured numbers.

## Out of scope

- Real payments, real customer data and real e-mail to real customers.
- A native mobile app.
- Multi-store or multi-tenant operation.
- Deep learning; the models are scikit-learn models (see ADR-002).
