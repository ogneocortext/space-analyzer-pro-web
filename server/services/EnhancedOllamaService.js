/**
 * Enhanced Ollama Service for Space Analyzer - Hardware Optimized
 * Provides advanced integration with local Ollama server with dynamic configuration
 */

const http = require("http");
const { URL } = require("url");
const dynamicConfig = require("../config/dynamic-config");

class EnhancedOllamaService {
  constructor(baseUrl = "http://localhost:11434") {
    this.baseUrl = baseUrl;
    this.learningService = null;
    this.models = [];
    // Use hardware-optimized model from dynamic config
    this.currentModel = dynamicConfig.aiModel;

    // Hardware-optimized concurrency settings
    this.requestQueue = [];
    this.isProcessing = false;
    this.maxConcurrentRequests = dynamicConfig.maxConcurrentAIRequests;
    this.activeRequests = 0;

    // GPU/CUDA Configuration - Optimized for Ollama 0.22.0
    this.gpuConfig = {
      num_gpu: 99, // Use all available GPUs (Ollama will distribute layers)
      num_thread: 0, // Let Ollama decide optimal thread count when using GPU
      main_gpu: 0, // Primary GPU index
      tensor_split: null, // Auto-split across GPUs
      use_mmap: true, // Memory map for faster loading
      use_mlock: false, // Don't lock memory (allows swap if needed)
      numa: false, // NUMA optimization off unless specifically needed
      batch_size: dynamicConfig.ollamaBatchSize, // Hardware-optimized batch size
      ctx_size: dynamicConfig.ollamaContextSize, // Hardware-optimized context
      ctx_size_analysis: dynamicConfig.ollamaContextSize * 2, // Larger for analysis
      f16_kv: true, // FP16 for key/value cache (saves VRAM, faster)
      offload_kqv: true, // Offload attention layers to GPU
      num_keep: 128, // Preserve system prompt from truncation (Ollama 0.22.0)
      repeat_penalty: 1.1, // Reduce repetition
      repeat_last_n: 64, // Control repetition context
      // New in 0.22.0: thinking parameter for reasoning models
      thinking: false, // Can be boolean or "high" | "medium" | "low"
    };

    // GPU Detection
    this.gpuInfo = {
      detected: false,
      count: 0,
      vramTotal: 0,
      vramFree: 0,
      cudaAvailable: false,
    };
    this.detectGPU();

    // Health Monitoring
    this.healthStatus = {
      isHealthy: false,
      lastCheck: null,
      consecutiveFailures: 0,
      circuitBreakerOpen: false,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000, // 30 seconds
    };

    // Performance Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestTimes: [],
      modelUsage: {},
      lastReset: Date.now(),
    };

    // Hardware-optimized caching
    this.responseCache = new Map();
    this.cacheExpiry = dynamicConfig.cacheExpiry;
    this.maxCacheSize = dynamicConfig.cacheSize;

    // Rate Limiting DISABLED for local development
    this.rateLimitWindow = 0; // Disabled
    this.maxRequestsPerWindow = Infinity; // No limit
    this.requestTimestamps = [];

