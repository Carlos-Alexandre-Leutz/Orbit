-- AlterTable
ALTER TABLE "Store" ADD COLUMN "highlights" JSONB NOT NULL DEFAULT '[]';

-- Categories now belong to a store.
ALTER TABLE "Category" ADD COLUMN "storeId" TEXT;
DROP INDEX "Category_slug_key";
CREATE UNIQUE INDEX "Category_storeId_slug_key" ON "Category"("storeId", "slug");
CREATE INDEX "Category_storeId_idx" ON "Category"("storeId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Each store gets its own copy of the shared categories its products use, and its products move to the copy.
INSERT INTO "Category" ("id", "slug", "name", "storeId", "createdAt")
SELECT gen_random_uuid()::text, c."slug", c."name", p."storeId", CURRENT_TIMESTAMP
FROM "Category" c
JOIN "Product" p ON p."categoryId" = c."id"
WHERE c."storeId" IS NULL
GROUP BY c."slug", c."name", p."storeId";

UPDATE "Product" p
SET "categoryId" = n."id"
FROM "Category" o, "Category" n
WHERE p."categoryId" = o."id"
  AND o."storeId" IS NULL
  AND n."storeId" = p."storeId"
  AND n."slug" = o."slug";

-- The shared copies nobody uses any more go away.
DELETE FROM "Category" c
WHERE c."storeId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Product" p WHERE p."categoryId" = c."id");
