# PBI-01: GitHub workflow

Issue: #2. Tasks: #3, #4, #5, #6, #7, #8, #9, #243, #247. Pull request: `pbi/01-github-workflow` → `staging`.

## Goal

Make the gitflow enforceable instead of only written down: protected branches, labels, a Project with fields and views, templates, contribution rules, a commit check that rejects attribution trailers, and a script that rebuilds the backlog as issues.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #5 Labels | #235 | `scripts/setup-labels.sh`: 22 labels (type, priority, phase F1 to F4, epics E0 to E12), idempotent. |
| #6 Templates | #236 | Issue forms for PBI and Task, blank issues off, English PR template. |
| #7 CONTRIBUTING | #237 | Gitflow, branch names, commit rules, Definition of Done, local setup, scripts table. |
| #8 Commit rules | #238 | commitlint, husky `commit-msg` hook, `commitlint` CI check, `.nvmrc`, `engines`. 7 tests. |
| #9 Import script | #239 | `scripts/import_backlog.py` with `--dry-run` and `--verify`; `scripts-tests` CI check. |
| #4 Project | #240 | `Phase` and `Priority` fields, their values, views Backlog, Board and Must-have. |
| #3 Branch protection | #241 | `scripts/protect-branches.sh` with `--check`, applied to `main` and `staging`. |
| #243 Python cache | #244, #245 | Found during validation: `.pyc` files had been committed. Untracked and ignored; task recorded in the backlog. |
| #247 Sub-issues | #248 | Found after the PBI was merged: issues were linked only by text and every task title repeated `[PBI-nn]`. Now native sub-issues (epic → PBI → task), titles without the prefix, and `--verify` checks the links. |

## Validation of the acceptance criteria

Run on 2026-11-13, after all tasks were merged.

| AC | Result | Evidence |
|---|---|---|
| AC1 Branches | **Pass** | `staging` exists. `protect-branches.sh --check`: 12 rules ok, 0 failures. On a throwaway branch with the same rules, a direct push, a force-push and a deletion were all rejected by GitHub (`GH006`). |
| AC2 Project | **Pass, refined** | `Phase` set on all 221 PBIs and tasks (re-checked after fixing #243). `Priority` on every item that has a marker. Views: Backlog, Board, Must-have. Epic E9 has no `[must]` or `[cut]` marker in the backlog, so its Priority is empty on purpose. |
| AC3 Labels | **Pass** | Labels for epic, pbi, task, must-have, cuttable and F1 to F4 exist. Running the script again left the count at 32. |
| AC4 Templates | **Pass, partly unverified** | Two issue forms, `config.yml` and a PR template with 4 sections; no Azure or Sonar text. The YAML parses. How the forms render on GitHub was **not** verified: GitHub serves them only from the default branch (`main`). |
| AC5 Contributing | **Pass** | `CONTRIBUTING.md` has the sections Gitflow (with branch names), Commits, Pull requests, Definition of Done, Local setup and Repository scripts. |
| AC6 Commit rules | **Pass** | Local hook rejected a commit with `Co-authored-by` and one with no type, and created no commit. In CI, a throwaway PR (#242, closed) with those two commits failed `commitlint` with the expected errors (`no-attribution-trailer`, `type-empty`, `subject-empty`) while `scripts-tests` passed. |
| AC7 Import script | **Pass, partly unverified** | The parser reads 13 epics, 46 PBIs and 176 tasks (174 plus #243 and #247). `--dry-run` reports every issue already on GitHub and 0 to create; `--verify` reports 0 problems, including that every PBI is a sub-issue of its epic and every task a sub-issue of its PBI (222 links). **Creating** issues for real was not verified, because all of them already exist; it is covered by tests with a fake `gh`. |
| AC8 Verified | **Pass** | This document. |

Tests: `pnpm test:commitlint` 7 passed; `pnpm test:scripts` 24 passed; `turbo run build` passes for the 3 apps; the unit tests of `@orbit/bff` and `@orbit/api-tasks` pass.

## Bugs found while validating

- The `.pyc` files committed by mistake (fixed in #243).
- Task #243 had been created by hand, so it had no Project values and was not in the backlog (fixed).
- Earlier, while building the tools: the import parser gave `must-have` to an epic with no marker, and the Project script read phase and priority from attributes that tasks did not have. Both were caught by `--verify` and by unit tests, and fixed before merging.
- Issues were linked only by a `Parent PBI: #n` line, so GitHub showed no hierarchy or progress, and the `[PBI-nn]` task prefix made the list read as loose tasks. Reported by the owner after the merge; fixed in #247 (PR #248). Task titles must stay unique because they are the matching key; a test guards it.
- The commit hook fails with an obscure error under Node 16, the default Node of the owner's machine. Mitigated with `.nvmrc` and `engines`; the hook itself still needs Node 20.

## Decisions and limits

- Branch protection requires a pull request but **no approvals**, and applies to admins. The AI merges its own PRs; a mandatory reviewer would block the workflow.
- Required checks are `commitlint` and `scripts-tests`. "Require branches to be up to date" is off, to avoid rebasing every PBI branch.
- A direct push to the real `main` or `staging` was deliberately not attempted. The negative test used a throwaway branch, so a failure could not damage them. The first real proof is the PR of this PBI, which has to pass both checks to merge.
- Views have a name, a layout and, for Must-have, a filter. Grouping and sorting inside a view are not set by the API and are left to the GitHub UI.
- Each task had its own `task/*` branch and PR, as the gitflow says.
