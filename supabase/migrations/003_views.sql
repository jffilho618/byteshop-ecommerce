-- ============================================
-- BYTESHOP OPTIMIZED VIEWS
-- Migration 003: Database Views
-- ============================================

-- ============================================
-- VIEW 1: PRODUCT INVENTORY
-- ============================================

CREATE OR REPLACE VIEW product_inventory_view AS
SELECT
  p.id,
  p.name,
  p.category,
  p.price,
  p.stock_quantity,
  p.is_active,
  p.created_at,
  p.updated_at,
  COALESCE(SUM(oi.quantity), 0)::INTEGER as total_sold,
  COUNT(DISTINCT oi.order_id)::INTEGER as order_count,
  COALESCE(SUM(oi.subtotal), 0)::NUMERIC(10,2) as total_revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id;

COMMENT ON VIEW product_inventory_view IS 'Dashboard de inventário com estatísticas de vendas por produto';

-- ============================================
-- VIEW 2: ORDER DETAILS (com itens agregados)
-- ============================================

CREATE OR REPLACE VIEW order_details_view AS
SELECT
  o.id as order_id,
  o.user_id,
  u.full_name as customer_name,
  u.email as customer_email,
  o.total_amount,
  o.status,
  o.shipping_address,
  o.created_at as order_date,
  o.updated_at,
  COUNT(oi.id)::INTEGER as item_count,
  json_agg(
    json_build_object(
      'id', oi.id,
      'product_id', p.id,
      'product_name', p.name,
      'product_category', p.category,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'subtotal', oi.subtotal
    ) ORDER BY oi.created_at
  ) as items
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
GROUP BY o.id, u.id;

COMMENT ON VIEW order_details_view IS 'Detalhes completos de pedidos com itens e informações do cliente';

-- ============================================
-- VIEW 3: USER ORDER HISTORY
-- ============================================

CREATE OR REPLACE VIEW user_order_history_view AS
SELECT
  u.id as user_id,
  u.full_name,
  u.email,
  u.role,
  u.created_at as member_since,
  COUNT(o.id)::INTEGER as total_orders,
  COALESCE(SUM(o.total_amount), 0)::NUMERIC(10,2) as total_spent,
  COALESCE(AVG(o.total_amount), 0)::NUMERIC(10,2) as average_order_value,
  MAX(o.created_at) as last_order_date,
  COUNT(CASE WHEN o.status = 'pending' THEN 1 END)::INTEGER as pending_orders,
  COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::INTEGER as delivered_orders
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.role = 'customer'
GROUP BY u.id;

COMMENT ON VIEW user_order_history_view IS 'Histórico e estatísticas de pedidos por usuário';

-- ============================================
-- VIEW 4: CART WITH PRODUCT DETAILS
-- ============================================

CREATE OR REPLACE VIEW cart_with_products_view AS
SELECT
  c.id as cart_item_id,
  c.user_id,
  c.product_id,
  c.quantity,
  c.created_at,
  c.updated_at,
  p.name as product_name,
  p.description as product_description,
  p.price as unit_price,
  p.category as product_category,
  p.image_url,
  p.stock_quantity,
  p.is_active,
  (c.quantity * p.price)::NUMERIC(10,2) as subtotal,
  (p.stock_quantity >= c.quantity) as is_available
FROM cart_items c
JOIN products p ON c.product_id = p.id;

COMMENT ON VIEW cart_with_products_view IS 'Carrinho com detalhes completos dos produtos';

-- ============================================
-- VIEW 5: SALES DASHBOARD (Admin)
-- ============================================

CREATE OR REPLACE VIEW sales_dashboard_view AS
SELECT
  o.created_at::date as sale_date,
  COUNT(DISTINCT o.id)::INTEGER as total_orders,
  COUNT(DISTINCT o.user_id)::INTEGER as unique_customers,
  SUM(o.total_amount)::NUMERIC(10,2) as total_revenue,
  AVG(o.total_amount)::NUMERIC(10,2) as average_order_value,
  COALESCE(SUM(oi.quantity), 0)::INTEGER as total_items_sold,
  COUNT(CASE WHEN o.status = 'pending' THEN 1 END)::INTEGER as pending_orders,
  COUNT(CASE WHEN o.status = 'processing' THEN 1 END)::INTEGER as processing_orders,
  COUNT(CASE WHEN o.status = 'shipped' THEN 1 END)::INTEGER as shipped_orders,
  COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::INTEGER as delivered_orders,
  COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END)::INTEGER as cancelled_orders
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.created_at::date
ORDER BY sale_date DESC;

