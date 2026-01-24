-- ============================================================================
-- ADD PHONE COUNTRY CODE TO MANAGEMENT COMPANIES
-- ============================================================================

ALTER TABLE management_companies
ADD COLUMN phone_country_code VARCHAR(10);
