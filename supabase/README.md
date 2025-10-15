# Supabase Database - ByteShop

## 📦 Estrutura de Arquivos

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # Tabelas, ENUMs, Functions, Triggers
│   ├── 002_rls_policies.sql      # Row Level Security policies
│   └── 003_views.sql             # Views otimizadas
├── seeds/
│   └── 001_sample_data.sql       # Dados de exemplo (16 produtos)
└── functions/                     # Edge Functions (a implementar)
```

---

## 🗄️ Database Schema

### Tabelas (5)

1. **users** - Dados customizados dos usuários
2. **products** - Catálogo de produtos
3. **cart_items** - Carrinho de compras
4. **orders** - Pedidos
5. **order_items** - Itens dos pedidos

### Views (7)

1. **product_inventory_view** - Inventário com estatísticas
2. **order_details_view** - Detalhes completos de pedidos
3. **user_order_history_view** - Histórico de clientes
4. **cart_with_products_view** - Carrinho com detalhes
5. **sales_dashboard_view** - Dashboard de vendas
6. **category_summary_view** - Resumo por categoria
7. **low_stock_products_view** - Produtos com estoque baixo

### Functions (8+)

**Business Logic:**
- `check_product_availability` - Verifica estoque
- `decrease_product_stock` - Diminui estoque
- `update_order_status` - Atualiza status com validação
- `calculate_order_total` - Calcula total do pedido

**Helpers:**
- `is_admin` - Verifica se usuário é admin
- `get_user_role` - Retorna role do usuário
- `get_cart_summary` - Resumo do carrinho
- `get_top_selling_products` - Top produtos

**System:**
- `update_updated_at_column` - Atualiza timestamp
- `calculate_order_item_subtotal` - Calcula subtotal
- `recalculate_order_total` - Recalcula total
- `prevent_role_change` - Previne mudança não autorizada

### Políticas RLS (~15)

**Padrão de segurança:**
- Customers: apenas próprios dados
- Admins: todos os dados
- Products: leitura pública, escrita apenas admin
- Cart: totalmente privado por usuário
- Orders: leitura própria + admin, escrita protegida

---

## 🚀 Como Usar

### 1. Executar Migrations

Consulte [SUPABASE_SETUP.md](../docs/SUPABASE_SETUP.md) para instruções detalhadas.

**Ordem de execução:**
1. `001_initial_schema.sql` ← Criar primeiro
2. `002_rls_policies.sql`
3. `003_views.sql`
4. `001_sample_data.sql` (opcional)

### 2. Criar Admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'seu-email@example.com';
```

### 3. Testar

```sql
-- Ver produtos
SELECT * FROM product_inventory_view;

-- Ver pedidos com detalhes
SELECT * FROM order_details_view;

-- Testar function
SELECT check_product_availability('product-uuid', 5);
```

---

## 🎯 Destaques Técnicos

### ✅ Performance
- Índices estratégicos em foreign keys
- Full-text search em produtos
- Views materializadas para aggregações
- Queries otimizadas com JOINs eficientes

### ✅ Segurança
- RLS habilitado em todas as tabelas
- Políticas granulares por role
- Validação de transições de status
- Proteção contra mudança não autorizada de role

### ✅ Integridade
- Foreign keys com CASCADE/RESTRICT apropriados
- CHECK constraints para validação
- Triggers para cálculos automáticos
- UNIQUE constraints onde necessário

### ✅ Automação
- Timestamp automático (created_at, updated_at)
- Cálculo automático de subtotals
- Recálculo automático de totais
- Validações no nível do banco

---

## 📊 Exemplo de Queries Otimizadas

### Query 1: Produtos mais vendidos com estoque

```sql
SELECT
  name,
  category,
  total_sold,
  stock_quantity,
  total_revenue
FROM product_inventory_view
WHERE total_sold > 0
ORDER BY total_sold DESC
LIMIT 10;
```

### Query 2: Pedidos de um cliente com itens

```sql
SELECT *
FROM order_details_view
WHERE user_id = 'user-uuid'
ORDER BY order_date DESC;
```

### Query 3: Dashboard de vendas do mês

```sql
SELECT
  sale_date,
  total_orders,
  total_revenue,
  average_order_value
FROM sales_dashboard_view
WHERE sale_date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY sale_date DESC;
```

---

## 🔄 Próximas Implementações

- [ ] Edge Functions para automação
- [ ] Triggers para emails
- [ ] Audit logs
- [ ] Soft delete em produtos
- [ ] Histórico de preços

---

**Status:** ✅ Schema completo e pronto para uso
