-- CreateTable
CREATE TABLE "StoreCustomer" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreCustomer_storeId_userId_key" ON "StoreCustomer"("storeId", "userId");

-- CreateIndex
CREATE INDEX "StoreCustomer_userId_idx" ON "StoreCustomer"("userId");

-- AddForeignKey
ALTER TABLE "StoreCustomer" ADD CONSTRAINT "StoreCustomer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCustomer" ADD CONSTRAINT "StoreCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Customers who already bought in a store are its customers.
INSERT INTO "StoreCustomer" ("id", "storeId", "userId")
SELECT gen_random_uuid()::text, "storeId", "userId" FROM "Order" GROUP BY "storeId", "userId";
