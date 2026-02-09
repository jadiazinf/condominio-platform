-- ============================================================================
-- ADD ADMIN INVITATIONS TABLE
-- ============================================================================
-- The admin_invitations table tracks invitations sent to users to become
-- administrators of management companies. This is separate from user_invitations
-- which tracks invitations for regular users to join condominiums.
--
-- Note: This table may already exist if drizzle-kit push was used.
-- CREATE TABLE IF NOT EXISTS ensures idempotency.

CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL UNIQUE,
  token_hash VARCHAR(64) NOT NULL,
  status admin_invitation_status NOT NULL DEFAULT 'pending',
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  email_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_user ON admin_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_company ON admin_invitations(management_company_id);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token_hash ON admin_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_expires ON admin_invitations(expires_at);
