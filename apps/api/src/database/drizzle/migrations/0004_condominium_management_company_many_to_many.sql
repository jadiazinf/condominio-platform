-- ============================================================================
-- REFACTOR: CONDOMINIUM - MANAGEMENT COMPANY MANY-TO-MANY RELATIONSHIP
-- ============================================================================
-- This migration converts the one-to-many relationship between condominiums
-- and management companies to a many-to-many relationship.
-- A condominium must now belong to at least one management company.

-- Step 1: Create the junction table
CREATE TABLE IF NOT EXISTS condominium_management_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_condo_mgmt_condominium ON condominium_management_companies(condominium_id);
CREATE INDEX IF NOT EXISTS idx_condo_mgmt_company ON condominium_management_companies(management_company_id);
CREATE INDEX IF NOT EXISTS idx_condo_mgmt_assigned_by ON condominium_management_companies(assigned_by);

-- Unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_condo_mgmt_unique ON condominium_management_companies(condominium_id, management_company_id);

-- Step 2: Migrate existing data from the FK column to the junction table
-- This will only insert records where management_company_id is not null
INSERT INTO condominium_management_companies (condominium_id, management_company_id, assigned_at, created_at, updated_at)
SELECT
  id as condominium_id,
  management_company_id,
  created_at as assigned_at,
  created_at,
  now() as updated_at
FROM condominiums
WHERE management_company_id IS NOT NULL
ON CONFLICT (condominium_id, management_company_id) DO NOTHING;

-- Step 3: Drop the old FK column and its index
DROP INDEX IF EXISTS idx_condominiums_management_company;
ALTER TABLE condominiums DROP COLUMN IF EXISTS management_company_id;
