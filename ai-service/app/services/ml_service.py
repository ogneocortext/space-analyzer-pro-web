"""ML Categorizer service - wraps the advanced categorizer for the unified API."""
import os
import time
from typing import Optional, Dict, List, Any
from pathlib import Path

try:
    from ml_categorizer.src.categorizer import AdvancedFileCategorizer, ClassificationResult, FileCategory
    HAS_CATEGORIZER = True
except ImportError:
    HAS_CATEGORIZER = False

_categorizer: Optional[AdvancedFileCategorizer] = None


def get_categorizer(model_dir: Optional[str] = None) -> Optional[AdvancedFileCategorizer]:
    """Get or create the categorizer instance."""
    global _categorizer
    if _categorizer is None and HAS_CATEGORIZER:
        dir_path = model_dir or os.getenv("MODEL_DIR", "ml_categorizer/models")
        try:
            _categorizer = AdvancedFileCategorizer(dir_path)
        except Exception:
            _categorizer = None
    return _categorizer


def categorize_file(file_path: str, include_features: bool = False, include_alternatives: bool = True) -> Dict[str, Any]:
    """Categorize a single file."""
    cat = get_categorizer()
    if cat is None:
        return {"success": False, "error": "Categorizer not initialized"}

    if not os.path.exists(file_path):
        return {"success": False, "error": f"File not found: {file_path}"}

    start = time.time()
    result = cat.categorize_file(file_path)
    processing_time = time.time() - start

    alternatives = []
    if include_alternatives:
        for category, confidence in result.alternative_categories:
            alternatives.append({"category": category.value, "confidence": confidence})

    features = None
    if include_features:
        try:
            file_features = cat.extract_features(file_path)
            features = {
                "filename": file_features.filename,
                "extension": file_features.extension,
                "size": file_features.size,
                "mime_type": file_features.mime_type,
                "word_count": file_features.word_count,
                "char_count": file_features.char_count,
                "language": file_features.language,
                "image_width": file_features.image_width,
                "image_height": file_features.image_height,
                "line_count": file_features.line_count,
                "function_count": file_features.function_count,
                "import_count": file_features.import_count,
            }
        except Exception:
            features = None

    return {
        "success": True,
        "filename": result.filename,
        "predicted_category": result.predicted_category.value,
        "confidence": result.confidence,
        "alternative_categories": alternatives,
        "features_used": result.features_used,
        "processing_time": result.processing_time,
        "model_version": result.model_version,
        "features": features,
    }


def categorize_batch(file_paths: List[str], include_features: bool = False, include_alternatives: bool = True) -> Dict[str, Any]:
    """Categorize multiple files."""
    cat = get_categorizer()
    if cat is None:
        return {"success": False, "error": "Categorizer not initialized", "results": []}

    valid_paths = [p for p in file_paths if os.path.exists(p)]
    if not valid_paths:
        return {"success": False, "error": "No valid files found", "results": []}

    start = time.time()
    results = cat.categorize_batch(valid_paths)
    total_time = time.time() - start

    formatted = []
    for result in results:
        alternatives = []
        if include_alternatives:
            for category, confidence in result.alternative_categories:
                alternatives.append({"category": category.value, "confidence": confidence})

        features = None
        if include_features:
            try:
                file_features = cat.extract_features(result.filename)
                features = {
                    "filename": file_features.filename,
                    "extension": file_features.extension,
                    "size": file_features.size,
                    "mime_type": file_features.mime_type,
                    "word_count": file_features.word_count,
                    "char_count": file_features.char_count,
                    "language": file_features.language,
                }
            except Exception:
                features = None

        formatted.append({
            "success": True,
            "filename": result.filename,
            "predicted_category": result.predicted_category.value,
            "confidence": result.confidence,
            "alternative_categories": alternatives,
            "features_used": result.features_used,
            "processing_time": result.processing_time,
            "model_version": result.model_version,
            "features": features,
        })

    stats = cat.get_category_statistics(results) if hasattr(cat, "get_category_statistics") else {}

    return {
        "success": True,
        "results": formatted,
        "statistics": stats,
        "total_processing_time": total_time,
    }


def get_supported_categories() -> List[Dict[str, str]]:
    """Get list of supported categories."""
    if not HAS_CATEGORIZER:
        return []
    descriptions = {
        "documents": "Text documents, PDFs, spreadsheets, presentations",
        "images": "Image files including photos, graphics, and icons",
        "videos": "Video files and movies",
        "audio": "Audio files and music",
        "code": "Source code files and programming scripts",
        "archives": "Compressed files and archives",
        "system": "System files and hidden directories",
        "temporary": "Temporary files and caches",
        "databases": "Database files and data stores",
        "configuration": "Configuration files and settings",
        "executables": "Executable programs and applications",
        "fonts": "Font files for typography",
        "backups": "Backup files and archives",
        "logs": "Log files and system logs",
        "cache": "Cache files and temporary data",
        "unknown": "Files that couldn't be categorized",
    }
    return [{"name": cat.value, "description": descriptions.get(cat.value, "")} for cat in FileCategory]
