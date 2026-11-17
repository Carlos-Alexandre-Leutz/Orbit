-- Delivery management: how long a store takes to deliver, where an order goes, and its tracking code.
ALTER TABLE "Store"
  ADD COLUMN "handlingDays" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deliveryDaysMin" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "deliveryDaysMax" INTEGER NOT NULL DEFAULT 7;

ALTER TABLE "Order"
  ADD COLUMN "shippingAddress" JSONB,
  ADD COLUMN "trackingCode" TEXT,
  ADD COLUMN "estimatedFrom" TIMESTAMP(3),
  ADD COLUMN "estimatedTo" TIMESTAMP(3);
