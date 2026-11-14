# PBI-05: Base CI/CD

Issue: #26. Tasks: #27, #28, #29, #30, #31. Pull request: `pbi/05-base-ci-cd` → `staging`.

## Goal

Every pull request is checked automatically: TypeScript lint, tests and build, Python lint and tests, Docker image builds. The deploy step exists as a harmless placeholder until the server does.

## What was delivered

| Task | PR | Result |
|---|---|---|
| #27 TypeScript | #271 | Workflow `typescript`: `turbo run lint test build` for the web app, the BFF and the API. `lint` only reports; `lint:fix` rewrites. Lint was broken before and now runs clean (0 errors) in all three apps. |
| #28 Python | #272 | Workflow `python`: `ruff check` on the ML service, scripts and tests, then `pytest` for the ML service. `ruff.toml` at the root. |
| #29 Docker | #273 | Workflow `docker`: builds the apps image and the ML image without pushing; the ML container must answer `/health`; the apps image must hold the three apps. |
| #30 Deploy placeholder | #274 | `deploy.yml` is inert: it writes a note and uses no secrets. `tests/test_ci.py` keeps the workflows consistent. |
| #31 Cache and time | #275 | Turborepo results cache in the TypeScript check; `scripts/pipeline_times.py` reports run times per workflow. |

All task branches were deleted after their merge.

## Validation of the acceptance criteria

Run on 2026-11-14, after all tasks were merged.

| AC | Result | Evidence |
|---|---|---|
| AC1 TypeScript check | **Pass** | The first CI run of #271 **failed** on a real formatting error in the API (a fix I had reverted by mistake) and passed once fixed. Locally, an unused variable makes `lint` exit 1 and a failing test makes `test` fail. A broken *build* was not tried. |
| AC2 `lint` does not rewrite | **Pass** | `tests/test_ci.py` asserts that no app's `lint` script contains `--fix` and that `lint:fix` does. |
| AC3 Python check | **Pass** | Runs on every pull request and passes; an unused import makes `ruff` exit 1. A failing pytest was not tried in CI. |
| AC4 Docker images | **Pass** | The `docker` check built both images and the smoke tests passed on its pull request (about 3.5 minutes on the first, uncached run). |
| AC5 Deploy placeholder | **Pass, not yet run** | No secrets or remote calls (a test fails if either is added). It only runs on a push to `staging`, so its first real run is when this PBI is merged. |
| AC6 Caching and time | **Partly verified** | pnpm, pip and Docker layer caches are configured; the Turborepo cache is configured but whether it hits is not shown yet (the cache of a pull request is only visible to its own runs until `staging` has one). `pipeline_times.py` works on the real runs: medians are about 16 s (commitlint), 9 s (scripts-tests), 14 s (python), 51 s (typescript), 204 s (docker), from few runs. |
| AC7 Existing checks and doc | **Pass** | `commitlint` and `scripts-tests` are unchanged and pass; this document. |

Tests on the PBI branch: `turbo run lint test build` 8 tasks passed; `pnpm test:scripts` 79 passed (70 before); `pnpm test:commitlint` 7 passed; ML pytest 2 passed; ruff clean; `import_backlog.py --verify` 245 items, 0 problems.

## Bugs found while doing this

- The TypeScript lint did not work at all: the BFF had no ESLint packages (the config failed to load), the web script called `next lint`, which this Next version no longer has, and the API had 30 findings. The old `lint` scripts also ran with `--fix`, so a "check" would have rewritten files.
- The BFF's e2e test imports `supertest`, which was not installed.
- My own mistake: undoing a deliberate-failure experiment with `git checkout` also undid a formatting fix, and the first CI run caught it.
- The template deploy workflow called Render hooks and ran migrations with secrets that do not exist here.

## Decisions and limits

- **Type-safety lint rules are warnings** (43 left) in the BFF and the API: the inherited auth code is untyped and PBI-06 rewrites it, so cleaning it now would be wasted work. They go back to errors when that code is replaced.
- **The three new checks are not required** by branch protection yet; only `commitlint` and `scripts-tests` are. Making them required is a change to repository protection (`scripts/protect-branches.sh` and a test that compares it with the docs), left for the owner to approve once they have run reliably.
- One image holds the web app, the BFF and the API; the CI builds it once rather than three times.
- Images are built, never pushed; publishing belongs to the deployment PBIs.
