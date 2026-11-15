-- The platform needs a store to hold the products that existed before stores did.
-- Its owner is a seller that cannot log in (the stored "password" is not a bcrypt hash);
-- the owner of the platform can give it a password through the reset flow or retire it.
INSERT INTO "User" ("id", "email", "name", "password", "role", "updatedAt")
SELECT gen_random_uuid(), 'demo-seller@orbit.invalid', 'Demo seller', '!', 'SELLER', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Store" WHERE "slug" = 'demo-store');

INSERT INTO "Store" ("id", "slug", "name", "description", "ownerId", "updatedAt")
SELECT gen_random_uuid(), 'demo-store', 'Orbit Demo Store', 'The store that holds the demo catalog.', "id", CURRENT_TIMESTAMP
FROM "User" WHERE "email" = 'demo-seller@orbit.invalid'
  AND NOT EXISTS (SELECT 1 FROM "Store" WHERE "slug" = 'demo-store');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "storeId" TEXT;
UPDATE "Product" SET "storeId" = (SELECT "id" FROM "Store" WHERE "slug" = 'demo-store');
ALTER TABLE "Product" ALTER COLUMN "storeId" SET NOT NULL;

-- DropIndex
DROP INDEX "Product_sku_key";

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_sku_key" ON "Product"("storeId", "sku");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
