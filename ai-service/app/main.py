"""
Unified AI Service for Space Analyzer Pro v3.0.0

Consolidates three services into one:
- ai-service/main.py (port 5000) -> /predict/*, /auth/*
- ai-service/ml_categorizer/src/api.py (port 8001) -> /categorizer/*
- server/python-ai-service/ai_service.py (port 8084) -> /ollama/*

Run: python -m app.main
"""
import os
import sys
from pathlib import Path

# Ensure ai-service root is on path for ollama_client and ml_categorizer imports
ai_service_root = Path(__file__).parent.parent
sys.path.insert(0, str(ai_service_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, PORT, HOST, ENABLE_ML_CATEGORIZER, ENABLE_OLLAMA
from app.routers import health, auth, predictions, ollama, categorizer

app = FastAPI(
    title="Space Analyzer AI (Unified)",
    description="Consolidated AI service: ML predictions, file categorization, and Ollama insights",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(predictions.router)

if ENABLE_OLLAMA:
    app.include_router(ollama.router)

if ENABLE_ML_CATEGORIZER:
    app.include_router(categorizer.router)


@app.on_event("startup")
async def startup():
    print(f"Space Analyzer AI v3.0.0 starting on {HOST}:{PORT}")
    print(f"  Features: predictions, auth", end="")
    if ENABLE_OLLAMA:
        print(", ollama", end="")
    if ENABLE_ML_CATEGORIZER:
        print(", categorizer", end="")
    print()
    print(f"  Docs: http://{HOST}:{PORT}/docs")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
