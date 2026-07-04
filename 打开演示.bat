@echo off
chcp 65001 >nul
title Tokubai Hub 演示
cd /d "%~dp0"

echo.
echo  ========================================
echo    Tokubai Hub  稳定演示（无需网络）
echo  ========================================
echo.

if exist "TokubaiHub-デモ.html" (
    echo 正在用浏览器打开演示...
    start "" "%~dp0TokubaiHub-デモ.html"
    echo.
    echo  已打开！若未弹出，请双击: TokubaiHub-デモ.html
    timeout /t 5 >nul
    exit /b 0
)

if exist "tokubai-hub\demo-standalone.html" (
    start "" "%~dp0tokubai-hub\demo-standalone.html"
    echo  已打开 tokubai-hub\demo-standalone.html
    timeout /t 5 >nul
    exit /b 0
)

echo  找不到演示文件，请确认已下载完整项目。
pause
