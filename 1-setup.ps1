$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"

Write-Host "Menyiapkan backend Saji Flow..." -ForegroundColor Cyan
Set-Location $BackendPath
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
npm.cmd install

Write-Host "Menyiapkan frontend Saji Flow..." -ForegroundColor Cyan
Set-Location $FrontendPath
if (-not (Test-Path ".env.local")) { Copy-Item ".env.example" ".env.local" }
npm.cmd install

Write-Host "`nSetup dependency selesai." -ForegroundColor Green
Write-Host "Sekarang edit file backend\.env, lalu jalankan .\2-init-database.ps1"
Set-Location $ProjectRoot
