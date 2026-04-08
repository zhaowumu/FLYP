@echo off
title Stop Services

echo ========================================
echo    Stop All Services
echo ========================================
echo.

echo Stopping backend service...
taskkill /fi "WindowTitle eq Backend Service*" /f >nul 2>&1

echo Stopping frontend service...
taskkill /fi "WindowTitle eq Frontend Service*" /f >nul 2>&1

echo Stopping node processes...
taskkill /im node.exe /f >nul 2>&1

echo.
echo ========================================
echo    All services stopped!
echo ========================================
echo.
pause