-- Add tax rate to subscription_rates
ALTER TABLE subscription_rates
  ADD COLUMN tax_rate DECIMAL(5,4) DEFAULT NULL;

-- Add tax configuration fields to condominium_services
ALTER TABLE condominium_services
  ADD COLUMN charges_iva BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN iva_rate DECIMAL(5,4) NOT NULL DEFAULT 0.16,
  ADD COLUMN subject_to_islr_retention BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN islr_retention_rate DECIMAL(5,4) NOT NULL DEFAULT 0.01;
