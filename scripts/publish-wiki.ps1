# Script de Publicação Automática da Wiki do tClavis no GitHub
# Requisitos: gh CLI autenticado ou PAT com permissão de 'repo'

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Publicador da Wiki Oficial - tClavis   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$owner = "TTreter"
$repo = "tClavis"
$wikiUrl = "https://github.com/$owner/$repo.wiki.git"
$wikiWebUrl = "https://github.com/$owner/$repo/wiki"

# 1. Obter Token de Autenticação via GitHub CLI
Write-Host "`n[1/4] Verificando credenciais do GitHub CLI..." -ForegroundColor Yellow
try {
    $token = gh auth token
    if (-not $token) {
        throw "Token vazio"
    }
    Write-Host "✓ Autenticado com sucesso via GitHub CLI!" -ForegroundColor Green
} catch {
    Write-Error "Falha ao obter token do GitHub CLI. Certifique-se de executar 'gh auth login' antes de rodar este script."
    exit 1
}

$authWikiUrl = "https://x-access-token:$token@github.com/$owner/$repo.wiki.git"

# 2. Testar se o backend da Wiki já foi inicializado no GitHub
Write-Host "`n[2/4] Testando disponibilidade do repositório da Wiki no GitHub..." -ForegroundColor Yellow
$lsRemote = & git ls-remote $authWikiUrl 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  O repositório Git da Wiki ainda não foi inicializado pelos servidores do GitHub!" -ForegroundColor Yellow
    Write-Host "O GitHub exige que a primeira página seja salva pelo navegador UMA única vez para provisionar o repositório." -ForegroundColor White
    Write-Host "`nPor favor, faça o seguinte:" -ForegroundColor Cyan
    Write-Host "1. Abra a URL: $wikiWebUrl" -ForegroundColor Green
    Write-Host "2. Clique no botão verde 'Create the first page' (ou crie a página inicial)" -ForegroundColor Green
    Write-Host "3. Clique em 'Save Page'" -ForegroundColor Green
    Write-Host "4. Execute este script novamente: .\scripts\publish-wiki.ps1" -ForegroundColor Green
    
    # Pergunta se deseja abrir a página agora
    $open = Read-Host "`nDeseja abrir a página no seu navegador agora? (S/N)"
    if ($open -eq 'S' -or $open -eq 's') {
        Start-Process $wikiWebUrl
    }
    exit 0
}

Write-Host "✓ Repositório da Wiki está ativo e pronto para receber push!" -ForegroundColor Green

# 3. Preparar diretório temporário para push
Write-Host "`n[3/4] Preparando arquivos e histórico Git da Wiki..." -ForegroundColor Yellow
$tempDir = Join-Path $env:TEMP "tclavis-wiki-build"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copiar todos os arquivos da pasta wiki/
$sourceWikiDir = Join-Path $PSScriptRoot "..\wiki"
Copy-Item -Path "$sourceWikiDir\*" -Destination $tempDir -Recurse

Push-Location $tempDir
try {
    & git init -b master
    & git config user.name "Tiago Treter"
    & git config user.email "tiago@treter.com"
    & git add .
    & git commit -m "docs: Publicação completa da Wiki oficial do tClavis"
    
    # 4. Enviar para o repositório remoto
    Write-Host "`n[4/4] Enviando documentação completa para o GitHub Wiki..." -ForegroundColor Yellow
    & git remote add origin $authWikiUrl
    & git push --force origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n🎉 SUCESSO! A Wiki do tClavis foi publicada com êxito!" -ForegroundColor Green
        Write-Host "Acesse agora em: $wikiWebUrl" -ForegroundColor Cyan
    } else {
        Write-Error "Ocorreu um erro ao enviar para o repositório remoto."
    }
} finally {
    Pop-Location
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
}
