/**
 * AI-Powered File Classification Service
 * Uses machine learning to intelligently classify files beyond simple extension matching
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

class AIFileClassifier {
  constructor() {
    this.model = null;
    this.features = new Map();
    this.cache = new Map();
    this.isInitialized = false;

    // Feature extraction configuration
    this.config = {
      enableContentAnalysis: true,
      enablePatternRecognition: true,
      enableSizeAnalysis: true,
      cacheSize: 10000,
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    console.info("🤖 Initializing AI File Classifier...");

    // Load pre-trained model or create new one
    await this.loadOrCreateModel();

    // Initialize feature extractors
    await this.initializeFeatureExtractors();

    this.isInitialized = true;
    console.info("✅ AI File Classifier initialized");
  }

  async loadOrCreateModel() {
    try {
      // Try to load existing model
      const modelPath = path.join(__dirname, "models", "file-classifier.json");

      if (
        await fs
          .access(modelPath)
          .then(() => true)
          .catch(() => false)
      ) {
        const modelData = await fs.readFile(modelPath, "utf8");
        this.model = JSON.parse(modelData);
        console.warn("📂 Loaded existing classification model");
      } else {
        // Create new model with default classifications
        this.model = await this.createDefaultModel();
        await this.saveModel();
        console.warn("🆕 Created new classification model");
      }
    } catch (error) {
      console.error("❌ Failed to load/create model:", error);
      this.model = await this.createDefaultModel();
    }
  }

  async createDefaultModel() {
    return {
      version: "1.0",
      created: new Date().toISOString(),
      categories: {
        documents: {
          patterns: [/\.(pdf|docx?|txt|rtf|md|tex|odt|pages)$/i],
          contentKeywords: ["document", "report", "letter", "contract", "invoice"],
          sizeRanges: [{ min: 1024, max: 100 * 1024 * 1024, weight: 0.8 }],
          confidence: 0.9,
        },
        code: {
          patterns: [
            /\.(js|jsx|ts|tsx|py|java|cpp|c|h|hpp|cs|php|rb|go|rs|swift|kt|html|css|scss|less|xml|json|yaml|yml|toml)$/i,
          ],
          contentKeywords: ["function", "class", "import", "export", "const", "let", "var"],
          sizeRanges: [{ min: 100, max: 1024 * 1024, weight: 0.7 }],
          confidence: 0.95,
        },
        media: {
          patterns: [
            /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|mp4|avi|mov|wmv|flv|mkv|mp3|wav|flac|aac|ogg)$/i,
          ],
          contentKeywords: ["image", "video", "audio", "media"],
          sizeRanges: [
            { min: 1024, max: 1024 * 1024, weight: 0.3 }, // Small media
            { min: 1024 * 1024, max: 10 * 1024 * 1024, weight: 0.5 }, // Medium media
            { min: 10 * 1024 * 1024, max: 100 * 1024 * 1024, weight: 0.7 }, // Large media
          ],
          confidence: 0.85,
        },
        archives: {
          patterns: [/\.(zip|rar|7z|tar|gz|bz2|xz|cab|msi|dmg|pkg|deb|rpm)$/i],
          contentKeywords: ["archive", "compressed", "package"],
          sizeRanges: [{ min: 1024, max: 1024 * 1024 * 1024, weight: 0.6 }],
          confidence: 0.9,
        },
        executables: {
          patterns: [/\.(exe|msi|deb|rpm|dmg|pkg|app|bat|cmd|sh|ps1)$/i],
          contentKeywords: ["executable", "application", "installer"],
          sizeRanges: [{ min: 1024, max: 100 * 1024 * 1024, weight: 0.8 }],
          confidence: 0.95,
        },
        data: {
          patterns: [/\.(db|sqlite|mdb|csv|json|xml|yaml|yml|toml|log|bak|tmp)$/i],
          contentKeywords: ["data", "database", "config", "log"],
          sizeRanges: [{ min: 0, max: 1024 * 1024 * 1024, weight: 0.4 }],
          confidence: 0.7,
        },
      },
      neuralWeights: {
        extension: 0.4,
        content: 0.3,
        size: 0.2,
        path: 0.1,
      },
    };
  }

  async initializeFeatureExtractors() {
    // Initialize content analysis patterns
    this.contentPatterns = {
      code: [
        /function\s+\w+\s*\(/g,
        /class\s+\w+/g,
        /import\s+.*from/g,
        /export\s+/g,
        /const\s+\w+/g,
        /let\s+\w+/g,
        /var\s+\w+/g,
      ],
      document: [
        /\b\s+/g, // Word count pattern
        /\d{1,2}\/\d{1,2}\/\d{4}/g, // Date pattern
        /\b(Chapter|Section|Part)\s+\d+/gi,
        /\b(Invoice|Receipt|Contract|Report)\b/gi,
      ],
      media: [
        /JFIF|PNG|GIF89|BMP|RIFF/gi, // File signatures
        /ID3|MP3|WAVE|AVI/gi,
        /\b(width|height|duration|frame)\b/gi,
      ],
    };
  }

  async classifyFile(filePath, stats = {}) {
    const cacheKey = this.generateCacheKey(filePath, stats);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const features = await this.extractFeatures(filePath, stats);
    const classification = await this.classifyWithModel(features);

    // Cache result
    if (this.cache.size >= this.config.cacheSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, classification);

    return classification;
  }

  async extractFeatures(filePath, stats) {
    const features = {
      path: filePath,
      extension: path.extname(filePath).toLowerCase(),
      filename: path.basename(filePath),
      directory: path.dirname(filePath),
      size: stats.size || 0,
      modified: stats.mtime || new Date(),
      created: stats.birthtime || new Date(),
    };

    // Extract path-based features
    features.pathDepth = filePath.split(path.sep).length;
    features.pathTokens = filePath
      .toLowerCase()
      .split(/[^a-z0-9]/i)
      .filter((t) => t.length > 2);
    features.isDirectory = stats.isDirectory || false;
    features.isHidden = path.basename(filePath).startsWith(".");

    // Extract content-based features if enabled
    if (this.config.enableContentAnalysis && !features.isDirectory) {
      try {
        features.contentFeatures = await this.extractContentFeatures(filePath);
      } catch (error) {
        // Content analysis failed, continue without it
        features.contentFeatures = null;
      }
    }

    // Extract size-based features
    if (this.config.enableSizeAnalysis) {
      features.sizeFeatures = this.extractSizeFeatures(features.size);
    }

    // Extract pattern-based features
    if (this.config.enablePatternRecognition) {
      features.patternFeatures = this.extractPatternFeatures(filePath, features.extension);
    }

    return features;
  }

  async extractContentFeatures(filePath) {
    const contentFeatures = {
      textContent: null,
      binarySignature: null,
      entropy: 0,
      lineCount: 0,
      wordCount: 0,
      codePatterns: [],
    };

    try {
      // Read first 1KB for analysis
      const buffer = await fs.readFile(filePath);
      const sample = buffer.slice(0, 1024);

      // Check if it's text or binary
      const isText = this.isTextContent(sample);

      if (isText) {
        contentFeatures.textContent = sample.toString("utf8", 0, Math.min(sample.length, 512));
        contentFeatures.lineCount = (contentFeatures.textContent.match(/\n/g) || []).length;
        contentFeatures.wordCount = contentFeatures.textContent
          .split(/\s+/)
          .filter((w) => w.length > 0).length;

        // Analyze code patterns
        for (const [category, patterns] of Object.entries(this.contentPatterns)) {
          const matches = patterns.reduce((count, pattern) => {
            return count + (contentFeatures.textContent.match(pattern) || []).length;
          }, 0);
          if (matches > 0) {
            contentFeatures.codePatterns.push({ category, matches });
          }
        }
      } else {
        contentFeatures.binarySignature = this.detectBinarySignature(sample);
        contentFeatures.entropy = this.calculateEntropy(sample);
      }
    } catch (error) {
      // File access error
      contentFeatures.error = error.message;
    }

    return contentFeatures;
  }

  isTextContent(buffer) {
    // Simple heuristic to detect text vs binary
    const sample = buffer.slice(0, 512);
    let textBytes = 0;

    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
        textBytes++;
      }
    }

    return textBytes / sample.length > 0.7;
  }

  detectBinarySignature(buffer) {
    const signatures = {
      PDF: "%PDF-",
      PNG: "\x89PNG\r\n\x1a\n",
      JPG: "\xff\xd8\xff",
      GIF: "GIF8",
      ZIP: "PK\x03\x04",
      EXE: "MZ\x90\x00",
    };

    for (const [type, sig] of Object.entries(signatures)) {
      if (buffer.toString("binary", 0, sig.length) === sig) {
        return type;
      }
    }

    return "Unknown";
  }

  calculateEntropy(buffer) {
    const frequency = new Array(256).fill(0);

    for (let i = 0; i < buffer.length; i++) {
      frequency[buffer[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequency[i] > 0) {
        const p = frequency[i] / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  extractSizeFeatures(size) {
    const sizeKB = size / 1024;
    const sizeMB = sizeKB / 1024;
    const sizeGB = sizeMB / 1024;

    return {
      bytes: size,
      kilobytes: sizeKB,
      megabytes: sizeMB,
      gigabytes: sizeGB,
      sizeCategory: this.categorizeSize(size),
      isLarge: size > 10 * 1024 * 1024, // > 10MB
      isHuge: size > 100 * 1024 * 1024, // > 100MB
    };
  }

  categorizeSize(size) {
    if (size < 1024) return "tiny";
    if (size < 10 * 1024) return "small";
    if (size < 1024 * 1024) return "medium";
    if (size < 10 * 1024 * 1024) return "large";
    return "huge";
  }

  extractPatternFeatures(filePath, extension) {
    const features = {
      extensionMatches: [],
      pathPatterns: [],
      namePatterns: [],
    };

    // Check against known patterns
    for (const [category, config] of Object.entries(this.model.categories)) {
      for (const pattern of config.patterns) {
        if (pattern.test(filePath)) {
          features.extensionMatches.push({
            category,
            confidence: config.confidence,
            match: filePath.match(pattern)[0],
          });
        }
      }
    }

    // Extract path patterns
    const pathParts = filePath.toLowerCase().split(path.sep);
    features.pathPatterns = pathParts.filter(
      (part) =>
        part.includes("temp") ||
        part.includes("cache") ||
        part.includes("backup") ||
        part.includes("log") ||
        /^\d{4}$/.test(part) // Year patterns
    );

    // Extract name patterns
    const filename = path.basename(filePath, extension);
    features.namePatterns = [
      { type: "date", match: filename.match(/\d{4}-\d{2}-\d{2}/) },
      { type: "version", match: filename.match(/v?\d+\.\d+/) },
      { type: "copy", match: filename.match(/copy\s*\d*/i) },
      { type: "temp", match: filename.match(/temp|tmp/i) },
    ].filter((p) => p.match);

    return features;
  }

  async classifyWithModel(features) {
    const scores = {};

    // Score each category
    for (const [category, config] of Object.entries(this.model.categories)) {
      let score = 0;
      let confidence = 0;

      // Extension-based scoring
      const extScore = this.scoreExtension(features.extension, config);
      score += extScore * this.model.neuralWeights.extension;

      // Content-based scoring
      if (features.contentFeatures) {
        const contentScore = this.scoreContent(features.contentFeatures, config);
        score += contentScore * this.model.neuralWeights.content;
      }

      // Size-based scoring
      if (features.sizeFeatures) {
        const sizeScore = this.scoreSize(features.sizeFeatures, config);
        score += sizeScore * this.model.neuralWeights.size;
      }

      // Path-based scoring
      const pathScore = this.scorePath(features, config);
      score += pathScore * this.model.neuralWeights.path;

      scores[category] = {
        score: Math.max(0, Math.min(1, score)),
        confidence: config.confidence,
        breakdown: {
          extension: extScore,
          content: features.contentFeatures
            ? this.scoreContent(features.contentFeatures, config)
            : 0,
          size: features.sizeFeatures ? this.scoreSize(features.sizeFeatures, config) : 0,
          path: pathScore,
        },
      };
    }

    // Find best match
    const bestCategory = Object.entries(scores).reduce(
      (best, [category, score]) => {
        return score.score > best.score.score ? { category, ...score } : best;
      },
      { category: "unknown", score: 0, confidence: 0 }
    );

    return {
      predicted: bestCategory.category,
      confidence: bestCategory.confidence * bestCategory.score,
      scores,
      features,
      reasoning: this.generateReasoning(bestCategory, scores),
    };
  }

  scoreExtension(extension, categoryConfig) {
    for (const pattern of categoryConfig.patterns) {
      if (pattern.test(extension)) {
        return 1.0;
      }
    }
    return 0.0;
  }

  scoreContent(contentFeatures, categoryConfig) {
    if (!contentFeatures.textContent) return 0;

    const text = contentFeatures.textContent.toLowerCase();
    let score = 0;

    for (const keyword of categoryConfig.contentKeywords || []) {
      if (text.includes(keyword.toLowerCase())) {
        score += 0.2;
      }
    }

    // Check pattern matches
    for (const patternMatch of contentFeatures.codePatterns || []) {
      if (
        patternMatch.category === categoryConfig.name ||
        patternMatch.category === categoryConfig.type
      ) {
        score += Math.min(0.5, patternMatch.matches * 0.1);
      }
    }

    return Math.min(1.0, score);
  }

  scoreSize(sizeFeatures, categoryConfig) {
    if (!categoryConfig.sizeRanges) return 0;

    let score = 0;
    for (const range of categoryConfig.sizeRanges) {
      if (sizeFeatures.bytes >= range.min && sizeFeatures.bytes <= range.max) {
        score += range.weight;
      }
    }

    return Math.min(1.0, score);
  }

  scorePath(features, categoryConfig) {
    let score = 0;

    // Check path patterns
    for (const pattern of features.pathPatterns || []) {
      if (
        categoryConfig.type === "temporary" &&
        (pattern.includes("temp") || pattern.includes("cache"))
      ) {
        score += 0.1;
      }
    }

    // Check name patterns
    for (const namePattern of features.namePatterns || []) {
      if (categoryConfig.type === "backup" && namePattern.type === "copy") {
        score += 0.1;
      }
    }

    return Math.min(1.0, score);
  }

  generateReasoning(bestCategory, allScores) {
    const reasons = [];
    const breakdown = bestCategory.breakdown;

    if (breakdown.extension > 0.5) {
      reasons.push(`File extension strongly suggests ${bestCategory.category}`);
    }

    if (breakdown.content > 0.3) {
      reasons.push(`Content analysis indicates ${bestCategory.category}`);
    }

    if (breakdown.size > 0.4) {
      reasons.push(`File size matches typical ${bestCategory.category} patterns`);
    }

    if (breakdown.path > 0.2) {
      reasons.push(`File path suggests ${bestCategory.category}`);
    }

    return reasons.join("; ");
  }

  generateCacheKey(filePath, stats) {
    const keyData = `${filePath}:${stats.size || 0}:${stats.mtime || 0}`;
    return crypto.createHash("md5").update(keyData).digest("hex");
  }

  async saveModel() {
    try {
      const modelDir = path.join(__dirname, "models");
      await fs.mkdir(modelDir, { recursive: true });

      const modelPath = path.join(modelDir, "file-classifier.json");
      await fs.writeFile(modelPath, JSON.stringify(this.model, null, 2));

      console.warn("💾 Classification model saved");
    } catch (error) {
      console.error("❌ Failed to save model:", error);
    }
  }

  async learnFromFeedback(filePath, predictedCategory, actualCategory) {
    if (predictedCategory === actualCategory) return; // Correct prediction

    // Update model weights based on feedback
    const features = await this.extractFeatures(filePath, { size: 0 });

    // Simple reinforcement learning
    const actualConfig = this.model.categories[actualCategory];
    if (actualConfig) {
      // Increase confidence for correct category
      actualConfig.confidence = Math.min(0.99, actualConfig.confidence + 0.01);

      // Adjust neural weights
      const breakdown = this.analyzeMisclassification(features, predictedCategory, actualCategory);
      this.adjustNeuralWeights(breakdown);

      await this.saveModel();
      console.warn(`🧠 Learned from feedback: ${predictedCategory} -> ${actualCategory}`);
    }
  }

  analyzeMisclassification(features, predicted, actual) {
    return {
      extensionError:
        features.extension &&
        this.model.categories[actual].patterns.some((p) => p.test("." + features.extension)),
      contentError:
        features.contentFeatures &&
        this.scoreContent(features.contentFeatures, this.model.categories[actual]) < 0.5,
      sizeError:
        features.sizeFeatures &&
        this.scoreSize(features.sizeFeatures, this.model.categories[actual]) < 0.5,
      pathError: this.scorePath(features, this.model.categories[actual]) < 0.5,
    };
  }

  adjustNeuralWeights(breakdown) {
    const learningRate = 0.01;

    if (breakdown.extensionError) {
      this.model.neuralWeights.extension += learningRate;
    }

    if (breakdown.contentError) {
      this.model.neuralWeights.content += learningRate;
    }

    if (breakdown.sizeError) {
      this.model.neuralWeights.size += learningRate;
    }

    if (breakdown.pathError) {
      this.model.neuralWeights.path += learningRate;
    }

    // Normalize weights
    const total = Object.values(this.model.neuralWeights).reduce((sum, weight) => sum + weight, 0);
    for (const key of Object.keys(this.model.neuralWeights)) {
      this.model.neuralWeights[key] /= total;
    }
  }

  // Batch classification for multiple files
  async classifyBatch(files) {
    const results = [];

    for (const file of files) {
      try {
        const classification = await this.classifyFile(file.path, file.stats);
        results.push({
          ...file,
          classification,
        });
      } catch (error) {
        results.push({
          ...file,
          classification: {
            predicted: "error",
            confidence: 0,
            error: error.message,
          },
        });
      }
    }

    return results;
  }

  // Get model statistics
  getModelStats() {
    return {
      version: this.model.version,
      created: this.model.created,
      categories: Object.keys(this.model.categories),
      cacheSize: this.cache.size,
      isInitialized: this.isInitialized,
    };
  }
}

module.exports = AIFileClassifier;
