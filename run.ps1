Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Starting LMS-mini Application" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "[1/2] Starting Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$scriptPath\BE\apps\lms-project-server'; npm run start:watch`""

Write-Host "[2/2] Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$scriptPath\FE'; npm run dev`""

Write-Host "Both services are starting in separate windows." -ForegroundColor Green
