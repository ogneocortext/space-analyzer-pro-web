"""
ML Categorizer API Service - DEPRECATED

This file has been replaced by the unified AI service in app/main.py.
The categorizer endpoints are now available at /categorizer/* on port 5000.

Run `python -m app.main` to start the consolidated service.
"""
import sys
from pathlib import Path

print("⚠️  WARNING: This entry point is deprecated.")
print("   Use 'python -m app.main' instead for the unified AI service v3.0.0")
print("   Categorizer endpoints are now at /categorizer/* on port 5000")
print("   Starting unified service now...\n")

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.main import app
import uvicorn
from app.config import HOST, PORT

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT, reload=True)
