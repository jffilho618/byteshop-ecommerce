# ============================================
# BYTESHOP - SUPABASE BACKUP SCRIPT (PowerShell)
# ============================================
# Este script faz backup completo do schema do Supabase
# Inclui: tabelas, views, functions, policies, triggers, etc.
# ============================================

# Configuração
$PROJECT_REF = "cliihgjajttoulpsrxzh"
$DB_HOST = "db.$PROJECT_REF.supabase.co"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"
$DB_PASSWORD = "bombalixo123"
$BACKUP_DIR = ".\supabase\backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\backup_$TIMESTAMP.sql"

# Criar diretório de backup se não existir
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "BYTESHOP - BACKUP SUPABASE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Host: $DB_HOST"
Write-Host "Database: $DB_NAME"
Write-Host "Backup file: $BACKUP_FILE"
Write-Host "============================================" -ForegroundColor Cyan

# Definir variável de ambiente para senha
$env:PGPASSWORD = $DB_PASSWORD

# Fazer dump apenas do schema public
$arguments = @(
    "--host=$DB_HOST",
    "--port=$DB_PORT",
    "--username=$DB_USER",
    "--dbname=$DB_NAME",
    "--schema=public",
    "--no-owner",
    "--no-acl",
    "--clean",
    "--if-exists",
    "--format=plain",
    "--file=$BACKUP_FILE"
)

try {
    $process = Start-Process -FilePath "pg_dump" -ArgumentList $arguments -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -eq 0) {
        Write-Host "✅ Backup criado com sucesso!" -ForegroundColor Green
        Write-Host "📁 Arquivo: $BACKUP_FILE"
        $size = (Get-Item $BACKUP_FILE).Length / 1KB
        Write-Host "📊 Tamanho: $([math]::Round($size, 2)) KB"

        # Criar também um backup "latest" para fácil acesso
        Copy-Item $BACKUP_FILE "$BACKUP_DIR\backup_latest.sql" -Force
        Write-Host "📁 Cópia: $BACKUP_DIR\backup_latest.sql"
    } else {
        Write-Host "❌ Erro ao criar backup! Exit code: $($process.ExitCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erro ao executar pg_dump: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUÇÃO: Instale o PostgreSQL client:" -ForegroundColor Yellow
    Write-Host "1. Download: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "2. Ou use: winget install PostgreSQL.PostgreSQL" -ForegroundColor Yellow
    exit 1
} finally {
    # Limpar variável de ambiente
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "BACKUP COMPLETO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
