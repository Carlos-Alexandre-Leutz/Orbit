# Project state

Where the project stands and what comes next. An AI session reads this first and updates it at the end of every PBI and every session (see [`working-agreement.md`](working-agreement.md)). Questions for the owner are in [`open-questions.md`](open-questions.md). **Last updated: 2026-11-14.**

## Where it stands

`staging` holds PBI-01 to PBI-08 and PBI-55, all with green checks. Each PBI has a document with its evidence and its limits: [`pbi/`](pbi).

| PBI | What it delivered |
|---|---|
| 01 to 04 | GitHub workflow, base from the SaaS template, starting documentation, local environment |
| 05 | CI: TypeScript, Python and Docker checks, an inert staging deploy, a script for pipeline times |
| 06 | Roles (customer, seller, admin), signed sessions, role guards, temporary visitor accounts |
| 07 | Product catalog: API, search, seed loader, integration tests on PostgreSQL |
| 55 | Web session (httpOnly cookie, [ADR-003](adr/ADR-003-web-session-cookie.md)), menu by role, banner, catalog pages, seller pages |
| 08 | Cart: model, rules with a row lock, cart page. The Redis task was cut. |

Measured on 2026-11-14: API 120 unit tests and 34 integration tests, BFF 16, web 52, `pnpm test:scripts` 86, `pnpm test:commitlint` 7; `scripts/import_backlog.py --verify` reports 260 items and 0 problems.

Parked ideas, with no tasks yet: epic E13 (cart recovery over WhatsApp, [`ideas/cart-recovery-whatsapp.md`](ideas/cart-recovery-whatsapp.md)) and epic E14 (support tickets with AI triage, [`ideas/support-tickets-ai.md`](ideas/support-tickets-ai.md)).

## Next step

**PBI-09, orders and test payment**, then follow the order at the end of [`00-backlog.md`](00-backlog.md): PBI-10, PBI-11 to PBI-14, PBI-17 to PBI-21, PBI-37.

For PBI-09 in particular:
- The cart only **warns** about stock. An order must check and take stock **atomically**, and freeze the price at that moment.
- There are no Stripe keys: build the payment behind a port with a fake, and ask the owner for test keys ([`open-questions.md`](open-questions.md)).
- The checkout and order pages are a task of PBI-09 itself, not of PBI-10.
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
