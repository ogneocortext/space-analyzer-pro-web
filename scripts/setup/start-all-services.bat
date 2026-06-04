@echo off
setlocal enabledelayedexpansion

REM Space Analyzer Pro - Start All Services
REM Unified: AI Service (port 5000), Orchestrator (port 8002), Node.js Backend (port 8091)

echo ========================================
echo Space Analyzer Pro - Starting All Services
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ to run AI Service and Orchestrator
    pause
    exit /b 1
)
echo [OK] Python found

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 18+ to run the backend server
    pause
    exit /b 1
)
echo [OK] Node.js found
echo.

REM Check if ports are already in use
echo Checking if ports are available...
netstat -ano | findstr ":5000" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 5000 is already in use. AI Service may fail to start.
)
netstat -ano | findstr ":8002" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 8002 is already in use. Orchestrator may fail to start.
)
netstat -ano | findstr ":8091" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Port 8091 is already in use. Backend may fail to start.
)
echo.

REM Start services
echo [1/3] Starting Unified AI Service on port 5000...
start "SpaceAnalyzer-AI-Service" cmd /k "cd /d %~dp0ai-service && echo Starting Unified AI Service v3.0.0... && python -m app.main"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Python Orchestrator on port 8002...
start "SpaceAnalyzer-Orchestrator" cmd /k "cd /d %~dp0orchestrator\src && echo Starting Orchestrator... && python api.py"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Node.js Backend on port 8091...
start "SpaceAnalyzer-Backend" cmd /k "cd /d %~dp0server && echo Starting Backend Server... && node server-improved.js"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Service URLs:
echo - Backend:      http://localhost:8091
echo - AI Service:   http://localhost:5000  (unified: predictions + categorizer + ollama)
echo - Orchestrator: http://localhost:8002
echo.
echo API Documentation:
echo - Backend:      http://localhost:8091/
echo - AI Service:   http://localhost:5000/docs
echo - Orchestrator: http://localhost:8002/docs
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo Stopping all services...
echo.

taskkill /FI "WINDOWTITLE eq SpaceAnalyzer-AI-Service*" /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq SpaceAnalyzer-Orchestrator*" /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq SpaceAnalyzer-Backend*" /T >nul 2>&1

taskkill /IM python.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1

timeout /t 2 /nobreak >nul
echo All services stopped.
echo.
pause
