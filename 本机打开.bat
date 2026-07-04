@echo off
chcp 65001 >nul
title Tokubai Hub 本机打开
cd /d "%~dp0"

echo.
echo  ==========================================
echo    Tokubai Hub  本机打开（完整功能）
echo  ==========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo.
    echo 正在打开 Node.js 下载页，请安装 LTS 版本后重新双击本文件。
    start https://nodejs.org/zh-cn
    pause
    exit /b 1
)

if not exist "tokubai-hub\package.json" (
    echo [错误] 找不到 tokubai-hub 文件夹
    echo 请确认已下载完整项目（不要只解压单个 html 文件）。
    pause
    exit /b 1
)

cd /d "%~dp0tokubai-hub"

echo [1/2] 安装依赖（首次约 1-3 分钟，请耐心等待）...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [错误] 依赖安装失败。可尝试换国内镜像后重试：
    echo   npm config set registry https://registry.npmmirror.com
    pause
    exit /b 1
)

echo.
echo [2/2] 启动服务...
echo.
echo  会弹出一个标题为「Tokubai Hub 服务」的窗口 — 请勿关闭它
echo  关闭该窗口 = 网站停止
echo  浏览器将在服务就绪后自动打开
echo.

start /b node scripts\wait-and-open.js
start "Tokubai Hub 服务" cmd /k "npm run dev"

echo 正在等待 http://localhost:3000 就绪...
echo 若 2 分钟未自动打开，请手动在浏览器输入: http://localhost:3000
echo.
timeout /t 12 >nul
