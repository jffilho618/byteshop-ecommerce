# Setup Completo - ByteShop

## 📋 Guia Completo de Configuração

Este guia detalha todo o processo de setup do projeto ByteShop, do zero até a aplicação rodando.

---

## 🎯 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase
- Git
- Editor de código (VS Code recomendado)

---

## 🚀 Passo 1: Clonar e Instalar

```bash
# Clonar repositório
git clone <repository-url>
cd byteshop

# Instalar dependências
npm install
```

---

## 🗄️ Passo 2: Configurar Supabase

### 2.1 - Criar Projeto no Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em "New Project"
3. Configure:
   - Name: ByteShop
   - Database Password: [escolha uma senha forte]
   - Region: [escolha a mais próxima]
4. Aguarde o projeto ser criado (~2 minutos)

### 2.2 - Executar Migrations SQL

No Supabase Dashboard → **SQL Editor**, execute na ordem:

1. **`supabase/migrations/001_initial_schema.sql`**
   - Cria tabelas, ENUMs, functions, triggers

2. **`supabase/migrations/002_rls_policies.sql`**
   - Habilita RLS e cria políticas

3. **`supabase/migrations/003_views.sql`**
   - Cria views otimizadas

4. **`supabase/migrations/004_storage_setup.sql`**
   - Cria functions para storage

### 2.3 - Configurar Storage (Manual)

Siga o guia: [STORAGE_DASHBOARD_SETUP.md](./STORAGE_DASHBOARD_SETUP.md)

Resumo:
1. Storage → Create bucket "product-images"
2. Configurar como público, 5MB limite
3. Criar 4 políticas RLS (SELECT público, INSERT/UPDATE/DELETE admin)

### 2.4 - Executar Seed Data (Opcional)

```sql
-- Execute no SQL Editor
-- supabase/seeds/001_sample_data.sql
```

Isso insere 16 produtos de exemplo.

### 2.5 - Criar Usuário Admin

1. Authentication → Users → Add user
2. Email: `admin@byteshop.com`
3. Password: [escolha uma senha]
4. No SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@byteshop.com';
```

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

### 3.1 - Backend

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite `.env` e preencha:

```env
# Supabase (pegar no Dashboard → Settings → API)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# Server
NODE_ENV=development
PORT=3000

# JWT (pode manter o padrão ou gerar novo)
JWT_SECRET=byteshop_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:8080
```

### 3.2 - Frontend

Edite `frontend/js/config/supabase.js`:

```javascript
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua_chave_anonima';
```

---

## 🎮 Passo 4: Iniciar Aplicação

### 4.1 - Backend (Terminal 1)

```bash
npm run dev
```

Deve exibir:
```
🚀 ByteShop API Server
📡 Server running on: http://localhost:3000
✅ Health check: http://localhost:3000/health
```

### 4.2 - Frontend (Terminal 2)

```bash
cd frontend
npx serve .
```

Ou use Live Server do VS Code.

Acesse: **http://localhost:3000** (ou porta do serve)

---

## ✅ Passo 5: Verificar Setup

### 5.1 - Backend

Teste o health check:
```bash
curl http://localhost:3000/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "development"
}
```

### 5.2 - Supabase

Execute no SQL Editor:
```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- Deve retornar: cart_items, order_items, orders, products, users

-- Verificar produtos
SELECT COUNT(*) as total FROM products;

-- Deve retornar: 16 (se executou seed)

-- Verificar admin
SELECT * FROM users WHERE role = 'admin';

-- Deve retornar seu usuário admin
```

### 5.3 - Frontend

1. Abra http://localhost:3000
2. Deve carregar a landing page
3. Produtos devem aparecer
4. Tente fazer login com o admin criado
5. Badge do carrinho deve funcionar

---

## 🧪 Passo 6: Testes Funcionais

### Teste 1: Visualizar Produtos
- ✅ Landing page carrega
- ✅ 16 produtos aparecem
- ✅ Filtros funcionam
- ✅ Busca funciona

### Teste 2: Autenticação
- ✅ Login com admin@byteshop.com
- ✅ Nome aparece na navbar
- ✅ Link "Dashboard Admin" aparece

### Teste 3: Carrinho
- ✅ Adicionar produto (requer login)
- ✅ Badge atualiza
- ✅ Página do carrinho funciona

### Teste 4: Admin (como admin)
- ✅ Ver todos produtos
- ✅ Ver estatísticas
- ✅ Ver pedidos de todos usuários

---

## 🐛 Troubleshooting

### Backend não inicia

```bash
# Verificar se porta 3000 está livre
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Matar processo se necessário
```

### Frontend: CORS error

- Certifique-se de servir via HTTP (não file://)
- Use Live Server ou `npx serve`

### Produtos não carregam

1. Verifique credenciais do Supabase em `frontend/js/config/supabase.js`
2. Confirme que migrations foram executadas
3. Verifique console do navegador
4. Tente executar seed data novamente

### RLS blocking queries

- Verifique se usuário está autenticado
- Confirme que políticas RLS foram criadas
- Para debug, desabilite RLS temporariamente:
  ```sql
  ALTER TABLE products DISABLE ROW LEVEL SECURITY;
  ```

---

## 📊 Estrutura Final

Após setup completo, você terá:

```
byteshop/
├── backend/               # API Node.js + Express
│   ├── src/
│   │   ├── config/       # Supabase, env
│   │   ├── controllers/  # 4 controllers
│   │   ├── middlewares/  # Auth, validation, errors
│   │   ├── routes/       # 25+ endpoints
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Helpers
│   │   ├── validators/   # Input validation
│   │   └── server.ts     # Entry point
│   └── package.json
├── frontend/              # HTML/CSS/JS
│   ├── index.html        # Landing page
│   ├── css/              # Styles
│   ├── js/               # Logic + Supabase
│   └── pages/            # Other pages (to implement)
├── supabase/
│   ├── migrations/       # 4 SQL files
│   └── seeds/            # Sample data
├── docs/                 # Documentation
└── README.md
```

---

## 🎯 Checklist Final

- [ ] Node.js instalado
- [ ] Projeto Supabase criado
- [ ] Migrations executadas (001, 002, 003, 004)
- [ ] Storage bucket configurado
- [ ] Seed data executado
- [ ] Usuário admin criado
- [ ] `.env` configurado (backend)
- [ ] `supabase.js` configurado (frontend)
- [ ] Backend rodando (porta 3000)
- [ ] Frontend servido via HTTP
- [ ] Health check funcionando
- [ ] Produtos aparecem na landing page
- [ ] Login funciona
- [ ] Carrinho funciona

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do backend
2. Abra console do navegador (F12)
3. Revise este guia do início
4. Consulte documentação do Supabase

---

## 🎉 Próximos Passos

Após setup completo:

1. ✅ Explorar a aplicação
2. ✅ Testar todas funcionalidades
3. ✅ Implementar páginas adicionais (login.html, cart.html, etc.)
4. ✅ Deploy (Vercel para frontend, Railway para backend)

---

**Tempo estimado de setup:** 20-30 minutos
**Dificuldade:** Intermediária
**Status:** ✅ Aplicação pronta para uso

---

Desenvolvido para o desafio técnico ByteShop 🚀