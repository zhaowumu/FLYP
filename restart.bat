@echo off
title Restart Services

echo ========================================
echo    Restart Services
echo ========================================
echo.

echo Stopping existing services...
call "%~dp0stop.bat"

echo.
echo Waiting 3 seconds before restart...
timeout /t 3 /nobreak >nul

echo.
echo Starting services...
call "%~dp0start.bat"