    // Initialize health monitoring
    this.initializeHealthMonitoring();
  }

  setLearningService(service) {
    this.learningService = service;
  }

  /**
   * Initialize health monitoring and periodic checks
   */
  initializeHealthMonitoring() {
    // Initial health check
    this.performHealthCheck();

    // Periodic health checks every 5 minutes (reduced from 30 seconds to reduce log spam)
    setInterval(() => {
      this.performHealthCheck();
    }, 300000);

    // Rate limiting cleanup disabled (no rate limiting in local dev)
    // setInterval(() => { this.cleanupRequestTimestamps(); }, 60000);

    // Clean up expired cache entries
    setInterval(() => {
      this.cleanupCache();
    }, 60000);
  }

  /**
   * Detect GPU availability and VRAM
   */
  detectGPU() {
    try {
      // Try to detect NVIDIA GPU via nvidia-smi
      const { execSync } = require("child_process");
      const nvidiaInfo = execSync(
        "nvidia-smi --query-gpu=count,name,memory.total,memory.free --format=csv,noheader",
        { encoding: "utf8", timeout: 5000 }
      );
      const lines = nvidiaInfo.trim().split("\n");

      this.gpuInfo.detected = true;
      this.gpuInfo.count = lines.length;
      this.gpuInfo.cudaAvailable = true;

      let totalVram = 0;
      let freeVram = 0;

      lines.forEach((line, idx) => {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 4) {
          const name = parts[1];
          const total = parseInt(parts[2].replace(" MiB", ""));
          const free = parseInt(parts[3].replace(" MiB", ""));
          totalVram += total;
          freeVram += free;
          console.log(
            `🎮 GPU ${idx}: ${name} - ${Math.round(total / 1024)}GB total, ${Math.round(free / 1024)}GB free`
          );
        }
      });

      this.gpuInfo.vramTotal = totalVram;
      this.gpuInfo.vramFree = freeVram;

      console.log(
        `✅ GPU Detection: ${this.gpuInfo.count} GPU(s), ${Math.round(freeVram / 1024)}/${Math.round(totalVram / 1024)}GB VRAM available`
      );
    } catch (err) {
      console.log(
        "⚠️ No NVIDIA GPU detected or nvidia-smi not available - CPU fallback will be used"
      );
      this.gpuInfo.detected = false;
    }
  }

  /**
   * Get GPU info for monitoring
   */
  getGPUInfo() {
    return { ...this.gpuInfo };
  }

  /**
   * Test connection to Ollama server (alias for performHealthCheck)
   */
  async testConnection() {
    try {
      await this.performHealthCheck();
      return this.healthStatus.isHealthy;
    } catch (error) {
      console.error("Ollama connection test failed:", error);
      return false;
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      const startTime = Date.now();
      const wasHealthy = this.healthStatus.isHealthy;

      const response = await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: "localhost",
            port: 11434,
            path: "/api/tags",
            method: "GET",
            timeout: 5000,
          },
          (res) => {
            res.on("end", () => {
              if (res.statusCode === 200) {
                this.healthStatus.isHealthy = true;
                this.healthStatus.lastCheck = Date.now();
                this.healthStatus.consecutiveFailures = 0;
                this.healthStatus.circuitBreakerOpen = false;

                const responseTime = Date.now() - startTime;
                // Only log if status changed from unhealthy to healthy
                if (!wasHealthy) {
                  console.log(`✅ Ollama health check passed (${responseTime}ms)`);
                }
                resolve(true);
              } else {
                reject(new Error(`HTTP ${res.statusCode}`));
              }
            });
            res.on("error", reject);
            res.resume();
          }
        );

        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Request timeout"));
        });

        req.end();
      });

      return response;
    } catch (error) {
      this.healthStatus.consecutiveFailures++;
      this.healthStatus.lastCheck = Date.now();

      if (this.healthStatus.consecutiveFailures >= this.healthStatus.circuitBreakerThreshold) {
        this.healthStatus.circuitBreakerOpen = true;
        console.warn("⚠️ Ollama circuit breaker opened due to repeated failures");

        // Auto-retry after timeout
        setTimeout(() => {
          this.healthStatus.circuitBreakerOpen = false;
          this.healthStatus.consecutiveFailures = 0;
          console.log("🔄 Ollama circuit breaker reset - retrying");
        }, this.healthStatus.circuitBreakerTimeout);
      }

      // Only log first failure or circuit breaker events
      if (this.healthStatus.consecutiveFailures === 1 || this.healthStatus.circuitBreakerOpen) {
        console.error(`❌ Ollama health check failed: ${error.message}`);
      }
      this.healthStatus.isHealthy = false;
      return false;
    }
  }

  /**
   * Check if service is available for requests
   */
  isServiceAvailable() {
    return this.healthStatus.isHealthy && !this.healthStatus.circuitBreakerOpen;
  }

  /**
   * Rate limiting check
   */
  isRateLimited() {
    const now = Date.now();
    const recentRequests = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.rateLimitWindow
    );

    return recentRequests.length >= this.maxRequestsPerWindow;
  }

  /**
   * Clean up old request timestamps
   */
  cleanupRequestTimestamps() {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.rateLimitWindow
    );
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.responseCache.delete(key);
      }
    }

    // Remove oldest entries if cache is too large
    if (this.responseCache.size > this.maxCacheSize) {
      const entries = Array.from(this.responseCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
      toDelete.forEach(([key]) => this.responseCache.delete(key));
    }
  }

  /**
   * Generate cache key for requests
   */
  generateCacheKey(model, prompt, options = {}) {
    // Don't include model in cache key to allow auto-selection to work
    const keyData = { prompt, options };
    return btoa(JSON.stringify(keyData)).substring(0, 32);
  }

  /**
   * Get cached response if available
   */
  getCachedResponse(cacheKey) {
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.response;
    }
    return null;
  }

  /**
   * Cache response
   */
  cacheResponse(cacheKey, response) {
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Update performance metrics
   */
  updateMetrics(success, responseTime, model) {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update response time tracking
    this.metrics.requestTimes.push(responseTime);
    if (this.metrics.requestTimes.length > 100) {
      this.metrics.requestTimes = this.metrics.requestTimes.slice(-100);
    }

    // Calculate average response time
    this.metrics.averageResponseTime =
      this.metrics.requestTimes.reduce((a, b) => a + b, 0) / this.metrics.requestTimes.length;

    // Track model usage
    if (!this.metrics.modelUsage[model]) {
      this.metrics.modelUsage[model] = 0;
    }
    this.metrics.modelUsage[model]++;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const successRate =
      this.metrics.totalRequests > 0
        ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)
        : 0;

    return {
      ...this.metrics,
      successRate: `${successRate}%`,
      uptime: this.healthStatus.isHealthy ? "Healthy" : "Unhealthy",
      circuitBreakerStatus: this.healthStatus.circuitBreakerOpen ? "Open" : "Closed",
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
    };
  }

  /**
   * Add request to queue
   */
  async enqueueRequest(requestFunction, priority = "normal") {
    return new Promise((resolve, reject) => {
      const request = {
        execute: requestFunction,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
      };

      // Insert based on priority
      if (priority === "high") {
        this.requestQueue.unshift(request);
      } else {
        this.requestQueue.push(request);
      }

      this.processQueue();
    });
  }

  /**
   * Process request queue
   */
  async processQueue() {
    if (
      this.isProcessing ||
      this.activeRequests >= this.maxConcurrentRequests ||
      this.requestQueue.length === 0
    ) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const request = this.requestQueue.shift();
      this.activeRequests++;

      this.executeRequest(request).finally(() => {
        this.activeRequests--;
        this.processQueue();
      });
    }

    this.isProcessing = false;
  }

  /**
   * Execute individual request
   */
  async executeRequest(request) {
    const startTime = Date.now();

    try {
      const result = await request.execute();
      const responseTime = Date.now() - startTime;

      request.resolve(result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      request.reject(error);
      throw error;
    }
  }

  /**
   * Enhanced generate with production features
   */
  async generate(prompt, model, options = {}) {
    // Check service availability
    if (!this.isServiceAvailable()) {
      throw new Error("Ollama service is currently unavailable");
    }

    // Check rate limiting
    if (this.isRateLimited()) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    const selectedModel = model || this.currentModel;
    const cacheKey = this.generateCacheKey(selectedModel, prompt, options);

    // Check cache first
    const cachedResponse = this.getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log("📋 Cache hit for generate request");
      return cachedResponse;
    }

    // Add to request queue
    return this.enqueueRequest(async () => {
      this.requestTimestamps.push(Date.now());

      const startTime = Date.now();

      try {
        const optimizedPrompt = prompt.length > 4000 ? prompt.substring(0, 4000) + "..." : prompt;

        // Extract just the model name if it's an object
        const modelName =
          typeof selectedModel === "string"
            ? selectedModel
            : selectedModel.name || selectedModel.model || "deepseek-coder:6.7b";

        const requestData = JSON.stringify({
          model: modelName,
          prompt: optimizedPrompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.8,
            top_k: 40,
            num_predict: 500, // Changed from max_tokens to num_predict for Ollama API
            num_ctx: this.gpuConfig.ctx_size,
            num_thread: this.gpuConfig.num_thread,
            num_gpu: this.gpuConfig.num_gpu,
            main_gpu: this.gpuConfig.main_gpu,
            num_batch: this.gpuConfig.batch_size, // Ollama 0.22.0 batch processing
            num_keep: this.gpuConfig.num_keep, // Ollama 0.22.0 system prompt preservation
            f16_kv: this.gpuConfig.f16_kv,
            offload_kqv: this.gpuConfig.offload_kqv,
            use_mmap: this.gpuConfig.use_mmap,
            use_mlock: this.gpuConfig.use_mlock,
            repeat_penalty: this.gpuConfig.repeat_penalty,
            repeat_last_n: this.gpuConfig.repeat_last_n,
            // New in 0.22.0: thinking parameter for reasoning models
            thinking: options.thinking !== undefined ? options.thinking : this.gpuConfig.thinking,
            ...options,
          },
          keep_alive: "5m", // Keep model in memory for 5 minutes for faster subsequent requests
        });

        console.log("🔍 EnhancedOllama Request:", {
          url: `${this.baseUrl}/api/generate`,
          model: modelName,
          promptLength: optimizedPrompt.length,
          requestData: requestData,
        });

        const response = await new Promise((resolve, reject) => {
          const url = new URL(`${this.baseUrl}/api/generate`);
          const req = http.request(
            {
              hostname: url.hostname,
              port: url.port || 11434,
              path: url.pathname,
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(requestData),
              },
            },
            (res) => {
              let data = "";
              res.on("data", (chunk) => (data += chunk));
              res.on("end", () => {
                console.log("🔍 EnhancedOllama Response Status:", res.statusCode);
                if (res.statusCode === 200) {
                  try {
                    const result = JSON.parse(data);
                    console.log(
                      "🔍 EnhancedOllama Response Success:",
                      result.response ? result.response.substring(0, 100) + "..." : "No response"
                    );
                    resolve(result);
                  } catch (e) {
                    console.log("🔍 EnhancedOllama JSON Parse Error:", e.message);
                    reject(new Error(`Invalid JSON response: ${e.message}`));
                  }
                } else {
                  console.log("🔍 EnhancedOllama HTTP Error:", res.statusCode, res.statusMessage);
                  console.log("🔍 EnhancedOllama Response Body:", data);
                  reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
              });
            }
          );

          req.on("error", (error) => {
            console.log("🔍 EnhancedOllama Request Error:", error.message);
            reject(new Error(`Request failed: ${error.message}`));
          });

          req.on("timeout", () => {
            console.log("🔍 EnhancedOllama Request Timeout - increasing timeout and retrying");
            req.destroy();
            // Don't reject immediately, let the circuit breaker handle it
            reject(new Error("Request timeout"));
          });

          req.setTimeout(120000); // 120 second timeout for AI inference
          req.write(requestData);
          req.end();
        });

        const responseTime = Date.now() - startTime;

        // Cache the response
        this.cacheResponse(cacheKey, response);

        // Update metrics
        this.updateMetrics(true, responseTime, selectedModel);

        return response;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.updateMetrics(false, responseTime, selectedModel);
        throw error;
      }
    });
  }

  /**
   * Enhanced chat with production features
   */
  async chat(messages, model, context) {
    if (!this.isServiceAvailable()) {
      throw new Error("Ollama service is currently unavailable");
    }

    if (this.isRateLimited()) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    let selectedModel = model || this.currentModel;

    // Auto-select model based on content
    if (!model && messages.length > 0) {
      selectedModel = this.selectModelForContent(messages[messages.length - 1].content);
    }

    // Check for vision content
    const hasImages = messages.some((msg) => msg.images && msg.images.length > 0);
    if (hasImages) {
      const visionModels = this.getModelsByTask("vision");
      if (visionModels.length > 0) {
        selectedModel = visionModels[0].name;
        console.log(`👁️ Switching to vision model: ${selectedModel}`);
      }
    }

    return this.enqueueRequest(async () => {
      this.requestTimestamps.push(Date.now());
      const startTime = Date.now();

      try {
        const requestBody = {
          model: selectedModel,
          messages: messages.map((msg) => {
            const messageData = {
              role: msg.role,
              content: msg.content,
            };

            if (msg.images && msg.images.length > 0) {
              messageData.images = msg.images;
            }

            return messageData;
          }),
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: hasImages ? 1500 : 1000, // Ollama 0.22.0: use num_predict instead of max_tokens
            thinking: this.gpuConfig.thinking, // New in 0.22.0
          },
        };

        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const responseTime = Date.now() - startTime;

        // Parse Ollama 0.22.0 response format
        const parsedResult = this.parseOllamaResponse(result, selectedModel);

        this.updateMetrics(true, responseTime, selectedModel);

        return parsedResult;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.updateMetrics(false, responseTime, selectedModel);
        throw error;
      }
    }, "high"); // Chat requests get high priority
  }

  /**
   * Model selection methods (keeping existing logic)
   */
  async fetchModels() {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: "localhost",
            port: 11434,
            path: "/api/tags",
            method: "GET",
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              if (res.statusCode === 200) {
                try {
                  resolve(JSON.parse(data));
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(new Error(`HTTP ${res.statusCode}`));
              }
            });
          }
        );

        req.on("error", reject);
        req.end();
      });

      this.models = (response.models || []).map((model) => ({
        ...model,
        vision_capable: this.isVisionModel(model.name),
      }));
      return this.models;
    } catch (error) {
      console.error("Failed to fetch Ollama models:", error);
      return [];
    }
  }

  isVisionModel(modelName) {
    const visionModels = [
      "llava",
      "llava-next",
      "moondream",
      "cogvlm",
      "vision",
      "multimodal",
      "claude-3",
      "gpt-4-vision",
      "qwen-vl",
      "internvl",
      "kosmos",
    ];
    return visionModels.some((visionModel) => modelName.toLowerCase().includes(visionModel));
  }

  getModelsByTask(task) {
    // Ollama 0.21.2 quantization-aware model selection
    // Updated to match actual installed models with partial matching
    const codeModels = ["deepseek-coder", "qwen2.5-coder", "codegemma", "codellama"];
    // Prioritize Q4_K_M quantized models for best performance/quality balance
    const generalModels = [
      "phi4-mini",
      "gemma3",
      "qwen2.5",
      "qwen3.5",
      "mistral",
      "llama3",
      "llamusic",
    ];

    switch (task) {
      case "code":
        // Match models that contain code-related keywords
        return this.models.filter(
          (m) =>
            codeModels.some((cm) => m.name.includes(cm)) ||
            m.name.includes("coder") ||
            m.name.includes("code")
        );
      case "vision":
        return this.models.filter((m) => m.vision_capable);
      case "analysis":
        // Prioritize Q4_K_M quantized models for analysis (best VRAM efficiency)
        return this.models.filter(
          (m) =>
            m.name.includes("q4_k_m") ||
            generalModels.slice(0, 3).some((gm) => m.name.includes(gm)) ||
            m.details?.parameter_size?.includes("4") ||
            m.details?.parameter_size?.includes("3") ||
            m.details?.parameter_size?.includes("1")
        );
      case "general":
      default:
        return this.models.filter(
          (m) => generalModels.some((gm) => m.name.includes(gm)) || m.name.includes("q4_k_m")
        );
    }
  }

  selectModelForContent(content) {
    const lowerContent = content.toLowerCase();

    // Ollama 0.21.2: Prioritize Q4_K_M quantized models for best performance
    // Updated to use partial matching for actual installed models
    const fastestModels = ["phi4-mini", "gemma3", "llamusic"];
    const availableFastModels = this.models.filter(
      (m) => fastestModels.some((fm) => m.name.includes(fm)) || m.name.includes("q4_k_m")
    );

    if (availableFastModels.length > 0) {
      console.log(`⚡ Using optimized model: ${availableFastModels[0].name}`);
      return availableFastModels[0].name;
    }

    if (
      lowerContent.includes("code") ||
      lowerContent.includes("programming") ||
      lowerContent.includes("javascript") ||
      lowerContent.includes("python")
    ) {
      const codeModels = this.getModelsByTask("code");
      if (codeModels.length > 0) return codeModels[0].name;
    }

    if (
      lowerContent.includes("analysis") ||
      lowerContent.includes("data") ||
      lowerContent.includes("statistics") ||
      lowerContent.includes("files")
    ) {
      const analysisModels = this.getModelsByTask("analysis");
      if (analysisModels.length > 0) return analysisModels[0].name;
    }

    const generalModels = this.getModelsByTask("general");
    return generalModels.length > 0 ? generalModels[0].name : this.currentModel;
  }

  /**
   * Parse Ollama API 0.22.0 response format
   * Handles new fields: thinking, tool_calls, done_reason
   */
  parseOllamaResponse(result, selectedModel) {
    // Default parsed structure
    const parsed = {
      ...result,
      used_model: selectedModel,
      message: "",
      thinking: null,
      tool_calls: [],
      done_reason: null,
    };

    // API 0.22.0: New response format with message object
    if (result.message && typeof result.message === "object") {
      // API 0.22.0 format: message object with content, thinking, tool_calls
      parsed.message = result.message.content || "";
      parsed.thinking = result.message.thinking || null;
      parsed.tool_calls = result.message.tool_calls || [];
    } else if (result.response && typeof result.response === "string") {
      // Legacy /api/generate format
      parsed.message = result.response;
      parsed.thinking = result.thinking || null;
    } else if (result.content) {
      // Alternative format
      parsed.message = result.content;
      parsed.thinking = result.thinking || null;
    } else {
      // Unexpected format - stringify for debugging
      parsed.message = JSON.stringify(result);
      console.warn("Unexpected Ollama response format:", result);
    }

    // Add done_reason if present (new in 0.22.0)
    if (result.done_reason) {
      parsed.done_reason = result.done_reason;
    }

    return parsed;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log("🔄 Shutting down Enhanced Ollama Service...");

    // Wait for active requests to complete
    while (this.activeRequests > 0) {
      console.log(`Waiting for ${this.activeRequests} active requests to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Clear queue
    this.requestQueue.forEach((request) => {
      request.reject(new Error("Service shutting down"));
    });
    this.requestQueue = [];

    console.log("✅ Enhanced Ollama Service shutdown complete");
  }
  /**
   * Enhanced Model Selection with Query Classification
   */
  selectOptimalModel(query, analysisData) {
    if (!this.models.length) return this.currentModel;

    // Classify query intent
    const queryType = this.classifyQuery(query);
    const complexity = this.calculateQueryComplexity(query, analysisData);

    console.log(`🎯 Query type: ${queryType}, Complexity: ${complexity.toFixed(2)}`);

    // Model selection based on query type and complexity
    let bestModel = this.currentModel;
    let bestScore = -1;

    for (const modelInfo of this.models) {
      const model = modelInfo.name;
      const perf = this.learningService ? this.learningService.getPerformance(model) : null;
      
      let score = 0;

      // Query type matching
      switch (queryType) {
        case "code_analysis":
        case "technical":
          if (model.includes("coder") || model.includes("codegemma") || model.includes("qwen")) {
            score += 5;
          } else if (model.includes("gemma3")) {
            score += 2;
          }
          break;

        case "file_search":
        case "optimization":
          if (model.includes("gemma3")) {
            score += 4;
          } else if (model.includes("coder")) {
            score += 2;
          }
          break;

        case "general":
        default:
          if (model.includes("gemma3")) {
            score += 4;
          } else {
            score += 1;
          }
          break;
      }

      // Complexity bonus
      if (complexity > 0.7 && (model.includes("coder") || model.includes("qwen"))) {
        score += 2;
      }

      // Performance bonus
      if (perf && perf.successfulQueries > 0) {
        const successRate = perf.successfulQueries / perf.totalQueries;
        score += successRate * 2;
        if (perf.averageResponseTime < 5000) score += 1;
      }

      // Hardware wear reduction
      const timeSinceLastUse = perf?.lastUsed ? Date.now() - perf.lastUsed : Infinity;
      if (timeSinceLastUse > 300000) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    console.log(`🤖 Auto-selected model: ${bestModel} (score: ${bestScore.toFixed(2)})`);
    return bestModel;
  }

  classifyQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    const codeTerms = ["function", "class", "method", "code", "import", "dependency", "refactor", "algorithm", "complexity", "performance", "optimize"];
    if (codeTerms.some(term => lowerQuery.includes(term))) return "code_analysis";

    const searchTerms = ["find", "search", "locate", "where", "which files", "show me"];
    if (searchTerms.some(term => lowerQuery.includes(term))) return "file_search";

    const optimizeTerms = ["reduce", "save", "free up", "delete", "remove", "clean", "optimize"];
    if (optimizeTerms.some(term => lowerQuery.includes(term))) return "optimization";

    const techTerms = ["why", "how", "explain", "what is", "memory", "storage", "disk"];
    if (techTerms.some(term => lowerQuery.includes(term))) return "technical";

    return "general";
  }

  calculateQueryComplexity(query, analysisData) {
    let complexity = 0;
    const technicalTerms = ["optimize", "refactor", "performance", "memory", "storage", "dependencies", "complexity", "algorithm"];
    
    const words = query.toLowerCase().split(" ");
    complexity += words.length * 0.1;
    complexity += technicalTerms.filter(term => query.toLowerCase().includes(term)).length * 0.2;

    if (analysisData) {
      const fileCount = analysisData.totalFiles || 0;
      const sizeGB = (analysisData.totalSize || 0) / (1024 * 1024 * 1024);

      if (fileCount > 10000) complexity += 0.3;
      else if (fileCount > 1000) complexity += 0.2;
      
      if (sizeGB > 10) complexity += 0.3;
      else if (sizeGB > 1) complexity += 0.2;
    }

    return Math.min(complexity, 1.0);
  }
}

module.exports = EnhancedOllamaService;
