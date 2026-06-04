#!/bin/bash
# Space Analyzer Pro - Startup Script (Unix/Linux/macOS)
# This script checks prerequisites and launches the application

echo "================================================"
echo "  Space Analyzer Pro v3.3.0 - Startup"
echo "================================================"
echo ""

# Check if Rust/Cargo is available
if ! command -v cargo &> /dev/null; then
    echo "[ERROR] Rust/Cargo not found in PATH."
    echo "Please install Rust from https://rustup.rs/"
    exit 1
fi

echo "[OK] Rust/Cargo found"
echo ""

# Check if Ollama is available (optional)
if command -v ollama &> /dev/null; then
    echo "[OK] Ollama found - AI features will be available"
    echo ""
else
    echo "[INFO] Ollama not found - AI features will be disabled"
    echo "       Install from https://ollama.com to enable AI features"
    echo ""
fi

# Check if NVIDIA GPU is available (optional)
if command -v nvidia-smi &> /dev/null; then
    echo "[OK] NVIDIA GPU detected - GPU acceleration available"
    echo ""
else
    echo "[INFO] No NVIDIA GPU detected - using CPU fallback"
    echo ""
fi

# Build the application
echo "Building Space Analyzer Pro..."
cargo build --release --bin space-analyzer-gui --bin space-analyzer-cli

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Build failed. Try running: cargo clean && cargo build"
    exit 1
fi

echo ""
echo "[OK] Build successful"
echo ""

# Ask user what to launch
echo "Select what to launch:"
echo "  1. GUI Application (recommended)"
echo "  2. CLI Application"
echo "  3. Flow Test Harness"
echo "  4. Exit"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "Launching GUI..."
        ./target/release/space-analyzer-gui
        ;;
    2)
        echo ""
        read -p "Enter path to scan (default: .): " scan_path
        scan_path=${scan_path:-.}
        ./target/release/space-analyzer-cli --path "$scan_path" --verbose
        ;;
    3)
        echo ""
        echo "Launching Flow Test Harness..."
        cargo run --bin flow-test-harness
        ;;
    4)
        echo ""
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo ""
        echo "Invalid choice. Exiting..."
        exit 1
        ;;
esac

echo ""
read -p "Press Enter to continue..."
