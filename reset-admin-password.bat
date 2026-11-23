@echo off
setlocal
node "%~dp0backend\scripts\reset-admin-password.cjs"
set "reset_status=%errorlevel%"
pause
exit /b %reset_status%
