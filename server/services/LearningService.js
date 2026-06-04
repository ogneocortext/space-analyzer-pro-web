const fs = require("fs");
const { promises: fsPromises } = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * LearningService
 * Handles self-learning cache, interaction history, and model performance tracking
 */
class LearningService {
  constructor(baseDir) {
    this.learningDir = baseDir || path.join(__dirname, "..", "controllers", "learning");
    this.cacheFile = path.join(this.learningDir, "cache.json");
    this.historyFile = path.join(this.learningDir, "history.json");
    
    this.cache = new Map();
    this.history = [];
    this.modelPerformance = new Map();
    
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      if (!fs.existsSync(this.learningDir)) {
        await fsPromises.mkdir(this.learningDir, { recursive: true });
      }
      
      await this.loadData();
      this.initialized = true;
      console.log("🧠 LearningService initialized");
    } catch (error) {
      console.error("❌ Failed to initialize LearningService:", error);
    }
  }

  async loadData() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const cacheData = JSON.parse(await fsPromises.readFile(this.cacheFile, "utf8"));
        this.cache = new Map(Object.entries(cacheData));
        console.log(`🧠 Loaded ${this.cache.size} cached responses`);
      }

      if (fs.existsSync(this.historyFile)) {
        this.history = JSON.parse(await fsPromises.readFile(this.historyFile, "utf8"));
        console.log(`📚 Loaded ${this.history.length} interaction records`);
        
        // Rebuild model performance from history if needed
        this.rebuildPerformanceMetrics();
      }
    } catch (error) {
      console.warn("⚠️ Could not load learning data:", error.message);
    }
  }

  rebuildPerformanceMetrics() {
    this.history.forEach(interaction => {
      const { model, responseTime, success } = interaction;
      this.updatePerformanceMetrics(model, responseTime, success);
    });
  }

  async saveData() {
    try {
      if (!fs.existsSync(this.learningDir)) {
        await fsPromises.mkdir(this.learningDir, { recursive: true });
      }
      
      const cacheObject = Object.fromEntries(this.cache);
      await fsPromises.writeFile(this.cacheFile, JSON.stringify(cacheObject, null, 2));
      await fsPromises.writeFile(this.historyFile, JSON.stringify(this.history, null, 2));
      
      console.log("💾 Learning data saved");
    } catch (error) {
      console.error("⚠️ Could not save learning data:", error.message);
    }
  }

  generateCacheKey(query, analysisData, model) {
    return crypto
      .createHash("md5")
      .update(
        JSON.stringify({
          query,
          totalFiles: analysisData?.totalFiles || 0,
          totalSize: analysisData?.totalSize || 0,
          categories: Object.keys(analysisData?.categories || {}),
          model,
        })
      )
      .digest("hex");
  }

  async getCachedResponse(query, analysisData, model) {
    const cacheKey = this.generateCacheKey(query, analysisData, model);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24h
      return cached.response;
    }
    return null;
  }

  async storeResponse(query, analysisData, model, response) {
    const cacheKey = this.generateCacheKey(query, analysisData, model);
    const entry = {
      timestamp: Date.now(),
      query,
      model,
      response,
      analysisFingerprint: {
        totalFiles: analysisData?.totalFiles || 0,
        totalSize: analysisData?.totalSize || 0,
        categories: Object.keys(analysisData?.categories || {}),
      },
    };

    this.cache.set(cacheKey, entry);

    // Limit cache size
    if (this.cache.size > 1000) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    if (Math.random() < 0.1) await this.saveData();
  }

  recordInteraction(query, analysisData, model, response, responseTime, success) {
    const interaction = {
      timestamp: Date.now(),
      query,
      model,
      responseTime,
      success,
      analysisFingerprint: {
        totalFiles: analysisData?.totalFiles || 0,
        totalSize: analysisData?.totalSize || 0,
        categories: Object.keys(analysisData?.categories || {}),
      },
      responseLength: response ? response.length : 0,
    };

    this.history.push(interaction);
    this.updatePerformanceMetrics(model, responseTime, success);

    if (this.history.length > 10000) {
      this.history = this.history.slice(-10000);
    }
  }

  updatePerformanceMetrics(model, responseTime, success) {
    const perf = this.modelPerformance.get(model) || {
      totalQueries: 0,
      successfulQueries: 0,
      averageResponseTime: 0,
      lastUsed: null,
    };

    perf.totalQueries++;
    if (success) perf.successfulQueries++;
    perf.lastUsed = Date.now();

    const alpha = 0.1; // Smoothing factor
    perf.averageResponseTime = perf.averageResponseTime * (1 - alpha) + responseTime * alpha;

    this.modelPerformance.set(model, perf);
  }

  getPerformance(model) {
    return this.modelPerformance.get(model);
  }
}

module.exports = LearningService;
