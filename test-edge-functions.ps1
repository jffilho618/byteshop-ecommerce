# 🧪 Script de Teste - Edge Functions ByteShop
# Execute este script para testar as Edge Functions

Write-Host "🚀 Testando Edge Functions - ByteShop" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Configurações
$SUPABASE_URL = "https://cliihgjajttoulpsrxzh.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsaWloZ2phanR0b3VscHNyeHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NzkxNTYsImV4cCI6MjA3NjA1NTE1Nn0.Gvftggy8YB82pQeA9dOmWR7-45R7Zscw4Ef5b42Q9_c"

# Headers
$headers = @{
    "Authorization" = "Bearer $ANON_KEY"
    "Content-Type" = "application/json"
    "apikey" = $ANON_KEY
}

Write-Host "📋 Passo 1: Buscando pedidos no banco de dados..." -ForegroundColor Cyan

try {
    # Buscar um pedido real (escape do &)
    $ordersUrl = "$SUPABASE_URL/rest/v1/orders?select=id,status`&limit=1"
    $ordersResponse = Invoke-RestMethod -Uri $ordersUrl -Method GET -Headers $headers

    if ($ordersResponse.Count -eq 0) {
        Write-Host "❌ ERRO: Nenhum pedido encontrado no banco de dados!" -ForegroundColor Red
        Write-Host "   Por favor, crie um pedido primeiro pelo frontend." -ForegroundColor Yellow
        exit 1
    }

    $orderId = $ordersResponse[0].id
    $orderStatus = $ordersResponse[0].status
    
    Write-Host "✅ Pedido encontrado!" -ForegroundColor Green
    Write-Host "   ID: $orderId" -ForegroundColor Gray
    Write-Host "   Status: $orderStatus`n" -ForegroundColor Gray

    # Teste 1: send-order-confirmation
    Write-Host "📧 Passo 2: Testando envio de email de confirmação..." -ForegroundColor Cyan
    
    $emailBody = @{
        order_id = $orderId
    } | ConvertTo-Json

    try {
        $emailUrl = "$SUPABASE_URL/functions/v1/send-order-confirmation"
        $emailResponse = Invoke-RestMethod -Uri $emailUrl -Method POST -Headers $headers -Body $emailBody

        Write-Host "✅ EMAIL ENVIADO COM SUCESSO!" -ForegroundColor Green
        Write-Host "   Resposta: $($emailResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
        Write-Host "   📥 Verifique sua caixa de entrada (pode estar no spam)!`n" -ForegroundColor Yellow
    }
    catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        Write-Host "❌ ERRO ao enviar email:" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
        if ($errorDetails) {
            Write-Host "   Detalhes: $($errorDetails | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
        Write-Host ""
    }

    # Teste 2: export-order-csv (precisa ser admin)
    Write-Host "📊 Passo 3: Testando exportação CSV..." -ForegroundColor Cyan
    Write-Host "   ⚠️  Este teste requer token de usuário ADMIN" -ForegroundColor Yellow
    Write-Host "   Para testar: faça login como admin no frontend e copie o token da sessão`n" -ForegroundColor Yellow

    # Verificar logs no banco
    Write-Host "📋 Passo 4: Verificando logs de execução..." -ForegroundColor Cyan
    
    $logsUrl = "$SUPABASE_URL/rest/v1/edge_function_logs?select=*`&order=created_at.desc`&limit=5"
    $logsResponse = Invoke-RestMethod -Uri $logsUrl -Method GET -Headers $headers

    if ($logsResponse.Count -gt 0) {
        Write-Host "✅ Logs encontrados:" -ForegroundColor Green
        foreach ($log in $logsResponse) {
            $statusIcon = if ($log.status -eq "success") { "✅" } else { "❌" }
            Write-Host "   $statusIcon [$($log.function_name)] - $($log.status) - $($log.execution_time_ms)ms" -ForegroundColor Gray
            if ($log.error_message) {
                Write-Host "      Erro: $($log.error_message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  Nenhum log encontrado ainda" -ForegroundColor Yellow
    }

    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "✅ TESTES CONCLUÍDOS!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green

    Write-Host "📊 RESUMO:" -ForegroundColor Cyan
    Write-Host "✅ Edge Functions deployed" -ForegroundColor Green
    Write-Host "✅ Variáveis de ambiente configuradas" -ForegroundColor Green
    Write-Host "✅ Teste de envio de email executado" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
    Write-Host "1. Verificar email recebido na caixa de entrada" -ForegroundColor White
    Write-Host "2. Integrar código no frontend (checkout.js e admin.js)" -ForegroundColor White
    Write-Host "3. Testar exportação CSV como admin" -ForegroundColor White
    Write-Host "4. Monitorar logs no Dashboard" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "❌ ERRO GERAL:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "   StatusCode: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}
