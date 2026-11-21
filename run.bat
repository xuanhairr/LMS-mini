@echo off
echo ==================================================
echo Starting LMS-mini Application
echo ==================================================

echo [1/2] Starting Backend...
start "LMS Backend" cmd /k "cd /d "%~dp0BE\apps\lms-project-server" && npm run start:watch"

echo [2/2] Starting Frontend...
start "LMS Frontend" cmd /k "cd /d "%~dp0FE" && npm run dev"

echo Both services are starting in separate windows.
echo You can close this window now.
pause
