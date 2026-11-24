-- The link to the tax invoice (nota fiscal) of an order, added by the seller.
ALTER TABLE "Order" ADD COLUMN "invoiceUrl" TEXT;
