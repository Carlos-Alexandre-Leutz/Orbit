-- AlterTable: a store can show up to five banners; the old single cover becomes the first one.
ALTER TABLE "Store" ADD COLUMN "bannerImageIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Store" SET "bannerImageIds" = ARRAY["coverImageId"] WHERE "coverImageId" IS NOT NULL;

ALTER TABLE "Store" DROP COLUMN "coverImageId";
