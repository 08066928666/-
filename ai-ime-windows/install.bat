@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   AI 智能输入法 - Windows 安装
echo ========================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python。请先安装 Python 3.10+：
    echo   https://www.python.org/downloads/
    echo   安装时勾选 "Add Python to PATH"
    pause
    exit /b 1
)

echo [1/2] 安装依赖...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [2/2] 安装完成！
echo.
echo 使用方法：
echo   双击 run.bat 启动
echo   或命令行：python main.py
echo.
echo 建议：右键 run.bat -^> 发送到桌面快捷方式
echo.
pause
