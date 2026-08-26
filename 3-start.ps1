$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"

function Assert-PortFree {
  param([int]$Port, [string]$Service)
  $Connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($Connection) {
    throw "Port $Port sedang dipakai. Tutup terminal/proses $Service yang lama, lalu jalankan script ini kembali."
  }
}

Assert-PortFree -Port 3000 -Service "backend"
Assert-PortFree -Port 5173 -Service "frontend"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendPath'; npm.cmd run start:dev"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FrontendPath'; npm.cmd run dev"

Write-Host "Saji Flow sedang dijalankan." -ForegroundColor Green
Write-Host "Frontend : http://localhost:5173"
Write-Host "Backend  : http://localhost:3000"
Write-Host "Swagger  : http://localhost:3000/docs"
