@echo off
chcp 65001 >nul
cd /d "%~dp0backend"

echo.
echo ╔════════════════════════════════════════════════╗
echo ║     NewBee 图片批量压缩                         ║
echo ╚════════════════════════════════════════════════╝
echo.
echo   按任意键开始压缩 uploads 目录下的图片...
pause >nul
echo.

npx ts-node scripts/compress-existing.ts

echo.
echo   压缩完成！按任意键退出...
pause >nul
