# Project state

Where the project stands and what comes next. An AI session reads this first and updates it at the end of every PBI and every session (see [`working-agreement.md`](working-agreement.md)). Questions for the owner are in [`open-questions.md`](open-questions.md). **Last updated: 2026-11-14 (evening).**

## Where it stands

`staging` holds PBI-01 to PBI-08 and PBI-55, all with green checks. **PBI-09 is in progress on the branch `pbi/09-orders-payment`** (not in `staging` yet): continue from that branch. Each PBI has a document with its evidence and its limits: [`pbi/`](pbi).

| PBI | What it delivered |
|---|---|
| 01 to 04 | GitHub workflow, base from the SaaS template, starting documentation, local environment |
| 05 | CI: TypeScript, Python and Docker checks, an inert staging deploy, a script for pipeline times |
| 06 | Roles (customer, seller, admin), signed sessions, role guards, temporary visitor accounts |
| 07 | Product catalog: API, search, seed loader, integration tests on PostgreSQL |
| 55 | Web session (httpOnly cookie, [ADR-003](adr/ADR-003-web-session-cookie.md)), menu by role, banner, catalog pages, seller pages |
| 08 | Cart: model, rules with a row lock, cart page. The Redis task was cut. |

Measured on 2026-11-14 on the PBI-09 branch: API 153 unit tests and 46 integration tests, BFF 18, web 52, `pnpm test:scripts` 86, `pnpm test:commitlint` 7; `scripts/import_backlog.py --verify` reports 260 items and 0 problems.

Parked ideas, with no tasks yet: epic E13 (cart recovery over WhatsApp, [`ideas/cart-recovery-whatsapp.md`](ideas/cart-recovery-whatsapp.md)) and epic E14 (support tickets with AI triage, [`ideas/support-tickets-ai.md`](ideas/support-tickets-ai.md)).

## Next step

**Finish PBI-09, orders and test payment**, on the branch `pbi/09-orders-payment`. Its acceptance criteria are written in issue #46. Then follow the order at the end of [`00-backlog.md`](00-backlog.md): PBI-10, PBI-11 to PBI-14, PBI-17 to PBI-21, PBI-37.

PBI-09 so far, and what is left:
- **Done, merged into the PBI branch:** #47, the `Order` and `OrderItem` tables, the state machine, placing an order from the cart (the stock is taken atomically and the prices are copied onto the order), reading orders, and shipping and delivering by a seller or admin, with the BFF routes. A migration and 46 integration tests cover it.
- **#48, payment:** a `PaymentProvider` port; a fake provider for tests and development; a Stripe adapter built with the `stripe` package that is only verifiable for its **webhook signature** (there are no Stripe keys, so a real charge cannot be tried); a pay route; a webhook route that needs the raw body (`rawBody` in `NestFactory.create`, also in the BFF, which must forward the raw body and the signature header); a table of handled event ids so a repeated event does nothing. A payment confirmed by the call and by the webhook must pay the order once.
- **#49, idempotency:** an `Idempotency-Key` on placing an order, unique per user, so a retry returns the same order; paying is idempotent through the order state.
- **#50, cancellation:** the customer cancels while payment is pending; a paid order is cancelled by a seller or admin and refunded through the provider; shipped and delivered orders cannot be cancelled; the stock goes back exactly once.
- **#51, e-mail:** an order confirmation through the existing `MailService`; a mail failure must never fail the order.
- **#295, web:** the checkout and order pages (place the order from the cart, pay in test mode, list, detail, cancel) and an "Orders" entry in the menu. The web server already lets `orders` through `/api/bff`. Use `quantityChoices`-style helpers kept out of server-only files.
- **Known gap to document in `PBI-09.md`:** an unpaid order keeps its stock until it is cancelled; nothing expires old unpaid orders yet.
- At the end: check each criterion on the full stack (API through the BFF and the pages in a real browser) and write `docs/pbi/PBI-09.md`.
- The same applies later to the model (PBI-17): there is no Gemini key, so use a fake behind the port.

## How a task and a PBI are done

