/**
 * Server Configuration Management
 * Environment-based configuration with validation and defaults
 */

const path = require("path");
const fs = require("fs");

class ConfigManager {
  constructor() {
    this.config = {};
    this.loadConfig();
    this.validateConfig();
  }

  /**
   * Load configuration from environment variables with defaults
   */
  loadConfig() {
    this.config = {
      // Server configuration
      port: this.parseInt(process.env.PORT, 8091),
      host: process.env.HOST || "localhost",
      nodeEnv: process.env.NODE_ENV || "development",

      // Database configuration
      database: {
        path: process.env.DATABASE_PATH || path.join(__dirname, "knowledge.db"),
        maxConnections: this.parseInt(process.env.DB_MAX_CONNECTIONS, 10),
        timeout: this.parseInt(process.env.DB_TIMEOUT, 30000),
      },

      // File system configuration
      filesystem: {
        maxFileSize: this.parseInt(process.env.MAX_FILE_SIZE, 100 * 1024 * 1024), // 100MB
        allowedExtensions: this.parseArray(process.env.ALLOWED_EXTENSIONS, [
          ".js",
          ".ts",
          ".json",
          ".txt",
          ".md",
        ]),
        uploadPath: process.env.UPLOAD_PATH || path.join(__dirname, "uploads"),
        tempPath: process.env.TEMP_PATH || path.join(__dirname, "temp"),
        maxDepth: this.parseInt(process.env.MAX_SCAN_DEPTH, 10),
      },

      // AI/Ollama configuration
      ai: {
        ollamaHost: process.env.OLLAMA_HOST || "localhost",
        ollamaPort: this.parseInt(process.env.OLLAMA_PORT, 11434),
        defaultModel: process.env.DEFAULT_AI_MODEL || "gemma3:latest",
        visionModel: process.env.VISION_MODEL || "qwen2.5vl:7b",
        timeout: this.parseInt(process.env.AI_TIMEOUT, 60000),
        maxRetries: this.parseInt(process.env.AI_MAX_RETRIES, 3),
        models: this.parseArray(process.env.AI_MODELS, [
          "gemma3:latest",
          "qwen2.5-coder:7b-instruct",
          "llama3.1:8b-instruct-q4_0",
          "mistral:7b-instruct-q4_0",
          "qwen2.5vl:7b",
        ]),
      },

      // Analysis configuration
      analysis: {
        largeFileThreshold: this.parseInt(process.env.LARGE_FILE_THRESHOLD, 10 * 1024 * 1024), // 10MB default
        oldFileThreshold: this.parseInt(process.env.OLD_FILE_THRESHOLD, 365 * 24 * 60 * 60 * 1000), // 1 year in ms
      },

      // Security configuration
      security: {
        corsOrigin: this.parseCorsOrigin(process.env.CORS_ORIGIN),
        rateLimitWindow: this.parseInt(process.env.RATE_LIMIT_WINDOW, 15 * 60 * 1000), // 15 minutes
        rateLimitMax: this.parseInt(process.env.RATE_LIMIT_MAX, 100),
        jwtSecret: process.env.JWT_SECRET || this.generateFallbackSecret(),
        sessionTimeout: this.parseInt(process.env.SESSION_TIMEOUT, 24 * 60 * 60 * 1000), // 24 hours
        enableHttps: this.parseBoolean(process.env.ENABLE_HTTPS, false),
      },

      // Logging configuration
      logging: {
        level: process.env.LOG_LEVEL || (this.isDevelopment ? "debug" : "warn"),
        file: process.env.LOG_FILE || "server.log",
        maxSize: this.parseInt(process.env.LOG_MAX_SIZE, 10 * 1024 * 1024), // 10MB
        maxFiles: this.parseInt(process.env.LOG_MAX_FILES, 5),
        enableConsole: this.parseBoolean(process.env.LOG_CONSOLE, true),
        enableFile: this.parseBoolean(process.env.LOG_FILE_ENABLE, true),
      },

      // Performance configuration
      performance: {
        enableCompression: this.parseBoolean(process.env.ENABLE_COMPRESSION, true),
        enableCaching: this.parseBoolean(process.env.ENABLE_CACHING, true),
        cacheSize: this.parseInt(process.env.CACHE_SIZE, 100),
        workerThreads: this.parseInt(process.env.WORKER_THREADS, 2),
        maxMemory: this.parseInt(process.env.MAX_MEMORY, 512 * 1024 * 1024), // 512MB
      },

      // Feature flags
      features: {
        aiRecommendations: this.parseBoolean(process.env.ENABLE_AI_RECOMMENDATIONS, true),
        duplicateDetection: this.parseBoolean(process.env.ENABLE_DUPLICATE_DETECTION, true),
        realTimeUpdates: this.parseBoolean(process.env.ENABLE_REALTIME_UPDATES, false),
        advancedSearch: this.parseBoolean(process.env.ENABLE_ADVANCED_SEARCH, true),
        exportFeatures: this.parseBoolean(process.env.ENABLE_EXPORT, true),
        monitoring: this.parseBoolean(process.env.ENABLE_MONITORING, true),
      },

      // External services
      services: {
        githubToken: process.env.GITHUB_TOKEN,
        discordWebhook: process.env.DISCORD_WEBHOOK,
        slackWebhook: process.env.SLACK_WEBHOOK,
        emailService: {
          provider: process.env.EMAIL_PROVIDER,
          apiKey: process.env.EMAIL_API_KEY,
          fromEmail: process.env.EMAIL_FROM,
        },
        aiService: {
          timeout: this.parseInt(process.env.AI_SERVICE_TIMEOUT, 30000), // 30s default
          batchTimeout: this.parseInt(process.env.AI_SERVICE_BATCH_TIMEOUT, 60000), // 60s for batches
          trainingTimeout: this.parseInt(process.env.AI_SERVICE_TRAINING_TIMEOUT, 5000), // 5s for training trigger
        },
      },
    };
  }

