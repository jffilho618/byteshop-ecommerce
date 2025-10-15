# Guia de Teste Completo - ByteShop

## 📋 Pré-requisitos

### 1. Configurar Supabase para Desenvolvimento

#### Desabilitar Confirmação de Email

1. Acesse o Supabase Dashboard
2. Vá em **Authentication → Settings → Email Auth**
3. **Desmarque**: "Enable email confirmations"
4. Clique em **Save**

**OU** Execute no SQL Editor:

```sql
-- Confirmar todos os emails pendentes
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
```

#### Executar Migration 005

```sql
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

GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated, anon;
```

### 2. Criar Usuários de Teste

#### Criar Usuário Admin

```sql
-- 1. Primeiro, registre um usuário via frontend ou Supabase Dashboard
--    Email: admin@byteshop.com
--    Senha: admin123

-- 2. Depois, atualize o role para admin:
UPDATE users
SET role = 'admin'
WHERE email = 'admin@byteshop.com';
```

#### Criar Usuário Cliente

```sql
-- Registre via frontend em: /pages/login.html?mode=register
-- Email: cliente@teste.com
-- Senha: cliente123
-- O role 'customer' é atribuído automaticamente
```

---

## 🧪 Testes por Funcionalidade

### 🛡️ ADMIN - Funcionalidades Administrativas

#### Login Admin

1. Acesse: `http://localhost:3000/pages/login.html`
2. Login: `admin@byteshop.com` / `admin123`
3. **Verificar**: Deve redirecionar para `/` (home)
4. **Verificar**: Link "Dashboard Admin" aparece no menu do usuário

#### Dashboard Admin

1. Acesse: `http://localhost:3000/pages/admin.html`
2. **Verificar**: Acesso permitido apenas para admin

##### Aba Produtos

- **Listar Produtos**: Deve mostrar todos os produtos da tabela
- **Adicionar Produto**:

  ```
  Nome: Produto Teste
  Categoria: laptops
  Preço: 1999.00
  Estoque: 10
  Descrição: Produto de teste
  ```

  - Clicar em "+ Adicionar Produto"
  - Preencher formulário
  - Clicar em "Salvar"
  - **Verificar**: Produto aparece na lista

- **Editar Produto**:
  - Clicar no ícone ✏️ de um produto
  - Alterar preço para 2499.00
  - Clicar em "Salvar"
  - **Verificar**: Preço atualizado na lista

- **Desativar/Ativar Produto**:
  - Clicar no ícone 🔒 de um produto
  - **Verificar**: Status muda de "Ativo" para "Inativo"
  - Clicar novamente no ícone 🔓
  - **Verificar**: Status volta para "Ativo"

- **Deletar Produto** (soft delete):
  - Clicar no ícone 🗑️ de um produto
  - Confirmar exclusão
  - **Verificar**: Produto marcado como inativo

##### Aba Pedidos

- **Listar Pedidos**: Deve mostrar todos os pedidos de todos os clientes
- **Alterar Status**:
  - Selecionar um pedido com status "Pendente"
  - Alterar para "Processando" no select
  - **Verificar**: Status atualizado imediatamente

##### Aba Estatísticas

- **Métricas**: Deve exibir:
  - Total de Produtos
  - Total de Pedidos
  - Receita Total
  - Produtos com Estoque Baixo (≤ 10 unidades)
- **Lista de Estoque Baixo**: Produtos com quantidade ≤ 10

#### Verificações de Segurança Admin

- [ ] Admin NÃO deve ver carrinho próprio (admins não compram)
- [ ] Admin PODE acessar `/pages/admin.html`
- [ ] Admin PODE ver e gerenciar todos os pedidos
- [ ] Admin PODE criar/editar/deletar produtos

---

### 👤 CLIENTE - Funcionalidades do Cliente

#### Registro de Cliente

1. Acesse: `http://localhost:3000/pages/login.html?mode=register`
2. Preencher:
   ```
   Nome: João Silva
   Email: joao@teste.com
   Senha: senha123
   Confirmar Senha: senha123
   ```
3. Clicar em "Criar Conta"
4. **Verificar**: Redireciona para home (`/`) automaticamente logado

#### Login Cliente

1. Acesse: `http://localhost:3000/pages/login.html`
2. Login: `joao@teste.com` / `senha123`
3. **Verificar**: Redireciona para `/` (home)
4. **Verificar**: Link "Dashboard Admin" NÃO aparece no menu

