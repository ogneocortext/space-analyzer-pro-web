@echo off
echo 🔧 Vite Cache Fix Script
echo ========================
echo.
echo This script will:
echo 1. Clear Vite cache with admin privileges
echo 2. Fix file permissions
echo 3. Create clean Vite configuration
echo 4. Restart development server
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running with administrator privileges
) else (
    echo ❌ This script requires administrator privileges
    echo.
    echo Please right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

REM Run Python script with admin privileges
echo 🐍 Running Python fix script...
python scripts\fix-vite-cache.py

if %errorLevel% neq 0 (
    echo.
    echo ❌ Script failed with error code %errorLevel%
    pause
    exit /b %errorLevel%
)

echo.
echo ✅ Vite cache fix completed!
echo 🚀 You can now run: npm run dev
echo.
pause