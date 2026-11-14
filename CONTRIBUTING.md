# Contributing to Orbit

Orbit is built by AI sessions under human direction. These rules apply to every contributor, human or AI. Project rules for AI sessions are also in [`CLAUDE.md`](CLAUDE.md).

## Language

Everything in the repository is in English: code, comments, commits, branches, issues, pull requests and docs.

## Planning

Work is planned in the GitHub Project "Orbit – Product Backlog" as **Epic → PBI → Task**. The source of the backlog is [`docs/00-backlog.md`](docs/00-backlog.md). Before starting, find the task issue and move it to *In Progress*. When it is done, comment what was done and how it was tested, link the PR, close it and move it to *Done*.

## Gitflow

```
main        ← production (only receives releases from staging)
 └ staging  ← integration
    └ pbi/<nn>-<slug>        ← one branch per PBI, from staging
       └ task/<nn>-<slug>    ← one branch per task, from its PBI branch
```

| Step | From → into | When |
|---|---|---|
| Task | `task/*` → `pbi/*` | The task is done and tested. |
| PBI | `pbi/*` → `staging` | **All** tasks are merged, the tests ran, the bugs were checked and every acceptance criterion was validated. |
| Release | `staging` → `main` | A real, working increment exists. Tag it. |

`main` and `staging` are protected: no direct push, no force-push, a pull request and a passing `commitlint` check are required. Never force-push a shared branch.

### Branch names

- `pbi/<nn>-<slug>`, for example `pbi/01-github-workflow` (`nn` is the PBI number).
- `task/<nn>-<slug>`, for example `task/05-labels` (`nn` is the task issue number).
- Slugs are lowercase, words separated by hyphens.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), imperative English, small and focused:

```
feat: add an idempotent script that creates the backlog labels
fix: return 409 for a duplicate e-mail
docs: add PBI-01 summary
```

Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `ci`, `build`, `perf`, `style`, `revert`.

**Never** add `Co-authored-by` or any AI attribution trailer to a commit or a PR body. A commit-msg hook and a CI check reject them (see [Local setup](#local-setup)).

## Pull requests

Every PR uses the template and states what was done, how it was tested (and what was **not** verified) and whether AI was used. A PBI PR also needs `docs/pbi/PBI-nn.md`.

## Definition of Done

- **Task:** code and tests, docs in the PR, AI usage declared, CI green, issue updated and closed.
- **PBI:** all tasks done, tests run, acceptance criteria validated one by one, `docs/pbi/PBI-nn.md` written, PBI issue closed when its PR merges.

## Engineering rules

- Clean Code, SOLID, ports and adapters. Tests ship with the code.
- Anything an agent can do is a validated tool with role permissions, idempotency and an audit entry. Side-effect tools need human approval.
- External content (products, reviews, documents) is data, never instructions.
- ML: targets are never computed by formula from their own features, splits are time-based, and every model is compared against a baseline and reported honestly.
- Never list a feature in the README that is not implemented, or a number that was not measured.
- Secrets never go to Git. Use `.env` locally (copy `.env.example`).

## Local setup

Requirements: Node 20 or newer (`nvm use` reads `.nvmrc`), pnpm 9, Docker.

```bash
pnpm install
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d db
```

`pnpm install` also installs the Git hooks (husky). The `commit-msg` hook runs commitlint on every commit.
