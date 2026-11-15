# Open questions and owner-only actions

Things only the owner can decide or do. An AI session adds a row when it asks something that must survive the chat, and removes it (with the answer written where it belongs) when it is settled. Last updated 2026-11-15.

## Decisions

| Question | Blocks | Notes |
|---|---|---|
| What must exist before the first public deploy? Candidates: rate limits on login and registration, hashing reset tokens, closing the open CORS and the published store-API port, backups, server hardening (PBI-44), a real mail provider. | PBI-42 and PBI-43 | These are listed under Known risks in [`project-state.md`](project-state.md). Today PBI-37 (security) and PBI-44 come after the agent work in the order; a public store may need part of them first. |
| Make the checks `typescript`, `python` and `docker` required on `staging` and `main`? | Nothing; makes the pipeline stricter | Today only `commitlint` and `scripts-tests` are required. It changes `scripts/protect-branches.sh` and the test that compares it with `AGENTS.md` and `CONTRIBUTING.md`. |
| What CORS settings should the BFF have? | Nothing today | The owner said they want to change it; an AI never changed it. The web app no longer depends on it: the browser only talks to its own site ([ADR-003](adr/ADR-003-web-session-cookie.md)). |
| Does the cart recovery SaaS (epic E13) live in this repository or in a new one? Which store platform comes first? | Turning E13 into a detailed backlog | See [`ideas/cart-recovery-whatsapp.md`](ideas/cart-recovery-whatsapp.md). The Meta rules in it were written from memory and must be checked first. |
| Support tickets with AI triage (epic E14): who answers a ticket, and where is the "expected behaviour" read from? | Turning E14 into a detailed backlog | Open questions are in [`ideas/support-tickets-ai.md`](ideas/support-tickets-ai.md). |

## Only the owner can do these

| Action | Why it is the owner's |
|---|---|
| Set up the VPS, deploy, and release `staging` to `main` | The project rule: nothing reaches `main` or production without the owner. PBI-42 to PBI-44 depend on it. |
| Give test keys for Stripe and for the Gemini API | An AI session has none and must not invent them. Until then the payment and the model are built behind a port with a fake. For Stripe: a test secret key and the signing secret of a test-mode webhook that points at `<BFF>/payments/webhook` go in `.env` as `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` ([ADR-004](adr/ADR-004-payments-behind-a-port.md), [PBI-09](pbi/PBI-09.md)). |
| Delete the merged `pbi/*` branches (01 to 09 and 55) | `AGENTS.md`: the owner deletes them after checking each merge. |
| Update the local `.env` from `.env.example` (`MONGO_*`, `JWT_SECRET`, the ports) | Only the owner's machine has that file. |
| Reset the old PostgreSQL volume (`docker compose down -v`) to get pgvector | It deletes development data, so it is the owner's call. |
| Move Docker's data to the 1 TB SSD, when it is connected | Needs the disk mounted, an ext4 file system, a mount by UUID in `fstab` and a backup of the database volumes. Steps are in [`project-state.md`](project-state.md). |
