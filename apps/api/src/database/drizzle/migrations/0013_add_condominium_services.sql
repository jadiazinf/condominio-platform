-- Create service_provider_type enum
DO $$ BEGIN
  CREATE TYPE service_provider_type AS ENUM ('individual', 'company', 'cooperative', 'government', 'internal');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create condominium_services table
CREATE TABLE IF NOT EXISTS condominium_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  provider_type service_provider_type NOT NULL,
  legal_name VARCHAR(255),
  tax_id_type VARCHAR(5),
  tax_id_number VARCHAR(50),
  email VARCHAR(255),
  phone_country_code VARCHAR(10),
  phone VARCHAR(50),
  address VARCHAR(500),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
  default_amount DECIMAL(15, 2),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create payment_concept_services junction table
CREATE TABLE IF NOT EXISTS payment_concept_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_concept_id UUID NOT NULL REFERENCES payment_concepts(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES condominium_services(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  use_default_amount BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(payment_concept_id, service_id)
);

-- Indexes for condominium_services
CREATE INDEX IF NOT EXISTS idx_condominium_services_condominium ON condominium_services(condominium_id);
CREATE INDEX IF NOT EXISTS idx_condominium_services_provider_type ON condominium_services(provider_type);
CREATE INDEX IF NOT EXISTS idx_condominium_services_active ON condominium_services(is_active);
CREATE INDEX IF NOT EXISTS idx_condominium_services_created_by ON condominium_services(created_by);

-- Indexes for payment_concept_services
CREATE INDEX IF NOT EXISTS idx_pcs_concept ON payment_concept_services(payment_concept_id);
CREATE INDEX IF NOT EXISTS idx_pcs_service ON payment_concept_services(service_id);
