# Advanced ML File Categorizer

Deep learning-powered file categorization service for Space Analyzer Pro with ensemble methods and comprehensive feature extraction.

## Features

- **Deep Learning Models**: Transformer-based text analysis and neural networks
- **Ensemble Methods**: Combines multiple ML approaches for maximum accuracy
- **Comprehensive Features**: Text, image, code, and metadata feature extraction
- **Real-time Categorization**: Fast inference with optimized models
- **Batch Processing**: Efficient handling of multiple files
- **Model Training**: Advanced training pipeline with cross-validation
- **REST API**: FastAPI-based service for easy integration
- **File Upload**: Direct file upload and categorization
- **Performance Monitoring**: Detailed metrics and statistics

## Installation

### Dependencies

```bash
cd ai-service/ml_categorizer
pip install -r requirements.txt
```

### Additional Setup

```bash
# Download spaCy English model
python -m spacy download en_core_web_sm

# Download NLTK data
python -m nltk.downloader punkt stopwords
```

## Usage

### API Service

```bash
# Start the API service
python src/api.py

# Custom host and port
HOST=0.0.0.0 PORT=8001 python src/api.py

# Custom model directory
MODEL_DIR=/path/to/models python src/api.py
```

### Training Models

```bash
# Train with synthetic data
python src/trainer.py

# Train with file system data
python src/trainer.py --data-source file_system --directory /path/to/data

# Train from JSON file
python src/trainer.py --data-source /path/to/training_data.json
```

### Direct Usage

```python
from src.categorizer import AdvancedFileCategorizer

# Initialize categorizer
categorizer = AdvancedFileCategorizer()

# Categorize single file
result = categorizer.categorize_file("/path/to/file.txt")
print(f"Category: {result.predicted_category.value}")
print(f"Confidence: {result.confidence:.3f}")

# Batch categorization
files = ["/path/to/file1.txt", "/path/to/file2.jpg"]
results = categorizer.categorize_batch(files)
```

## API Endpoints

### Health Check

```bash
GET /
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00",
  "service": "ml-categorizer",
  "model_loaded": true,
  "version": "2.0.0"
}
```

### Model Information

```bash
GET /model/info
```

Response:
```json
{
  "model_version": "2.0.0",
  "training_data_version": "2024.01",
  "supported_categories": [
    "documents",
    "images", 
    "videos",
    "audio",
    "code",
    "archives",
    "system",
    "temporary",
    "databases",
    "configuration",
    "executables",
    "fonts",
    "backups",
    "logs",
    "cache",
    "unknown"
  ],
  "model_status": "loaded",
  "last_training_date": null
}
```

### Single File Categorization

```bash
POST /categorize
Content-Type: application/json

{
  "file_path": "/path/to/file.txt",
  "include_features": true,
  "include_alternatives": true
}
```

Response:
```json
{
  "success": true,
  "filename": "/path/to/file.txt",
  "predicted_category": "documents",
  "confidence": 0.95,
  "alternative_categories": [
    {"category": "code", "confidence": 0.03},
    {"category": "configuration", "confidence": 0.02}
  ],
  "features_used": ["ml_ensemble", "text_features", "metadata_features"],
  "processing_time": 0.045,
  "model_version": "2.0.0",
  "features": {
    "filename": "file.txt",
    "extension": ".txt",
    "size": 1024,
    "mime_type": "text/plain",
    "word_count": 150,
    "char_count": 750,
    "language": "english"
  }
}
```

### Batch Categorization

```bash
POST /categorize/batch
Content-Type: application/json

{
  "file_paths": [
    "/path/to/file1.txt",
    "/path/to/file2.jpg",
    "/path/to/file3.py"
  ],
  "include_features": false,
  "include_alternatives": true
}
```

Response:
```json
{
  "success": true,
  "results": [...],
  "statistics": {
    "total_files": 3,
    "categories": {
      "documents": 1,
      "images": 1,
      "code": 1
    },
    "average_confidence": 0.87,
    "processing_time_total": 0.234,
    "model_version": "2.0.0"
  },
  "total_processing_time": 0.234
}
```

### File Upload and Categorization

```bash
POST /upload/categorize
Content-Type: multipart/form-data

file: [binary file data]
include_features: true
include_alternatives: true
```

### Model Training

```bash
POST /train
Content-Type: application/json

{
  "training_data": [
    {
      "features": {
        "filename": "document.pdf",
        "extension": ".pdf",
        "size": 1024000,
        "mime_type": "application/pdf",
        "word_count": 5000,
        "char_count": 25000
      },
      "category": "documents"
    }
  ],
  "model_name": "custom_model"
}
```

## Supported Categories

| Category | Description | Common Extensions |
|----------|-------------|------------------|
| documents | Text documents, PDFs, spreadsheets | .pdf, .doc, .txt, .md |
| images | Image files and graphics | .jpg, .png, .gif, .svg |
| videos | Video files and movies | .mp4, .avi, .mov, .mkv |
| audio | Audio files and music | .mp3, .wav, .flac, .aac |
| code | Source code and scripts | .py, .js, .java, .cpp |
| archives | Compressed files | .zip, .tar, .gz, .7z |
| system | System and hidden files | .sys, .dll, hidden files |
| temporary | Temporary and cache files | .tmp, .cache, .temp |
| databases | Database files | .db, .sqlite, .sql |
| configuration | Config files | .conf, .ini, .env |
| executables | Executable programs | .exe, .app, .deb |
| fonts | Font files | .ttf, .otf, .woff |
| backups | Backup files | .bak, .backup, .old |
| logs | Log files | .log, .out |
| cache | Cache files | .cache, .tmp |
| unknown | Unclassified files | various |

