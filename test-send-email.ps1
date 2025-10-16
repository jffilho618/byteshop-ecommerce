# Teste Final da Edge Function send-order-confirmation

$PROJECT_URL = "https://cliihgjajttoulpsrxzh.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsaWloZ2phanR0b3VscHNyeHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NzkxNTYsImV4cCI6MjA3NjA1NTE1Nn0.Gvftggy8YB82pQeA9dOmWR7-45R7Zscw4Ef5b42Q9_c"
$ORDER_ID = "20c607df-bc47-4f09-a55d-3bf09e757495"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTE: send-order-confirmation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Order ID: $ORDER_ID" -ForegroundColor Gray
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $ANON_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    order_id = $ORDER_ID
} | ConvertTo-Json

Write-Host "Enviando request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "$PROJECT_URL/functions/v1/send-order-confirmation" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    Write-Host "Verifique o email do usuario!" -ForegroundColor Yellow
    
} catch {
    Write-Host ""
    Write-Host "ERRO!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Detalhes: $errorBody" -ForegroundColor Red
    } catch {
        Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "1. RESEND_API_KEY configurado no Dashboard" -ForegroundColor Gray
    Write-Host "2. email_templates populado (execute INSERT_EMAIL_TEMPLATE.sql)" -ForegroundColor Gray
    Write-Host "3. Logs no Dashboard: https://supabase.com/dashboard/project/cliihgjajttoulpsrxzh/logs/edge-functions" -ForegroundColor Gray
}
