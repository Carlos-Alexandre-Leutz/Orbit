-- CreateEnum
CREATE TYPE "LlmCallOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable: one row per call to a language model.
CREATE TABLE "LlmCall" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "outcome" "LlmCallOutcome" NOT NULL,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicroUsd" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "LlmCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmCall_createdAt_idx" ON "LlmCall"("createdAt");

-- CreateIndex
CREATE INDEX "LlmCall_correlationId_idx" ON "LlmCall"("correlationId");

-- CreateIndex
CREATE INDEX "LlmCall_model_createdAt_idx" ON "LlmCall"("model", "createdAt");
