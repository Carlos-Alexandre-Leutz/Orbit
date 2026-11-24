# ADR-002: Machine learning in a separate Python service

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

Orbit forecasts sales, estimates delivery time and models delivery delay risk with scikit-learn (PBI-25, PBI-26, PBI-30). The rest of the backend is TypeScript (see [ADR-001](ADR-001-stack.md)), and agents must reach the models through governed tools that are audited and permission-checked.

Two rules from the project also apply: a model is always compared against a baseline and reported honestly, and the data is simulated.

## Decision

Models are trained and served by a **separate Python service** (FastAPI, scikit-learn, joblib), in its own directory under `services/`.

- The TypeScript backend never loads a model. Agent tools such as `forecast_demand` and `estimate_delivery` call the service over HTTP; the tool layer records the model version, inputs and output in the audit log (PBI-28).
- The service is reachable only on the internal Compose network, never from the internet (PBI-27).
- Each saved model carries metadata: version, date, metrics and a hash of the training data, and has a model card in `docs/` (PBI-27).
- Training and evaluation live in the same service, with pytest tests and ruff in CI (PBI-05, PBI-26).

State today: nothing of this exists yet. There is no Python service in the repository.

## Alternatives considered

- **Machine learning in TypeScript.** One language. Not chosen: the scikit-learn ecosystem (pipelines, time-series cross-validation, metrics, joblib) has no equivalent that would be as reliable or as readable for a reviewer.
- **Calling Python as a child process from NestJS.** No extra service. Not chosen: it hides the model behind process management, makes versioning and health checks harder and mixes two runtimes in one container.
- **A managed ML or forecasting API.** Less to build. Not chosen: the project exists to show the whole pipeline (data, baseline, metrics, lifecycle), which a hosted black box would hide.
- **Notebooks only.** Enough to explore. Not chosen as the delivery: the agent needs a callable, versioned service, although a notebook is still used for exploration (PBI-25).

## Consequences

- One more service to build, test, deploy and monitor, with its own images and CI jobs.
- A network call between the agent and the models, so tools need timeouts and a defined failure behavior when the service is down.
- The contract between the tools and the service has to be versioned, because the two sides change at different speeds.
- The boundary makes governance simpler: the audit entry of a tool call can name the model version, and a model that does not beat its baseline can be blocked from promotion (PBI-31) without touching the agent code.
