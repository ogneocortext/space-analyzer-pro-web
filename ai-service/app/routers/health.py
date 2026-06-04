"""Health and status endpoints."""
from datetime import datetime
from fastapi import APIRouter
from app.config import ENABLE_ML_CATEGORIZER, ENABLE_OLLAMA
from app.services.ollama_service import check_ollama
from app.services.ml_service import get_categorizer

router = APIRouter(tags=["health"])


@router.get("/")
async def root():
    return {
        "service": "Space Analyzer AI (Unified)",
        "version": "3.0.0",
        "status": "running",
        "features": {
            "ml_predictions": True,
            "ml_categorizer": ENABLE_ML_CATEGORIZER,
            "ollama_insights": ENABLE_OLLAMA,
        },
    }


@router.get("/health")
async def health():
    status = {"status": "healthy", "timestamp": datetime.now().isoformat()}

    if ENABLE_OLLAMA:
        ollama = check_ollama()
        status["ollama"] = ollama

    if ENABLE_ML_CATEGORIZER:
        cat = get_categorizer()
        status["ml_categorizer"] = {"loaded": cat is not None}

    return status
