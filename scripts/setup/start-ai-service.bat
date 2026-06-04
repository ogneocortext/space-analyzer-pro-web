@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Starting Unified AI Service v3.0.0
echo ========================================
echo.

cd /d "%~dp0ai-service"

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [X] Python not found. Install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check/install dependencies
echo [+] Checking dependencies...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo [X] Failed to install dependencies
    pause
    exit /b 1
)
echo     [OK] Dependencies ready

echo.
echo [+] Starting unified AI service on port 5000...
echo     - ML predictions:  /predict/*
echo     - Auth:            /auth/*
echo     - Ollama proxy:    /ollama/*
echo     - Categorizer:     /categorizer/*
echo     - Docs:            http://localhost:5000/docs
echo.

python -m app.main

pause