## Feature Extraction

### Text Features
- Word count and character count
- Language detection
- Content preview
- Text density metrics

### Image Features
- Image dimensions (width, height, channels)
- Perceptual hash for similarity detection
- Image format analysis

### Code Features
- Line count and function count
- Import/dependency analysis
- Programming language detection

### Metadata Features
- File size and timestamps
- MIME type detection
- File permissions
- Hidden/executable flags

## Model Architecture

### Traditional ML Models
- **Random Forest**: 100 estimators, robust to overfitting
- **Gradient Boosting**: Sequential ensemble for high accuracy
- **Voting Classifier**: Combines multiple models

### Deep Learning Model
- **Neural Network**: 3-layer fully connected architecture
- **Batch Normalization**: Improves training stability
- **Dropout**: Prevents overfitting
- **Cross-Entropy Loss**: Standard for classification

### Feature Engineering
- **Log Transformations**: Handle skewed size distributions
- **Normalization**: StandardScaler for feature scaling
- **Categorical Encoding**: Hash-based encoding for text features
- **Temporal Features**: Timestamp-based features

## Training Pipeline

### Data Sources
1. **Synthetic Data**: Generated patterns for each category
2. **File System**: Real files from directories
3. **JSON Files**: Labeled training data

### Training Process
1. **Feature Extraction**: Comprehensive feature extraction
2. **Data Splitting**: Stratified train/test split
3. **Model Training**: Multiple algorithms with cross-validation
4. **Performance Evaluation**: Accuracy, precision, recall metrics
5. **Model Selection**: Best performing model selection
6. **Model Persistence**: Save trained models

### Performance Metrics
- **Accuracy**: Overall classification accuracy
- **Cross-Validation**: K-fold validation scores
- **Classification Report**: Precision, recall, F1-score
- **Confusion Matrix**: Per-category performance

## Integration with Space Analyzer Pro

### Web Dashboard Integration
```javascript
// API call from frontend
const response = await fetch('/api/categorize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file_path: '/path/to/file',
    include_features: true
  })
});

const result = await response.json();
console.log(`Category: ${result.predicted_category}`);
```

### Background Processing
```python
# Integration with file monitor
from src.categorizer import AdvancedFileCategorizer

categorizer = AdvancedFileCategorizer()

def on_file_change(file_path):
    result = categorizer.categorize_file(file_path)
    # Update database with categorization result
    update_file_category(file_path, result.predicted_category)
```

## Performance

### Benchmarks
- **Single File**: < 50ms average processing time
- **Batch Processing**: 100+ files/second
- **Model Accuracy**: 85-95% depending on training data
- **Memory Usage**: < 200MB for typical workloads
- **Scalability**: Handles thousands of files efficiently

### Optimization Tips
1. **Batch Processing**: Use batch endpoints for multiple files
2. **Feature Caching**: Cache extracted features for repeated files
3. **Model Selection**: Choose appropriate model for your use case
4. **Data Quality**: Better training data improves accuracy

## Examples

### Python Client

```python
import requests
import json

# API client
class CategorizerClient:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
    
    def categorize_file(self, file_path, include_features=False):
        response = requests.post(
            f"{self.base_url}/categorize",
            json={
                "file_path": file_path,
                "include_features": include_features,
                "include_alternatives": True
            }
        )
        return response.json()
    
    def categorize_batch(self, file_paths):
        response = requests.post(
            f"{self.base_url}/categorize/batch",
            json={
                "file_paths": file_paths,
                "include_features": False,
                "include_alternatives": True
            }
        )
        return response.json()

# Usage
client = CategorizerClient()
result = client.categorize_file("/path/to/document.pdf")
print(f"Category: {result['predicted_category']}")
```

### Command Line Interface

```bash
# Categorize single file
curl -X POST http://localhost:8001/categorize \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/path/to/file.txt"}'

# Batch categorization
curl -X POST http://localhost:8001/categorize/batch \
  -H "Content-Type: application/json" \
  -d '{"file_paths": ["/file1.txt", "/file2.jpg"]}'

# Upload and categorize
curl -X POST http://localhost:8001/upload/categorize \
  -F "file=@/path/to/file.txt" \
  -F "include_features=true"
```

## Troubleshooting

### Common Issues

1. **Model Not Loading**: Check model directory and permissions
2. **Low Accuracy**: Increase training data quality and quantity
3. **Slow Processing**: Enable batch processing and feature caching
4. **Memory Issues**: Reduce batch size and optimize feature extraction

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python src/api.py
```

### Model Validation

```python
from src.categorizer import AdvancedFileCategorizer

categorizer = AdvancedFileCategorizer()

# Test with known files
test_files = [
    ("document.pdf", "documents"),
    ("photo.jpg", "images"),
    ("script.py", "code")
]

for file_path, expected_category in test_files:
    result = categorizer.categorize_file(file_path)
    print(f"File: {file_path}")
    print(f"Expected: {expected_category}")
    print(f"Predicted: {result.predicted_category.value}")
    print(f"Confidence: {result.confidence:.3f}")
    print("---")
```

## Contributing

1. Follow existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure cross-platform compatibility
5. Validate model performance improvements

## License

MIT License - see LICENSE file for details.