-- ============================================
-- BYTESHOP DATABASE SCHEMA
-- Migration 001: Initial Schema
-- ============================================

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para full-text search

-- ============================================
-- ENUMS
-- ============================================

-- Roles de usuário
CREATE TYPE user_role AS ENUM ('customer', 'admin');

-- Categorias de produtos
CREATE TYPE product_category AS ENUM (
  'laptops',
  'smartphones',
  'tablets',
  'accessories',
  'components',
  'peripherals'
);

-- Status de pedidos
CREATE TYPE order_status AS ENUM (
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

-- ============================================
-- TABELAS
-- ============================================

-- Tabela de usuários (estende auth.users do Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE users IS 'Informações adicionais dos usuários do sistema';
COMMENT ON COLUMN users.role IS 'Role do usuário: customer (cliente) ou admin (administrador)';

-- ============================================

-- Tabela de produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  category product_category NOT NULL,
  image_url TEXT,
  specifications JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE products IS 'Catálogo de produtos tecnológicos';
COMMENT ON COLUMN products.specifications IS 'Especificações técnicas em formato JSON';

-- Índices para performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_stock ON products(stock_quantity);
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('portuguese', name || ' ' || description));

-- ============================================

-- Tabela de carrinho de compras
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Um usuário não pode ter o mesmo produto duplicado no carrinho
  UNIQUE(user_id, product_id)
);

-- Comentários
COMMENT ON TABLE cart_items IS 'Itens no carrinho de compras dos usuários';

-- Índices
CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE INDEX idx_cart_product ON cart_items(product_id);

-- ============================================

-- Tabela de pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0),
  status order_status NOT NULL DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE orders IS 'Pedidos realizados pelos clientes';

-- Índices
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================

-- Tabela de itens dos pedidos
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE order_items IS 'Itens individuais de cada pedido (snapshot do produto)';
COMMENT ON COLUMN order_items.unit_price IS 'Preço do produto no momento da compra';

-- Índices
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ============================================
-- FUNCTIONS E TRIGGERS
-- ============================================

-- Function para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================

-- Function para calcular subtotal do order_item automaticamente
CREATE OR REPLACE FUNCTION calculate_order_item_subtotal()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal = NEW.unit_price * NEW.quantity;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular subtotal
CREATE TRIGGER calculate_subtotal_trigger
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_item_subtotal();

-- ============================================

-- Function para recalcular total do pedido
CREATE OR REPLACE FUNCTION recalculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  order_uuid UUID;
BEGIN
  -- Determina o order_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    order_uuid := OLD.order_id;
  ELSE
    order_uuid := NEW.order_id;
  END IF;

  -- Atualiza o total da order
  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM order_items
    WHERE order_id = order_uuid
  )
  WHERE id = order_uuid;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular total quando itens mudam
CREATE TRIGGER update_order_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_total();

-- ============================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================

-- Function para verificar disponibilidade de produto
CREATE OR REPLACE FUNCTION check_product_availability(
  product_uuid UUID,
  required_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  available_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO available_stock
  FROM products
  WHERE id = product_uuid AND is_active = true;

  RETURN available_stock >= required_quantity;
END;
$$ LANGUAGE plpgsql;

-- ============================================

-- Function para diminuir estoque
CREATE OR REPLACE FUNCTION decrease_product_stock(
  product_uuid UUID,
  quantity_to_decrease INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - quantity_to_decrease
  WHERE id = product_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', product_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================

-- Function para atualizar status do pedido com validação
CREATE OR REPLACE FUNCTION update_order_status(
  order_uuid UUID,
  new_status order_status
)
RETURNS BOOLEAN AS $$
DECLARE
  current_status order_status;
BEGIN
  -- Busca status atual
  SELECT status INTO current_status
  FROM orders
  WHERE id = order_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', order_uuid;
  END IF;

  -- Validações de transição de status
  IF current_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot update a cancelled order';
  END IF;

  IF current_status = 'delivered' AND new_status != 'delivered' THEN
    RAISE EXCEPTION 'Cannot change status of a delivered order';
  END IF;

  -- Atualiza status
  UPDATE orders
  SET status = new_status
  WHERE id = order_uuid;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================

-- Function para calcular total do pedido (helper)
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  total NUMERIC(10, 2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO total
  FROM order_items
  WHERE order_id = order_uuid;

  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================

COMMENT ON FUNCTION check_product_availability IS 'Verifica se há estoque suficiente para um produto';
COMMENT ON FUNCTION decrease_product_stock IS 'Diminui o estoque de um produto (usado ao criar pedido)';
COMMENT ON FUNCTION update_order_status IS 'Atualiza status do pedido com validações de transição';
COMMENT ON FUNCTION calculate_order_total IS 'Calcula o total de um pedido baseado nos itens';
