"""
Advanced ML File Categorizer
Deep learning-powered file categorization with multiple models and ensemble methods
"""

import os
import json
import pickle
import hashlib
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum

# Try to import heavy dependencies with fallbacks
try:
    import numpy as np
    import pandas as pd
    HAS_NUMPY_PANDAS = True
except ImportError:
    HAS_NUMPY_PANDAS = False
    print("Warning: numpy/pandas not available. Using fallback implementations.")

try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    print("Warning: PyTorch not available. Deep learning features disabled.")

try:
    from transformers import AutoTokenizer, AutoModel
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False
    print("Warning: Transformers not available. Advanced NLP features disabled.")

try:
    from sklearn.ensemble import RandomForestClassifier, VotingClassifier
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics import classification_report, accuracy_score
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("Warning: scikit-learn not available. ML features limited.")

try:
    import nltk
    from nltk.tokenize import word_tokenize
    from nltk.corpus import stopwords
    HAS_NLTK = True
except ImportError:
    HAS_NLTK = False
    print("Warning: NLTK not available. Basic text processing only.")

try:
    import magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False
    print("Warning: python-magic not available. MIME type detection limited.")

try:
    import spacy
    HAS_SPACY = True
except ImportError:
    HAS_SPACY = False
    print("Warning: spaCy not available. Advanced NLP disabled.")

try:
    from PIL import Image
    import cv2
    import imagehash
    HAS_IMAGE_PROCESSING = True
except ImportError:
    HAS_IMAGE_PROCESSING = False
    print("Warning: Image processing libraries not available.")

# Download required NLTK data
if HAS_NLTK:
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')
    except OSError:
        pass

    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords')
    except OSError:
        pass

class FileCategory(Enum):
    """File categories for classification"""
    DOCUMENTS = "documents"
    IMAGES = "images"
    VIDEOS = "videos"
    AUDIO = "audio"
    CODE = "code"
    ARCHIVES = "archives"
    SYSTEM = "system"
    TEMPORARY = "temporary"
    DATABASES = "databases"
    CONFIGURATION = "configuration"
    EXECUTABLES = "executables"
    FONTS = "fonts"
    BACKUPS = "backups"
    LOGS = "logs"
    CACHE = "cache"
    UNKNOWN = "unknown"

@dataclass
class FileFeatures:
    """Feature set for file classification"""
    # Basic file features
    filename: str
    extension: str
    size: int
    mime_type: str
    is_hidden: bool
    is_executable: bool

    # Text features
    content_preview: str = ""
    word_count: int = 0
    char_count: int = 0
    language: str = "unknown"

    # Image features (if applicable)
    image_width: int = 0
    image_height: int = 0
    image_channels: int = 0
    image_hash: str = ""

    # Code features (if applicable)
    line_count: int = 0
    function_count: int = 0
    import_count: int = 0

    # Metadata features
    creation_date: Optional[datetime] = None
    modification_date: Optional[datetime] = None
    file_hash: str = ""

@dataclass
class ClassificationResult:
    """Result of file classification"""
    filename: str
    predicted_category: FileCategory
    confidence: float
    alternative_categories: List[Tuple[FileCategory, float]]
    features_used: List[str]
    processing_time: float
    model_version: str

