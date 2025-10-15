# Database Schema - ByteShop

## 🗄️ Visão Geral

O banco de dados do ByteShop utiliza PostgreSQL (via Supabase) com foco em:
- **Segurança**: Row Level Security (RLS) em todas as tabelas
- **Performance**: Índices estratégicos e views otimizadas
- **Integridade**: Foreign keys e constraints adequados
- **Automação**: Functions e triggers para lógica de negócio

---

## 📋 Tabelas

### 1. `users`
Extensão da tabela `auth.users` do Supabase para dados customizados.

```sql
users
├── id (uuid, PK, FK -> auth.users.id)
├── email (text, unique, not null)
├── full_name (text, not null)
├── role (user_role enum, default: 'customer')
├── created_at (timestamp)
└── updated_at (timestamp)
```

**Roles:**
- `customer`: Cliente normal
- `admin`: Administrador do sistema

**RLS:**
- Todos podem ler seus próprios dados
- Admins podem ler todos os dados
- Apenas o próprio usuário pode atualizar seus dados

---

### 2. `products`
Catálogo de produtos tecnológicos.

```sql
products
├── id (uuid, PK, default: gen_random_uuid())
├── name (text, not null)
├── description (text, not null)
├── price (numeric(10,2), not null, check > 0)
├── stock_quantity (integer, not null, check >= 0)
├── category (product_category enum, not null)
├── image_url (text)
├── specifications (jsonb)
├── is_active (boolean, default: true)
├── created_at (timestamp)
└── updated_at (timestamp)
```

**Categories:**
- laptops, smartphones, tablets, accessories, components, peripherals

**Índices:**
- `idx_products_category` - Busca por categoria
- `idx_products_price` - Filtro por preço
- `idx_products_active` - Produtos ativos
- `idx_products_search` - Full-text search (name + description)

**RLS:**
- Todos podem ler produtos ativos
- Apenas admins podem criar/atualizar/deletar

---

### 3. `cart_items`
Itens no carrinho de compras dos clientes.

```sql
cart_items
├── id (uuid, PK, default: gen_random_uuid())
├── user_id (uuid, FK -> users.id, not null)
├── product_id (uuid, FK -> products.id, not null)
├── quantity (integer, not null, check > 0, check <= 100)
├── created_at (timestamp)
└── updated_at (timestamp)

UNIQUE(user_id, product_id)
```

**Índices:**
- `idx_cart_user` - Busca rápida por usuário

**RLS:**
- Usuários podem ver/modificar apenas seus próprios itens
- Admins não têm acesso (carrinho é pessoal)

---

### 4. `orders`
Pedidos realizados pelos clientes.

```sql
orders
├── id (uuid, PK, default: gen_random_uuid())
├── user_id (uuid, FK -> users.id, not null)
├── total_amount (numeric(10,2), not null, check > 0)
├── status (order_status enum, default: 'pending')
├── shipping_address (text, not null)
├── created_at (timestamp)
└── updated_at (timestamp)
```

**Status:**
- pending, processing, shipped, delivered, cancelled

**Índices:**
- `idx_orders_user` - Pedidos por usuário
- `idx_orders_status` - Filtro por status
- `idx_orders_created` - Ordenação por data

**RLS:**
- Usuários veem apenas seus próprios pedidos
- Admins veem todos os pedidos
- Apenas admins podem atualizar status

---

### 5. `order_items`
Itens de cada pedido (snapshot do produto no momento da compra).

```sql
order_items
├── id (uuid, PK, default: gen_random_uuid())
├── order_id (uuid, FK -> orders.id ON DELETE CASCADE, not null)
├── product_id (uuid, FK -> products.id, not null)
├── quantity (integer, not null, check > 0)
├── unit_price (numeric(10,2), not null, check > 0)
├── subtotal (numeric(10,2), not null, check > 0)
└── created_at (timestamp)
```

