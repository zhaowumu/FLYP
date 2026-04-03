@echo off
title Install Dependencies

echo ========================================
echo    Install Dependencies
echo ========================================
echo.

echo [1/3] Checking Node.js environment...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found, please install Node.js first
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo Node.js version: %%i

echo.
echo [2/3] Installing backend dependencies...
cd /d "%~dp0backend"
echo Cleaning old dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo Installing new dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend dependencies installation failed
    pause
    exit /b 1
)
echo Backend dependencies installed

echo.
echo [3/3] Installing frontend dependencies...
cd /d "%~dp0frontend"
echo Cleaning old dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo Installing new dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend dependencies installation failed
    pause
    exit /b 1
)
echo Frontend dependencies installed

echo.
echo ========================================
echo    Dependencies installed successfully!
echo ========================================
echo.
echo Now you can run start.bat to start services
echo.
pause