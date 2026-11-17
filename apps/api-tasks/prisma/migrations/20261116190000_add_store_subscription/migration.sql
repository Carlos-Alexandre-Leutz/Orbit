-- AlterTable: the monthly subscription of each store (Mercado Pago), with its 30 free days.
ALTER TABLE "Store" ADD COLUMN "subscriptionId" TEXT,
ADD COLUMN "subscriptionStatus" TEXT,
ADD COLUMN "trialEndsAt" TIMESTAMP(3);
