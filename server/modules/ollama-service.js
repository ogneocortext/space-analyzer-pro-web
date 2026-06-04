/**
 * Enhanced Ollama Service with Performance Tracking and Feedback Loop Support
 * Integrated with model comparison, health monitoring, and auto-fallback
 */

const { spawn, execSync } = require("child_process");

class EnhancedOllamaService {
  constructor(options = {}) {
    this.host = options.host || "http://localhost:11434";
    this.defaultModel = options.defaultModel || "phi4-mini:latest";
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
    this.timeout = options.timeout || 300000;

    // Performance tracking
    this.modelPerformance = new Map();
    this.ollamaProcess = null;
    this.ollamaAvailable = false;
    this.ollamaServerStarted = false;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      lastRequestAt: null,
      uptimeStart: null,
    };
  }

  /**
   * Start Ollama server if not already running
   */
  async startIfNeeded(checkFn, loadFn) {
    try {
      await this._checkAvailability(checkFn);
      if (this.ollamaAvailable) {
        await this._loadModels(loadFn);
        return;
      }

      console.log("🔄 Attempting to start Ollama server...");
      this.ollamaProcess = spawn("ollama", ["serve"], {
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.ollamaServerStarted = true;
      this.metrics.uptimeStart = Date.now();

      let attempts = 0;
      const maxAttempts = 30;

      const checkServer = async () => {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          await this._checkAvailability(checkFn);
          if (this.ollamaAvailable) {
            console.log("✅ Ollama server started successfully");
            await this._loadModels(loadFn);
            return;
          }
        } catch (error) {
          // Continue checking
        }

        if (attempts < maxAttempts) {
          checkServer();
        } else {
          console.log("⚠️ Failed to start Ollama server - using basic AI insights");
        }
      };

      checkServer();

      if (this.ollamaProcess) {
        this.ollamaProcess.on("close", (code) => {
          console.log(`Ollama process exited with code ${code}`);
          this.ollamaAvailable = false;
          this.ollamaServerStarted = false;
        });

        this.ollamaProcess.on("error", (error) => {
          console.error("Ollama process error:", error);
          this.ollamaAvailable = false;
          this.ollamaServerStarted = false;
        });
      }
    } catch (error) {
      console.log("⚠️ Could not start Ollama server - using basic AI insights");
    }
  }

  /**
   * Check Ollama availability with detailed status
   */
  async _checkAvailability(checkFn) {
    if (checkFn && typeof checkFn === "function") {
      const result = await checkFn();
      this.ollamaAvailable = !!result;
    }
    return this.ollamaAvailable;
  }

  /**
   * Load models using the enhanced service
   */
  async _loadModels(loadFn) {
    try {
      const models = await this.listModels();
      models.forEach((m) => {
        if (!this.modelPerformance.has(m.name)) {
          this.modelPerformance.set(m.name, {
            totalQueries: 0,
            successfulQueries: 0,
            totalResponseTime: 0,
            avgResponseTime: 0,
            lastUsed: null,
            errorCount: 0,
            tokensPerSecond: 0,
          });
        }
      });

      if (loadFn && typeof loadFn === "function") {
        await loadFn();
      }
    } catch (error) {
      console.error("Failed to load models:", error);
    }
  }

  /**
   * Make API request to Ollama with retry and performance tracking
   */
  async request(endpoint, payload, model = this.defaultModel) {
    const url = `${this.host}/api/${endpoint}`;
    const startTime = Date.now();

    this.metrics.totalRequests++;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.timeout),
        });

        const elapsed = Date.now() - startTime;
        const data = await response.json();

        if (response.ok) {
          this.metrics.successfulRequests++;
          this.metrics.totalResponseTime += elapsed;
          this.metrics.avgResponseTime =
            this.metrics.totalResponseTime / this.metrics.successfulRequests;
          this.metrics.lastRequestAt = new Date().toISOString();

          // Track model performance
          this._updateModelPerformance(model, elapsed, data);

          return { success: true, data, elapsed };
        } else {
          this.metrics.failedRequests++;
          throw new Error(`HTTP ${response.status}: ${data.error || "Unknown error"}`);
        }
      } catch (error) {
        if (attempt === this.maxRetries) {
          this.metrics.failedRequests++;
          return {
            success: false,
            error: error.message,
            elapsed: Date.now() - startTime,
          };
        }
        console.log(
          `  ⏳ Retry ${attempt}/${this.maxRetries} for ${model}... (${error.message})`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * attempt)
        );
      }
    }
  }

  /**
   * Update model performance tracking
   */
  _updateModelPerformance(model, elapsed, data) {
    const perf = this.modelPerformance.get(model);
    if (!perf) return;

    perf.totalQueries++;
    perf.successfulQueries++;
    perf.totalResponseTime += elapsed;
    perf.avgResponseTime = perf.totalResponseTime / perf.successfulQueries;
    perf.lastUsed = new Date().toISOString();

    if (data.eval_count && data.eval_duration) {
      perf.tokensPerSecond =
        data.eval_count / (data.eval_duration / 1e9);
    }
  }

  /**
   * List available models from Ollama
   */
  async listModels() {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error("Failed to list models:", error);
      return [];
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(model) {
    try {
      const response = await fetch(`${this.host}/api/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Failed to get info for ${model}:`, error);
      return null;
    }
  }

  /**
   * Run a chat completion
   */
  async chat(messages, model = this.defaultModel, options = {}) {
    const payload = {
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.numPredict ?? 500,
        ...(options.extra || {}),
      },
    };

    const result = await this.request("chat", payload, model);
    if (result.success) {
      return {
        response: result.data.message?.content || "",
        model: result.data.model || model,
        doneReason: result.data.done_reason,
        totalDuration: result.data.total_duration,
        evalCount: result.data.eval_count,
        evalDuration: result.data.eval_duration,
        elapsed: result.elapsed,
      };
    }
    return { response: "", error: result.error, model };
  }

  /**
   * Run custom prompt
   */
  async generate(prompt, model = this.defaultModel, options = {}) {
    return await this.chat([{ role: "user", content: prompt }], model, options);
  }

  /**
   * Analyze an image
   */
  async analyzeImage(imagePathOrBase64, prompt, model = this.defaultModel, options = {}) {
    let imageB64 = imagePathOrBase64;

    if (!imageB64.startsWith("data:") && !imageB64.startsWith("/9j/")) {
      // It's a file path, read and encode
      try {
        const fs = require("fs");
        const data = fs.readFileSync(imagePathOrBase64);
        imageB64 = `data:image/png;base64,${data.toString("base64")}`;
      } catch (e) {
        return { response: "", error: `Failed to read image: ${e.message}` };
      }
    }

    const messages = [{ role: "user", content: prompt, images: [imageB64] }];
    return await this.chat(messages, model, {
      temperature: 0.2,
      numPredict: 768,
      ...options,
    });
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    return {
      ollama: {
        available: this.ollamaAvailable,
        serverStarted: this.ollamaServerStarted,
        models: Array.from(this.modelPerformance.keys()),
      },
      metrics: { ...this.metrics },
      modelPerformance: Object.fromEntries(
        Array.from(this.modelPerformance.entries()).map(([name, perf]) => [
          name,
          {
            ...perf,
            successRate:
              perf.totalQueries > 0
                ? (perf.successfulQueries / perf.totalQueries) * 100
                : 0,
          },
        ])
      ),
    };
  }

  /**
   * Get best model for analysis (based on performance history)
   */
  getBestModel(complexity = "general") {
    const visionModels = Array.from(this.modelPerformance.entries())
      .filter(([name]) =>
        ["qwen3-vl", "llava", "bakllava", "phi3", "gemma"].some((m) =>
          name.toLowerCase().includes(m)
        )
      )
      .sort((a, b) => {
        const aRate = a[1].successRate || 0;
        const bRate = b[1].successRate || 0;
        const aSpeed = a[1].tokensPerSecond || 0;
        const bSpeed = b[1].tokensPerSecond || 0;
        return bRate * bSpeed - aRate * aSpeed;
      });

    if (visionModels.length > 0) {
      return visionModels[0][0];
    }
    return this.defaultModel;
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report = [];
    for (const [model, perf] of this.modelPerformance.entries()) {
      report.push({
        model,
        totalQueries: perf.totalQueries,
        successfulQueries: perf.successfulQueries,
        errorCount: perf.errorCount,
        successRate:
          perf.totalQueries > 0
            ? ((perf.successfulQueries / perf.totalQueries) * 100).toFixed(1) + "%"
            : "N/A",
        avgResponseTime: Math.round(perf.avgResponseTime) + "ms",
        tokensPerSecond: Math.round(perf.tokensPerSecond * 10) / 10,
        lastUsed: perf.lastUsed || "Never",
      });
    }
    return report.sort(
      (a, b) => (parseFloat(b.successRate) || 0) - (parseFloat(a.successRate) || 0)
    );
  }

  /**
   * Cleanup on shutdown
   */
  cleanup() {
    if (this.ollamaProcess) {
      try {
        process.kill(-this.ollamaProcess.pid, "SIGTERM");
      } catch {
        try {
          this.ollamaProcess.kill("SIGTERM");
        } catch (e) {
          console.error("Failed to kill Ollama process:", e.message);
        }
      }
      this.ollamaProcess = null;
    }
  }
}

// Singleton instance
let _instance = null;

function getEnhancedOllama(options = {}) {
  if (!_instance) {
    _instance = new EnhancedOllamaService(options);
  }
  return _instance;
}

module.exports = {
  EnhancedOllamaService,
  getEnhancedOllama,
};