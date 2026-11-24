-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- CreateTable: the append-only record of what an actor did through a tool.
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorRole" "Role",
    "tool" TEXT NOT NULL,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB NOT NULL DEFAULT '{}',
    "outcome" "AuditOutcome" NOT NULL,
    "approverId" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_actorId_occurredAt_idx" ON "audit_log"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_log_tool_occurredAt_idx" ON "audit_log"("tool", "occurredAt");

-- Append-only: the table can be inserted into and read, never changed. The trigger stops the table owner too,
-- which a plain REVOKE cannot (an owner keeps its rights); the REVOKE covers every other role.
CREATE FUNCTION audit_log_reject_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER audit_log_no_update_delete
BEFORE UPDATE OR DELETE ON "audit_log"
FOR EACH ROW EXECUTE FUNCTION audit_log_reject_change();

CREATE TRIGGER audit_log_no_truncate
BEFORE TRUNCATE ON "audit_log"
FOR EACH STATEMENT EXECUTE FUNCTION audit_log_reject_change();

REVOKE UPDATE, DELETE, TRUNCATE ON "audit_log" FROM PUBLIC;
