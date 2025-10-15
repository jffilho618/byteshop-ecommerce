# Supabase Setup Guide - ByteShop

## 🎯 Objetivo

Este guia detalha como executar as migrations SQL no Supabase para criar toda a estrutura do banco de dados do ByteShop.

---

## 📋 Pré-requisitos

1. ✅ Conta no Supabase criada
2. ✅ Projeto criado no Supabase
3. ✅ Credenciais copiadas para o arquivo `.env`

---

## 🚀 Execução das Migrations

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o SQL Editor**
   - Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecione seu projeto ByteShop
   - No menu lateral, clique em **"SQL Editor"**

2. **Execute as migrations na ordem**

   Copie e cole o conteúdo de cada arquivo SQL na ordem abaixo:

   #### Migration 001: Initial Schema
   ```
   Arquivo: supabase/migrations/001_initial_schema.sql
   ```
   - Cria ENUMs (user_role, product_category, order_status)
   - Cria todas as tabelas (users, products, cart_items, orders, order_items)
   - Cria índices para performance
   - Cria functions (calculate_order_total, update_order_status, etc.)
   - Cria triggers (updated_at, subtotal calculation)

   **Execute** e aguarde confirmação de sucesso.

   ---

   #### Migration 002: RLS Policies
   ```
   Arquivo: supabase/migrations/002_rls_policies.sql
   ```
   - Habilita RLS em todas as tabelas
   - Cria helper functions (is_admin, get_user_role)
   - Cria ~15 políticas de segurança
   - Configura grants de permissão

   **Execute** e aguarde confirmação de sucesso.

   ---

   #### Migration 003: Views
   ```
   Arquivo: supabase/migrations/003_views.sql
   ```
   - Cria 7 views otimizadas:
     - product_inventory_view
     - order_details_view
     - user_order_history_view
     - cart_with_products_view
     - sales_dashboard_view
     - category_summary_view
     - low_stock_products_view
   - Cria helper functions para views

   **Execute** e aguarde confirmação de sucesso.

   ---

   #### Migration 004: Storage Helper Functions
   ```
   Arquivo: supabase/migrations/004_storage_setup.sql
   ```
   - Cria function `get_product_image_url()` para gerar URLs
   - Cria view `products_with_images_view` com URLs processadas

   **Execute** e aguarde confirmação de sucesso.

   **IMPORTANTE:** O bucket e as políticas RLS do Storage **NÃO podem ser criados via SQL**.
   Siga o guia: **[STORAGE_DASHBOARD_SETUP.md](./STORAGE_DASHBOARD_SETUP.md)** para configurar via Dashboard.

   ---

   #### Seed 001: Sample Data (Opcional)
   ```
   Arquivo: supabase/seeds/001_sample_data.sql
   ```
   - Insere 16 produtos de exemplo em todas as categorias
   - Útil para desenvolvimento e testes

   **Execute** apenas se quiser dados de exemplo.

---

### Opção 2: Via CLI do Supabase (Avançado)

Se você tem o Supabase CLI instalado:

```bash
# 1. Login no Supabase
supabase login

# 2. Link com seu projeto
supabase link --project-ref your-project-ref

# 3. Aplicar migrations
supabase db push

# 4. (Opcional) Executar seeds
supabase db seed
```

---

## ✅ Verificação

Após executar todas as migrations, verifique se tudo foi criado corretamente:

### 1. Verificar Tabelas

No SQL Editor, execute:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Esperado:**
- cart_items
- order_items
- orders
- products
- users

---

### 2. Verificar Views

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Esperado:**
- cart_with_products_view
- category_summary_view
- low_stock_products_view
- order_details_view
- product_inventory_view
- products_with_images_view
- sales_dashboard_view
- user_order_history_view

---

### 3. Verificar Functions

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**Esperado (principais):**
- calculate_order_total
- check_product_availability
- decrease_product_stock
- get_cart_summary
- get_top_selling_products
- is_admin
- update_order_status

---

### 4. Verificar RLS

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Deve retornar ~15 políticas distribuídas entre as tabelas.

---

### 5. Verificar Produtos (se executou seed)

```sql
SELECT COUNT(*) as total_products FROM products;
```

**Esperado:** 16 produtos

---

## 🔐 Criar Primeiro Usuário Admin

Após as migrations, você precisa criar um usuário admin:

### 1. Criar conta via Supabase Auth

No dashboard:
- Vá em **"Authentication" → "Users"**
- Clique em **"Add user"** → **"Create new user"**
- Email: `admin@byteshop.com`
- Password: escolha uma senha segura
- Clique em **"Create user"**

### 2. Promover para Admin

No SQL Editor:

```sql
-- Substituir pelo email real do admin
UPDATE users
SET role = 'admin'
WHERE email = 'admin@byteshop.com';
```

---

## 📊 Testar o Banco

### Teste 1: Buscar Produtos

```sql
SELECT * FROM products WHERE is_active = true LIMIT 5;
```

### Teste 2: Usar View

```sql
SELECT * FROM product_inventory_view ORDER BY total_sold DESC LIMIT 5;
```

### Teste 3: Testar Function

```sql
SELECT check_product_availability(
  (SELECT id FROM products LIMIT 1),
  5
);
```

---

## 🎨 Próximos Passos

Após confirmar que tudo está funcionando:

1. ✅ Atualizar arquivo `.env` com as credenciais
2. ✅ Criar usuário admin
3. ✅ Testar autenticação via API
4. ✅ Implementar Services e Controllers
5. ✅ Integrar frontend

---

## ⚠️ Troubleshooting

### Erro: "permission denied for schema public"

**Solução:** Verifique se você está usando a aba correta no SQL Editor (deve ser a do seu projeto).

---

### Erro: "relation already exists"

**Solução:** A tabela/view já foi criada. Você pode:
- Ignorar (se for reexecutar)
- Dropar antes: `DROP TABLE IF EXISTS nome_tabela CASCADE;`

---

### Erro ao criar políticas RLS

**Solução:** Certifique-se de que executou a migration 001 primeiro (ela cria as tabelas).

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Supabase Dashboard
2. Confira se executou as migrations na ordem correta
3. Revise a documentação do Supabase: https://supabase.com/docs

---

**Status Esperado após Setup:**
- ✅ 5 Tabelas criadas
- ✅ 8 Views criadas
- ✅ ~12 Functions criadas
- ✅ ~15 Políticas RLS ativas (tabelas)
- ✅ 4 Políticas RLS Storage
- ✅ 1 Bucket de Storage configurado
- ✅ Dados de exemplo (se executou seed)
- ✅ Pelo menos 1 usuário admin

---

**Desenvolvido para o desafio técnico ByteShop**
