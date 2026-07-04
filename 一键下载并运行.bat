@echo off
chcp 65001 >nul
title Tokubai Hub 一键下载并运行
set "TARGET=%USERPROFILE%\Desktop\tokubai"
set "REPO=https://github.com/08066928666/-.git"
set "BRANCH=cursor/local-open-cb9a"

echo.
echo  ==========================================
echo    Tokubai Hub  一键下载并运行
echo  ==========================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [1] 未安装 Git，改用浏览器下载 ZIP...
    echo.
    start https://github.com/08066928666/-/tree/%BRANCH%
    echo  请在网页点 Code -^> Download ZIP
    echo  解压到桌面后，双击 tokubai 文件夹里的 TokubaiHub-デモ.html
    pause
    exit /b 1
)

if not exist "%TARGET%" (
    echo [1/3] 正在下载到桌面\tokubai ...
    git clone -b %BRANCH% %REPO% "%TARGET%"
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 下载失败。仓库是私有的请先登录 GitHub，或用手动下载 ZIP。
        start https://github.com/08066928666/-/tree/%BRANCH%
        pause
        exit /b 1
    )
) else (
    echo [1/3] 已存在桌面\tokubai ，跳过下载
)

cd /d "%TARGET%"
echo [2/3] 准备运行...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  未安装 Node.js，打开离线演示版...
    start "" "%TARGET%\TokubaiHub-デモ.html"
    echo.
    echo  已打开演示页。完整版请安装 Node.js 后重新运行本脚本。
    echo  https://nodejs.org/zh-cn
    timeout /t 8
    exit /b 0
)

echo [3/3] 启动完整版（自动打开浏览器）...
call "%TARGET%\本机打开.bat"
