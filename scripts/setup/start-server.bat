@echo off
setlocal

echo.
echo ====================================
echo Space Analyzer - Backend Server
echo ====================================
echo.

rem Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0
set SERVER_DIR=%SCRIPT_DIR%..\server

cd /d "%SERVER_DIR%"

echo Starting server on port 8080...
echo.

rem Try to find node.exe in PATH first, then try common locations
where node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    node server.js
) else (
    rem Try common Node.js installation paths
    if exist "C:\Program Files\nodejs\node.exe" (
        "C:\Program Files\nodejs\node.exe" server.js
    ) else if exist "C:\nvm4w\nodejs\node.exe" (
        "C:\nvm4w\nodejs\node.exe" server.js
    ) else (
        echo Error: node.exe not found in PATH or common locations
        echo Please ensure Node.js is installed and in your PATH
        pause
        exit /b 1
    )
)

pause
