@echo off
title Antigravity 一键汉化与还原工具
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 环境！
    echo 请先安装 Node.js 官网: https://nodejs.org 后再运行本工具。
    pause
    exit /b
)

node patch.js
pause