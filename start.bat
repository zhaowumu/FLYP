@echo off
title Game Project Management System

echo ========================================
echo    Game Project Management System
echo ========================================
echo.

echo [1/3] Checking Node.js environment...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found, please install Node.js first
    pause
    exit /b 1
)
echo Node.js environment OK

echo.
echo [2/3] Starting backend service (Port: 3000)...
cd /d "%~dp0backend"
start "Backend Service" cmd /k "npm run dev"

echo Waiting for backend to start...
timeout /t 12 /nobreak >nul

echo.
echo [3/3] Starting frontend service (Port: 5173)...
cd /d "%~dp0frontend"
start "Frontend Service" cmd /k "npm run dev"

echo.
echo ========================================
echo    Services started successfully!
echo ========================================
echo.
echo Backend API: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window (services will continue running)
pause >nul