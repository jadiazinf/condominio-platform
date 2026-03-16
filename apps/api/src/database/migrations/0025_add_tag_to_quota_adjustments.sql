ALTER TABLE "quota_adjustments" ADD COLUMN IF NOT EXISTS "tag" text;

-- Backfill existing adjustments with known tags
UPDATE "quota_adjustments"
SET "tag" = 'early_discount'
WHERE "adjustment_type" = 'discount'
  AND "reason" LIKE 'Descuento por pronto pago:%'
  AND "tag" IS NULL;

UPDATE "quota_adjustments"
SET "tag" = 'late_surcharge'
WHERE "adjustment_type" = 'increase'
  AND "reason" LIKE 'Recargo por mora:%'
  AND "tag" IS NULL;
