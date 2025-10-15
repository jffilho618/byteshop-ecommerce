# ByteShop - E-commerce de Produtos de Tecnologia

## 📋 Sobre o Projeto

ByteShop é um e-commerce moderno de produtos de tecnologia, desenvolvido com Node.js, TypeScript e Supabase como parte de um desafio técnico.

## 🚀 Tecnologias

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL Database
  - Authentication
  - Row Level Security (RLS)
  - Edge Functions
  - Real-time subscriptions

### Frontend
- **HTML5** + **CSS3**
- **TypeScript**
- **Supabase Client** - Integração com backend

## 🏗️ Arquitetura do Projeto

```
byteshop/
├── backend/
│   └── src/
│       ├── config/          # Configurações (Supabase, JWT, etc)
│       ├── controllers/     # Controladores da API
│       ├── middlewares/     # Middlewares (auth, validation, etc)
│       ├── routes/          # Rotas da API
│       ├── services/        # Lógica de negócio
│       ├── types/           # Tipos TypeScript
│       └── utils/           # Funções utilitárias
├── frontend/
│   ├── css/                 # Estilos
│   ├── js/                  # Scripts TypeScript
│   ├── pages/               # Páginas HTML
│   └── assets/              # Imagens e recursos
├── supabase/
│   ├── migrations/          # Migrations do banco de dados
│   ├── functions/           # Edge Functions
│   └── seeds/               # Dados iniciais
└── docs/                    # Documentação

```

## 🎯 Funcionalidades

### Para Clientes
- ✅ Navegação e busca de produtos
- ✅ Filtros avançados
- ✅ Carrinho de compras
- ✅ Checkout (requer login)
- ✅ Histórico de pedidos

### Para Administradores
- ✅ CRUD completo de produtos
- ✅ Gerenciamento de pedidos
- ✅ Dashboard administrativo
- ✅ Relatórios e estatísticas

## 🔐 Segurança

- **Row Level Security (RLS)** - Políticas de acesso no Supabase
- **JWT Authentication** - Autenticação segura
- **Input Validation** - Validação de dados
- **CORS** configurado
- **Helmet** - Security headers

## ⚙️ Configuração

### Pré-requisitos
- Node.js 18+
- Conta no Supabase
- Git

### Instalação

1. Clone o repositório
```bash
git clone <repository-url>
cd byteshop
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais do Supabase
```

4. Execute o projeto
```bash
npm run dev
```

## 📊 Database Schema

A estrutura do banco de dados será documentada em `docs/database-schema.md`

## 🧪 Diferenciais Técnicos

- **Código Limpo**: Arquitetura modular e bem organizada
- **Performance**: Queries otimizadas com views e indexes
- **Segurança**: RLS bem implementado para cada role
- **Automação**: Edge Functions para tarefas assíncronas
- **Documentação**: Código bem documentado e explicado

## 📝 Licença

MIT

---

**Desenvolvido como parte do desafio técnico para Desenvolvedor Júnior/Estagiário**
