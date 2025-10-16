# Sistema de Gerenciamento de Endereços - ByteShop

## 📋 Visão Geral

Sistema completo de gerenciamento de múltiplos endereços de entrega para usuários do ByteShop, implementando as melhores práticas de armazenamento e reutilização de endereços.

## 🎯 Funcionalidades

### Para Usuários

1. **Múltiplos Endereços**
   - Salvar vários endereços diferentes
   - Dar nomes/labels aos endereços (Casa, Trabalho, etc.)
   - Marcar um endereço como padrão

2. **No Checkout**
   - Escolher endereço salvo
   - Inserir novo endereço
   - Opção de salvar novo endereço para uso futuro
   - Auto-preenchimento via CEP (ViaCEP API)

3. **Histórico de Pedidos**
   - Endereços preservados mesmo se deletados posteriormente
   - Visualização completa do endereço usado em cada pedido

## 🏗️ Arquitetura

### Database Schema

#### Tabela `addresses`
```sql
- id (UUID, PK)
- user_id (UUID, FK → users)
- label (TEXT) - "Casa", "Trabalho", etc.
- street (TEXT)
- number (TEXT)
- complement (TEXT, nullable)
- neighborhood (TEXT)
- city (TEXT)
- state (TEXT) - 2 caracteres
- zipcode (TEXT) - formato: 12345-678
- is_default (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Constraints:**
- `state` deve ter exatamente 2 caracteres
- `zipcode` deve seguir formato brasileiro (regex)
- Apenas um endereço `is_default=true` por usuário (garantido por trigger)

#### Tabela `orders` (modificações)
```sql
+ address_id (UUID, FK → addresses, ON DELETE SET NULL)
~ shipping_address (TEXT, nullable) - agora opcional
```

**Comportamento:**
- Se `address_id` fornecido, `shipping_address` é preenchido automaticamente via trigger
- Se endereço for deletado, pedido mantém o texto em `shipping_address`
- Pedidos antigos continuam funcionando com apenas `shipping_address`

### Triggers

#### `ensure_single_default_address`
- **Quando:** Antes de INSERT/UPDATE em `addresses`
- **O que faz:** Desmarca outros endereços do usuário quando um é marcado como padrão
- **Garante:** Apenas um endereço padrão por usuário

#### `populate_shipping_address`
- **Quando:** Antes de INSERT/UPDATE em `orders`
- **O que faz:** Se `address_id` fornecido mas `shipping_address` vazio, preenche automaticamente
- **Garante:** Redundância de dados para histórico

### Functions

#### `format_address(address_id UUID) → TEXT`
Formata endereço completo como string:
```
Rua Exemplo, 123, Apto 45, Centro, São Paulo/SP, 01234-567
```

#### `get_default_address(user_id UUID) → UUID`
Retorna o ID do endereço padrão do usuário.

### View: `orders_with_addresses`
JOIN otimizado de pedidos com endereços completos:
```sql
SELECT
  orders.*,
  addresses.label,
  addresses.street,
  addresses.number,
  ... (todos os campos de address)
  COALESCE(orders.shipping_address, format_address(orders.address_id)) as full_address
FROM orders
LEFT JOIN addresses ON orders.address_id = addresses.id
```

## 🔒 Segurança (RLS Policies)

### Tabela `addresses`

| Operação | Política |
|----------|----------|
| SELECT | Usuário vê apenas seus endereços, admin vê todos |
| INSERT | Usuário pode criar apenas para si mesmo |
| UPDATE | Usuário pode atualizar apenas seus endereços |
| DELETE | Usuário pode deletar apenas seus endereços |

### Integridade Referencial

- `addresses.user_id → users.id` (ON DELETE CASCADE)
  - Deletar usuário remove todos seus endereços

- `orders.address_id → addresses.id` (ON DELETE SET NULL)
  - Deletar endereço mantém pedido (com texto em shipping_address)

## 💻 Frontend Implementation

### API Functions (`frontend/js/utils/api.js`)

```javascript
// Buscar todos os endereços do usuário
getAddresses()

// Buscar endereço padrão
getDefaultAddress()

// Criar novo endereço
createAddress({
  label: 'Casa',
  street: 'Rua Exemplo',
  number: '123',
  complement: 'Apto 45',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipcode: '01234-567',
  is_default: true
})

// Atualizar endereço
updateAddress(addressId, { label: 'Novo Nome' })

// Deletar endereço
deleteAddress(addressId)

// Marcar como padrão
setDefaultAddress(addressId)

// Formatar endereço para exibição
formatAddressFromData(addressObject)
```

### Checkout Flow

#### Modo 1: Usar Endereço Salvo
1. Carregar endereços do usuário
2. Exibir dropdown com endereços
3. Endereço padrão pré-selecionado
4. Ao confirmar pedido: enviar `addressId`

#### Modo 2: Novo Endereço
1. Formulário de endereço
2. Auto-completar via CEP (ViaCEP)
3. Checkbox "Salvar para próximas compras"
   - Se marcado: criar endereço primeiro, depois pedido com `addressId`
   - Se desmarcado: criar pedido com apenas `shippingAddress` (texto)

### Componentes UI

**Radio Buttons (Modo de Endereço):**
```html
<input type="radio" name="addressMode" value="select" checked>
  Usar endereço salvo
