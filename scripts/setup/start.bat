@echo off
REM Space Analyzer Pro - Startup Script (Windows)
REM This script checks prerequisites and launches the application

echo ================================================
echo   Space Analyzer Pro v3.3.0 - Startup
echo ================================================
echo.

REM Check if Rust/Cargo is available
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Rust/Cargo not found in PATH.
    echo Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

echo [OK] Rust/Cargo found
echo.

REM Check if Ollama is available (optional)
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Ollama found - AI features will be available
    echo.
) else (
    echo [INFO] Ollama not found - AI features will be disabled
    echo        Install from https://ollama.com to enable AI features
    echo.
)

REM Check if NVIDIA GPU is available (optional)
where nvidia-smi >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] NVIDIA GPU detected - GPU acceleration available
    echo.
) else (
    echo [INFO] No NVIDIA GPU detected - using CPU fallback
    echo.
)

REM Build the application
echo Building Space Analyzer Pro...
cargo build --release --bin space-analyzer-gui --bin space-analyzer-cli

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed. Try running: cargo clean ^&^& cargo build
    pause
    exit /b 1
)

echo.
echo [OK] Build successful
echo.

REM Ask user what to launch
echo Select what to launch:
echo   1. GUI Application (recommended)
echo   2. CLI Application
echo   3. Flow Test Harness
echo   4. Exit
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Launching GUI...
    .\target\release\space-analyzer-gui.exe
) else if "%choice%"=="2" (
    echo.
    set /p scan_path="Enter path to scan (default: .): "
    if "%scan_path%"=="" set scan_path=.
    .\target\release\space-analyzer-cli.exe --path "%scan_path%" --verbose
) else if "%choice%"=="3" (
    echo.
    echo Launching Flow Test Harness...
    cargo run --bin flow-test-harness
) else if "%choice%"=="4" (
    echo.
    echo Exiting...
    exit /b 0
) else (
    echo.
    echo Invalid choice. Exiting...
    exit /b 1
)

echo.
pause
