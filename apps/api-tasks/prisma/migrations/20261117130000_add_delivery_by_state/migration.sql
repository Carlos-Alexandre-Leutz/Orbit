-- Delivery time per destination state: { "SC": { "min": 8, "max": 15 } }, in business days. Empty means the store's general days.
ALTER TABLE "Store" ADD COLUMN "deliveryByState" JSONB NOT NULL DEFAULT '{}';