class AdvancedFileCategorizer:
    """Advanced ML-powered file categorizer"""

    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)

        # Initialize models
        self.text_encoder = None
        self.image_classifier = None
        self.ensemble_classifier = None
        self.label_encoder = None
        self.scaler = None

        # Initialize NLP models
        self.nlp = None
        self.tokenizer = None
        self.transformer_model = None

        # Feature extractors
        self.tfidf_vectorizer = None

        # Model metadata
        self.model_version = "2.0.0"
        self.training_data_version = "2024.01"

        # Category mappings
        self.category_mapping = {
            0: FileCategory.DOCUMENTS,
            1: FileCategory.IMAGES,
            2: FileCategory.VIDEOS,
            3: FileCategory.AUDIO,
            4: FileCategory.CODE,
            5: FileCategory.ARCHIVES,
            6: FileCategory.SYSTEM,
            7: FileCategory.TEMPORARY,
            8: FileCategory.DATABASES,
            9: FileCategory.CONFIGURATION,
            10: FileCategory.EXECUTABLES,
            11: FileCategory.FONTS,
            12: FileCategory.BACKUPS,
            13: FileCategory.LOGS,
            14: FileCategory.CACHE,
            15: FileCategory.UNKNOWN,
        }

        # Load models
        self._load_models()

    def _load_models(self):
        """Load pre-trained models"""
        try:
            # Load ensemble classifier
            ensemble_path = self.model_dir / "ensemble_classifier.pkl"
            if ensemble_path.exists():
                with open(ensemble_path, 'rb') as f:
                    self.ensemble_classifier = pickle.load(f)

            # Load label encoder
            encoder_path = self.model_dir / "label_encoder.pkl"
            if encoder_path.exists():
                with open(encoder_path, 'rb') as f:
                    self.label_encoder = pickle.load(f)

            # Load scaler
            scaler_path = self.model_dir / "feature_scaler.pkl"
            if scaler_path.exists():
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)

            # Load TF-IDF vectorizer
            tfidf_path = self.model_dir / "tfidf_vectorizer.pkl"
            if tfidf_path.exists():
                with open(tfidf_path, 'rb') as f:
                    self.tfidf_vectorizer = pickle.load(f)

            # Initialize transformer model for text
            try:
                self.tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
                self.transformer_model = AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
            except Exception as e:
                print(f"Warning: Could not load transformer model: {e}")

            # Initialize spaCy
            if HAS_SPACY:
                try:
                    self.nlp = spacy.load("en_core_web_sm")
                except OSError:
                    print("Warning: spaCy English model not found. Run: python -m spacy download en_core_web_sm")
                    self.nlp = None

        except Exception as e:
            print(f"Warning: Error loading models: {e}")

    def extract_features(self, file_path: Union[str, Path]) -> FileFeatures:
        """Extract comprehensive features from a file"""
        file_path = Path(file_path)

        # Basic file information
        stat = file_path.stat()
        if HAS_MAGIC:
            mime_type = magic.from_file(str(file_path), mime=True)
        else:
            # Fallback MIME type detection
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if mime_type is None:
                mime_type = "application/octet-stream"

        features = FileFeatures(
            filename=file_path.name,
            extension=file_path.suffix.lower() if file_path.suffix else "",
            size=stat.st_size,
            mime_type=mime_type,
            is_hidden=file_path.name.startswith('.'),
            is_executable=os.access(file_path, os.X_OK),
            creation_date=datetime.fromtimestamp(stat.st_ctime),
            modification_date=datetime.fromtimestamp(stat.st_mtime),
        )

        # Calculate file hash
        try:
            with open(file_path, 'rb') as f:
                features.file_hash = hashlib.md5(f.read()).hexdigest()
        except Exception:
            pass

        # Extract content-based features
        self._extract_text_features(file_path, features)
        self._extract_image_features(file_path, features)
        self._extract_code_features(file_path, features)

        return features

    def _extract_text_features(self, file_path: Path, features: FileFeatures):
        """Extract text-based features"""
        text_extensions = {'.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml', '.csv'}

        if features.extension not in text_extensions and 'text/' not in features.mime_type:
            return

        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(8192)  # Read first 8KB for preview

            features.content_preview = content[:1000]
            features.char_count = len(content)

            # Tokenize and count words
            if HAS_NLTK:
                words = word_tokenize(content.lower())
                features.word_count = len(words)
            else:
                # Simple fallback tokenization
                words = content.lower().split()
                features.word_count = len(words)

            # Detect language
            try:
                from langdetect import detect
                features.language = detect(content)
            except Exception:
                features.language = "unknown"

        except Exception:
            pass

    def _extract_image_features(self, file_path: Path, features: FileFeatures):
        """Extract image-based features"""
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}

        if features.extension not in image_extensions and not features.mime_type.startswith('image/'):
            return

        try:
            with Image.open(file_path) as img:
                features.image_width, features.image_height = img.size
                features.image_channels = len(img.getbands()) if hasattr(img, 'getbands') else 3

                # Calculate perceptual hash
                features.image_hash = str(imagehash.phash(img))

        except Exception:
            pass

    def _extract_code_features(self, file_path: Path, features: FileFeatures):
        """Extract code-specific features"""
        code_extensions = {
            '.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs'
        }

        if features.extension not in code_extensions:
            return

        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            lines = content.split('\n')
            features.line_count = len(lines)

            # Count functions (simplified)
            function_patterns = ['def ', 'function ', 'func ', 'public ', 'private ']
            features.function_count = sum(
                sum(1 for line in lines if pattern in line)
                for pattern in function_patterns
            )

            # Count imports
            import_patterns = ['import ', 'from ', 'using ', 'include ']
            features.import_count = sum(
                sum(1 for line in lines if pattern in line)
                for pattern in import_patterns
            )

        except Exception:
            pass

    def categorize_file(self, file_path: Union[str, Path]) -> ClassificationResult:
        """Categorize a single file"""
        import time
        start_time = time.time()

        file_path = Path(file_path)
        features = self.extract_features(file_path)

        # Use rule-based classification as fallback
        if self.ensemble_classifier is None:
            category = self._rule_based_classification(features)
            confidence = 0.8
            alternatives = []
            features_used = ["rule_based"]
        else:
            # Use ML model
            category, confidence, alternatives = self._ml_classification(features)
            features_used = ["ml_ensemble", "text_features", "metadata_features"]

        processing_time = time.time() - start_time

        return ClassificationResult(
            filename=str(file_path),
            predicted_category=category,
            confidence=confidence,
            alternative_categories=alternatives,
            features_used=features_used,
            processing_time=processing_time,
            model_version=self.model_version
        )

    def _rule_based_classification(self, features: FileFeatures) -> FileCategory:
        """Rule-based classification as fallback"""
        extension = features.extension.lower()
        mime_type = features.mime_type.lower()

        # Document types
        if extension in {'.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.md'}:
            return FileCategory.DOCUMENTS

        # Image types
        if extension in {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.svg'}:
            return FileCategory.IMAGES

        # Video types
        if extension in {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'}:
            return FileCategory.VIDEOS

        # Audio types
        if extension in {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'}:
            return FileCategory.AUDIO

        # Code types
        if extension in {'.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.html', '.css', '.xml', '.json', '.yaml', '.yml'}:
            return FileCategory.CODE

        # Archive types
        if extension in {'.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar'}:
            return FileCategory.ARCHIVES

        # Database types
        if extension in {'.db', '.sqlite', '.mdb', '.sql'}:
            return FileCategory.DATABASES

        # Configuration types
        if extension in {'.conf', '.config', '.ini', '.cfg', '.env'}:
            return FileCategory.CONFIGURATION

        # Executable types
        if extension in {'.exe', '.msi', '.deb', '.rpm', '.dmg', '.app'} or features.is_executable:
            return FileCategory.EXECUTABLES

        # Font types
        if extension in {'.ttf', '.otf', '.woff', '.woff2', '.eot'}:
            return FileCategory.FONTS

        # Backup types
        if extension in {'.bak', '.backup', '.old'}:
            return FileCategory.BACKUPS

        # Log types
        if extension in {'.log', '.out'} or 'log' in features.filename.lower():
            return FileCategory.LOGS

        # Cache types
        if 'cache' in features.filename.lower() or extension in {'.cache', '.tmp'}:
            return FileCategory.CACHE

        # Temporary types
        if extension in {'.tmp', '.temp'} or features.filename.startswith('.'):
            return FileCategory.TEMPORARY

        # System types
        if features.filename.startswith('.') and features.is_hidden:
            return FileCategory.SYSTEM

        return FileCategory.UNKNOWN

    def _ml_classification(self, features: FileFeatures) -> Tuple[FileCategory, float, List[Tuple[FileCategory, float]]]:
        """ML-based classification"""
        try:
            # Convert features to numerical vector
            feature_vector = self._features_to_vector(features)

            if feature_vector is None:
                # Fallback to rule-based
                category = self._rule_based_classification(features)
                return category, 0.7, []

            # Scale features
            if self.scaler:
                feature_vector = self.scaler.transform([feature_vector])[0]

            # Make prediction
            prediction = self.ensemble_classifier.predict_proba([feature_vector])[0]

            # Get top categories
            top_indices = np.argsort(prediction)[::-1][:3]
            top_categories = [
                (self.category_mapping[idx], prediction[idx])
                for idx in top_indices
            ]

            best_category, best_confidence = top_categories[0]

            return best_category, best_confidence, top_categories[1:]

        except Exception as e:
            print(f"ML classification error: {e}")
            # Fallback to rule-based
            category = self._rule_based_classification(features)
            return category, 0.6, []

    def _features_to_vector(self, features: FileFeatures) -> Optional[List[float]]:
        """Convert features to numerical vector"""
        try:
            vector = [
                # Basic features
                features.size,
                float(features.is_hidden),
                float(features.is_executable),

                # Text features
                features.word_count,
                features.char_count,
                len(features.content_preview),

                # Code features
                features.line_count,
                features.function_count,
                features.import_count,

                # Image features
                features.image_width,
                features.image_height,
                features.image_channels,

                # Time features
                (features.creation_date.timestamp() if features.creation_date else 0),
                (features.modification_date.timestamp() if features.modification_date else 0),
            ]

            return vector

        except Exception as e:
            print(f"Feature vector conversion error: {e}")
            return None

    def train_models(self, training_data: List[Tuple[FileFeatures, FileCategory]]):
        """Train the ML models"""
        print("Training ML categorizer models...")

        # Prepare training data
        X = []
        y = []

        for features, category in training_data:
            vector = self._features_to_vector(features)
            if vector:
                X.append(vector)
                y.append(category.value)

        if len(X) < 10:
            print("Insufficient training data")
            return

        X = np.array(X)
        y = np.array(y)

        # Encode labels
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y)

        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Create ensemble classifier
        rf = RandomForestClassifier(n_estimators=100, random_state=42)

        # Train the model
        self.ensemble_classifier = rf
        self.ensemble_classifier.fit(X_scaled, y_encoded)

        # Save models
        self._save_models()

        # Evaluate model
        y_pred = self.ensemble_classifier.predict(X_scaled)
        accuracy = accuracy_score(y_encoded, y_pred)
        print(f"Model training completed. Accuracy: {accuracy:.3f}")

    def _save_models(self):
        """Save trained models"""
        try:
            # Save ensemble classifier
            with open(self.model_dir / "ensemble_classifier.pkl", 'wb') as f:
                pickle.dump(self.ensemble_classifier, f)

            # Save label encoder
            with open(self.model_dir / "label_encoder.pkl", 'wb') as f:
                pickle.dump(self.label_encoder, f)

            # Save scaler
            with open(self.model_dir / "feature_scaler.pkl", 'wb') as f:
                pickle.dump(self.scaler, f)

            print("Models saved successfully")

        except Exception as e:
            print(f"Error saving models: {e}")

    def categorize_batch(self, file_paths: List[Union[str, Path]]) -> List[ClassificationResult]:
        """Categorize multiple files"""
        results = []

        for file_path in file_paths:
            try:
                result = self.categorize_file(file_path)
                results.append(result)
            except Exception as e:
                print(f"Error categorizing {file_path}: {e}")
                # Create error result
                error_result = ClassificationResult(
                    filename=str(file_path),
                    predicted_category=FileCategory.UNKNOWN,
                    confidence=0.0,
                    alternative_categories=[],
                    features_used=["error"],
                    processing_time=0.0,
                    model_version=self.model_version
                )
                results.append(error_result)

        return results

    def get_category_statistics(self, results: List[ClassificationResult]) -> Dict[str, Any]:
        """Get statistics about categorization results"""
        stats = {
            'total_files': len(results),
            'categories': {},
            'average_confidence': 0.0,
            'processing_time_total': 0.0,
            'model_version': self.model_version
        }

        category_counts = {}
        total_confidence = 0.0
        total_time = 0.0

        for result in results:
            category = result.predicted_category.value
            category_counts[category] = category_counts.get(category, 0) + 1
            total_confidence += result.confidence
            total_time += result.processing_time

        stats['categories'] = category_counts
        stats['average_confidence'] = total_confidence / len(results) if results else 0.0
        stats['processing_time_total'] = total_time

        return stats

# Convenience function for quick categorization
def categorize_file(file_path: Union[str, Path]) -> ClassificationResult:
    """Quick categorization of a single file"""
    categorizer = AdvancedFileCategorizer()
    return categorizer.categorize_file(file_path)

# Example usage
if __name__ == "__main__":
    # Test the categorizer
    categorizer = AdvancedFileCategorizer()

    # Test with a sample file
    test_file = "sample.txt"
    if os.path.exists(test_file):
        result = categorizer.categorize_file(test_file)
        print(f"File: {result.filename}")
        print(f"Category: {result.predicted_category.value}")
        print(f"Confidence: {result.confidence:.3f}")
        print(f"Processing time: {result.processing_time:.3f}s")
