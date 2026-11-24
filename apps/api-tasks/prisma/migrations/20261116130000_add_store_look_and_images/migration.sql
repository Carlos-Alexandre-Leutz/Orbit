-- AlterTable
ALTER TABLE "Store" ADD COLUMN "tagline" TEXT NOT NULL DEFAULT '',
ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
ADD COLUMN "logoImageId" TEXT,
ADD COLUMN "coverImageId" TEXT,
ADD COLUMN "contactEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN "contactPhone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "imageIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_storeId_idx" ON "Image"("storeId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
