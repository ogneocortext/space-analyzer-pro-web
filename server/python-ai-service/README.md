# Python AI Service for Ollama

This Python microservice handles all Ollama AI operations for the Space Analyzer.

## Setup

1. Install Python 3.8+ if not already installed
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the service:
   ```bash
   python ai_service.py
   ```
   Or on Windows:
   ```bash
   start.bat
   ```

## API Endpoints

### GET /health
Check if the service and Ollama are available.

### GET /models
List available Ollama models.

### POST /generate
Generate AI text.
- Body: `{ "prompt": "...", "model": "phi4-mini:latest" }`

### POST /analyze
Analyze file system data and provide AI insights.
- Body: `{ "analysisData": {...}, "model": "phi4-mini:latest" }`

## Integration

The Node.js backend will call this service instead of directly using Ollama, providing better reliability and error handling.
