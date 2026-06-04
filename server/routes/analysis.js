/**
 * Analysis Routes Module - Fixed Version
 * Handles directory scanning, analysis management, and progress tracking
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");
const AnalysisController = require("../controllers/AnalysisController");
const ValidationMiddleware = require("../middleware/validation");

class AnalysisRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    // Initialize simple logger
    this.logger = {
      info: (message) => console.log(`[ANALYSIS] ${message}`),
      error: (message) => console.error(`[ANALYSIS] ${message}`),
      warn: (message) => console.warn(`[ANALYSIS] ${message}`),
      debug: (message) => console.debug(`[ANALYSIS] ${message}`),
    };
    // Use shared controller instance from server to avoid multiple instances
    this.analysisController =
      server.analysisController || new AnalysisController(server);
    if (!server.analysisController) {
      server.analysisController = this.analysisController;
    }
    this.logger.info("AnalysisRoutes initialized [v2.8.2-fixed]");
    this.setupRoutes();
  }

  getRouter() {
    return this.router;
  }

  // Main analysis logic for directory scanning with progress tracking
  async startAnalysisLogic(req, res, directoryPath) {
    try {
      // Generate human-readable analysis ID
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const suffix = Math.random().toString(36).substr(2, 4);
      const analysisId = `analysis-${timestamp}-${suffix}`;

      // Initialize analysis tracking
      if (!this.server.activeAnalyses) {
        this.server.activeAnalyses = new Map();
      }

      // Start user-friendly scan tracking
      this.logger.startScan(analysisId, directoryPath, req.body.options || {});

      // Create analysis entry
      const analysisEntry = {
        analysisId,
        directoryPath,
        status: "running",
        progress: 0,
        currentFile: "Starting scan...",
        filesScanned: 0,
        startTime: Date.now(),
        endTime: null,
        error: null,
        process: null,
      };

      this.server.activeAnalyses.set(analysisId, analysisEntry);

      // Start periodic progress updates while scanner runs
      this.startProgressPolling(analysisId, analysisEntry);

      // Generate unique temp file name using UUID to prevent collisions
      const tempFileName = `temp_analysis_${crypto.randomUUID()}.json`;
      analysisEntry.tempFileName = tempFileName;

      // Use native Node.js scanner module with proper path resolution
      try {
        const nativeScannerPath = path.join(
          __dirname,
          "..",
          "..",
          "native",
          "scanner",
          "index.node",
        );
        let SpaceAnalyzer;
        if (fs.existsSync(nativeScannerPath)) {
          SpaceAnalyzer = require(nativeScannerPath);
        } else {
          throw new Error(`Native scanner not found at: ${nativeScannerPath}`);
        }
        const scanner = new SpaceAnalyzer();

        // Start analysis with native scanner
        this.startNativeAnalysis(
          analysisId,
          analysisEntry,
          scanner,
          directoryPath,
          tempFileName,
        );

        // Return immediate success response
        return res.json({
          success: true,
          analysisId,
          message: "Analysis started successfully",
          directoryPath,
        });
      } catch (scannerError) {
        this.logger.warn(
          "Native scanner not available, using basic scan",
          scannerError.message,
        );

        // Fallback to basic directory scanning
        this.startBasicAnalysis(
          analysisId,
          analysisEntry,
          directoryPath,
          tempFileName,
        );

        return res.json({
          success: true,
          analysisId,
          message: "Analysis started with basic scanner",
          directoryPath,
        });
      }
    } catch (error) {
      this.logger.error("Failed to start scanner", error.message);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to start scanner",
      });
    }
  }

  /**
   * Start analysis using native Node.js scanner module
   */
  startNativeAnalysis(
    analysisId,
    analysisEntry,
    scanner,
    directoryPath,
    tempFileName,
  ) {
    try {
      // Start analysis in background
      const analysisPromise = scanner.analyzeDirectory(directoryPath, {
        maxFiles: 5000,
        includeHidden: false,
        followSymlinks: false,
        onProgress: (progress) => {
          // Update analysis entry with progress
          analysisEntry.progress = progress.percentage || 0;
          analysisEntry.currentFile = progress.currentFile || "Scanning...";
          analysisEntry.filesScanned = progress.files || 0;

          // Store progress for frontend polling
          this.server.activeAnalyses.set(analysisId, analysisEntry);

          // Update user-friendly progress
          this.logger.updateProgress(
            analysisId,
            progress.files || 0,
            5000,
            progress.currentFile || "Scanning...",
          );
        },
      });

      // Handle analysis completion
      analysisPromise
        .then(async (result) => {
          this.logger.completeScan(analysisId, result);

          // Save results to temp file
          const outputPath = path.join(__dirname, "../../temp", tempFileName);
          fs.writeFileSync(
            outputPath,
            JSON.stringify(
              {
                success: true,
                result: this.formatNativeResult(result),
                analysisId,
              },
              null,
              2,
            ),
          );

          // Update analysis entry
          analysisEntry.status = "completed";
          analysisEntry.endTime = Date.now();
          analysisEntry.result = result;
          analysisEntry.filesScanned =
            result.total_files || result.files?.length || 0;
          analysisEntry.progress = 100;
          this.server.activeAnalyses.set(analysisId, analysisEntry);

          // Also store in analysisResults for history
          if (this.server.analysisResults) {
            this.server.analysisResults.set(analysisId, {
              ...result,
              analysisId,
              directoryPath: analysisEntry.directoryPath,
              status: "complete",
              completedAt: Date.now(),
              startTime: analysisEntry.startTime,
              filesScanned: analysisEntry.filesScanned,
            });
          }

          // Save to database for persistence
          if (this.server?.knowledgeDB?.analysis?.storeAnalysis) {
            try {
              await this.server.knowledgeDB.analysis.storeAnalysis(
                analysisEntry.directoryPath,
                this.formatNativeResult(result),
              );
              console.log("✅ Analysis saved to database:", analysisId);
            } catch (dbError) {
              console.warn(
                "⚠️ Failed to save analysis to database:",
                dbError.message,
              );
            }
          }
        })
        .catch((error) => {
          this.logger.scanError(analysisId, error);

          analysisEntry.status = "error";
          analysisEntry.error = error.message;
          analysisEntry.endTime = Date.now();
          this.server.activeAnalyses.set(analysisId, analysisEntry);
        });
    } catch (error) {
      this.logger.error("Failed to start native analysis", error.message);
      throw error;
    }
  }

  /**
   * Fallback basic analysis using Node.js fs
   */
  startBasicAnalysis(analysisId, analysisEntry, directoryPath, tempFileName) {
    try {
      // Basic analysis started - no verbose logging needed

      // Basic directory scanning
      const scanDirectory = (dirPath, files = []) => {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            scanDirectory(fullPath, files);
          } else {
            files.push({
              name: item,
              path: fullPath,
              size: stats.size,
              extension: path.extname(item),
              category: this.getCategoryFromExtension(path.extname(item)),
              modified: stats.mtime.toISOString(),
            });
          }

          // Update progress
          analysisEntry.filesScanned = files.length;
          analysisEntry.progress = Math.min(
            100,
            Math.floor((files.length / 100) * 100),
          );
          analysisEntry.currentFile = fullPath;
          this.server.activeAnalyses.set(analysisId, analysisEntry);
        }

        return files;
      };

      // Start scanning
      setTimeout(async () => {
        try {
          const files = scanDirectory(directoryPath);
          const result = {
            files,
            totalFiles: files.length,
            totalSize: files.reduce((sum, file) => sum + file.size, 0),
            categories: this.generateCategories(files),
            directoryPath,
          };

          // Save results
          const outputPath = path.join(__dirname, "../../temp", tempFileName);
          fs.writeFileSync(
            outputPath,
            JSON.stringify(
              {
                success: true,
                result: this.formatBasicResult(result),
                analysisId,
              },
              null,
              2,
            ),
          );

          // Update analysis entry
          analysisEntry.status = "completed";
          analysisEntry.endTime = Date.now();
          analysisEntry.result = result;
          this.server.activeAnalyses.set(analysisId, analysisEntry);

          this.logger.completeScan(analysisId, result);

          // Save to database for persistence
          if (this.server?.knowledgeDB?.analysis?.storeAnalysis) {
            try {
              await this.server.knowledgeDB.analysis.storeAnalysis(
                analysisEntry.directoryPath,
                this.formatBasicResult(result),
              );
              console.log("✅ Basic analysis saved to database:", analysisId);
            } catch (dbError) {
              console.warn(
                "⚠️ Failed to save basic analysis to database:",
                dbError.message,
              );
            }
          }
        } catch (error) {
          this.logger.scanError(analysisId, error);

          analysisEntry.status = "error";
          analysisEntry.error = error.message;
          analysisEntry.endTime = Date.now();
          this.server.activeAnalyses.set(analysisId, analysisEntry);
        }
      }, 100);
    } catch (error) {
      this.logger.error("Failed to start basic analysis", error.message);
      throw error;
    }
  }

  /**
   * Format native scanner result to match expected frontend format
   */
  formatNativeResult(nativeResult) {
    return {
      summary: {
        totalFiles: nativeResult.totalFiles || 0,
        totalSize: nativeResult.totalSize || 0,
        scanDurationMs:
          Date.now() -
          (this.server.activeAnalyses.values().next().value?.startTime ||
            Date.now()),
        filesScannedPerSecond: 0,
        bytesScannedPerSecond: 0,
      },
      file_analysis: {
        files: nativeResult.files || [],
        categories: nativeResult.categories || {},
        extensionStats: nativeResult.extensionStats || {},
      },
      files: nativeResult.files || [],
      categories: nativeResult.categories || {},
      extensionStats: nativeResult.extensionStats || {},
      directory: nativeResult.directory || "",
      strategy: "native-scanner",
      tools: ["rust-native"],
      generated_at: new Date().toISOString(),
      scanner_version: "1.0.0",
    };
  }

  /**
   * Format basic scanner result to match expected frontend format
   */
  formatBasicResult(basicResult) {
    return {
      summary: {
        totalFiles: basicResult.totalFiles || 0,
        totalSize: basicResult.totalSize || 0,
        scanDurationMs:
          Date.now() -
          (this.server.activeAnalyses.values().next().value?.startTime ||
            Date.now()),
        filesScannedPerSecond: 0,
        bytesScannedPerSecond: 0,
      },
      file_analysis: {
        files: basicResult.files || [],
        categories: basicResult.categories || {},
        extensionStats: {},
      },
      files: basicResult.files || [],
      categories: basicResult.categories || {},
      extensionStats: {},
      directory: basicResult.directory || "",
      strategy: "basic-scanner",
      tools: ["nodejs-fs"],
      generated_at: new Date().toISOString(),
      scanner_version: "1.0.0",
    };
  }

  /**
   * Get category from file extension
   */
  getCategoryFromExtension(extension) {
    const ext = extension.toLowerCase();
    const categories = {
      ".js": "Code",
      ".ts": "Code",
      ".vue": "Code",
      ".py": "Code",
      ".java": "Code",
      ".jpg": "Images",
      ".jpeg": "Images",
      ".png": "Images",
      ".gif": "Images",
      ".svg": "Images",
      ".mp4": "Video",
      ".avi": "Video",
      ".mkv": "Video",
      ".mov": "Video",
      ".mp3": "Audio",
      ".wav": "Audio",
      ".flac": "Audio",
      ".pdf": "Documents",
      ".doc": "Documents",
      ".txt": "Documents",
      ".md": "Documents",
      ".zip": "Archives",
      ".rar": "Archives",
      ".7z": "Archives",
      ".tar": "Archives",
    };
    return categories[ext] || "Other";
  }

  /**
   * Generate categories from files
   */
  generateCategories(files) {
    const categories = {};
    for (const file of files) {
      const category = file.category || "Other";
      if (!categories[category]) {
        categories[category] = { count: 0, size: 0 };
      }
      categories[category].count++;
      categories[category].size += file.size || 0;
    }
    return categories;
  }

  /**
   * Start progress polling for analysis updates
   */
  startProgressPolling(analysisId, analysisEntry) {
    const progressInterval = setInterval(() => {
      if (
        analysisEntry.status === "completed" ||
        analysisEntry.status === "error"
      ) {
        clearInterval(progressInterval);
        return;
      }

      // Update analysis entry in server state
      this.server.activeAnalyses.set(analysisId, analysisEntry);
    }, 1000);

    analysisEntry.progressInterval = progressInterval;
  }

  setupRoutes() {
    // Main analysis endpoint
    this.router.post(
      "/analyze",
      ValidationMiddleware.validateAnalysis,
      async (req, res) => {
        const { directoryPath } = req.body;

        if (!directoryPath) {
          return res.status(400).json({
            success: false,
            error: "directoryPath is required",
          });
        }

        await this.startAnalysisLogic(req, res, directoryPath);
      },
    );

    // Get analysis progress
    this.router.get("/progress/:analysisId", (req, res) => {
      const { analysisId } = req.params;
      const analysis = this.server.activeAnalyses?.get(analysisId);

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: "Analysis not found",
        });
      }

      return res.json({
        success: true,
        progress: {
          files: analysis.filesScanned,
          percentage: analysis.progress,
          currentFile: analysis.currentFile,
          completed: analysis.status === "completed",
          totalSize: analysis.result?.totalSize || 0,
        },
      });
    });

    // Get analysis results
    this.router.get("/results/:analysisId", (req, res) => {
      const { analysisId } = req.params;
      const analysis = this.server.activeAnalyses?.get(analysisId);

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: "Analysis not found",
        });
      }

      if (analysis.status !== "completed") {
        return res.status(400).json({
          success: false,
          error: "Analysis not completed yet",
        });
      }

      // Try to read results from temp file
      const tempFilePath = path.join(
        __dirname,
        "../../temp",
        analysis.tempFileName,
      );
      try {
        if (fs.existsSync(tempFilePath)) {
          const resultData = JSON.parse(fs.readFileSync(tempFilePath, "utf8"));
          return res.json({
            success: true,
            analysis: resultData.result,
            analysisId,
          });
        }
      } catch (error) {
        this.logger.error("Failed to read analysis results", error.message);
      }

      // Fallback to in-memory result
      return res.json({
        success: true,
        analysis: analysis.result,
        analysisId,
      });
    });

    // Cancel analysis
    this.router.post("/cancel", (req, res) => {
      const { analysisId } = req.body;
      const analysis = this.server.activeAnalyses?.get(analysisId);

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: "Analysis not found",
        });
      }

      // Clear progress interval
      if (analysis.progressInterval) {
        clearInterval(analysis.progressInterval);
      }

      // Update status
      analysis.status = "cancelled";
      analysis.endTime = Date.now();
      this.server.activeAnalyses.set(analysisId, analysis);

      return res.json({
        success: true,
        message: "Analysis cancelled",
      });
    });

    // Get all active analyses
    this.router.get("/active", (req, res) => {
      const analyses = Array.from(this.server.activeAnalyses?.values() || []);
      return res.json({
        success: true,
        analyses: analyses.map((analysis) => ({
          analysisId: analysis.analysisId,
          directoryPath: analysis.directoryPath,
          status: analysis.status,
          progress: analysis.progress,
          filesScanned: analysis.filesScanned,
          startTime: analysis.startTime,
        })),
      });
    });

    // Get analysis history from database
    this.router.get("/history", async (req, res) => {
      try {
        const { limit = 50, offset = 0 } = req.query;
        const maxLimit = Math.min(parseInt(limit) || 50, 100);
        const skip = parseInt(offset) || 0;

        let analyses = [];

        // Get from database
        if (this.server?.knowledgeDB?.analysis?.getAnalysisHistory) {
          try {
            const dbResult =
              await this.server.knowledgeDB.analysis.getAnalysisHistory(
                maxLimit,
                skip,
              );
            analyses = dbResult.analyses || [];
            return res.json({
              success: true,
              analyses,
              pagination: {
                total: dbResult.total || analyses.length,
                limit: maxLimit,
                offset: skip,
                hasMore: skip + maxLimit < (dbResult.total || analyses.length),
              },
              source: "database",
            });
          } catch (dbError) {
            console.warn("⚠️ Database query failed:", dbError.message);
          }
        }

        // Fallback to in-memory results
        if (this.server?.analysisResults) {
          for (const [id, result] of this.server.analysisResults.entries()) {
            analyses.push({
              analysisId: id,
              directory: result.directoryPath || result.path || "Unknown",
              status: result.status || "complete",
              lastAnalyzed: result.completedAt || result.endTime,
              startTime: result.startTime,
              totalFiles: result.totalFiles || result.filesScanned || 0,
              totalSize: result.totalSize || 0,
            });
          }
        }

        return res.json({
          success: true,
          analyses,
          source: "memory",
        });
      } catch (error) {
        console.error("❌ History endpoint error:", error.message);
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get specific analysis by ID
    this.router.get("/history/:analysisId", async (req, res) => {
      try {
        const { analysisId } = req.params;

        // Get from database
        if (this.server?.knowledgeDB?.analysis?.getAnalysisById) {
          try {
            const dbResult =
              await this.server.knowledgeDB.analysis.getAnalysisById(
                analysisId,
              );
            if (dbResult.success && dbResult.analysis) {
              return res.json({
                success: true,
                analysis: dbResult.analysis,
                analysisId,
                source: "database",
              });
            }
          } catch (dbError) {
            console.warn("⚠️ Database query failed:", dbError.message);
          }
        }

        // Fallback to in-memory results
        if (this.server?.analysisResults?.has(analysisId)) {
          const result = this.server.analysisResults.get(analysisId);
          return res.json({
            success: true,
            analysis: {
              analysisId,
              directory: result.directoryPath || result.path || "Unknown",
              status: result.status || "complete",
              lastAnalyzed: result.completedAt || result.endTime,
              startTime: result.startTime,
              totalFiles: result.totalFiles || result.filesScanned || 0,
              totalSize: result.totalSize || 0,
              files: result.files || [],
            },
            analysisId,
            source: "memory",
          });
        }

        return res.status(404).json({
          success: false,
          error: "Analysis not found",
          analysisId,
        });
      } catch (error) {
        console.error("❌ History by ID endpoint error:", error.message);
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Health check
    this.router.get("/health", (req, res) => {
      return res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        activeAnalyses: this.server.activeAnalyses?.size || 0,
      });
    });
  }
}

module.exports = AnalysisRoutes;
