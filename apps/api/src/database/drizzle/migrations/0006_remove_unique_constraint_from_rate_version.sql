-- Migration: Remove unique constraint from subscription_rates.version
-- This allows multiple rates to have the same version number

-- Drop the unique index on version
DROP INDEX IF EXISTS "idx_rates_version_unique";

-- Create a regular index on version (not unique)
CREATE INDEX IF NOT EXISTS "idx_rates_version" ON "subscription_rates" ("version");
