/**
 * General Routes Module
 * Handles general API endpoints that don't belong to specific modules
 */

const express = require("express");

class GeneralRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    this.setupRoutes();
  }

  getRouter() {
    return this.router;
  }

  setupRoutes() {
    // Test root endpoint
    this.router.get("/", (req, res) => {
      res.json({
        success: true,
        message: "General routes working",
        timestamp: new Date().toISOString(),
      });
    });

    // Health check endpoint
    this.router.get("/health", (req, res) => {
      console.log("🏥 Health endpoint accessed");
      res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: "2.8.9",
        environment: process.env.NODE_ENV || "development",
      });
    });

    // Debug endpoint to test mounting
    this.router.get("/debug/test", (req, res) => {
      console.log("🔍 Debug test endpoint accessed");
      res.json({
        success: true,
        message: "Debug test endpoint working",
        timestamp: new Date().toISOString(),
        routes: "General routes are properly mounted",
      });
    });

    // Debug routes endpoint
    this.router.get("/debug/routes", (req, res) => {
      res.json({
        success: true,
        routes: {
          general: [
            "/api/health",
            "/api/debug/routes",
            "/api/progress/:analysisId",
            "/api/history/:analysisId",
            "/api/results/:analysisId",
          ],
          analysis: ["/api/analysis/*"],
          ai: ["/api/ai/*"],
          files: ["/api/files/*"],
          settings: ["/api/settings/*"],
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Progress endpoint (alias for /api/analysis/progress/:analysisId)
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

    // History endpoint (alias for /api/analysis/history/:analysisId)
    this.router.get("/history/:analysisId", async (req, res) => {
      const { analysisId } = req.params;

      try {
        // Try to get from active analyses first
        const activeAnalysis = this.server.activeAnalyses?.get(analysisId);
        if (activeAnalysis && activeAnalysis.status === "completed") {
          return res.json({
            success: true,
            analysis: activeAnalysis.result,
            analysisId,
            status: activeAnalysis.status,
            completedAt: activeAnalysis.endTime,
            directoryPath: activeAnalysis.directoryPath,
          });
        }

        // Try to get from analysis results
        const storedAnalysis = this.server.analysisResults?.get(analysisId);
        if (storedAnalysis) {
          return res.json({
            success: true,
            analysis: storedAnalysis,
            analysisId,
            status: storedAnalysis.status,
            completedAt: storedAnalysis.completedAt,
            directoryPath: storedAnalysis.directoryPath,
          });
        }

        // Try to get from database
        if (this.server?.knowledgeDB?.analysis?.getAnalysis) {
          const dbAnalysis =
            await this.server.knowledgeDB.analysis.getAnalysis(analysisId);
          if (dbAnalysis) {
            return res.json({
              success: true,
              analysis: dbAnalysis,
              analysisId,
              source: "database",
            });
          }
        }

        return res.status(404).json({
          success: false,
          error: "Analysis not found",
        });
      } catch (error) {
        console.error("Error fetching analysis history:", error);
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Results endpoint (alias for /api/analysis/results/:analysisId)
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
      const path = require("path");
      const fs = require("fs");
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
        console.error("Failed to read analysis results:", error.message);
      }

      // Fallback to in-memory result
      return res.json({
        success: true,
        analysis: analysis.result,
        analysisId,
      });
    });
  }
}

module.exports = GeneralRoutes;
