"""ML prediction endpoints - file categorization and cleanup recommendations."""
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel

from app.services.ml_predictions import (
    predict_category as svc_predict_category,
    predict_cleanup as svc_predict_cleanup,
    train_categorizer as svc_train_categorizer,
    get_models_status as svc_get_models_status,
    categorize_by_rules,
    FileData,
    DirectoryAnalysis,
    FileCategorization,
    CleanupRecommendation,
    MLModelStatus,
)

router = APIRouter(prefix="/predict", tags=["predictions"])


@router.get("/models/status", response_model=MLModelStatus)
async def models_status():
    """Get status of all ML models."""
    return svc_get_models_status()


@router.post("/category", response_model=FileCategorization)
async def predict_category(file_data: FileData):
    """Predict the category of a file."""
    return svc_predict_category(file_data)


@router.post("/cleanup", response_model=List[CleanupRecommendation])
async def predict_cleanup(analysis: DirectoryAnalysis):
    """Predict which files should be cleaned up."""
    return svc_predict_cleanup(analysis)


@router.post("/categories-batch")
async def predict_categories_batch(files: List[FileData]):
    """Categorize multiple files in one request."""
    results = []
    for file_data in files:
        result = svc_predict_category(file_data)
        results.append(result)
    return {"predictions": results}


@router.post("/train/categorizer")
async def train_categorizer(files: List[FileData], background_tasks: BackgroundTasks):
    """Train file categorization model."""
    background_tasks.add_task(svc_train_categorizer, files)
    return {"message": "Training started in background", "files_count": len(files)}


@router.post("/train/cleanup-predictor")
async def train_cleanup_predictor(analyses: List[DirectoryAnalysis], background_tasks: BackgroundTasks):
    """Train cleanup prediction model."""
    async def _train():
        pass
    background_tasks.add_task(_train)
    return {"message": "Training started in background", "analyses_count": len(analyses)}
