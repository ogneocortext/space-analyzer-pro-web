#!/bin/bash
# AI Service Startup Script for macOS/Linux

set -e

echo "🚀 Starting Space Analyzer AI Service..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.9+"
    exit 1
fi

# Check Python version
version=$(python3 --version)
echo "📦 $version"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📁 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Start the service
echo "🌐 Starting AI Service on port ${PYTHON_AI_PORT:-5000}..."
echo "📖 API docs: http://localhost:${PYTHON_AI_PORT:-5000}/docs"
echo ""

python main.py
