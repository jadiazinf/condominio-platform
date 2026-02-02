-- ============================================================================
-- ADD USER PERMISSIONS TABLE
-- ============================================================================
-- This table allows assigning permissions directly to users (e.g., superadmins)
-- instead of relying solely on role-based permissions.

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_assigned_by ON user_permissions(assigned_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_unique ON user_permissions(user_id, permission_id);

-- ============================================================================
-- ADD USER INVITATIONS TABLE
-- ============================================================================
-- Tracks invitations sent to users to join the platform and be assigned to condominiums.

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL UNIQUE,
  token_hash VARCHAR(64) NOT NULL,
  status admin_invitation_status DEFAULT 'pending' NOT NULL,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  email_error TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_user ON user_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_condominium ON user_invitations(condominium_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_role ON user_invitations(role_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token_hash ON user_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON user_invitations(expires_at);
