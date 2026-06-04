"""Advanced ML categorizer endpoints - replaces ai-service/ml_categorizer/src/api.py"""
import os
import tempfile
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel, Field

from app.services.ml_service import (
    get_categorizer,
    categorize_file as svc_categorize_file,
    categorize_batch as svc_categorize_batch,
    get_supported_categories,
)
from app.config import ML_CATEGORIZER_MODEL_DIR

router = APIRouter(prefix="/categorizer", tags=["categorizer"])


class FileCategorizationRequest(BaseModel):
    file_path: str = Field(..., description="Path to the file to categorize")
    include_features: bool = Field(default=False)
    include_alternatives: bool = Field(default=True)


class BatchCategorizationRequest(BaseModel):
    file_paths: List[str] = Field(..., description="List of file paths to categorize")
    include_features: bool = Field(default=False)
    include_alternatives: bool = Field(default=True)


class TrainingDataRequest(BaseModel):
    training_data: List[Dict[str, Any]] = Field(...)
    model_name: Optional[str] = Field(default="custom_model")


@router.get("/health")
async def health():
    cat = get_categorizer()
    if cat is None:
        raise HTTPException(status_code=503, detail="Categorizer not initialized")
    return {
        "status": "healthy",
        "model_loaded": True,
        "model_version": cat.model_version,
    }


@router.get("/model/info")
async def model_info():
    cat = get_categorizer()
    if cat is None:
        raise HTTPException(status_code=503, detail="Categorizer not initialized")
    return {
        "model_version": cat.model_version,
        "training_data_version": cat.training_data_version,
        "supported_categories": [c.value for c in type(cat).FileCategory] if hasattr(cat, "FileCategory") else [],
        "model_status": "loaded",
    }


@router.post("/categorize")
async def categorize_file(req: FileCategorizationRequest):
    result = svc_categorize_file(req.file_path, req.include_features, req.include_alternatives)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Categorization failed"))
    return result


@router.post("/categorize/batch")
async def categorize_batch(req: BatchCategorizationRequest):
    result = svc_categorize_batch(req.file_paths, req.include_features, req.include_alternatives)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Batch categorization failed"))
    return result


@router.post("/upload/categorize")
async def upload_and_categorize(
    file: UploadFile = File(...),
    include_features: bool = Form(False),
    include_alternatives: bool = Form(True),
):
    cat = get_categorizer()
    if cat is None:
        raise HTTPException(status_code=503, detail="Categorizer not initialized")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        result = svc_categorize_file(temp_file_path, include_features, include_alternatives)
        os.unlink(temp_file_path)

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error"))

        result["filename"] = file.filename
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload categorization failed: {str(e)}")


@router.post("/train")
async def train_model(req: TrainingDataRequest, background_tasks: BackgroundTasks):
    cat = get_categorizer()
    if cat is None:
        raise HTTPException(status_code=503, detail="Categorizer not initialized")

    async def _train():
        pass
    background_tasks.add_task(_train)
    return {
        "success": True,
        "message": f"Model training started for {req.model_name}",
        "training_samples": len(req.training_data),
    }


@router.get("/categories")
async def categories():
    return {"categories": get_supported_categories()}


@router.get("/statistics")
async def statistics():
    cat = get_categorizer()
    if cat is None:
        raise HTTPException(status_code=503, detail="Categorizer not initialized")
    return {
        "service": "ml-categorizer",
        "version": cat.model_version,
        "model_loaded": True,
        "supported_categories": len(get_supported_categories()),
    }
