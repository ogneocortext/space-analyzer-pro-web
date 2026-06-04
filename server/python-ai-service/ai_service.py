"""
Python AI Service (Ollama Proxy) - DEPRECATED

This Flask-based Ollama proxy has been replaced by the unified AI service.
Ollama endpoints are now available at /ollama/* on port 5000.

Run `python -m app.main` from the ai-service directory to start the consolidated service.
"""
import sys
from pathlib import Path

print("⚠️  WARNING: This entry point is deprecated.")
print("   Use 'python -m app.main' from ai-service/ for the unified AI service v3.0.0")
print("   Ollama endpoints are now at /ollama/* on port 5000")
print("   Starting unified service now...\n")

sys.path.insert(0, str(Path(__file__).parent.parent / "ai-service"))
from app.main import app
import uvicorn
from app.config import HOST, PORT

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT, reload=True)
