/**
 * Complexity Analysis Routes Module
 * Handles code complexity analysis and metrics
 */

const express = require("express");
const path = require("path");
const crypto = require("crypto");

class ComplexityRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Analyze code complexity for a directory
    this.router.post("/complexity/analyze", async (req, res) => {
      const startTime = Date.now();
      try {
        const { directory, analysisId, maxFiles = 100 } = req.body;

        if (!directory && !analysisId) {
          return res.status(400).json({ error: "Directory or analysisId is required" });
        }

        // Validate directory path if provided
        if (directory && !this.server.isValidPath(directory)) {
          return res.status(400).json({ error: "Invalid directory path" });
        }

        // Get analysis data
        const analysisData = analysisId
          ? this.server.analysisResults.get(analysisId)
          : Array.from(this.server.analysisResults.values()).find((a) => a.directory === directory);

        if (!analysisData || !analysisData.files) {
          return res.status(400).json({ error: "No analysis data found" });
        }

        // Filter code files
        const codeExtensions = [
          ".js",
          ".ts",
          ".jsx",
          ".tsx",
          ".py",
          ".java",
          ".cs",
          ".cpp",
          ".c",
          ".go",
          ".rs",
          ".php",
          ".rb",
        ];
        const codeFiles = analysisData.files
          .filter((f) => {
            const ext = path.extname(f.name).toLowerCase();
            return codeExtensions.includes(ext);
          })
          .slice(0, maxFiles);

        // Import complexity analyzer
        const ComplexityAnalyzer = require("../modules/complexity-analyzer");
        const analyzer = new ComplexityAnalyzer();

        // Analyze files
        const filePaths = codeFiles.map((f) => f.path);
        const complexityResults = await analyzer.analyzeFiles(filePaths);

        // Store results in database if available
        if (this.server.knowledgeDB) {
          for (const result of complexityResults) {
            const fileHash = crypto
              .createHash("md5")
              .update(`${result.filePath}:${result.linesOfCode}`)
              .digest("hex");

            await this.server.knowledgeDB.storeComplexityMetrics({
              filePath: result.filePath,
              directoryPath: directory || analysisData.directory,
              language: result.language,
              linesOfCode: result.linesOfCode,
              logicalLines: result.logicalLines,
              commentLines: result.commentLines,
              blankLines: result.blankLines,
              cyclomaticComplexity: result.cyclomaticComplexity,
              cognitiveComplexity: result.cognitiveComplexity,
              functionCount: result.functionCount,
              maxFunctionLength: result.maxFunctionLength,
              averageFunctionLength: result.averageFunctionLength,
              nestingDepth: result.nestingDepth,
              maintainabilityIndex: result.maintainabilityIndex,
              complexityGrade: result.complexityGrade,
              refactoringPriority: result.refactoringPriority,
              fileHash,
            });
          }
        }

        // Calculate summary statistics
        const summary = analyzer.getSummaryStats(complexityResults);

        res.json({
          success: true,
          directory: directory || analysisData.directory,
          filesAnalyzed: complexityResults.length,
          summary,
          topComplexFiles: summary?.mostComplexFiles || [],
          filesNeedingRefactoring: summary?.filesNeedingRefactoring || 0,
          responseTime: Date.now() - startTime,
        });
      } catch (error) {
        console.error("Complexity analysis error:", error);
        res.status(500).json({
          error: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    });

    // Get complexity metrics for a directory
    this.router.get("/complexity/metrics", async (req, res) => {
      try {
        const { directory, minPriority, limit = 50 } = req.query;

        if (!directory) {
          return res.status(400).json({ error: "Directory is required" });
        }

        // Validate directory path
        if (!this.server.isValidPath(directory)) {
          return res.status(400).json({ error: "Invalid directory path" });
        }

        const metrics = this.server.knowledgeDB
          ? await this.server.knowledgeDB.getDirectoryComplexity(directory, minPriority || null)
          : [];

        const summary = this.server.knowledgeDB
          ? await this.server.knowledgeDB.getComplexitySummary(directory)
          : null;

        const parsedLimit = parseInt(limit);
        const safeLimit = Number.isNaN(parsedLimit) ? 50 : Math.max(1, Math.min(1000, parsedLimit));

        res.json({
          success: true,
          directory,
          metrics: metrics.slice(0, safeLimit),
          summary,
          count: metrics.length,
        });
      } catch (error) {
        console.error("Get complexity metrics error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get complexity summary for a directory
    this.router.get("/complexity/summary", async (req, res) => {
      try {
        const { directory } = req.query;

        if (!directory) {
          return res.status(400).json({ error: "Directory is required" });
        }

        // Validate directory path
        if (!this.server.isValidPath(directory)) {
          return res.status(400).json({ error: "Invalid directory path" });
        }

        const summary = this.server.knowledgeDB
          ? await this.server.knowledgeDB.getComplexitySummary(directory)
          : null;
        const filesNeedingRefactoring = this.server.knowledgeDB
          ? await this.server.knowledgeDB.getFilesNeedingRefactoring(directory, 20)
          : [];

        res.json({
          success: true,
          directory,
          summary,
          filesNeedingRefactoring,
        });
      } catch (error) {
        console.error("Get complexity summary error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get files needing refactoring
    this.router.get("/complexity/refactoring", async (req, res) => {
      try {
        const { directory, limit = 20 } = req.query;

        if (!directory) {
          return res.status(400).json({ error: "Directory is required" });
        }

        const files = this.server.knowledgeDB
          ? await this.server.knowledgeDB.getFilesNeedingRefactoring(directory, parseInt(limit))
          : [];

        res.json({
          success: true,
          directory,
          files,
          count: files.length,
        });
      } catch (error) {
        console.error("Get refactoring files error:", error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = ComplexityRoutes;
