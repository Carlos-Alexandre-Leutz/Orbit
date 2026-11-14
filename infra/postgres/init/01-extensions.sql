-- Runs once, when the database volume is created. For an existing volume run it by hand:
--   docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS vector"
CREATE EXTENSION IF NOT EXISTS vector;
