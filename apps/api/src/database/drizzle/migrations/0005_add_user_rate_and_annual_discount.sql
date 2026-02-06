-- ============================================================================
-- ADD USER RATE AND ANNUAL DISCOUNT TO SUBSCRIPTION RATES
-- ============================================================================
-- This migration adds user-based pricing and automatic annual discount support
-- to the subscription rates table.
--
-- Changes:
-- 1. Add user_rate column for pricing based on active management company users
-- 2. Add annual_discount_percentage column for automatic annual subscription discounts

-- Step 1: Add user_rate column with default value of 0
ALTER TABLE subscription_rates
ADD COLUMN IF NOT EXISTS user_rate DECIMAL(10, 2) NOT NULL DEFAULT '0';

-- Step 2: Add annual_discount_percentage column with default value of 15%
ALTER TABLE subscription_rates
ADD COLUMN IF NOT EXISTS annual_discount_percentage DECIMAL(5, 2) NOT NULL DEFAULT '15';

-- Step 3: Add comments for documentation
COMMENT ON COLUMN subscription_rates.user_rate IS 'Monthly rate per active management company user (staff member). Default 0 means no user-based pricing.';
COMMENT ON COLUMN subscription_rates.annual_discount_percentage IS 'Automatic percentage discount applied to annual subscriptions. Default 15%.';
