-- ============================================
-- BYTESHOP - CREATE USER FUNCTION
-- Migration 005: Function para criar perfil de usuário após signup
-- ============================================

-- Function para criar perfil de usuário (bypassa RLS)
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_role user_role DEFAULT 'customer'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO users (id, email, full_name, role)
  VALUES (user_id, user_email, user_full_name, user_role)
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_user_profile IS 'Cria ou atualiza o perfil do usuário (bypassa RLS)';

-- Grant execute para authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;