/**
 * AI Models Routes Module
 * Handles AI model detection, Q&A, management, and purpose identification
 */

const express = require("express");

class AIModelsRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Detect AI models in analysis
    this.router.get("/ai-models/:analysisId", async (req, res) => {
      try {
        const { analysisId } = req.params;

        // Get analysis results
        const analysis = this.server?.analysisResults?.get(analysisId);
        if (!analysis && !analysis?.files) {
          return res.status(404).json({
            success: false,
            error: "Analysis not found",
          });
        }

        // Detect AI/ML model files
        const aiModels = this.detectAIModels(analysis.files);

        res.json({
          success: true,
          analysisId,
          aiModels,
          count: aiModels.length,
        });
      } catch (error) {
        console.error("AI models detection error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // AI Model Q&A
    this.router.post("/ai-models/qa", async (req, res) => {
      try {
        const { question, directory, analysisId } = req.body;

        if (!question) {
          return res.status(400).json({
            success: false,
            error: "Question is required",
          });
        }

        // Generate Q&A response
        const response = await this.answerQuestion(question, directory, analysisId);

        res.json({
          success: true,
          question,
          answer: response.answer,
          suggestions: response.suggestions,
          relatedFiles: response.relatedFiles,
        });
      } catch (error) {
        console.error("AI models QA error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // AI Model management recommendations
    this.router.get("/ai-models/manage/:analysisId", async (req, res) => {
      try {
        const { analysisId } = req.params;
        const { action } = req.query;

        const analysis = this.server?.analysisResults?.get(analysisId);
        if (!analysis) {
          return res.status(404).json({
            success: false,
            error: "Analysis not found",
          });
        }

        const aiModels = this.detectAIModels(analysis.files);
        const management = this.generateManagementRecommendations(aiModels, action);

        res.json({
          success: true,
          analysisId,
          action: action || "general",
          recommendations: management,
        });
      } catch (error) {
        console.error("AI models management error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // AI Model purpose identification
    this.router.get("/ai-models/purpose/:analysisId", async (req, res) => {
      try {
        const { analysisId } = req.params;

        const analysis = this.server?.analysisResults?.get(analysisId);
        if (!analysis) {
          return res.status(404).json({
            success: false,
            error: "Analysis not found",
          });
        }

        const aiModels = this.detectAIModels(analysis.files);
        const purposes = this.identifyPurposes(aiModels);

        res.json({
          success: true,
          analysisId,
          purposes,
        });
      } catch (error) {
        console.error("AI models purpose error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  }

  detectAIModels(files) {
    const modelExtensions = {
      "safetensors": { type: "HuggingFace", format: "SafeTensors" },
      "pt": { type: "PyTorch", format: "Torch Model" },
      "pth": { type: "PyTorch", format: "Torch Model" },
      "ckpt": { type: "Checkpoint", format: "Model Checkpoint" },
      "pkl": { type: "Pickle", format: "Pickled Model" },
      "h5": { type: "Keras", format: "HDF5 Model" },
      "pb": { type: "TensorFlow", format: "Protocol Buffer" },
      "onnx": { type: "ONNX", format: "Open Neural Network" },
      "tflite": { type: "TensorFlow Lite", format: "Mobile Model" },
      "gguf": { type: "GGUF", format: "GGML Format" },
      "bin": { type: "Binary", format: "Binary Model" },
      "mlmodel": { type: "CoreML", format: "Apple ML Model" },
    };

    const models = [];

    for (const file of files) {
      const ext = (file.extension || "").toLowerCase().replace(".", "");
      if (modelExtensions[ext]) {
        models.push({
          name: file.name,
          path: file.path,
          size: file.size,
          type: modelExtensions[ext].type,
          format: modelExtensions[ext].format,
          extension: ext,
        });
      }
    }

    return models;
  }

  async answerQuestion(question, directory, analysisId) {
    const lowerQuestion = question.toLowerCase();
    
    // Get analysis if available
    let analysis = null;
    let aiModels = [];
    
    if (analysisId && this.server?.analysisResults?.has(analysisId)) {
      analysis = this.server.analysisResults.get(analysisId);
      aiModels = this.detectAIModels(analysis.files || []);
    }

    // Generate answer based on question type
    let answer = "";
    let suggestions = [];
    let relatedFiles = [];

    if (lowerQuestion.includes("model") || lowerQuestion.includes("ai")) {
      if (aiModels.length > 0) {
        answer = `I found ${aiModels.length} AI model(s) in this directory. ` +
          `The models are: ${aiModels.map(m => m.name).join(", ")}. ` +
          `Types include: ${[...new Set(aiModels.map(m => m.type))].join(", ")}.`;
        
        suggestions = [
          "View model details",
          "Check model compatibility",
          "Convert models to optimized format",
          "Backup model files",
        ];
        relatedFiles = aiModels.map(m => ({ name: m.name, path: m.path, type: "model" }));
      } else {
        answer = "No AI model files were detected in this directory. " +
          "Common model extensions include: .pt, .pth, .safetensors, .onnx, .h5, .gguf";
        
        suggestions = [
          "Search for models in subdirectories",
          "Scan for hidden model files",
          "Check related project directories",
        ];
      }
    } else if (lowerQuestion.includes("size") || lowerQuestion.includes("storage")) {
      if (analysis) {
        const totalSize = analysis.totalSize || analysis.summary?.total_size || 0;
        answer = `The total storage used is ${this.formatBytes(totalSize)}. `;
        
        if (aiModels.length > 0) {
          const modelSize = aiModels.reduce((sum, m) => sum + (m.size || 0), 0);
          answer += `AI models occupy ${this.formatBytes(modelSize)} (${(modelSize / totalSize * 100).toFixed(1)}% of total).`;
        }
        
        suggestions = [
          "View storage breakdown",
          "Identify large files",
          "Find duplicate files",
          "Optimize storage",
        ];
      }
    } else if (lowerQuestion.includes("optimize") || lowerQuestion.includes("compress")) {
      answer = "For AI models, you can optimize storage by:\n" +
        "1. Converting to quantization formats (INT8, FP16)\n" +
        "2. Using GGUF for local LLMs\n" +
        "3. Removing unused checkpoints\n" +
        "4. Compressing with safetensors format";
      
      suggestions = [
        "Convert to quantized format",
        "Use safetensors instead of pickle",
        "Remove old checkpoints",
        "Archive unused models",
      ];
    } else {
      answer = "I can help you analyze AI models, storage usage, and optimization opportunities. " +
        "Try asking about:\n" +
        "- What AI models are in this directory?\n" +
        "- How much storage is being used?\n" +
        "- How can I optimize these models?\n" +
        "- Which models can be safely removed?";
      
      suggestions = [
        "Show me the AI models",
        "Check storage usage",
        "Optimize models",
        "Find cleanup opportunities",
      ];
    }

    return { answer, suggestions, relatedFiles };
  }

  generateManagementRecommendations(aiModels, action) {
    const recommendations = [];

    if (aiModels.length === 0) {
      return [{
        type: "info",
        message: "No AI models found in this directory",
        priority: "low",
      }];
    }

    // Group by type
    const byType = {};
    for (const model of aiModels) {
      if (!byType[model.type]) byType[model.type] = [];
      byType[model.type].push(model);
    }

    if (action === "optimize" || action === "all") {
      // Check for optimization opportunities
      const pickleModels = aiModels.filter(m => m.extension === "pkl" || m.extension === "pickle");
      if (pickleModels.length > 0) {
        recommendations.push({
          type: "optimization",
          message: `${pickleModels.length} pickle model(s) found. Consider converting to safetensors for better security and performance.`,
          priority: "high",
          potentialSavings: pickleModels.reduce((sum, m) => sum + (m.size || 0) * 0.1, 0),
          files: pickleModels.map(m => m.path),
        });
      }

      const fp32Models = aiModels.filter(m => m.extension === "pt" || m.extension === "pth");
      if (fp32Models.length > 0) {
        recommendations.push({
          type: "optimization",
          message: `${fp32Models.length} PyTorch model(s) could be quantized to FP16 or INT8 for 50% storage savings.`,
          priority: "medium",
          potentialSavings: fp32Models.reduce((sum, m) => sum + (m.size || 0) * 0.5, 0),
          files: fp32Models.map(m => m.path),
        });
      }
    }

    if (action === "cleanup" || action === "all") {
      // Check for old checkpoints
      const checkpoints = aiModels.filter(m => m.name.includes("checkpoint") || m.name.includes("epoch"));
      if (checkpoints.length > 3) {
        recommendations.push({
          type: "cleanup",
          message: `${checkpoints.length} training checkpoints found. Consider keeping only the latest 2-3 checkpoints.`,
          priority: "medium",
          potentialSavings: checkpoints.slice(0, -3).reduce((sum, m) => sum + (m.size || 0), 0),
          files: checkpoints.slice(0, -3).map(m => m.path),
        });
      }
    }

    if (action === "backup" || action === "all") {
      recommendations.push({
        type: "backup",
        message: `Consider backing up ${aiModels.length} AI model(s) to external storage or cloud.`,
        priority: "low",
        files: aiModels.map(m => m.path),
      });
    }

    return recommendations;
  }

  identifyPurposes(aiModels) {
    const purposes = [];

    // Check for common patterns
    const hasLLM = aiModels.some(m => 
      m.name.toLowerCase().includes("llm") || 
      m.name.toLowerCase().includes("gpt") ||
      m.name.toLowerCase().includes("bert") ||
      m.extension === "gguf"
    );

    const hasVision = aiModels.some(m => 
      m.name.toLowerCase().includes("vision") || 
      m.name.toLowerCase().includes("image") ||
      m.name.toLowerCase().includes("clip") ||
      m.name.toLowerCase().includes("resnet")
    );

    const hasAudio = aiModels.some(m => 
      m.name.toLowerCase().includes("audio") || 
      m.name.toLowerCase().includes("speech") ||
      m.name.toLowerCase().includes("whisper")
    );

    const hasNLP = aiModels.some(m => 
      m.name.toLowerCase().includes("nlp") || 
      m.name.toLowerCase().includes("embed") ||
      m.name.toLowerCase().includes("token")
    );

    if (hasLLM) {
      purposes.push({
        type: "llm",
        description: "Large Language Models for text generation and understanding",
        models: aiModels.filter(m => m.extension === "gguf" || m.name.toLowerCase().includes("llm")).map(m => m.name),
      });
    }

    if (hasVision) {
      purposes.push({
        type: "computer_vision",
        description: "Image and video processing models",
        models: aiModels.filter(m => m.name.toLowerCase().includes("vision") || m.name.toLowerCase().includes("image")).map(m => m.name),
      });
    }

    if (hasAudio) {
      purposes.push({
        type: "audio",
        description: "Speech recognition and audio processing",
        models: aiModels.filter(m => m.name.toLowerCase().includes("audio") || m.name.toLowerCase().includes("speech")).map(m => m.name),
      });
    }

    if (hasNLP) {
      purposes.push({
        type: "nlp",
        description: "Natural language processing and embeddings",
        models: aiModels.filter(m => m.name.toLowerCase().includes("nlp") || m.name.toLowerCase().includes("embed")).map(m => m.name),
      });
    }

    if (purposes.length === 0) {
      purposes.push({
        type: "general",
        description: "General purpose machine learning models",
        models: aiModels.map(m => m.name),
      });
    }

    return purposes;
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  getRouter() {
    return this.router;
  }
}

module.exports = AIModelsRoutes;
