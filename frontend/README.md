# Frontend - ByteShop

## 🚀 Setup Rápido

### 1. Configurar Supabase Client

Edite o arquivo `js/config/supabase.js` e substitua as credenciais:

```javascript
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua_chave_anonima_aqui';
```

Para encontrar essas credenciais:
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto ByteShop
3. Vá em **Settings** → **API**
4. Copie:
   - **URL do Projeto** → SUPABASE_URL
   - **anon/public** key → SUPABASE_ANON_KEY

### 2. Servir o Frontend

Como o frontend usa ES6 modules, você precisa servir via HTTP (não pode abrir direto pelo file://).

**Opção 1: Live Server (VS Code)**
```bash
# Instalar extensão Live Server no VS Code
# Clicar com botão direito em index.html → "Open with Live Server"
```

**Opção 2: Python**
```bash
# Na pasta frontend/
python -m http.server 8000
# Acessar: http://localhost:8000
```

**Opção 3: Node.js**
```bash
npx serve .
# Acessar: http://localhost:3000
```

---

## 📁 Estrutura

```
frontend/
├── index.html              # Landing page
├── css/
│   ├── reset.css           # CSS reset
│   ├── variables.css       # Design tokens
│   ├── global.css          # Estilos globais
│   ├── components.css      # Componentes reutilizáveis
│   └── landing.css         # Landing page específico
├── js/
│   ├── config/
│   │   └── supabase.js     # Configuração Supabase
│   ├── utils/
│   │   ├── auth.js         # Funções de autenticação
│   │   └── api.js          # Funções de API
│   ├── components/
│   │   └── navbar.js       # Componente navbar
│   └── pages/
│       └── landing.js      # Lógica da landing page
└── pages/
    ├── login.html          # (A implementar)
    ├── register.html       # (A implementar)
    ├── cart.html           # (A implementar)
    ├── checkout.html       # (A implementar)
    ├── orders.html         # (A implementar)
    └── admin.html          # (A implementar)
```

---

## 🎯 Funcionalidades Implementadas

### Landing Page (index.html)
- ✅ Hero section
- ✅ Filtro por categoria
- ✅ Busca de produtos
- ✅ Filtros de preço
- ✅ Ordenação (mais recente, preço, nome)
- ✅ Grid de produtos responsivo
- ✅ Adicionar ao carrinho
- ✅ Badge do carrinho atualizado em tempo real
- ✅ Navbar com autenticação visual

### Autenticação
- ✅ Login/Logout
- ✅ Registro
- ✅ Sessão persistente
- ✅ Proteção de rotas
- ✅ Diferenciação de roles (customer/admin)

### Carrinho
- ✅ Adicionar produtos
- ✅ Atualizar quantidade
- ✅ Remover itens
- ✅ Cálculo de total
- ✅ Validação de estoque

---

## 🔧 Como Funciona

### Supabase Client
O frontend se conecta **diretamente ao Supabase**, respeitando as políticas RLS:

```javascript
// Exemplo: Buscar produtos
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true);
```

### Autenticação
Usa Supabase Auth com sessão persistente:

```javascript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Verifica sessão atual
const { data: { session } } = await supabase.auth.getSession();
```

### RLS em Ação
As políticas RLS garantem segurança:
- **Produtos**: Todos podem ver produtos ativos
- **Carrinho**: Cada usuário vê apenas seu carrinho
- **Pedidos**: Cada usuário vê apenas seus pedidos
- **Admin**: Vê tudo

---

## 🎨 Customização

### Cores
Edite `css/variables.css`:

```css
:root {
  --primary-color: #3b82f6;  /* Cor principal */
  --secondary-color: #8b5cf6; /* Cor secundária */
  /* ... */
}
```

### Logo
Substitua o texto "ByteShop" por uma imagem:

```html
<div class="navbar-brand">
  <img src="/assets/logo.png" alt="ByteShop">
</div>
```

---

## 🐛 Troubleshooting

### CORS Error
- Certifique-se de servir via HTTP (não file://)
- Use Live Server ou python -m http.server

### Products não carregam
1. Verifique as credenciais do Supabase
2. Confirme que executou as migrations
3. Verifique se há produtos no banco (seed data)
4. Abra o console do navegador para ver erros

### Imagens não aparecem
1. Configure o Storage bucket
2. Faça upload de imagens de exemplo
3. Verifique URLs no banco de dados

---

## 📱 Responsivo

O frontend é **mobile-first** e funciona em:
- ✅ Desktop (1280px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (até 768px)

---

## ⚡ Performance

### Otimizações
- Lazy loading de imagens
- Debounce em buscas
- Cache de sessão
- Atualização incremental do carrinho

---

## 🔒 Segurança

- ✅ RLS ativo em todas operações
- ✅ Validação no backend
- ✅ Sanitização de inputs
- ✅ HTTPS only em produção
- ✅ Session tokens seguros

---

## 🚧 Próximas Páginas

As seguintes páginas ainda precisam ser implementadas:
- [ ] Login/Register pages
- [ ] Cart page
- [ ] Checkout page
- [ ] Orders page
- [ ] Admin dashboard

Estruturas base estão prontas, apenas precisam do HTML específico.

---

**Status:** ✅ Landing page funcional
**Tecnologias:** Vanilla JS + Supabase Client
**Módulos ES6:** Sim (requer servidor HTTP)