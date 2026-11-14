# Setup

How to run Orbit on your machine. Everything here was run on a fresh clone; see `docs/pbi/PBI-04.md` for what was checked.

## What you need

- **Docker** with Compose v2.20 or newer (`docker compose version`). This is all you need to run the whole stack.
- Only if you work on the code outside Docker: Node 20 and pnpm 9 (`nvm use` reads `.nvmrc`; the default Node 16 breaks pnpm and the commit hook) and Python 3.12 for the scripts and their tests.

## Start everything with one command

```bash
cp .env.example .env
docker compose up -d --build --wait
```

The first run builds the images and takes a few minutes. When the command returns, every service is healthy.

| Service | Address | What it is |
|---|---|---|
| `frontend` | <http://localhost:3000> | Web app (redirects to `/login`) |
| `bff` | <http://localhost:3001/docs> | Backend for the frontend, with Swagger |
| `api-tasks` | <http://localhost:3002> | Store API (applies the Prisma migrations when it starts) |
| `db` | `127.0.0.1:5432` | PostgreSQL 16 with the `pgvector` extension |
| `mongo` | `127.0.0.1:27017` | MongoDB 7, with the user from `.env` |
| `ml` | not published | Machine learning service; today it only answers `/health` |

The databases listen on `127.0.0.1` only. The ML service is reachable only from the other containers; check it with:

```bash
docker compose exec ml python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read().decode())"
```

Check the vector extension:

```bash
docker compose exec db psql -U orbit -d orbit -c "select extname, extversion from pg_extension where extname = 'vector'"
```

## Change the ports

If a port is taken, set `POSTGRES_PORT` or `MONGO_PORT` in `.env`. The web, BFF and API ports are fixed in `docker-compose.yml`.

## Work on the code with hot reload

Run only the backing services in Docker, then the apps on your machine:

```bash
docker compose up -d --wait db mongo ml
pnpm install
```

Or run the apps in containers that watch your files:

```bash
docker compose -f docker-compose.dev.yml up --build
```

The second option was only validated, not started, when this page was written.

## Reset

```bash
docker compose down        # stop, keep the data
docker compose down -v     # stop and DELETE the databases
```

## Seed data and tests

- The fictional store is in [`seed/`](../seed/README.md); check it with `python3 scripts/seed_data.py --check`. Load the catalog with `pnpm --filter @orbit/api-tasks seed:catalog` (with `DATABASE_URL` pointing at the running database); the demo users are not loaded.
- Repository tests: `pnpm test:scripts` and `pnpm test:commitlint`. The ML service has its own: `cd services/ml && pip install -r requirements-dev.txt && pytest`.

## When something fails

| Symptom | Cause and fix |
|---|---|
| `required variable MONGO_PASSWORD is missing a value` | `.env` is missing or old. Copy `.env.example` again and keep your own values. |
| `port is already allocated` | Another program uses the port. Change `POSTGRES_PORT` or `MONGO_PORT`, or stop the other program. |
| `type "vector" does not exist` | The database volume is older than the pgvector image, so the init script never ran. The simplest fix, since development data is disposable, is `docker compose down -v` and start again. To keep the data, run `docker compose exec db psql -U orbit -d orbit -c "CREATE EXTENSION IF NOT EXISTS vector"`: it worked on an old volume in a test, but the old image was Alpine-based and the new one is Debian-based, so text sort order can differ in theory. |
| `api-tasks` stays unhealthy | Look at `docker compose logs api-tasks`. It starts only after the database is healthy and applies migrations first. |
| `Missing required environment variables: ...` | An app stopped at startup on purpose; fill the named variables in `.env`. |
| `URL.canParse is not a function` or similar on `pnpm` | You are on Node 16. Run `nvm use` (Node 20). |
