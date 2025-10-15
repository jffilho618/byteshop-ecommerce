# Backend Structure - ByteShop

## 📁 Estrutura de Diretórios

```
backend/src/
├── config/          # Configurações da aplicação
├── controllers/     # Lógica de controle das requisições
├── middlewares/     # Middlewares customizados
├── routes/          # Definição de rotas
├── services/        # Lógica de negócio
├── types/           # Tipos e interfaces TypeScript
├── utils/           # Funções utilitárias
├── validators/      # Validações de entrada
├── app.ts           # Configuração do Express
└── server.ts        # Inicialização do servidor
```

## 🔧 Configurações (`config/`)

### `env.ts`
Validação e exportação de variáveis de ambiente com tipagem forte.

### `supabase.ts`
- **supabase**: Cliente com chave anônima (respeita RLS)
- **supabaseAdmin**: Cliente com Service Role Key (bypass RLS - usar com cuidado)
- Constantes para tabelas, views e functions do banco

## 🎭 Middlewares (`middlewares/`)

### Autenticação e Autorização
- `authenticate`: Valida JWT token do Supabase
- `authorize(...roles)`: Verifica se o usuário tem permissão baseada em role
- `optionalAuth`: Autenticação opcional (não retorna erro se não autenticado)

### Validação
- `validate`: Processa resultados do express-validator
- `runValidations`: Executa validações em sequência

### Tratamento de Erros
- `AppError`: Classe customizada de erro
- `errorHandler`: Handler global de erros
- `notFoundHandler`: Handler para rotas não encontradas
- `asyncHandler`: Wrapper para async functions (elimina try-catch)

## ✅ Validators (`validators/`)

Validações usando **express-validator** para:
- **auth**: Login e registro
- **product**: CRUD de produtos e filtros
- **cart**: Adicionar/atualizar carrinho
- **order**: Criar pedidos e atualizar status

## 📊 Types (`types/`)

### User Types
- `UserRole`: ADMIN | CUSTOMER
- `User`: Interface do usuário
- `AuthPayload`: Payload do JWT

### Product Types
- `ProductCategory`: Enum de categorias
- `Product`: Interface de produto
- `CreateProductDTO`: Dados para criar produto
- `UpdateProductDTO`: Dados para atualizar produto
- `ProductFilters`: Filtros de busca

### Order Types
- `OrderStatus`: Enum de status do pedido
- `Order`: Interface de pedido
- `OrderItem`: Interface de item do pedido
- `CreateOrderDTO`: Dados para criar pedido

### API Response Types
- `ApiResponse<T>`: Resposta padrão da API
- `PaginatedResponse<T>`: Resposta com paginação

## 🛠️ Utils (`utils/`)

### Response Helpers (`response.util.ts`)
- `successResponse`: Resposta de sucesso
- `errorResponse`: Resposta de erro
- `paginatedResponse`: Resposta com paginação
- `createdResponse`: Resposta 201 Created
- `noContentResponse`: Resposta 204 No Content

### Query Helpers (`query.util.ts`)
- `calculatePagination`: Calcula offset e limit
- `sanitizeSearchTerm`: Sanitiza termo de busca
- `buildSearchQuery`: Constrói query ILIKE
- `parsePositiveNumber`: Valida números positivos
- `parseBoolean`: Valida booleanos

## 🚀 Server (`app.ts` e `server.ts`)

### Middlewares Globais
1. **Helmet** - Security headers
2. **CORS** - Cross-Origin Resource Sharing
3. **Body Parser** - JSON e URL-encoded
4. **Morgan** - Logger (apenas em dev)

### Health Check
```
GET /health
```
Retorna status do servidor e timestamp.

### Graceful Shutdown
- Escuta SIGTERM e SIGINT
- Fecha servidor gracefully
- Força shutdown após 10s se necessário

## 📝 Próximos Passos

1. ✅ Criar schema do banco de dados no Supabase
2. ✅ Implementar RLS (Row Level Security)
3. ✅ Criar Functions e Views otimizadas
4. ✅ Implementar Services (lógica de negócio)
5. ✅ Implementar Controllers
6. ✅ Definir Routes
7. ✅ Criar Edge Functions

## 🎯 Padrões de Código

### Controller Pattern
```typescript
export const getProducts = asyncHandler(async (req, res) => {
  const filters = req.query;
  const result = await productService.getProducts(filters);
  return successResponse(res, result);
});
```

### Service Pattern
```typescript
export const getProducts = async (filters: ProductFilters) => {
  // Lógica de negócio
  // Queries no Supabase
  return result;
};
```

### Error Handling
```typescript
if (!product) {
  throw new AppError(404, 'Product not found');
}
```

## 🔐 Segurança

- ✅ Helmet para headers de segurança
- ✅ Validação de entrada com express-validator
- ✅ Autenticação JWT via Supabase
- ✅ Autorização baseada em roles
- ✅ RLS no banco de dados (a implementar)
- ✅ Sanitização de queries
- ✅ CORS configurado

---

**Desenvolvido com TypeScript, Express e Supabase**
