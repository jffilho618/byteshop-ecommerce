# Testar exportacao CSV usando SERVICE_ROLE_KEY (bypass auth)
# A funcao verifica se o usuario e admin consultando o banco

$PROJECT_URL = "https://cliihgjajttoulpsrxzh.supabase.co"
# Usando SERVICE_ROLE_KEY que tem permissoes totais
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsaWloZ2phanR0b3VscHNyeHpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ3OTE1NiwiZXhwIjoyMDc2MDU1MTU2fQ.2Caulf3zFu4EDgqSgfL8P4ayP_FF5NfnPWjDTrlAYpo"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE: export-order-csv" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Parametros de filtro (opcional)
$filters = "?status=pending"  # Altere conforme necessario
# $filters = "?start_date=2025-10-01&end_date=2025-10-31"
# $filters = ""  # Sem filtros = todos os pedidos

Write-Host "Filtros: $filters" -ForegroundColor Gray
Write-Host "Fazendo request..." -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
}

try {
    # Fazer request para a Edge Function
    $response = Invoke-WebRequest `
        -Uri "$PROJECT_URL/functions/v1/export-order-csv$filters" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    # Salvar CSV
    $filename = "orders_export_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
    $response.Content | Out-File -FilePath $filename -Encoding UTF8
    
    Write-Host "SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Arquivo salvo: $filename" -ForegroundColor Cyan
    Write-Host "Tamanho: $($response.Content.Length) bytes" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Primeiras linhas do CSV:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    # Mostrar primeiras 10 linhas
    Get-Content $filename | Select-Object -First 10 | ForEach-Object { Write-Host $_ -ForegroundColor White }
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Arquivo completo salvo em: $PWD\$filename" -ForegroundColor Green
    
} catch {
    Write-Host "ERRO!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    
    if ($statusCode -eq 403) {
        Write-Host "Acesso negado - Usuario nao e admin" -ForegroundColor Red
    } elseif ($statusCode -eq 404) {
        Write-Host "Nenhum pedido encontrado com os filtros especificados" -ForegroundColor Yellow
    } else {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "Detalhes: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Filtros disponiveis:" -ForegroundColor Cyan
Write-Host "  ?status=pending" -ForegroundColor Gray
Write-Host "  ?status=delivered" -ForegroundColor Gray
Write-Host "  ?start_date=2025-10-01&end_date=2025-10-31" -ForegroundColor Gray
Write-Host "  ?status=pending&start_date=2025-10-01" -ForegroundColor Gray
