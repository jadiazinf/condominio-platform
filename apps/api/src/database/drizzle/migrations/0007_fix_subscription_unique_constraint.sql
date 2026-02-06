-- Drop the current unique index that prevents multiple cancelled subscriptions
DROP INDEX IF EXISTS idx_subscriptions_active_unique;

-- Create a partial unique index that only applies to active and trial statuses
-- This allows multiple cancelled/expired subscriptions per company while ensuring
-- only one active or trial subscription at a time
CREATE UNIQUE INDEX idx_subscriptions_active_unique
ON management_company_subscriptions (management_company_id, status)
WHERE status IN ('active', 'trial');
