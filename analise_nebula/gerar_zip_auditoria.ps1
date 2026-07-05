# Script de Automação Nebula AI - Compactação para Auditoria IA
# Este script cria um arquivo ZIP ultra-leve contendo apenas o código-fonte essencial do Nebula.

$ScriptPath = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$RootPath = (Get-Item -Path $ScriptPath).Parent.FullName
$DestFolder = "analise_nebula"
$ZipName = "analise_nebula.zip"
$ZipPath = Join-Path -Path $RootPath -ChildPath "$DestFolder\$ZipName"

# Se o ZIP antigo existir, remove
if (Test-Path -Path $ZipPath) {
    Remove-Item -Path $ZipPath -Force
}

# Criar lista de arquivos e diretórios essenciais a incluir
$Includes = @(
    "src",
    "public",
    "supabase",
    "api",
    "package.json",
    "eslint.config.js",
    "index.html",
    "vite.config.js",
    "nebula-bridge.js",
    "nebula-bridge.cjs",
    "README.md",
    "AGENT_CONTEXT.md",
    "ROADMAP_MASTER_OS.md",
    "DESIGN_GUARDRAILS.md",
    "DESIGN_SYSTEM.md",
    "HANDOVER_OAUTH.md",
    "SAFETY_PROTOCOL.md",
    "SYSTEM_PROMPT.md",
    ".antigravity_context.md",
    "rag_schema.sql",
    "supabase_provider_connections.sql",
    "supabase_usage_schema.sql",
    "analise_nebula"
)

Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "Iniciando a compactação do código-fonte do Nebula AI..." -ForegroundColor Cyan
Write-Host "Raiz do Projeto: $RootPath" -ForegroundColor Gray
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan

# Filtra apenas os itens válidos e existentes
$ItemsToCompress = Get-ChildItem -Path $RootPath | Where-Object { $Includes -contains $_.Name }

# Define um caminho temporário fora da pasta analise_nebula para evitar dependência circular
$TempZipPath = Join-Path -Path $env:TEMP -ChildPath $ZipName
if (Test-Path -Path $TempZipPath) {
    Remove-Item -Path $TempZipPath -Force
}

# Compacta os itens selecionados para a pasta temporária
Compress-Archive -Path $ItemsToCompress.FullName -DestinationPath $TempZipPath -Force

# Move o zip gerado para a pasta final analise_nebula
Move-Item -Path $TempZipPath -Destination $ZipPath -Force

Write-Host "Sucesso! O arquivo de auditoria foi gerado com sucesso em:" -ForegroundColor Green
Write-Host "-> $ZipPath" -ForegroundColor White

Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "Tamanho do arquivo gerado:" -ForegroundColor Cyan
$FileSize = (Get-Item -Path $ZipPath).Length / 1MB
$SizeFormatted = "{0:N2}" -f $FileSize
if ($FileSize -le 35) {
    Write-Host "$SizeFormatted MB (Dentro do limite de 35 MB - OK)" -ForegroundColor Green
}
if ($FileSize -gt 35) {
    Write-Host "$SizeFormatted MB (ATENCAO: Ultrapassou o limite de 35 MB - ALERTA)" -ForegroundColor Red
}
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
