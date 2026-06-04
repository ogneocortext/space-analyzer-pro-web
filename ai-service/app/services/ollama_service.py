"""Ollama service - wraps the existing ollama_client for the unified API."""
from typing import Optional, Dict, List, Any
from app.config import OLLAMA_HOST, OLLAMA_DEFAULT_MODEL, OLLAMA_TIMEOUT, OLLAMA_MAX_RETRIES
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from ollama_client import OllamaClient, get_client as get_ollama_client

_client: Optional[OllamaClient] = None


def get_client() -> OllamaClient:
    """Get or create the Ollama client with unified config."""
    global _client
    if _client is None:
        _client = OllamaClient(
            base_url=OLLAMA_HOST,
            default_model=OLLAMA_DEFAULT_MODEL,
            timeout=OLLAMA_TIMEOUT,
            max_retries=OLLAMA_MAX_RETRIES,
        )
    return _client


def check_ollama() -> Dict[str, Any]:
    """Check Ollama server status."""
    client = get_client()
    available = client.check_server()
    models = client.available_models if available else []
    return {
        "available": available,
        "models": models,
        "models_count": len(models),
    }
