-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentRef" TEXT;

-- CreateTable
CREATE TABLE "ProcessedPaymentEvent" (
    "id" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedPaymentEvent_pkey" PRIMARY KEY ("id")
);
