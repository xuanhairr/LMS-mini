@echo off
title Stop LMS-mini Services

echo ==================================================
echo           Stopping LMS-mini Services
echo ==================================================
echo.

echo Stopping Docker container (MongoDB)...
cd /d "%~dp0BE\apps\lms-project-server"
docker compose -f docker-compose.dev.yml down
if %ERRORLEVEL% NEQ 0 (
    docker-compose -f docker-compose.dev.yml down
)

echo.
echo ==================================================
echo Docker container has stopped.
echo To close Frontend and Backend, simply close their
echo terminal windows ("LMS Frontend" and "LMS Backend").
echo ==================================================
echo.
pause
