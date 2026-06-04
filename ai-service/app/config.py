"""
Unified configuration for the consolidated AI service.
Replaces config.py from server/python-ai-service and env defaults from ai-service/main.py.
"""
import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Server configuration
HOST = os.getenv("AI_SERVICE_HOST", "127.0.0.1")
PORT = int(os.getenv("AI_SERVICE_PORT", "5000"))
DEBUG = os.getenv("AI_SERVICE_DEBUG", "false").lower() == "true"

# Ollama configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_DEFAULT_MODEL = os.getenv("OLLAMA_DEFAULT_MODEL", "phi4-mini:latest")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "300"))
OLLAMA_MAX_RETRIES = int(os.getenv("OLLAMA_MAX_RETRIES", "3"))

# Security
# Generate a secure dev secret with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
API_KEY = os.getenv("API_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# CORS — strip whitespace from each origin to support env vars like "http://example.com, http://other.com"
CORS_ORIGINS = [origin.strip() for origin in
    os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8080,http://localhost:8091").split(",")
    if origin.strip()]

# ML Model paths
MODELS_DIR = Path(__file__).parent.parent / "models"
ML_CATEGORIZER_MODEL_DIR = os.getenv("MODEL_DIR", str(Path(__file__).parent.parent / "ml_categorizer" / "models"))

# Feature flags
ENABLE_AUTH = os.getenv("ENABLE_AUTH", "true").lower() == "true"
ENABLE_ML_CATEGORIZER = os.getenv("ENABLE_ML_CATEGORIZER", "true").lower() == "true"
ENABLE_OLLAMA = os.getenv("ENABLE_OLLAMA", "true").lower() == "true"