  /**
   * Validate configuration and create required directories
   */
  validateConfig() {
    // Validate port range
    if (this.config.port < 1 || this.config.port > 65535) {
      throw new Error(`Invalid port number: ${this.config.port}. Must be between 1 and 65535.`);
    }

    // Create required directories
    this.ensureDirectory(this.config.filesystem.uploadPath);
    this.ensureDirectory(this.config.filesystem.tempPath);
    this.ensureDirectory(path.dirname(this.config.database.path));

    // Validate database path
    const dbDir = path.dirname(this.config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Validate AI models
    if (!Array.isArray(this.config.ai.models) || this.config.ai.models.length === 0) {
      throw new Error("At least one AI model must be configured.");
    }

    console.log("✅ Configuration validated successfully");
    console.log(`📊 Environment: ${this.config.nodeEnv}`);
    console.log(`🔌 Port: ${this.config.port}`);
    console.log(`🤖 AI Models: ${this.config.ai.models.length} configured`);
    console.log(`📁 Upload Path: ${this.config.filesystem.uploadPath}`);
  }

  /**
   * Ensure directory exists
   */
  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  }

  /**
   * Parse integer with default fallback
   */
  parseInt(value, defaultValue) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Parse boolean with default fallback
   */
  parseBoolean(value, defaultValue) {
    if (value === undefined || value === null) return defaultValue;
    return value.toLowerCase() === "true" || value === "1";
  }

