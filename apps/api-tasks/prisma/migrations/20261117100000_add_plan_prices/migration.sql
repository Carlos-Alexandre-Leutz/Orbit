-- CreateTable: the price of each plan, edited by an admin. It starts with the one plan, R$ 15 a month.
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Plan" ("id", "name", "priceCents", "currency", "updatedAt")
VALUES ('pro', 'Orbit Pro', 1500, 'BRL', CURRENT_TIMESTAMP);

-- AlterTable: a change of price is not about one store.
ALTER TABLE "AdminAction" ALTER COLUMN "storeId" DROP NOT NULL;
