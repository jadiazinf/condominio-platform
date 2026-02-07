-- ============================================================================
-- ADD IS_ACTIVE AND UPDATED_AT TO EXCHANGE RATES
-- ============================================================================

-- Add isActive column with default true
ALTER TABLE exchange_rates
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add updatedAt column
ALTER TABLE exchange_rates
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Drop the unique index on (from_currency_id, to_currency_id, effective_date)
-- since we now allow multiple records for the same pair+date (active + inactive)
DROP INDEX IF EXISTS idx_exchange_rates_unique;

-- Add index on is_active for filtering
CREATE INDEX idx_exchange_rates_active ON exchange_rates (is_active);
