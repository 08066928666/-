@echo off
chcp 65001 >nul
echo ========================================
echo   Tokubai Hub 一键启动
echo ========================================
echo.

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo 请先安装: https://nodejs.org/ （选 LTS 版本）
    pause
    exit /b 1
)

echo [1/3] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] npm install 失败
    pause
    exit /b 1
)

echo.
echo [2/3] 初始化数据库...
if not exist .env copy .env.example .env
call npm run db:setup
if %errorlevel% neq 0 (
    echo [错误] 数据库初始化失败
    pause
    exit /b 1
)

echo.
echo [3/3] 启动服务器...
echo.
echo 启动成功后，浏览器打开: http://localhost:3000
echo 按 Ctrl+C 可停止服务器
echo.

call npm run dev

pause
