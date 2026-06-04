#!/usr/bin/env python3
"""
Pytest configuration for Space Analyzer AI Service tests.
"""

import pytest
import tempfile
import os
from pathlib import Path

# Set test environment variables
os.environ["PYTHON_AI_PORT"] = "5001"  # Use different port for tests
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["API_KEY"] = "test-api-key"


@pytest.fixture
def temp_models_dir():
    """Create temporary models directory for tests."""
    with tempfile.TemporaryDirectory() as temp_dir:
        models_dir = Path(temp_dir) / "models"
        models_dir.mkdir(exist_ok=True)
        yield models_dir


@pytest.fixture
def sample_file_data():
    """Sample file data for testing."""
    return {
        "path": "/test/sample.txt",
        "name": "sample.txt",
        "size": 1024,
        "extension": "txt",
        "modified_time": 1640995200,
        "category": "documents"
    }


@pytest.fixture
def sample_directory_analysis():
    """Sample directory analysis for testing."""
    return {
        "files": [
            {
                "path": "/test/file1.txt",
                "name": "file1.txt",
                "size": 1024,
                "extension": "txt",
                "modified_time": 1640995200,
                "category": "documents"
            },
            {
                "path": "/test/file2.py",
                "name": "file2.py",
                "size": 2048,
                "extension": "py",
                "modified_time": 1640995200,
                "category": "code"
            }
        ],
        "path": "/test"
    }


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
