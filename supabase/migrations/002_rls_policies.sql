-- ============================================
-- BYTESHOP ROW LEVEL SECURITY (RLS)
-- Migration 002: RLS Policies
-- ============================================

-- ============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS PARA RLS
-- ============================================

-- Function para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function para pegar role do usuário atual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- POLÍTICAS: USERS
-- ============================================

-- SELECT: Usuários podem ver seus próprios dados, admins veem tudo
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id OR is_admin());

-- INSERT: Apenas durante signup (handled by Supabase Auth + trigger)
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: Usuários podem atualizar seus próprios dados (exceto role)
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (role = (SELECT role FROM users WHERE id = auth.uid()) OR is_admin())
  );

-- DELETE: Apenas admins podem deletar usuários
CREATE POLICY "Only admins can delete users"
  ON users FOR DELETE
  USING (is_admin());

-- ============================================
-- POLÍTICAS: PRODUCTS
-- ============================================

-- SELECT: Todos podem ver produtos ativos, admins veem todos
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true OR is_admin());

-- INSERT: Apenas admins podem criar produtos
CREATE POLICY "Only admins can create products"
  ON products FOR INSERT
  WITH CHECK (is_admin());

-- UPDATE: Apenas admins podem atualizar produtos
CREATE POLICY "Only admins can update products"
  ON products FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Apenas admins podem deletar produtos (soft delete preferível)
CREATE POLICY "Only admins can delete products"
  ON products FOR DELETE
  USING (is_admin());

-- ============================================
-- POLÍTICAS: CART_ITEMS
-- ============================================

-- SELECT: Usuários veem apenas seus próprios itens do carrinho
CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Usuários podem adicionar ao próprio carrinho
CREATE POLICY "Users can add to own cart"
  ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuários podem atualizar próprio carrinho
CREATE POLICY "Users can update own cart"
  ON cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuários podem remover do próprio carrinho
CREATE POLICY "Users can delete from own cart"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS: ORDERS
-- ============================================

-- SELECT: Usuários veem próprios pedidos, admins veem todos
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

-- INSERT: Usuários podem criar próprios pedidos
CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Apenas admins podem atualizar pedidos (ex: status)
CREATE POLICY "Only admins can update orders"
  ON orders FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Apenas admins podem deletar pedidos
CREATE POLICY "Only admins can delete orders"
  ON orders FOR DELETE
  USING (is_admin());

-- ============================================
-- POLÍTICAS: ORDER_ITEMS
-- ============================================

-- SELECT: Usuários veem itens dos próprios pedidos, admins veem tudo
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR is_admin())
    )
  );

-- INSERT: Apenas durante criação de pedido (via trigger/function)
-- Usuários podem inserir itens apenas nos próprios pedidos
CREATE POLICY "Users can create items for own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- UPDATE: Apenas admins (normalmente order_items são imutáveis)
CREATE POLICY "Only admins can update order items"
  ON order_items FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Apenas admins
CREATE POLICY "Only admins can delete order items"
  ON order_items FOR DELETE
  USING (is_admin());

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION is_admin IS 'Verifica se o usuário autenticado é um administrador';
COMMENT ON FUNCTION get_user_role IS 'Retorna o role do usuário autenticado';

-- ============================================
-- GRANTS (Permissões para authenticated users)
-- ============================================

-- Garantir que usuários autenticados possam acessar as tabelas
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT ON products TO authenticated, anon; -- Produtos podem ser vistos por não-autenticados
GRANT INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items TO authenticated;

-- ============================================
-- VALIDAÇÕES ADICIONAIS
-- ============================================

-- Trigger para prevenir mudança de role por não-admins
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role != NEW.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_unauthorized_role_change
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();
