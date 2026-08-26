$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $ProjectRoot "backend")

if (-not (Test-Path ".env")) {
  throw "File backend\.env belum ada. Jalankan .\1-setup.ps1 terlebih dahulu."
}

Write-Host "Menjalankan migration database..." -ForegroundColor Cyan
npm.cmd run db:migrate
Write-Host "Membuat tenant, outlet, role, permission, dan admin awal..." -ForegroundColor Cyan
npm.cmd run db:seed
Write-Host "`nDatabase Saji Flow siap digunakan." -ForegroundColor Green
Set-Location $ProjectRoot