#### Navegação e Filtros (Landing Page)

1. Acesse: `http://localhost:3000/`
2. **Busca**: Digite "laptop" na busca
   - **Verificar**: Mostra apenas produtos com "laptop" no nome/descrição
3. **Filtro por Categoria**: Clicar em "Smartphones"
   - **Verificar**: Mostra apenas smartphones
4. **Ordenação**: Selecionar "Menor Preço"
   - **Verificar**: Produtos ordenados do menor para o maior preço
5. **Filtro de Preço**: Min: 1000, Max: 5000
   - **Verificar**: Mostra apenas produtos nessa faixa
6. **Apenas em Estoque**: Marcar checkbox
   - **Verificar**: Mostra apenas produtos com estoque > 0

#### Adicionar ao Carrinho

1. Clicar em "Adicionar ao Carrinho" em um produto
2. **Verificar**: Notificação de sucesso aparece
3. **Verificar**: Badge do carrinho incrementa (ex: 0 → 1)
4. Adicionar mais 2 produtos diferentes
5. **Verificar**: Badge mostra 3

#### Carrinho de Compras

1. Acesse: `http://localhost:3000/pages/cart.html`
2. **Verificar**: 3 produtos aparecem na lista

##### Gerenciar Quantidades

- **Aumentar quantidade**:
  - Clicar no botão "+"
  - **Verificar**: Quantidade incrementa
  - **Verificar**: Subtotal do item atualiza
  - **Verificar**: Total geral atualiza

- **Diminuir quantidade**:
  - Clicar no botão "-"
  - **Verificar**: Quantidade decrementa
  - **Verificar**: Subtotal e total atualizam

- **Validação de estoque**:
  - Tentar aumentar além do estoque disponível
  - **Verificar**: Botão "+" desabilitado quando atinge limite

##### Remover Item

- Clicar em "Remover" em um produto
- Confirmar remoção
- **Verificar**: Item removido da lista
- **Verificar**: Total recalculado
- **Verificar**: Badge do carrinho atualiza (3 → 2)

##### Limpar Carrinho

- Clicar em "Limpar Carrinho"
- Confirmar
- **Verificar**: Mensagem "Seu carrinho está vazio"
- **Verificar**: Badge mostra 0

#### Checkout

1. Adicionar produtos ao carrinho novamente
2. Clicar em "Finalizar Compra"
3. Acesse: `http://localhost:3000/pages/checkout.html`

##### Preenchimento de Endereço

- **CEP Auto-fill**: Digite CEP válido (ex: 01310-100)
  - **Verificar**: Rua, bairro, cidade e estado preenchem automaticamente (via ViaCEP)
- Preencher campos restantes:
  ```
  CEP: 01310-100
  Número: 123
  Complemento: Apto 45
  ```

##### Resumo do Pedido

- **Verificar**: Lista de produtos com quantidades
- **Verificar**: Subtotal correto
- **Verificar**: Frete (Grátis)
- **Verificar**: Total correto

##### Confirmar Pedido

- Clicar em "Confirmar Pedido"
- **Verificar**: Modal de sucesso aparece
- **Verificar**: Número do pedido é exibido
- **Verificar**: Estoque dos produtos decrementou no banco

#### Meus Pedidos

1. Acesse: `http://localhost:3000/pages/orders.html`
2. **Verificar**: Lista com todos os pedidos do cliente
3. **Verificar**: Cada pedido mostra:
   - Número do pedido
   - Data e hora
   - Status (Pendente, Processando, etc.)
   - Total

##### Detalhes do Pedido

- Clicar em qualquer pedido
- **Verificar**: Modal abre com:
  - Informações do pedido
  - Endereço de entrega completo
  - Lista de todos os itens
  - Preços unitários e totais
  - Resumo financeiro

#### Verificações de Segurança Cliente

- [ ] Cliente NÃO pode acessar `/pages/admin.html` (deve redirecionar para `/`)
- [ ] Cliente só vê seus próprios pedidos em `/pages/orders.html`
- [ ] Cliente só vê seu próprio carrinho
- [ ] Cliente NÃO pode editar/deletar produtos

---

## 🔗 Verificações de Integração Frontend-Backend-BD

