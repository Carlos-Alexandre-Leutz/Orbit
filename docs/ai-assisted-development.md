# AI-assisted development

**Status: draft.** This describes how Orbit is built with AI sessions as of PBI-03. It is finished in PBI-45, when there is a full project to look back on. It says what is done and what is enforced; it makes no claim about productivity, because nothing here was measured.

## What this project is, as an experiment

Orbit is built by one owner who directs and AI sessions that do the work: planning issues, code, tests, docs, pull requests and merges. The owner sets the scope and reads the results; the AI follows the rules in [`AGENTS.md`](../AGENTS.md). The point of the project is to show that AI-assisted development can run under governance, the same idea Orbit applies to its own agents.

## Who decides what

| Decision | Who |
|---|---|
| What is in the backlog, its priorities and what gets cut | Owner |
| How a task is implemented | AI |
| Merging a task PR or a PBI PR into its target branch | AI, once the required checks pass |
| Releasing `staging` to `main` | AI asks the owner first, and only when there is a real working increment |
| Deleting `pbi/*` branches | Owner, after checking the merge |
| Bulk changes to the issue tracker, deployments | AI asks first |

## The workflow

1. Work starts from a task issue in the GitHub Project (Epic → PBI → Task); the backlog source is [`00-backlog.md`](00-backlog.md).
2. Before a PBI starts, its acceptance criteria are written in the PBI issue.
3. Each task has its own branch and pull request into the PBI branch. The PR says what was done, how it was tested, what was not verified and that AI was used.
4. When every task of a PBI is merged, the AI runs the tests, looks for bugs and validates each acceptance criterion one by one, then writes `docs/pbi/PBI-nn.md` with the result and opens the PBI PR into `staging`.
5. The issue and the Project are updated at the start and at the end of each task.

## Guardrails that are enforced, not just written

| Rule | Enforced by | Notes |
|---|---|---|
| Conventional Commits, no `Co-authored-by` or AI attribution trailer | Husky `commit-msg` hook and the `commitlint` CI check (`commitlint.config.mjs`) | AI use is declared in the PR text instead of a commit trailer. |
| Pull request required, no force-push, required checks, admins included | `scripts/protect-branches.sh` on `main` and `staging` | Checked with `--check`. |
| Backlog, issues, labels and sub-issue links agree | `scripts/import_backlog.py --verify` | Run by hand, not in CI. |
| Docs, ADRs and the AI rules stay consistent with the backlog and with each other | `tests/test_docs.py`, run by the `scripts-tests` CI check | Checks structure and references, not whether the text is correct. |
| PR states what was done, how it was tested and AI usage | `.github/pull_request_template.md` | A template; nothing checks that the answers are true. |

What is only a convention: the content of a PR description and the judgement behind a design decision. Review of those depends on the owner reading them.

## Mistakes made so far, and how they were caught

AI-written work needs checks because it makes ordinary mistakes. These happened in this project:

| Mistake | How it was caught | What changed |
|---|---|---|
| Said the `staging` branch did not exist, when it existed on the remote. | Checking the remote. | Branched from the real `staging`. |
| Merged task PRs without having updated the task issues. | The owner asked. | Updating issues before and after each task became a standing rule. |
| Committed Python cache files with `git add -A`. | The PBI-01 validation pass. | Files untracked and ignored; a task was added to the backlog. |
| Imported the template with database credentials hardcoded in its Compose files. | Review of the template when importing it. | Credentials moved to `.env`. |
| Linked issues only by a line of text, with the PBI name repeated in every task title. | The owner noticed. | Native sub-issues and plain titles; `--verify` checks the links. |
| Wrote a test that checked nothing (it repeated a count). | Re-reading the tests before the PR. | Removed before merging; the other new tests were each shown to fail on a deliberate break. |
| Wrote in `CONTRIBUTING.md` that one required check existed, when the branch protection requires two. | Writing `AGENTS.md` from the protection script. | Fixed, and a test now compares the two. |

## What is not claimed

- No measure of time saved, defects avoided or cost. None was collected.
- No claim that AI review replaces human review of design decisions.
- The inherited template was copied, not written here, and has known gaps listed in [ADR-001](adr/ADR-001-stack.md).

## To finish in PBI-45

- A real account of what AI did well and badly across the whole project, with evidence.
- A pointer to the eval report, audit trail and model metrics once they exist.
- Whether the guardrails above held when the workload was larger.
