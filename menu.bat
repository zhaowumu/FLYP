@echo off
title Game Project Management System

:menu
cls
echo.
echo  ========================================
echo     Game Project Management System
echo  ========================================
echo.
echo     1. Install Dependencies (First use)
echo     2. Start Services
echo     3. Stop Services
echo     4. Restart Services
echo     5. Check Status
echo     6. Open Project Folder
echo     0. Exit
echo.
echo  ========================================
echo.

set /p choice=Select option (0-6): 

if "%choice%"=="1" goto install
if "%choice%"=="2" goto start
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto status
if "%choice%"=="6" goto open
if "%choice%"=="0" goto exit
echo Invalid choice, please try again
timeout /t 2 >nul
goto menu

:install
echo.
call "%~dp0install.bat"
goto menu

:start
echo.
call "%~dp0start.bat"
goto menu

:stop
echo.
call "%~dp0stop.bat"
goto menu

:restart
echo.
call "%~dp0restart.bat"
goto menu

:status
echo.
echo Checking service status...
echo.
echo Backend service:
tasklist /fi "WindowTitle eq Backend Service*" 2>nul | find /i "cmd.exe" >nul
if %errorlevel% equ 0 (
    echo [Running]
) else (
    echo [Stopped]
)
echo.
echo Frontend service:
tasklist /fi "WindowTitle eq Frontend Service*" 2>nul | find /i "cmd.exe" >nul
if %errorlevel% equ 0 (
    echo [Running]
) else (
    echo [Stopped]
)
echo.
pause
goto menu

:open
explorer "%~dp0"
goto menu

:exit
echo.
echo Thank you for using Game Project Management System!
echo.
pause
exit /b 0