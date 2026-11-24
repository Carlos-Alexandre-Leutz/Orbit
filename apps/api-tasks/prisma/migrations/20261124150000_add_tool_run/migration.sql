-- AlterEnum: a tool held until a human approves it.
ALTER TYPE "AuditOutcome" ADD VALUE 'PENDING_APPROVAL';

-- CreateEnum
CREATE TYPE "ToolRunStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');

-- CreateTable: one execution of a tool that changes data, claimed by its idempotency key.
CREATE TABLE "ToolRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actorId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "ToolRunStatus" NOT NULL DEFAULT 'STARTED',
    "result" JSONB,
    "error" TEXT,

    CONSTRAINT "ToolRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolRun_actorId_tool_idempotencyKey_key" ON "ToolRun"("actorId", "tool", "idempotencyKey");
