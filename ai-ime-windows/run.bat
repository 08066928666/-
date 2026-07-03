@echo off
chcp 65001 >nul
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先运行 install.bat
    pause
    exit /b 1
)

:: 建议以管理员运行以获得全局热键最佳兼容性
python main.py
if errorlevel 1 pause