<input type="radio" name="addressMode" value="new">
  Inserir novo endereço
```

**Select (Endereços Salvos):**
```html
<select id="savedAddressSelect">
  <option value="{id}">
    {label} - {street}, {number}, {city}/{state}
  </option>
</select>
```

**Checkbox (Salvar Endereço):**
```html
<input type="checkbox" id="saveAddress">
  Salvar este endereço para próximas compras

<!-- Mostrado apenas se checkbox marcado -->
<input type="text" id="addressLabel" placeholder="Ex: Casa, Trabalho">
```

## 📊 Fluxo de Dados

### Cenário 1: Usuário com Endereços Salvos
```
1. Carregar endereços → getAddresses()
2. Renderizar opções no select
3. Pré-selecionar endereço padrão
4. Usuário confirma pedido
5. createOrder(null, items, selectedAddressId)
6. Trigger preenche shipping_address automaticamente
7. Pedido criado com referência + texto
```

### Cenário 2: Novo Usuário (Primeiro Pedido)
```
1. getAddresses() retorna []
2. Forçar modo "novo endereço"
3. Desabilitar opção "usar salvo"
4. Usuário preenche formulário
5. Se salvar: createAddress() → createOrder(text, items, addressId)
6. Se não salvar: createOrder(text, items, null)
7. Primeiro endereço salvo = padrão automaticamente
```

### Cenário 3: Usuário Deleta Endereço
```
1. deleteAddress(addressId)
2. Pedidos antigos mantêm texto em shipping_address
3. orders.address_id → NULL (SET NULL)
4. Histórico preservado
```

## 🚀 Como Executar as Migrations

### Opção 1: Supabase Dashboard (Recomendado)
1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Abra o arquivo `supabase/migrations/EXECUTE_007_008.sql`
5. Copie todo o conteúdo
6. Cole no editor
7. Clique em **Run**

### Opção 2: Supabase CLI (Se configurado)
```bash
# Link project (apenas primeira vez)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

## ✅ Teste do Sistema

### Teste 1: Criar Endereço
```javascript
const address = await createAddress({
  label: 'Casa',
  street: 'Rua Teste',
  number: '123',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipcode: '01234-567',
  is_default: true
});
console.log('Endereço criado:', address);
```

### Teste 2: Pedido com Endereço Salvo
```javascript
const items = [
  { product_id: '...', quantity: 1, unit_price: 99.90 }
];

const order = await createOrder(null, items, addressId);
console.log('Pedido criado:', order);
// Verificar que shipping_address foi preenchido automaticamente
```

### Teste 3: Múltiplos Endereços + Padrão
```javascript
// Criar segundo endereço como padrão
await createAddress({
  label: 'Trabalho',
  // ...
  is_default: true
});

// Verificar que apenas um está marcado como padrão
const addresses = await getAddresses();
const defaults = addresses.filter(a => a.is_default);
console.assert(defaults.length === 1, 'Apenas um endereço padrão');
```

## 🎨 Melhorias Futuras (Opcional)

### Página de Gerenciamento de Endereços
Criar `frontend/pages/addresses.html`:
- Listar todos os endereços
- Editar/deletar endereços
- Marcar/desmarcar como padrão
- Adicionar novos endereços

### Validação Avançada
- Validar CEP via ViaCEP antes de salvar
- Sugerir correções de endereço
- Validar formato de número/complemento

### Geocoding (Avançado)
- Integrar com Google Maps API
- Validar existência de endereço
- Calcular frete baseado em distância

## 📝 Notas Técnicas

### Por que Redundância de Dados?
Armazenar tanto `address_id` quanto `shipping_address` pode parecer redundante, mas tem vantagens:

1. **Histórico Preservado:** Se usuário deletar endereço, pedido mantém informação
2. **Performance:** Não precisa JOIN para exibir pedidos simples
3. **Flexibilidade:** Suporta pedidos com endereços não salvos
4. **Migração:** Pedidos antigos continuam funcionando

### Índices Criados
```sql
-- Performance em queries de usuário
CREATE INDEX idx_addresses_user ON addresses(user_id);

-- Query rápida de endereço padrão
CREATE INDEX idx_addresses_default ON addresses(user_id, is_default)
  WHERE is_default = true;

-- JOIN otimizado orders ← addresses
CREATE INDEX idx_orders_address ON orders(address_id);
```

### Validações Backend
As constraints do PostgreSQL garantem:
- Estado sempre 2 caracteres (CHECK)
- CEP formato brasileiro (REGEX)
- Apenas um padrão por usuário (TRIGGER)
- Integridade referencial (FK)

## 🔗 Referências

- Migrations: `supabase/migrations/007_addresses_table.sql`
- Migrations: `supabase/migrations/008_orders_add_address_id.sql`
- API Frontend: `frontend/js/utils/api.js` (linhas 372-495)
- Checkout Logic: `frontend/js/pages/checkout.js`
- Checkout UI: `frontend/pages/checkout.html`
- Estilos: `frontend/css/checkout.css`

---

**Status:** ✅ Implementação Completa (Frontend + Backend + Database)
**Última Atualização:** Migration 008
**Próximo Passo:** Executar migrations no Supabase Dashboard
