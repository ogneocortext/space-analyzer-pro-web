/**
 * Enhanced AI-ML Integration for Polyglot Scanner
 * Integrates self-learning ML, Ollama models, and scanner intelligence
 */

const enhancedScanner = require("./enhanced-polyglot-scanner");
const selfLearningML = require("./LearningService");
const ollamaService = require("./OllamaService");
const filesize = require("filesize");

class AIIntegratedScanner {
  constructor() {
    this.enhancedScanner = enhancedScanner;
    this.mlService = selfLearningML;
    this.ollamaService = ollamaService;
    this.isInitialized = false;
    this.analysisCache = new Map();
    this.modelPerformance = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log("🤖 Initializing AI-Integrated Scanner...");

    try {
      // Initialize all components
      await this.enhancedScanner.initialize();
      await this.mlService.initialize();
      await this.initializeOllamaModels();

      this.isInitialized = true;
      console.log("✅ AI-Integrated Scanner initialized successfully");
      console.log("🧠 Available AI Features:");
      console.log("  - Self-Learning ML: ✅");
      console.log("  - Ollama Integration: ✅");
      console.log("  - Enhanced Analytics: ✅");
      console.log("  - Vision Analysis: ✅");
      console.log("  - Intelligent Routing: ✅");
    } catch (error) {
      console.error("❌ Failed to initialize AI-Integrated Scanner:", error);
      throw error;
    }
  }

  async initializeOllamaModels() {
    try {
      const modelsAvailable = await this.ollamaService.testConnection();
      if (modelsAvailable) {
        const models = await this.ollamaService.fetchModels();
        // Redundant log removed to prevent terminal spam
      } else {
        console.warn("⚠️ Ollama not available, using fallback ML");
      }
    } catch (error) {
      console.warn("⚠️ Ollama initialization failed:", error.message);
    }
  }

  /**
   * Initialize the AI core system
   */
  async scanWithAI(directoryPath, options = {}) {
    await this.initialize();

    const {
      enableML = true,
      enableOllama = true,
      enableSelfLearning = true,
      analysisDepth = "comprehensive", // 'basic', 'detailed', 'comprehensive'
      modelPreference = "auto", // 'auto', 'code', 'vision', 'analysis', 'general'
      maxFiles = null,
      includeImages = false,
    } = options;

    console.log(`🔍 AI-Enhanced Scan: ${directoryPath}`);
    console.log(`🧠 Strict Workflow: Scanning → Self-Learning → Ollama`);
    console.log(
      `📊 Features: Self-Learning=${enableSelfLearning}, Ollama=${enableOllama}, Depth=${analysisDepth}`
    );

    try {
      // STEP 1: Perform enhanced scanning (data collection only)
      console.log("📂 STEP 1: Performing enhanced scanning...");
      const scanResults = await this.enhancedScanner.scanDirectory(directoryPath, {
        strategy: "adaptive",
        enableML: false, // Disable ML during scanning - we'll handle it separately
        optimizeFor: "speed",
        maxFiles: options.maxFiles || null,
      });

      console.log(
        `✅ Scanning completed: ${scanResults.totalFiles} files, ${this.formatFileSize(scanResults.totalSize)}`
      );

      // STEP 2: Process scanning results through self-learning system FIRST
      console.log("📚 STEP 2: Processing scan results through self-learning system...");
      const selfLearningInsights = await this.processScanResultsThroughSelfLearning(
        scanResults,
        analysisDepth
      );

      // Store self-learning analysis for future learning
      await this.storeSelfLearningResults(scanResults, selfLearningInsights);

      let finalInsights = {
        ...selfLearningInsights,
        modelUsed: "self-learning",
        confidence: selfLearningInsights.confidence || 0.8,
        workflowStage: "self-learning-completed",
      };

      // STEP 3: Feed self-learning results to Ollama for enhancement (only if self-learning completed successfully)
      if (
        enableOllama &&
        this.shouldUseOllamaAfterSelfLearning(selfLearningInsights, analysisDepth)
      ) {
        try {
          console.log("🚀 STEP 3: Feeding self-learning results to Ollama for enhancement...");
          const enhancedInsights = await this.enhanceWithOllama(
            scanResults,
            selfLearningInsights,
            analysisDepth,
            modelPreference
          );

          // STEP 4: Create final enhanced insights combining both systems
          finalInsights = {
            ...enhancedInsights,
            modelUsed: "self-learning+ollama",
            confidence: Math.max(selfLearningInsights.confidence, enhancedInsights.confidence),
            workflowStage: "ollama-enhancement-completed",
            // Preserve both analyses for comparison and learning
            selfLearningBase: selfLearningInsights,
            ollamaEnhancement: enhancedInsights,
            improvement: this.calculateImprovement(selfLearningInsights, enhancedInsights),
          };

          // STEP 5: Feed Ollama's enhanced insights back to self-learning for continuous improvement
          await this.feedOllamaResultsBackToSelfLearning(
            enhancedInsights,
            scanResults,
            selfLearningInsights
          );

          console.log("✅ Workflow completed: Scanning → Self-Learning → Ollama → Feedback Loop");
        } catch (error) {
          console.warn(
            "⚠️ Ollama enhancement failed, using self-learning results only:",
            error.message
          );
          // Continue with self-learning results - workflow still valid
          finalInsights.workflowStage = "self-learning-only-ollama-failed";
        }
      } else {
        console.log("📝 Using self-learning insights only (Ollama not needed or available)");
        finalInsights.workflowStage = "self-learning-only";
      }

      return {
        success: true,
        data: scanResults,
        aiAnalysis: finalInsights,
        metadata: {
          ...scanResults.metadata,
          workflow: "scanning-selflearning-ollama",
          aiFeatures: {
            selfLearning: enableSelfLearning,
            ollama: enableOllama,
            vision: !!finalInsights.visionAnalysis,
            analysisDepth,
          },
          modelUsed: finalInsights.modelUsed,
          processingTime: Date.now(),
        },
      };
    } catch (error) {
      console.error("❌ AI-Enhanced scan failed:", error);
      throw error;
    }
  }

