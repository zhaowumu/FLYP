@echo off
title Stop Services

echo ========================================
echo    Stop All Services
echo ========================================
echo.

echo Stopping backend service...
taskkill /fi "WindowTitle eq Backend Service*" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo Backend service stopped
) else (
    echo Backend service not running
)

echo.
echo Stopping frontend service...
taskkill /fi "WindowTitle eq Frontend Service*" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo Frontend service stopped
) else (
    echo Frontend service not running
)

echo.
echo ========================================
echo    All services stopped!
echo ========================================
echo.
pause