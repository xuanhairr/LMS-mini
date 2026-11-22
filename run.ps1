[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Khoi dong LMS-mini"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         KHOI DONG HE THONG LMS-MINI              " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition

# 1. Khởi động Database (MongoDB qua Docker)
Write-Host "[1/3] Dang khoi dong Database (MongoDB qua Docker)..." -ForegroundColor Yellow
Push-Location "$scriptPath\BE\apps\lms-project-server"
try {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        docker compose -f docker-compose.dev.yml up -d 2>$null
        if ($LASTEXITCODE -ne 0) {
            docker-compose -f docker-compose.dev.yml up -d 2>$null
        }
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database (MongoDB) khoi dong thanh cong!" -ForegroundColor Green
        } else {
            Write-Host "[CANH BAO] Khong the bat container qua Docker. Hay kiem tra xem Docker Desktop da chay chua." -ForegroundColor Red
        }
    } else {
        Write-Host "[CANH BAO] Khong tim thay lenh docker trong PATH." -ForegroundColor Red
    }
} catch {
    Write-Host "[CANH BAO] Co loi khi chay Docker: $_" -ForegroundColor Red
}
Pop-Location
Write-Host ""

# 2. Khởi động Backend (NestJS)
Write-Host "[2/3] Dang khoi dong Backend (NestJS)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$scriptPath\BE\apps\lms-project-server'; `$Host.UI.RawUI.WindowTitle = 'LMS Backend (Port 3000)'; npm run start:watch`""
Write-Host ""

# 3. Khởi động Frontend (React Vite)
Write-Host "[3/3] Dang khoi dong Frontend (React Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"Set-Location '$scriptPath\FE'; `$Host.UI.RawUI.WindowTitle = 'LMS Frontend (Port 8080)'; npm run dev`""
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Tat ca cac dich vu dang duoc khoi dong!" -ForegroundColor Green
Write-Host " - Frontend : http://localhost:8080" -ForegroundColor White
Write-Host " - Backend  : http://localhost:3000" -ForegroundColor White
Write-Host " - GraphQL  : http://localhost:3000/graphql" -ForegroundColor White
Write-Host " - Database : MongoDB tren cong 27017" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Cua so nay se tu dong dong sau 5 giay..." -ForegroundColor Gray
Start-Sleep -Seconds 5
