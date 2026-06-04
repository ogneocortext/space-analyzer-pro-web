#!/bin/bash
# Linting script for Space Analyzer AI Service

set -e

echo "🔍 Running linting checks for Space Analyzer AI Service..."

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry is not installed. Please install Poetry first."
    echo "   Visit: https://python-poetry.org/docs/#installation"
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
poetry install --with dev

# Run Black (code formatting)
echo "🎨 Running Black (code formatting)..."
poetry run black --check --diff ai_service/ tests/ scripts/

# Run isort (import sorting)
echo "📚 Running isort (import sorting)..."
poetry run isort --check-only --diff ai_service/ tests/ scripts/

# Run flake8 (linting)
echo "🔍 Running flake8 (linting)..."
poetry run flake8 ai_service/ tests/ scripts/ --max-line-length=88 --extend-ignore=E203,W503

# Run mypy (type checking)
echo "🔍 Running mypy (type checking)..."
poetry run mypy ai_service/ --ignore-missing-imports --no-strict-optional

# Run bandit (security linter)
echo "🔒 Running bandit (security check)..."
poetry run bandit -r ai_service/ -f json -o bandit-report.json || true

# Run pytest with coverage
echo "🧪 Running tests with coverage..."
poetry run pytest tests/ -v --cov=ai_service --cov-report=term-missing --cov-report=html --cov-report=xml

echo "✅ Linting complete!"
echo "📊 Coverage report generated in htmlcov/"
echo "🔒 Security report generated in bandit-report.json"
