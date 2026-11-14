# PBI-03: Starting documentation

Issue: #15. Tasks: #16, #17, #18, #19. Pull request: `pbi/03-starting-documentation` → `staging`.

## Goal

Write down what Orbit must do, the rules AI sessions follow, the first architecture decisions and how AI is used, and make the structure of these documents checkable by tests so they do not rot.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #16 Requirements | #250 | `docs/01-requirements.md`: problem, scope rules, four personas, 22 user stories with acceptance criteria and the PBI that delivers each, non-functional requirements, out of scope. |
| #17 AI rules | #251 | `AGENTS.md` is the single source of the rules for any AI tool; `CLAUDE.md` imports it. `CONTRIBUTING.md` aligned (and a wrong line fixed). |
| #18 ADRs | #252 | `docs/adr/template.md`, ADR-001 (stack, split into in the repository / planned / open) and ADR-002 (ML in a separate Python service, stated as not built yet). |
| #19 AI development | #253 | `docs/ai-assisted-development.md`, marked draft: who decides, the workflow, enforced guardrails versus conventions, mistakes made and how they were caught, what is not claimed. |

All four task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-14, after all tasks were merged.

| AC | Result | Evidence |
|---|---|---|
| AC1 Requirements | **Pass** | 22 stories with unique ids, each with "Acceptance criteria" and "Delivered by"; the 29 PBIs named all exist in the backlog; personas customer, seller, admin and visitor; "Out of scope" present. |
| AC2 AI rules | **Pass** | `CLAUDE.md` is an import of `AGENTS.md` (5 lines). A fresh Claude Code session started in the repository quoted the branch-cleanup rule, which exists only in `AGENTS.md`, so the import is loaded. The required checks named in `scripts/protect-branches.sh` appear in both `AGENTS.md` and `CONTRIBUTING.md` (a test compares them). |
| AC3 ADRs | **Pass, after a fix** | Template and ADR-001 and ADR-002 have status, date, context, decision, alternatives and consequences. The claims of ADR-001 were compared with the repository: versions from the `package.json` files, Compose image `postgres:16-alpine` (no pgvector, MongoDB or Redis in the Compose files). The gaps listed for the inherited base were checked in the code, and the first wording was imprecise (see below). |
| AC4 AI-assisted development | **Pass** | All sections present, marked draft, every file it names exists, and the only digits in the text are list numbers, dates and PBI or ADR ids. |
| AC5 Checked | **Pass** | `pnpm test:scripts`: 43 passed (19 new, in `tests/test_docs.py`); `pnpm test:commitlint`: 7 passed. Each group of new tests was shown to fail on deliberate breaks (a PBI that does not exist, a broken link, a drifting list of checks, a renamed ADR section, an invalid status or date, a wrong script path, a missing draft marker). `import_backlog.py --verify`: 235 items, 0 problems. |

No application code changed in this PBI, so the app builds and unit tests were not re-run.

## Bugs found while validating

- **ADR-001 was imprecise about the inherited base.** Reading the code showed that `login` returns no token (`jsonwebtoken` is installed in the BFF but unused), that `register` and `login` return the whole user record except the password (which includes the reset fields, not only the "forgot password" response), and that the BFF turns every `register` error into a 500, hiding the 409 for a duplicate e-mail. The ADR now says exactly this.
- A date check I wrote for the ADR tests failed on a correct file (missing multiline flag); fixed before the PR.
- A requirement-traceability test I wrote checked nothing (it repeated a count); removed before the PR.
- `CONTRIBUTING.md` said only `commitlint` is a required check; the branch protection requires `commitlint` and `scripts-tests`. Fixed in #251, and a test now compares the two.
- The file-existence test for the AI doc flagged a link label that is relative to `docs/`; the test now resolves names from the document's folder too.

## Decisions and limits

- `AGENTS.md` is the source of the rules and `CLAUDE.md` only imports it, so there is one text to maintain.
- The tests check **structure and references** (sections, ids, links, files, PBIs), not whether the prose is correct. Whether the stories and decisions are right is for the owner to judge in the PRs.
- The stories were derived from the epics and PBIs of the backlog by the AI; the owner has not yet reviewed them one by one.
- `docs/ai-assisted-development.md` is a draft on purpose; PBI-45 finishes it. Its table of mistakes is the AI's own account and the owner should confirm it.
- ADR-001 records planned and open choices as such. They are not decided until their PBIs, and each change is recorded in a new ADR.