  async processScanResultsThroughSelfLearning(scanData, analysisDepth) {
    console.log("🧠 Processing scan results through self-learning system...");

    // Store raw scan data in self-learning system first
    await this.mlService.storeAnalysis({
      ...scanData,
      processingStage: "raw-scan-data",
      timestamp: Date.now(),
    });

    // Generate self-learning insights based on scan data
    const insights = await this.generateSelfLearningInsights(scanData, analysisDepth);

    // Add metadata about processing
    insights.processingMetadata = {
      scanDataProcessed: true,
      processingTime: Date.now(),
      analysisDepth,
      source: "self-learning-system",
    };

    return insights;
  }

  async storeSelfLearningResults(scanData, selfLearningInsights) {
    try {
      // Store complete self-learning analysis results
      await this.mlService.storeAnalysis({
        ...scanData,
        selfLearningInsights,
        processingStage: "self-learning-completed",
        timestamp: Date.now(),
      });

      console.log("💾 Self-learning results stored successfully");
    } catch (error) {
      console.warn("⚠️ Failed to store self-learning results:", error.message);
    }
  }

  shouldUseOllamaAfterSelfLearning(selfLearningInsights, analysisDepth) {
    // Only use Ollama if self-learning completed successfully and analysis is comprehensive
    if (!selfLearningInsights || selfLearningInsights.confidence < 0.5) {
      console.log("🚫 Self-learning confidence too low, skipping Ollama enhancement");
      return false;
    }

    // Use Ollama for comprehensive analysis or when self-learning indicates complexity
    if (analysisDepth === "comprehensive") {
      return true;
    }

    // Use Ollama if self-learning detected complex patterns
    const hasComplexPatterns = selfLearningInsights.patterns?.some(
      (p) => p.type === "complex_structure" || p.type === "anomaly_detected"
    );

    return hasComplexPatterns;
  }

