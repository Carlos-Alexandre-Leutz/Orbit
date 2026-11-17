-- AlterTable: each store connects its own payment provider; the secrets are stored encrypted.
ALTER TABLE "Store" ADD COLUMN "paymentProvider" TEXT,
ADD COLUMN "paymentPublicKey" TEXT,
ADD COLUMN "paymentCredentials" TEXT;
