-- Carts and orders that existed before stores belong to the demo store, which holds the old catalog.

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN "storeId" TEXT;
UPDATE "Cart" SET "storeId" = (SELECT "id" FROM "Store" WHERE "slug" = 'demo-store');
ALTER TABLE "Cart" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "Order" ADD COLUMN "storeId" TEXT;
UPDATE "Order" SET "storeId" = (SELECT "id" FROM "Store" WHERE "slug" = 'demo-store');
ALTER TABLE "Order" ALTER COLUMN "storeId" SET NOT NULL;

-- DropIndex
DROP INDEX "Cart_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_storeId_key" ON "Cart"("userId", "storeId");

-- CreateIndex
CREATE INDEX "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
