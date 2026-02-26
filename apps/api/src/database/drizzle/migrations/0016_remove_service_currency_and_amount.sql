-- Remove currency_id and default_amount from condominium_services
ALTER TABLE "condominium_services" DROP CONSTRAINT IF EXISTS "condominium_services_currency_id_currencies_id_fk";
ALTER TABLE "condominium_services" DROP COLUMN IF EXISTS "currency_id";
ALTER TABLE "condominium_services" DROP COLUMN IF EXISTS "default_amount";
