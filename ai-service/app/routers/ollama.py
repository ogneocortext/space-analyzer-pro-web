"""Ollama proxy endpoints - replaces server/python-ai-service/ai_service.py"""
import json
import re
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ollama_service import get_client, check_ollama
from app.config import OLLAMA_DEFAULT_MODEL

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ollama", tags=["ollama"])


class GenerateRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    temperature: float = 0.3
    num_predict: int = 500


class AnalyzeRequest(BaseModel):
    analysisData: dict
    model: Optional[str] = None


class GenerateResponse(BaseModel):
    success: bool
    response: str = ""
    model: str = ""
    error: str = ""


class AnalyzeResponse(BaseModel):
    success: bool
    insights: dict = {}
    raw_response: str = ""
    model: str = ""
    error: str = ""


@router.get("/models")
async def list_models():
    """List available Ollama models."""
    client = get_client()
    models = client.list_models()
    return {"success": True, "models": models, "count": len(models)}


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    """Generate text from an Ollama model."""
    if not req.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    client = get_client()
    model = req.model or OLLAMA_DEFAULT_MODEL
    logger.info(f"Generating with model: {model}, prompt length: {len(req.prompt)}")

    resp = client.generate(
        prompt=req.prompt,
        model=model,
        temperature=req.temperature,
        num_predict=req.num_predict,
    )

    if resp.success:
        return GenerateResponse(success=True, response=resp.response, model=resp.model)
    return GenerateResponse(success=False, error=resp.error, model=model)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_filesystem(req: AnalyzeRequest):
    """Analyze file system data and provide AI insights."""
    client = get_client()
    model = req.model or OLLAMA_DEFAULT_MODEL

    prompt = _build_analysis_prompt(req.analysisData)
    logger.info(f"Analyzing filesystem with model: {model}")

    resp = client.generate(prompt=prompt, model=model, temperature=0.3, num_predict=800)

    if resp.success:
        insights = _parse_insights(resp.response)
        return AnalyzeResponse(success=True, insights=insights, raw_response=resp.response, model=model)
    return AnalyzeResponse(success=False, error=resp.error, model=model)


def _build_analysis_prompt(data: dict) -> str:
    total_files = data.get("totalFiles", 0)
    total_size = data.get("totalSize", 0)
    categories = data.get("categories", {})

    prompt = f"""Analyze this file system data and provide actionable insights:

Total Files: {total_files}
Total Size: {_format_size(total_size)}

Categories:"""
    for cat_name, cat_data in categories.items():
        count = cat_data.get("count", 0)
        size = cat_data.get("size", 0)
        prompt += f"\n- {cat_name}: {count} files ({_format_size(size)})"

    prompt += """

Please provide:
1. Storage optimization recommendations
2. Potential duplicate files to investigate
3. Large files that might need attention
4. Unusual file patterns or extensions
5. Overall storage health assessment

Format your response as JSON with these keys:
- recommendations: array of strings
- large_files: array of objects with name and size
- unusual_patterns: array of strings
- health_score: number from 0-100
- summary: brief description"""
    return prompt


def _parse_insights(response_text: str) -> dict:
    try:
        json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception:
        pass
    return {
        "recommendations": [],
        "large_files": [],
        "unusual_patterns": [],
        "health_score": 75,
        "summary": response_text[:500] if response_text else "No insights generated",
    }


def _format_size(bytes_size: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if bytes_size < 1024:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024
    return f"{bytes_size:.2f} PB"