### 1. Autenticação (Frontend ↔ Supabase Auth)

- [ ] Registro cria usuário em `auth.users` E `public.users`
- [ ] Login retorna sessão válida
- [ ] Sessão persiste no localStorage
- [ ] Logout limpa sessão e localStorage
- [ ] Páginas protegidas redirecionam para login

### 2. Produtos (Frontend ↔ Backend API ↔ Supabase)

**Via Landing Page (Cliente):**

- [ ] Busca usa query `ilike` no Supabase
- [ ] Filtros aplicam WHERE clauses corretas
- [ ] Ordenação funciona (ORDER BY)
- [ ] Apenas produtos ativos (`is_active = true`) aparecem

**Via Dashboard Admin:**

- [ ] CREATE produto insere em `products` table
- [ ] UPDATE produto atualiza campos
- [ ] DELETE faz soft delete (`is_active = false`)
- [ ] RLS permite apenas admins modificarem

### 3. Carrinho (Frontend ↔ Supabase)

- [ ] Adicionar produto cria registro em `cart_items`
- [ ] Atualizar quantidade faz UPDATE em `cart_items`
- [ ] Remover item faz DELETE em `cart_items`
- [ ] RLS: usuário só acessa seu próprio carrinho
- [ ] View `cart_with_products_view` funciona corretamente

### 4. Pedidos (Frontend ↔ Backend ↔ Functions PostgreSQL)

- [ ] Criar pedido:
  - Insere em `orders` table
  - Insere múltiplos registros em `order_items`
  - Chama `decrease_product_stock()` para cada produto
  - Limpa `cart_items` do usuário
- [ ] RLS: cliente vê apenas seus pedidos
- [ ] RLS: admin vê todos os pedidos
- [ ] Views `order_details_view` e `user_order_history_view` funcionam

### 5. Estoque e Validações

- [ ] Trigger `update_order_item_subtotal` calcula subtotais automaticamente
- [ ] Function `calculate_order_total()` soma corretamente
- [ ] Function `check_product_availability()` valida estoque antes de compra
- [ ] Estoque decrementa corretamente após pedido

### 6. Dashboard Admin e Views

- [ ] View `sales_dashboard_view` agrega vendas por data
- [ ] View `category_summary_view` agrupa por categoria
- [ ] View `low_stock_products_view` filtra produtos com estoque ≤ 10
- [ ] Estatísticas calculam corretamente

---

## 🐛 Checklist de Problemas Comuns

### Autenticação

- [ ] Confirmação de email desabilitada
- [ ] Migration 005 executada
- [ ] Função `create_user_profile` com GRANT correto

### RLS

- [ ] Policies de INSERT/UPDATE/DELETE verificam `auth.uid()`
- [ ] Admin usa função `is_admin()` nas policies
- [ ] Service role key no backend .env (para operações admin)

### Frontend

- [ ] URLs do Supabase configuradas em `supabase.js`
- [ ] localStorage persiste sessão
- [ ] Redirecionamentos por role funcionam

### Backend

- [ ] Servidor rodando na porta 3000
- [ ] CORS configurado para frontend
- [ ] Rotas protegidas com middleware `authenticate`
- [ ] Autorização usa middleware `authorize()`

---

## 📊 Resumo de Permissões

| Funcionalidade           | Cliente | Admin |
| ------------------------ | ------- | ----- |
| Ver produtos             | ✅      | ✅    |
| Adicionar ao carrinho    | ✅      | ❌    |
| Criar pedido             | ✅      | ❌    |
| Ver próprios pedidos     | ✅      | ✅    |
| Ver todos os pedidos     | ❌      | ✅    |
| Criar/editar produtos    | ❌      | ✅    |
| Deletar produtos         | ❌      | ✅    |
| Atualizar status pedidos | ❌      | ✅    |
| Acessar dashboard admin  | ❌      | ✅    |
| Ver estatísticas         | ❌      | ✅    |

---

## ✅ Conclusão

Se todos os testes acima passarem, a aplicação está funcionando corretamente com:

- ✅ Autenticação e autorização por roles
- ✅ RLS protegendo dados
- ✅ Integração Frontend-Backend-BD
- ✅ Funcionalidades separadas por role
- ✅ Validações de estoque e negócio
- ✅ Dashboard admin completo
- ✅ Experiência de compra completa para clientes
