# 🚀 Edge Functions - ByteShop

## 📁 Estrutura

```
supabase/
  functions/
    send-order-confirmation/
      index.ts          ✅ Envia email de confirmação de pedido
    export-order-csv/
      index.ts          ✅ Exporta pedidos para CSV (admin)
    deno.json           ✅ Configuração Deno
```

---

## 🔧 Setup e Deploy

### 1️⃣ Instalar Supabase CLI

**⚠️ IMPORTANTE:** Não use `npm install -g supabase` no Windows!

**Opção A: Usando Scoop (Recomendado)**

```powershell
# 1. Instalar Scoop (se ainda não tiver)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# 2. Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Opção B: Usando Chocolatey**

```powershell
# Se tiver Chocolatey instalado
choco install supabase
```

**Opção C: Download Direto (Mais Simples)**

1. Baixe o executável: https://github.com/supabase/cli/releases
2. Baixe: `supabase_windows_amd64.zip`
3. Extraia o arquivo `supabase.exe`
4. Mova para: `C:\Program Files\Supabase\`
5. Adicione ao PATH do Windows

**Verificar instalação:**

```powershell
supabase --version
```

### 2️⃣ Login no Supabase

```powershell
supabase login
```

### 3️⃣ Link ao Projeto

```powershell
# Obter PROJECT_REF no Supabase Dashboard > Settings > General
supabase link --project-ref SEU_PROJECT_REF
```

### 4️⃣ Configurar Variáveis de Ambiente

No **Supabase Dashboard**:

- Vá em: **Settings → Edge Functions → Secrets**

Adicionar:

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
FRONTEND_URL=http://localhost:8000
```

**Onde conseguir RESEND_API_KEY:**

- Acesse: https://resend.com
- Crie conta gratuita (100 emails/dia)
- Gere API Key em: https://resend.com/api-keys

**Alternativas ao Resend:**

- SendGrid (https://sendgrid.com) - 100 emails/dia grátis
- Mailgun (https://mailgun.com) - 5,000 emails/mês grátis
- Amazon SES - Muito barato

### 5️⃣ Deploy das Functions

```powershell
# Deploy send-order-confirmation
supabase functions deploy send-order-confirmation

# Deploy export-order-csv
supabase functions deploy export-order-csv
```

---

## 🧪 Testes

### Testar send-order-confirmation

```powershell
# Via curl (Windows PowerShell)
$headers = @{
    "Authorization" = "Bearer SEU_ANON_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    order_id = "uuid-de-um-pedido-real"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://SEU_PROJECT.supabase.co/functions/v1/send-order-confirmation" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

### Testar export-order-csv

```powershell
# Obter JWT token de admin primeiro
# Depois fazer request

$headers = @{
    "Authorization" = "Bearer JWT_TOKEN_DE_ADMIN"
}

Invoke-RestMethod -Uri "https://SEU_PROJECT.supabase.co/functions/v1/export-order-csv?status=delivered" `
    -Method GET `
    -Headers $headers `
    -OutFile "orders.csv"
```

---

## 🔗 Integração com Frontend

### 1. Enviar email após criar pedido

```javascript
// Em checkout.js - após criar pedido
async function createOrder(orderData) {
  try {
    // 1. Criar pedido
    const { data: order, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;

    // 2. Enviar email de confirmação
    const { data: emailResult, error: emailError } = await supabase.functions.invoke(
      'send-order-confirmation',
      { body: { order_id: order.id } }
    );

    if (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Não falhar o pedido, apenas logar o erro
    } else {
      console.log('Email sent successfully:', emailResult);
    }

    return order;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}
```

### 2. Exportar pedidos (admin)

```javascript
// Em admin.js - botão de exportar
async function exportOrders(filters = {}) {
  try {
    // Obter token de sessão
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert('Você precisa estar logado');
      return;
    }

    // Construir URL com filtros
    const params = new URLSearchParams();
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    if (filters.status) params.append('status', filters.status);

    // Fazer request
    const response = await fetch(`${supabase.functions.getUrl('export-order-csv')}?${params}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export orders');
    }

    // Download do arquivo
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    alert('Pedidos exportados com sucesso!');
  } catch (error) {
    console.error('Error exporting orders:', error);
    alert('Erro ao exportar pedidos');
  }
}

// Adicionar botão no HTML
// <button onclick="exportOrders()">📥 Exportar Pedidos CSV</button>
```

---

## 📊 Monitoramento

### Ver logs de execução

```sql
-- Últimas 50 execuções
SELECT * FROM edge_function_logs
ORDER BY created_at DESC
LIMIT 50;

-- Métricas de performance
SELECT * FROM edge_function_metrics;

-- Taxa de sucesso por função
SELECT
  function_name,
  success_rate_pct,
  avg_execution_time_ms
FROM edge_function_metrics
WHERE success_rate_pct < 95; -- Alertar se < 95%
```

---

## 🔍 Troubleshooting

### Erro: "RESEND_API_KEY not configured"

**Solução:** Configure a variável no Dashboard → Edge Functions → Secrets

### Erro: "Order not found"

**Solução:** Verifique se o order_id existe na tabela orders

### Erro: "Admin access required"

**Solução:** Verifique se o usuário tem role='admin' na tabela users

### Email não chega

**Soluções:**

1. Verificar spam/lixo eletrônico
2. Verificar se RESEND_API_KEY está correto
3. Ver logs: `SELECT * FROM edge_function_logs WHERE status = 'error'`
4. Verificar se email está verificado no Resend (free tier)

---

## 📝 Funcionalidades

### ✅ send-order-confirmation

**Entrada:**

```json
{
  "order_id": "uuid-do-pedido"
}
```

**Saída:**

```json
{
  "success": true,
  "message": "Order confirmation email sent",
  "order_id": "...",
  "execution_time_ms": 1234
}
```

**O que faz:**

1. Busca detalhes do pedido (order_details_view)
2. Busca template de email (email_templates)
3. Renderiza template com dados do pedido
4. Envia email via Resend API
5. Registra log de execução

---

### ✅ export-order-csv

**Entrada (query params):**

```
?start_date=2025-01-01&end_date=2025-12-31&status=delivered
```

**Saída:**

```csv
ID do Pedido,Cliente,Email,Status,Valor Total,Data do Pedido,Endereço,Total de Itens
abc123,João Silva,joao@email.com,delivered,1500.00,16/10/2025,"Rua A, 123",3
```

**O que faz:**

1. Verifica se usuário é admin
2. Busca pedidos com filtros (order_details_view)
3. Converte para formato CSV
4. Retorna arquivo para download
5. Registra log de execução

---

## 🎯 Próximos Passos

1. ✅ **Deploy das Edge Functions** (você está aqui!)
2. ✅ **Testar envio de email** (criar pedido e verificar inbox)
3. ✅ **Testar exportação CSV** (como admin)
4. ✅ **Integrar com frontend** (código fornecido acima)
5. ✅ **Monitorar logs** (verificar taxa de sucesso)

---

## 🚀 Status

- [x] Infraestrutura no banco (migration 007) ✅
- [ ] Deploy das Edge Functions ⏳ **VOCÊ ESTÁ AQUI**
- [ ] Configurar variáveis de ambiente ⏳
- [ ] Testar envio de email ⏳
- [ ] Testar exportação CSV ⏳
- [ ] Integrar com frontend ⏳

---

**Tempo estimado para deploy:** 10-15 minutos  
**Requisito:** Obrigatório para o desafio técnico ✅

Boa sorte! 🚀
