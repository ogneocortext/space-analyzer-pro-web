#!/usr/bin/env python3
"""
Space Analyzer AI Service - DEPRECATED

This file has been replaced by the unified AI service in app/main.py.
Run `python -m app.main` instead to start the consolidated service.

This file is kept for backward compatibility and will redirect to the new service.
"""
import sys
from pathlib import Path

print("⚠️  WARNING: This entry point is deprecated.")
print("   Use 'python -m app.main' instead for the unified AI service v3.0.0")
print("   Starting unified service now...\n")

sys.path.insert(0, str(Path(__file__).parent))
from app.main import app
import uvicorn
from app.config import HOST, PORT

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT, reload=True)
