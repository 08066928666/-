@echo off
chcp 65001 >nul
title Tokubai Hub
cd /d "%~dp0"

echo ========================================
echo   Tokubai Hub 一键启动
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo 请先安装: https://nodejs.org/zh-cn （选 LTS 版本）
    pause
    exit /b 1
)

echo [1/2] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] npm install 失败
    pause
    exit /b 1
)

echo.
echo [2/2] 启动服务并打开浏览器...
echo 请勿关闭本窗口。按 Ctrl+C 可停止。
echo.

start /b node scripts\wait-and-open.js
call npm run dev

pause
