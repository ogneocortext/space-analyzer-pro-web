#!/bin/bash
# Test script for Space Analyzer AI Service

set -e

echo "🧪 Running tests for Space Analyzer AI Service..."

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry is not installed. Please install Poetry first."
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
poetry install --with dev

# Run unit tests
echo "🔬 Running unit tests..."
poetry run pytest tests/ -v --tb=short

# Run integration tests
echo "🔗 Running integration tests..."
poetry run pytest tests/ -v -m "not unit" --tb=short

# Run all tests with coverage
echo "📊 Running all tests with coverage..."
poetry run pytest tests/ -v --cov=ai_service --cov-report=term-missing --cov-report=html --cov-fail-under=80

echo "✅ All tests completed!"
echo "📊 Coverage report available in htmlcov/"
echo "📈 Coverage threshold: 80%"
