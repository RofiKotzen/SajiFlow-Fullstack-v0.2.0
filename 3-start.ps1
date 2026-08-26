$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendPath'; npm.cmd run start:dev"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FrontendPath'; npm.cmd run dev"

Write-Host "Saji Flow sedang dijalankan." -ForegroundColor Green
Write-Host "Frontend : http://localhost:5173"
Write-Host "Backend  : http://localhost:3000"
Write-Host "Swagger  : http://localhost:3000/docs"
