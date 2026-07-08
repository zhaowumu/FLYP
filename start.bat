@echo off
title Game Project Management System

echo ========================================
echo    Game Project Management System
echo ========================================
echo.

echo [1/4] Checking Node.js environment...
node --version >/dev/null 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found, please install Node.js first
    pause
    exit /b 1
)
echo Node.js environment OK

echo.
echo [2/4] Building backend...
cd /d "%~dp0backend"
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo Backend build success

echo.
echo [3/4] Starting backend service (Port: 3000)...
start "Backend Service" cmd /k "node --max-old-space-size=1024 dist/server.js"

echo Waiting for backend to start...
timeout /t 8 /nobreak >/dev/null

echo.
echo [4/4] Starting frontend service (Port: 5173)...
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
pause >/dev/null
