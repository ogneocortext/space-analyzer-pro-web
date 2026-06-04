"""ML prediction service logic - extracted from ai-service/main.py"""
import os
import pickle
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

from app.config import MODELS_DIR

MODELS_DIR.mkdir(exist_ok=True)

# Pydantic models
class FileData(BaseModel):
    path: str
    name: str
    size: int
    extension: str
    modified_time: float
    category: Optional[str] = None


class DirectoryAnalysis(BaseModel):
    files: List[FileData]
    path: str
    largest_files: List[FileData] = []
    file_types: Dict[str, int] = {}


class FileCategorization(BaseModel):
    path: str
    predicted_category: str
    confidence: float
    alternatives: List[Dict[str, Any]]


class CleanupRecommendation(BaseModel):
    file_path: str
    confidence: float
    action: str
    reason: str


class MLModelStatus(BaseModel):
    model_name: str
    trained: bool
    accuracy: Optional[float]
    last_trained: Optional[str]
    sample_count: int

_models = {}
_label_encoders = {}


def _get_model_path(model_name: str) -> Path:
    return MODELS_DIR / f"{model_name}.pkl"


def _get_encoder_path(model_name: str) -> Path:
    return MODELS_DIR / f"{model_name}_encoder.pkl"


def _load_model(model_name: str):
    global _models, _label_encoders
    if model_name in _models:
        return _models[model_name], _label_encoders.get(model_name)

    model_path = _get_model_path(model_name)
    encoder_path = _get_encoder_path(model_name)

    if not model_path.exists():
        return None, None

    with open(model_path, "rb") as f:
        _models[model_name] = pickle.load(f)
    if encoder_path.exists():
        with open(encoder_path, "rb") as f:
            _label_encoders[model_name] = pickle.load(f)

    return _models[model_name], _label_encoders.get(model_name)


def _extract_features(file_data: FileData):
    features = [
        file_data.size,
        len(file_data.name),
        hash(file_data.extension) % 1000,
        datetime.now().timestamp() - file_data.modified_time,
        file_data.name.count("."),
        len(file_data.extension),
    ]
    if HAS_NUMPY:
        return np.array(features).reshape(1, -1)
    return [features]


def categorize_by_rules(file_data: FileData) -> str:
    ext = file_data.extension.lower()
    rules = {
        "documents": [".doc", ".docx", ".pdf", ".txt", ".rtf", ".odt"],
        "images": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp"],
        "videos": [".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv"],
        "audio": [".mp3", ".wav", ".flac", ".aac", ".ogg"],
        "archives": [".zip", ".rar", ".7z", ".tar", ".gz"],
        "code": [".js", ".ts", ".py", ".java", ".cpp", ".c", ".h", ".rs", ".go"],
        "data": [".json", ".xml", ".csv", ".xlsx", ".db", ".sql"],
        "executables": [".exe", ".msi", ".dmg", ".app", ".deb", ".rpm"],
    }
    for category, exts in rules.items():
        if ext in exts:
            return category
    return "other"


def predict_category(file_data: FileData) -> FileCategorization:
    model, encoder = _load_model("file_categorizer")

    if model is None:
        category = categorize_by_rules(file_data)
        return FileCategorization(
            path=file_data.path,
            predicted_category=category,
            confidence=0.5,
            alternatives=[{"category": category, "confidence": 0.5}, {"category": "unknown", "confidence": 0.5}],
        )

    features = _extract_features(file_data)
    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]

    predicted_category = encoder.inverse_transform([prediction])[0] if encoder else str(prediction)

    top_indices = np.argsort(probabilities)[-3:][::-1]
    alternatives = []
    for idx in top_indices:
        cat = encoder.inverse_transform([idx])[0] if encoder else str(idx)
        alternatives.append({"category": cat, "confidence": float(probabilities[idx])})

    return FileCategorization(
        path=file_data.path,
        predicted_category=predicted_category,
        confidence=float(max(probabilities)),
        alternatives=alternatives,
    )


def predict_cleanup(analysis: DirectoryAnalysis) -> List[CleanupRecommendation]:
    recommendations = []
    for file_data in analysis.largest_files:
        file_age_days = (datetime.now().timestamp() - file_data.modified_time) / 86400

        if file_age_days > 365 and file_data.size > 100 * 1024 * 1024:
            recommendations.append(CleanupRecommendation(
                file_path=file_data.path,
                confidence=min(0.9, file_age_days / 730),
                action="archive",
                reason=f"Large file ({file_data.size / 1024 / 1024:.1f} MB) not modified in {file_age_days:.0f} days",
            ))
        elif "temp" in file_data.name.lower() or "tmp" in file_data.name.lower():
            if file_age_days > 30:
                recommendations.append(CleanupRecommendation(
                    file_path=file_data.path,
                    confidence=0.85,
                    action="delete",
                    reason="Temporary file older than 30 days",
                ))
        elif analysis.file_types.get(file_data.extension, 0) > 100:
            recommendations.append(CleanupRecommendation(
                file_path=file_data.path,
                confidence=0.6,
                action="review",
                reason=f"Many files with {file_data.extension} extension ({analysis.file_types[file_data.extension]} found)",
            ))

    return sorted(recommendations, key=lambda x: x.confidence, reverse=True)


def get_models_status() -> List[MLModelStatus]:
    models = ["file_categorizer", "cleanup_predictor"]
    statuses = []
    for model_name in models:
        model, _ = _load_model(model_name)
        model_path = _get_model_path(model_name)
        statuses.append(MLModelStatus(
            model_name=model_name,
            trained=model is not None,
            accuracy=None,
            last_trained=datetime.fromtimestamp(model_path.stat().st_mtime).isoformat() if model_path.exists() else None,
            sample_count=0,
        ))
    return statuses


def _train_categorizer_task(files: List[FileData]):
    if not HAS_SKLEARN or not HAS_NUMPY:
        print("Warning: scikit-learn/numpy not available for training")
        return

    X, y = [], []
    for fd in files:
        if fd.category:
            X.append(_extract_features(fd)[0])
            y.append(fd.category)

    if len(X) < 10:
        print("Not enough training data (need at least 10 files)")
        return

    X, y = np.array(X), np.array(y)
    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y_encoded)

    model_path = _get_model_path("file_categorizer")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    encoder_path = _get_encoder_path("file_categorizer")
    with open(encoder_path, "wb") as f:
        pickle.dump(encoder, f)

    print(f"Model trained on {len(X)} files, {len(encoder.classes_)} categories")


def train_categorizer(files: List[FileData]):
    _train_categorizer_task(files)