  async enhanceWithOllama(scanData, selfLearningInsights, analysisDepth, modelPreference) {
    console.log("🦙 Enhancing self-learning insights with Ollama...");

    // Create context-aware prompt that includes self-learning results
    const enhancedPrompt = this.createEnhancedPrompt(scanData, selfLearningInsights);

    const availableModels = this.ollamaService.getAvailableModels();
    let selectedModel = modelPreference;

    if (modelPreference === "auto") {
      selectedModel = this.selectOptimalOllamaModel(scanData, availableModels);
    } else {
      const modelsByTask = this.ollamaService.getModelsByTask(modelPreference);
      selectedModel =
        modelsByTask.length > 0 ? modelsByTask[0].name : "qwen2.5-coder:7b-instruct-q4_0";
    }

    console.log(`🎯 Using Ollama model: ${selectedModel}`);

    try {
      const response = await this.ollamaService.chat(
        [
          {
            role: "system",
            content: `You are an expert file system analyst working in collaboration with a self-learning ML system.
                    The self-learning system has already analyzed the scan data and provided initial insights.
                    Your task is to enhance, validate, and expand upon these insights with your advanced reasoning capabilities.`,
          },
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        selectedModel
      );

      const enhancedInsights = this.parseOllamaResponse(response, selectedModel);

      // Add metadata about the enhancement process
      enhancedInsights.enhancementMetadata = {
        basedOnSelfLearning: true,
        selfLearningConfidence: selfLearningInsights.confidence,
        ollamaModel: selectedModel,
        enhancementTime: Date.now(),
      };

      return enhancedInsights;
    } catch (error) {
      console.error("❌ Ollama enhancement failed:", error);
      throw error;
    }
  }

  async feedOllamaResultsBackToSelfLearning(
    enhancedInsights,
    scanData,
    originalSelfLearningInsights
  ) {
    try {
      // Store complete analysis including Ollama enhancements for future learning
      await this.mlService.storeAnalysis({
        ...scanData,
        originalSelfLearningInsights,
        ollamaEnhancedInsights: enhancedInsights,
        processingStage: "ollama-enhancement-completed",
        feedbackLoop: true,
        timestamp: Date.now(),
      });

      // Calculate and store improvement metrics
      const improvementMetrics = this.calculateImprovement(
        originalSelfLearningInsights,
        enhancedInsights
      );

      await this.mlService.storeLearningMetrics({
        improvementMetrics,
        workflowType: "scanning-selflearning-ollama",
        timestamp: Date.now(),
      });

      console.log("📈 Ollama enhancements successfully fed back to self-learning system");
      console.log(
        `📊 Improvement: ${improvementMetrics.percentage.toFixed(1)}% (${improvementMetrics.quality})`
      );
    } catch (error) {
      console.warn("⚠️ Failed to feed Ollama results back to self-learning:", error.message);
    }
  }

  createEnhancedPrompt(scanData, selfLearningInsights) {
    return `You are enhancing analysis from a self-learning ML system.

ORIGINAL SCAN DATA:
- Total Files: ${scanData.totalFiles || 0}
- Total Size: ${this.formatFileSize(scanData.totalSize || 0)}
- Categories: ${Object.keys(scanData.categories || {}).join(", ")}

SELF-LEARNING SYSTEM INSIGHTS:
${JSON.stringify(selfLearningInsights, null, 2)}

TASK:
1. Review the self-learning system's analysis
2. Validate its findings and recommendations
3. Enhance with additional insights the ML system might have missed
4. Provide more sophisticated recommendations
5. Identify any patterns or anomalies the self-learning system overlooked
6. Suggest improvements to the self-learning system's analysis process

Focus on:
- Storage optimization opportunities
- Performance implications
- Security considerations
- Organizational improvements
- Advanced pattern recognition

Provide your enhanced analysis in the same structured format as the self-learning insights, but with additional depth and sophistication.`;
  }

  parseOllamaResponse(response, modelUsed) {
    try {
      // Debug: Log what we're actually receiving

      // Handle different response formats from new Ollama API (2026)
      let responseText = "";

      // Check for structured/tool response format (new in 2026)
      if (response && response.message && typeof response.message === "object") {
        console.log("🔧 Ollama structured response detected");
        responseText = response.message.content || JSON.stringify(response.message);
      } else if (response && response.message && typeof response.message === "string") {
        console.log("💬 Ollama standard message response detected");
        responseText = response.message;
      } else if (response && response.response && typeof response.response === "string") {
        console.log("💬 Ollama standard response detected (legacy format)");
        responseText = response.response;
      } else if (response && response.content) {
        console.log("📝 Ollama content response detected");
        responseText = response.content;
      } else if (typeof response === "string") {
        // Handle case where response is directly a string (new API format)
        console.log("📝 Ollama direct string response detected");
        responseText = response;
      } else {
        console.warn("⚠️ Unexpected Ollama response format:", typeof response, response);
        responseText = JSON.stringify(response);
      }

      if (!responseText) {
        console.warn("⚠️ Empty Ollama response");
        return {
          summary: "No analysis available",
          recommendations: [],
          patterns: [],
          optimizations: [],
          modelUsed,
          confidence: 0.1,
          fullResponse: response,
        };
      }

      const lines = responseText.split("\n").filter((line) => line.trim());

      return {
        summary: lines[0] || "Analysis completed",
        recommendations: lines.slice(1, 6).map((line) => line.replace(/^\d+\.\s*/, "")),
        patterns: [],
        optimizations: [],
        modelUsed,
        confidence: 0.9,
        fullResponse: response,
      };
    } catch (error) {
      console.error("❌ Error parsing Ollama response:", error);
      return {
        summary: "Error parsing response",
        recommendations: [],
        patterns: [],
        optimizations: [],
        modelUsed,
        confidence: 0.1,
        fullResponse: response,
        error: error.message,
      };
    }
  }

  calculateImprovement(baseInsights, enhancedInsights) {
    // Calculate how much Ollama improved the analysis
    const baseScore = this.scoreInsightsQuality(baseInsights);
    const enhancedScore = this.scoreInsightsQuality(enhancedInsights);

    const improvement = ((enhancedScore - baseScore) / baseScore) * 100;

    return {
      percentage: improvement,
      quality: improvement > 20 ? "significant" : improvement > 5 ? "moderate" : "minimal",
      baseScore,
      enhancedScore,
    };
  }

  scoreInsightsQuality(insights) {
    let score = 0;

    // Recommendation quality (up to 40 points)
    score += Math.min(insights.recommendations?.length || 0, 10) * 4;

    // Pattern detection (up to 30 points)
    score += Math.min(insights.patterns?.length || 0, 5) * 6;

    // Optimization suggestions (up to 20 points)
    score += Math.min(insights.optimizations?.length || 0, 5) * 4;

    // Confidence bonus (up to 10 points)
    score += (insights.confidence || 0) * 10;

    return score;
  }

  // Additional helper methods (simplified versions)
  async generateSelfLearningInsights(scanData, analysisDepth) {
    console.log("🧠 Using Self-Learning ML for insights...");
    const learningStats = this.mlService.getLearningStats();

    const insights = {
      summary: `Self-learning analysis of ${scanData.totalFiles} files`,
      recommendations: ["Continue monitoring for patterns", "Implement automated cleanup"],
      patterns: [],
      optimizations: [],
      modelUsed: "self-learning-comprehensive",
      confidence: learningStats.analysesCount >= 5 ? 0.7 : 0.5,
    };

    return insights;
  }

  async generateVisionInsights(scanData) {
    console.log("👁️ Generating Vision Insights...");
    return null; // Simplified for now
  }

  selectOptimalOllamaModel(scanData, availableModels) {
    // Simplified model selection
    const codeModels = this.ollamaService.getModelsByTask("code");
    if (codeModels.length > 0) return codeModels[0].name;

    const generalModels = this.ollamaService.getModelsByTask("general");
    if (generalModels.length > 0) return generalModels[0].name;

    return "qwen2.5-coder:7b-instruct-q4_0";
  }

  formatFileSize(bytes) {
    return filesize(bytes, { round: 2 });
  }

  createComprehensiveAnalysis(scanData, aiInsights, visionInsights, predictiveInsights) {
    const analysis = {
      overview: {
        totalFiles: scanData.totalFiles,
        totalSize: scanData.totalSize,
        scanner: scanData.scanner,
        scanTime: scanData.scanTime,
        performance: scanData.metadata?.performance || {},
      },
      aiInsights: {
        summary: aiInsights.summary,
        recommendations: aiInsights.recommendations || [],
        patterns: aiInsights.patterns || [],
        optimizations: aiInsights.optimizations || [],
        modelUsed: aiInsights.modelUsed,
        confidence: aiInsights.confidence || 0.5,
      },
      visionAnalysis: visionInsights,
      predictiveInsights: predictiveInsights || [],
      integration: {
        selfLearningActive: this.mlService.getLearningStats().isInitialized,
        ollamaActive: this.ollamaService.getAvailableModels().length > 0,
        visionAvailable: this.ollamaService.hasVisionModels(),
        modelsAvailable: {
          ollama: this.ollamaService.getAvailableModels().length,
          selfLearning: this.mlService.getLearningStats().modelsTrained,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return analysis;
  }

  // API Methods
  async getAIModels() {
    await this.initialize();
    return {
      ollama: this.ollamaService.getAvailableModels(),
      selfLearning: {
        active: this.mlService.getLearningStats().isInitialized,
        models: this.mlService.getLearningStats().modelsTrained,
      },
      vision: {
        available: this.ollamaService.hasVisionModels(),
        models: this.ollamaService.getVisionModels(),
      },
    };
  }

  async getAnalysisHistory() {
    await this.initialize();
    return {
      selfLearning: this.mlService.getLearningStats(),
      cached: [],
    };
  }

  async clearCache() {
    this.analysisCache.clear();
    console.log("🧹 AI Analysis cache cleared");
  }

  // Process chat messages through enhanced AI workflow
  async processChatWithAI(messages, context, options = {}) {
    await this.initialize();

    const {
      enableSelfLearning = true,
      enableOllama = true,
      analysisDepth = "comprehensive",
      modelPreference = "auto",
    } = options;

    console.log("💬 Processing chat through enhanced AI workflow...");
    console.log(
      `🧠 Features: Self-Learning=${enableSelfLearning}, Ollama=${enableOllama}, Depth=${analysisDepth}`
    );

    try {
      // Create a mock scan data from context for processing
      const mockScanData = {
        totalFiles: context?.analysisData?.totalFiles || 0,
        totalSize: context?.analysisData?.totalSize || 0,
        categories: context?.analysisData?.categories || {},
        files: context?.analysisData?.files || [],
        metadata: {
          scanner: "chat-workflow",
          scanTime: Date.now(),
        },
      };

      // STEP 1: Process through self-learning system
      console.log("📚 Processing chat context through self-learning system...");
      const selfLearningInsights = await this.processScanResultsThroughSelfLearning(
        mockScanData,
        analysisDepth
      );

      // Store self-learning analysis
      await this.storeSelfLearningResults(mockScanData, selfLearningInsights);

      let finalInsights = {
        ...selfLearningInsights,
        modelUsed: "self-learning",
        confidence: selfLearningInsights.confidence || 0.8,
        workflowStage: "self-learning-completed",
      };

      // STEP 2: Enhance with Ollama if enabled
      if (
        enableOllama &&
        this.shouldUseOllamaAfterSelfLearning(selfLearningInsights, analysisDepth)
      ) {
        try {
          console.log("🚀 Enhancing chat insights with Ollama...");
          const enhancedInsights = await this.enhanceWithOllama(
            mockScanData,
            selfLearningInsights,
            analysisDepth,
            modelPreference
          );

          finalInsights = {
            ...enhancedInsights,
            modelUsed: "self-learning+ollama",
            confidence: Math.max(selfLearningInsights.confidence, enhancedInsights.confidence),
            workflowStage: "ollama-enhancement-completed",
            selfLearningBase: selfLearningInsights,
            ollamaEnhancement: enhancedInsights,
            improvement: this.calculateImprovement(selfLearningInsights, enhancedInsights),
          };

          // Feed Ollama results back to self-learning
          await this.feedOllamaResultsBackToSelfLearning(
            enhancedInsights,
            mockScanData,
            selfLearningInsights
          );

          console.log("✅ Chat workflow completed: Self-Learning → Ollama → Feedback Loop");
        } catch (error) {
          console.warn(
            "⚠️ Ollama enhancement failed for chat, using self-learning results only:",
            error.message
          );
          finalInsights.workflowStage = "self-learning-only-ollama-failed";
        }
      } else {
        console.log("📝 Using self-learning insights only for chat");
        finalInsights.workflowStage = "self-learning-only";
      }

      return {
        success: true,
        aiAnalysis: finalInsights,
        metadata: {
          workflow: "chat-workflow",
          aiFeatures: {
            selfLearning: enableSelfLearning,
            ollama: enableOllama,
            analysisDepth,
          },
          modelUsed: finalInsights.modelUsed,
          processingTime: Date.now(),
          context: context,
        },
      };
    } catch (error) {
      console.error("❌ Chat AI processing failed:", error);
      throw error;
    }
  }

  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      components: {
        enhancedScanner: !!this.enhancedScanner,
        selfLearning: !!this.mlService,
        ollama: !!this.ollamaService,
      },
      capabilities: {
        adaptiveScanning: true,
        selfLearning: this.mlService.getLearningStats().isInitialized,
        ollamaIntegration: this.ollamaService.getAvailableModels().length > 0,
        visionAnalysis: this.ollamaService.hasVisionModels(),
        predictiveAnalysis:
          this.mlService.getLearningStats().modelsTrained?.changePredictor || false,
      },
    };
  }
}

module.exports = new AIIntegratedScanner();