  /**
   * Parse array from comma-separated string
   */
  parseArray(value, defaultValue) {
    if (!value) return defaultValue;
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  /**
   * Parse CORS origin configuration
   */
  parseCorsOrigin(value) {
    if (!value) {
      // Default for localhost development
      return process.env.NODE_ENV === "production" ? false : true;
    }

    if (value === "*") return true;
    if (value.includes(",")) {
      return value.split(",").map((origin) => origin.trim());
    }

    return value;
  }

  /**
   * Generate or load persisted JWT secret
   * Persists secret to file so it survives server restarts
   */
  generateFallbackSecret() {
    const crypto = require("crypto");
    const fs = require("fs");
    const path = require("path");

    const secretPath = path.join(__dirname, ".jwt-secret");

    // Try to load existing secret
    try {
      if (fs.existsSync(secretPath)) {
        const savedSecret = fs.readFileSync(secretPath, "utf8").trim();
        if (savedSecret && savedSecret.length >= 32) {
          console.log("🔐 Loaded persisted JWT secret");
          return savedSecret;
        }
      }
    } catch (e) {
      console.warn("⚠️  Could not load persisted JWT secret:", e.message);
    }

    // Generate new secret
    const secret = crypto.randomBytes(32).toString("hex");

    // Persist to file
    try {
      fs.writeFileSync(secretPath, secret, { mode: 0o600 }); // Restrictive permissions
      console.log("🔐 Generated and persisted new JWT secret");
    } catch (e) {
      console.warn("⚠️  Could not persist JWT secret:", e.message);
    }

    console.warn(
      "⚠️  Using generated JWT secret for development. Set JWT_SECRET environment variable for production."
    );
    return secret;
  }

  /**
   * Get configuration value with dot notation path
   */
  get(path, defaultValue = undefined) {
    return path.split(".").reduce((obj, key) => obj?.[key], this.config) ?? defaultValue;
  }

  /**
   * Set configuration value (for testing or dynamic updates)
   */
  set(path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);
    target[lastKey] = value;
  }

  /**
   * Get all configuration as plain object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Check if running in development mode
   */
  get isDevelopment() {
    return this.config.nodeEnv === "development";
  }

  /**
   * Check if running in production mode
   */
  get isProduction() {
    return this.config.nodeEnv === "production";
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig() {
    return {
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      nodeEnv: this.config.nodeEnv,
      port: this.config.port,
      host: this.config.host,
    };
  }

  /**
   * Create .env.example file with all available options
   */
  createEnvExample() {
    const example = `# Space Analyzer Server Configuration
# Copy this file to .env and modify values as needed

# Server Configuration
PORT=8091
HOST=localhost
NODE_ENV=development

# Database Configuration
DATABASE_PATH=./server/knowledge.db
DB_MAX_CONNECTIONS=10
DB_TIMEOUT=30000

# File System Configuration
MAX_FILE_SIZE=104857600
ALLOWED_EXTENSIONS=.js,.ts,.json,.txt,.md
UPLOAD_PATH=./server/uploads
TEMP_PATH=./server/temp
MAX_SCAN_DEPTH=10

# AI/Ollama Configuration
OLLAMA_HOST=localhost
OLLAMA_PORT=11434
DEFAULT_AI_MODEL=gemma3:latest
VISION_MODEL=qwen2.5vl:7b
AI_TIMEOUT=60000
AI_MAX_RETRIES=3
AI_MODELS=gemma3:latest,qwen2.5-coder:7b-instruct,llama3.1:8b-instruct-q4_0,mistral:7b-instruct-q4_0,qwen2.5vl:7b

# Security Configuration
CORS_ORIGIN=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
JWT_SECRET=your-super-secret-jwt-key-here
SESSION_TIMEOUT=86400000
ENABLE_HTTPS=false

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE=server.log
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5
LOG_CONSOLE=true
LOG_FILE_ENABLE=true

# Performance Configuration
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_SIZE=100
WORKER_THREADS=2
MAX_MEMORY=536870912

# Feature Flags
ENABLE_AI_RECOMMENDATIONS=true
ENABLE_DUPLICATE_DETECTION=true
ENABLE_REALTIME_UPDATES=false
ENABLE_ADVANCED_SEARCH=true
ENABLE_EXPORT=true
ENABLE_MONITORING=true

# External Services (Optional)
GITHUB_TOKEN=your-github-token
DISCORD_WEBHOOK=https://discord.com/api/webhooks/your/webhook
SLACK_WEBHOOK=https://hooks.slack.com/services/your/webhook
EMAIL_PROVIDER=smtp
EMAIL_API_KEY=your-email-api-key
EMAIL_FROM=noreply@spaceanalyzer.app
`;

    const examplePath = path.join(__dirname, "..", ".env.example");
    fs.writeFileSync(examplePath, example);
    console.log(`📄 Created .env.example file: ${examplePath}`);
  }
}

// Create singleton instance
const config = new ConfigManager();

module.exports = config;