- Plan from the issue; branch `task/<nn>-<slug>` from the PBI branch, which comes from `staging`. Never push to `main` or `staging`.
- Write the PBI's acceptance criteria in its issue before starting. Comment on each task issue, move it in the Project, open the pull request (what was done, how it was tested, what was **not** verified, that AI was used), wait for all six checks, merge through `gh api` (`gh pr edit` fails here), delete the task branch, close the issue.
- A new issue for the Project needs `gh project item-add`, then `scripts/setup_project.py` to set Phase and Priority. A task added to the backlog is created by `scripts/import_backlog.py`; its `--verify` must end with 0 problems.
- At the end of a PBI, check **each** criterion for real: for the back end, the full Compose stack through the BFF; for the front end, a real browser. Write `docs/pbi/PBI-nn.md` and open the PBI pull request into `staging`.

## Environment traps

- The default Node is 16. Put Node 20 on the `PATH` before `pnpm` or `git commit`.
- The Docker daemon cannot see the sandbox `/tmp`. Verify the full stack from a clone **inside the repository folder** (for example `.verifyNN`, listed in `.git/info/exclude`), then run `docker compose -p <project> down -v --rmi local` and delete the clone.
- The owner's own stack uses ports 3000 to 3002 and the container `orbit-postgres-db`. In a verification clone, change the published ports (13000 to 13002), `POSTGRES_PORT`, `MONGO_PORT` and the `container_name`. Never stop the owner's containers.
- Commands that run longer than about two minutes are moved to the background: wait for the notification instead of polling. The Docker check takes about four minutes per pull request.
- Next.js here is version 16: read `apps/web/node_modules/next/dist/docs` first (`middleware` is `proxy`, `cookies()` and route params are asynchronous).
- `@nestjs/jwt` and `@nestjs/mapped-types` version 12 are ES-module only; use 11 and 2.x. Code outside `apps/api-tasks/src` must stay out of `tsconfig.build.json`. A client component must not import server-only code such as `next/headers`.
- Do not push before the local lint has finished: a pull request started too early once failed in CI for that reason.

## Disk

On 2026-11-14 the disk was 97% full (about 7.6 GB free) because Docker's build cache had grown to about 39 GB. Clearing the build cache and three old verification images brought it to about 43 GB free (81%). A full-stack verification costs a few GB. If free space falls near 5 GB, stop and tell the owner. Docker keeps its data in `/var/snap/docker/common/var-lib-docker` (a snap install).

The owner has a 1 TB SSD for AI projects and may move Docker's data there. The steps: connect and mount it with an ext4 file system by UUID in `fstab`; back up the database volumes; stop Docker; `rsync` the directory to the SSD; point Docker's data root at it; start Docker; check that the containers and volumes are intact; only then delete the old directory. Formatting erases the disk, so the owner confirms that step.

## Known risks (details in the PBI documents)

- `POST /auth/anonymous` is public and creates a row per call; there is no request limit on login or registration; reset tokens are stored in plain text; the store API still has `enableCors()` open and its port published.
- The API's error messages are in Portuguese and the pages in English.
- Not verified yet: the staging deploy (the placeholder only writes a note), the Turborepo cache hit in CI, the `Secure` cookie over https, the layout on a phone, and the 24-hour expiry of a visitor account.

## Pace so far

Merge times on 2026-11-14 (from the Git history of `staging`): PBI-05 at 11:27, PBI-06 at 12:36, PBI-07 at 13:24, PBI-55 at 18:54, PBI-08 at 19:33. Between 13:24 and 18:54 the time went mostly to rewriting the backlog, the parked ideas, disk space and pauses. With no interruptions a PBI of 3 to 5 tasks, including its full-stack validation and document, took about 40 to 70 minutes, roughly 13 minutes a task. On 2026-11-14 the backlog had 38 PBIs and 139 tasks left, not counting the parked epics E13 and E14; about 33 of those PBIs need nothing from the owner (the server, deploy, backups and the launch video do). A realistic estimate for those is 45 to 60 hours of active work, because the agent, RAG, machine learning and evaluation PBIs are slower than the store ones. This is an estimate from five data points, not a promise.