**Índices:**
- `idx_order_items_order` - Itens por pedido
- `idx_order_items_product` - Produtos mais vendidos

**RLS:**
- Mesmas regras de `orders` (herda permissões via join)

---

## 🔍 Views Otimizadas

### 1. `product_inventory_view`
Dashboard de inventário para admins.

```sql
SELECT
  p.id,
  p.name,
  p.category,
  p.price,
  p.stock_quantity,
  p.is_active,
  COALESCE(SUM(oi.quantity), 0) as total_sold,
  COUNT(DISTINCT oi.order_id) as order_count
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id
```

---

### 2. `order_details_view`
Detalhes completos de pedidos com itens e produtos.

```sql
SELECT
  o.id as order_id,
  o.user_id,
  o.total_amount,
  o.status,
  o.shipping_address,
  o.created_at as order_date,
  json_agg(
    json_build_object(
      'product_id', p.id,
      'product_name', p.name,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'subtotal', oi.subtotal
    )
  ) as items
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY o.id
```

---

### 3. `user_order_history_view`
Histórico de pedidos dos usuários.

```sql
SELECT
  u.id as user_id,
  u.full_name,
  u.email,
  COUNT(o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_spent,
  MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id
```

---

## ⚙️ Functions do PostgreSQL

### 1. `calculate_order_total(order_id UUID)`
Calcula o total do pedido baseado nos itens.

```sql
RETURNS NUMERIC
```

Soma todos os subtotals dos order_items e atualiza o total_amount da order.

---

### 2. `update_order_status(order_id UUID, new_status TEXT)`
Atualiza status do pedido com validações.

```sql
RETURNS BOOLEAN
```

Valida transições de status e atualiza updated_at.

---

### 3. `check_product_availability(product_id UUID, quantity INTEGER)`
Verifica se há estoque suficiente.

```sql
RETURNS BOOLEAN
```

Retorna true se stock_quantity >= quantity.

---

### 4. `decrease_product_stock(product_id UUID, quantity INTEGER)`
Diminui o estoque do produto (chamado ao criar pedido).

```sql
RETURNS VOID
```

Atualiza stock_quantity -= quantity com validação.

---

## 🔔 Triggers

### 1. `update_updated_at_column`
Atualiza automaticamente a coluna `updated_at` em todas as tabelas.

```sql
BEFORE UPDATE ON [table]
FOR EACH ROW
EXECUTE FUNCTION update_updated_at()
```

---

### 2. `calculate_order_item_subtotal`
Calcula automaticamente subtotal = unit_price * quantity.

```sql
BEFORE INSERT OR UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION calculate_subtotal()
```

---

### 3. `update_order_total_on_item_change`
Atualiza total do pedido quando itens mudam.

```sql
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION recalculate_order_total()
```

---

## 🔐 Row Level Security (RLS)

Todas as tabelas têm RLS habilitado com políticas específicas:

### Padrão de Políticas

**SELECT:**
- Customers: apenas próprios dados
- Admins: todos os dados

**INSERT:**
- Customers: apenas próprios dados
- Admins: qualquer dado

**UPDATE:**
- Customers: apenas próprios dados
- Admins: qualquer dado

**DELETE:**
- Customers: apenas próprios dados (quando aplicável)
- Admins: qualquer dado

---

## 📈 Índices Estratégicos

Todos os índices foram criados para otimizar queries comuns:
- Foreign keys sempre indexadas
- Campos usados em WHERE/ORDER BY
- Campos usados em JOINs
- Full-text search para busca de produtos

---

## 🎯 Próximos Passos

1. ✅ Executar migration com criação das tabelas
2. ✅ Implementar políticas RLS
3. ✅ Criar functions e triggers
4. ✅ Criar views otimizadas
5. ✅ Popular banco com dados de teste (seeds)

---

**Total de objetos no banco:**
- 5 Tabelas
- 3 Views
- 4 Functions principais
- 3 Triggers
- ~10 Índices
- ~15 Políticas RLS
