-- AlterTable: the agent that took each audited step. Adding a column is not blocked by the append-only triggers.
ALTER TABLE "audit_log" ADD COLUMN "agent" TEXT;