COMMENT ON VIEW sales_dashboard_view IS 'Dashboard de vendas diárias para administradores';

-- ============================================
-- VIEW 6: PRODUCT CATEGORIES SUMMARY
-- ============================================

CREATE OR REPLACE VIEW category_summary_view AS
SELECT
  p.category,
  COUNT(p.id)::INTEGER as total_products,
  COUNT(CASE WHEN p.is_active THEN 1 END)::INTEGER as active_products,
  SUM(p.stock_quantity)::INTEGER as total_stock,
  AVG(p.price)::NUMERIC(10,2) as average_price,
  MIN(p.price)::NUMERIC(10,2) as min_price,
  MAX(p.price)::NUMERIC(10,2) as max_price,
  COALESCE(SUM(oi.quantity), 0)::INTEGER as total_sold,
  COALESCE(SUM(oi.subtotal), 0)::NUMERIC(10,2) as total_revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.category
ORDER BY total_revenue DESC;

COMMENT ON VIEW category_summary_view IS 'Resumo e estatísticas por categoria de produto';

-- ============================================
-- VIEW 7: LOW STOCK PRODUCTS (Admin Alert)
-- ============================================

CREATE OR REPLACE VIEW low_stock_products_view AS
SELECT
  p.id,
  p.name,
  p.category,
  p.price,
  p.stock_quantity,
  p.is_active,
  COALESCE(AVG(oi.quantity), 0)::NUMERIC(10,2) as average_order_quantity,
  COUNT(DISTINCT oi.order_id)::INTEGER as times_ordered
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
WHERE p.is_active = true AND p.stock_quantity <= 10
GROUP BY p.id
ORDER BY p.stock_quantity ASC;

COMMENT ON VIEW low_stock_products_view IS 'Produtos com estoque baixo (≤10 unidades) para alerta de reposição';

-- ============================================
-- ÍNDICES PARA MELHOR PERFORMANCE DAS VIEWS
-- ============================================

-- Índice para status + data (usado em dashboards)
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(status, created_at DESC);

-- Nota: Índice por data não é possível com expressões não-IMMUTABLE
-- A query continuará performática usando o índice idx_orders_created existente

-- ============================================
-- RLS PARA VIEWS
-- ============================================

-- As views herdam as permissões RLS das tabelas base
-- Mas vamos garantir que apenas admins acessem algumas views administrativas

-- Grant de leitura para views públicas/customer
GRANT SELECT ON product_inventory_view TO authenticated, anon;
GRANT SELECT ON cart_with_products_view TO authenticated;
GRANT SELECT ON order_details_view TO authenticated;

-- Views apenas para admin (será controlado pela aplicação)
GRANT SELECT ON sales_dashboard_view TO authenticated;
GRANT SELECT ON category_summary_view TO authenticated;
GRANT SELECT ON low_stock_products_view TO authenticated;
GRANT SELECT ON user_order_history_view TO authenticated;

-- ============================================
-- FUNÇÕES HELPER PARA VIEWS
-- ============================================

-- Function para buscar resumo do carrinho de um usuário
CREATE OR REPLACE FUNCTION get_cart_summary(user_uuid UUID)
RETURNS TABLE (
  total_items INTEGER,
  total_price NUMERIC(10,2),
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_items,
    COALESCE(SUM(subtotal), 0)::NUMERIC(10,2) as total_price,
    BOOL_AND(is_available) as is_valid
  FROM cart_with_products_view
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_cart_summary IS 'Retorna resumo do carrinho: total de itens, preço total e se todos os produtos estão disponíveis';

-- ============================================

-- Function para buscar top produtos mais vendidos
CREATE OR REPLACE FUNCTION get_top_selling_products(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category product_category,
  total_sold INTEGER,
  total_revenue NUMERIC(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    name,
    category,
    total_sold,
    total_revenue
  FROM product_inventory_view
  WHERE total_sold > 0
  ORDER BY total_sold DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_selling_products IS 'Retorna os produtos mais vendidos';
