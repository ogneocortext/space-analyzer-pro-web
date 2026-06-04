"""
Python AI Service Configuration
Centralized configuration for Python AI service
"""

# Port configuration (matches ports.config.js)
PYTHON_AI_PORT = 8084

# Ollama configuration
OLLAMA_HOST = 'http://localhost:11434'
OLLAMA_PORT = 11434

# Logging configuration
LOG_LEVEL = 'INFO'

# AI Model configuration
DEFAULT_MODEL = 'llama3.1'
MAX_TOKENS = 4096
TEMPERATURE = 0.7
