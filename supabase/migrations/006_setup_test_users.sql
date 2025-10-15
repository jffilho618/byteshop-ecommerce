-- ============================================
-- BYTESHOP - SETUP TEST USERS
-- Migration 006: Confirmar emails e criar usuário admin
-- ============================================

-- 1. Confirmar todos os emails pendentes (desenvolvimento)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Criar usuário admin de teste
-- IMPORTANTE: Você precisa primeiro criar a conta via Dashboard ou frontend
-- Depois, execute esta query substituindo o email:

-- UPDATE users
-- SET role = 'admin'
-- WHERE email = 'seu-admin@exemplo.com';

-- Exemplo:
-- UPDATE users
-- SET role = 'admin'
-- WHERE email = 'admin@byteshop.com';

COMMENT ON TABLE users IS 'Tabela de usuários - use migration 006 para configurar roles';