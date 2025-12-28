-- ============================================================================
-- FOREIGN KEYS FOR CIRCULAR DEPENDENCIES
-- These foreign keys reference the users table from tables defined before users
-- ============================================================================

-- locations.registered_by -> users.id
ALTER TABLE locations
ADD CONSTRAINT fk_locations_registered_by
FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL;

-- currencies.registered_by -> users.id
ALTER TABLE currencies
ADD CONSTRAINT fk_currencies_registered_by
FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL;

-- exchange_rates.created_by -> users.id
ALTER TABLE exchange_rates
ADD CONSTRAINT fk_exchange_rates_created_by
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- exchange_rates.registered_by -> users.id
ALTER TABLE exchange_rates
ADD CONSTRAINT fk_exchange_rates_registered_by
FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL;
