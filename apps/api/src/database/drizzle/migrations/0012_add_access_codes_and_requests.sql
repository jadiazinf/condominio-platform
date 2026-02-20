-- Access request status enum
DO $$ BEGIN
  CREATE TYPE access_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Condominium access codes table
CREATE TABLE IF NOT EXISTS condominium_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  code VARCHAR(8) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_access_codes_condominium ON condominium_access_codes(condominium_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON condominium_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON condominium_access_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_access_codes_expires ON condominium_access_codes(expires_at);

-- Access requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_code_id UUID NOT NULL REFERENCES condominium_access_codes(id) ON DELETE CASCADE,
  ownership_type ownership_type NOT NULL,
  status access_request_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_condominium ON access_requests(condominium_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_unit ON access_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_user ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_access_code ON access_requests(access_code_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
