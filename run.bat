@echo off
title LMS-mini Application

echo ==================================================
echo           Starting LMS-mini Application
echo ==================================================
echo.

echo [1/3] Starting Database [MongoDB via Docker]...
cd /d "%~dp0BE\apps\lms-project-server"
docker compose -f docker-compose.dev.yml up -d
if %ERRORLEVEL% NEQ 0 (
    docker-compose -f docker-compose.dev.yml up -d
)
echo.

echo [2/3] Starting Backend [NestJS]...
start "LMS Backend" cmd /k "cd /d "%~dp0BE\apps\lms-project-server" && npm run start:watch"
echo.

echo [3/3] Starting Frontend [React Vite]...
start "LMS Frontend" cmd /k "cd /d "%~dp0FE" && npm run dev"
echo.

echo ==================================================
echo Services are starting in separate windows!
echo - Frontend:  http://localhost:8080
echo - Backend:   http://localhost:3000
echo - GraphQL:   http://localhost:3000/graphql
echo - Database:  MongoDB on port 27017
echo ==================================================
echo.
pause
