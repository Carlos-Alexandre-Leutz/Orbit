-- AlterTable: the request each audit entry belongs to. Adding a column is not blocked by the append-only triggers.
ALTER TABLE "audit_log" ADD COLUMN "correlationId" TEXT;

-- CreateIndex
CREATE INDEX "audit_log_correlationId_idx" ON "audit_log"("correlationId");
