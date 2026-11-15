# Working agreement: decisions live in the repository

**Rule: anything that must be remembered later is written in the repository. The chat is not a place to keep it.**

A chat is long, gets summarized, is forgotten when a session ends, is not versioned, is not reviewed and costs tokens every time it is re-read. A decision that exists only in a chat is lost the next time the context is cut or a new session starts. The repository is versioned, reviewed in pull requests and covered by tests.

## Where each kind of thing goes

| What | Where |
|---|---|
| An architecture or technology decision, and why | An ADR in [`adr/`](adr) (copy [`adr/template.md`](adr/template.md); never rewrite an old one, supersede it) |
| What to build, in what order, what was cut | The backlog, [`00-backlog.md`](00-backlog.md), and its issues |
| What a PBI delivered, how each criterion was checked, what was not verified | `pbi/PBI-nn.md` |
| What the product must do | [`01-requirements.md`](01-requirements.md) |
| How to run and set up the project | [`setup.md`](setup.md) |
| Rules every AI session follows | [`../AGENTS.md`](../AGENTS.md) |
| An idea that is not planned yet | A file in [`ideas/`](ideas), plus a parked PBI in the backlog |
| A question only the owner can answer, or something only the owner can do | [`open-questions.md`](open-questions.md) |
| Where the project stands and what comes next | [`project-state.md`](project-state.md) |
| A trap of the environment that cost time | [`project-state.md`](project-state.md) (and [`../AGENTS.md`](../AGENTS.md) when every session must know it) |

## What an AI session does

- When a decision is taken in the chat, write it in the right place above, in a pull request, before the session ends. Do not wait to be asked and do not rely on a summary.
- Update [`project-state.md`](project-state.md) at the end of every PBI and every session, and [`open-questions.md`](open-questions.md) whenever a question is asked or answered.
- Hand a session over by pointing the next one at the repository (`AGENTS.md`, `project-state.md`, the `pbi/` documents), not by pasting a long summary. A pasted note is only a pointer; if it and the repository disagree, the repository wins.
- Do only what the owner asked and then stop: no extra branches, commits, pull requests or next steps without being asked (owner's rule of 2026-11-15, also in `AGENTS.md`).
- Leave the unit tests to the pipeline instead of running them after each change; the PR says so (same rule and date).
- Explanations for the owner, small talk and one-off answers need not be written down.

## What is enforced and what is a habit

`tests/test_docs.py` checks that these documents exist, link to each other, are linked from `AGENTS.md`, and that the PBIs and ADRs they name exist. It cannot check that a decision was written down at all: that depends on the habit above and on the owner noticing in review when something important lives only in a chat.
