/**
 * Space Analyzer AI Integration Layer
 * Integrates enhanced AI file analysis with existing scanner functionality
 */

const EnhancedAIFileAnalyzer = require("./EnhancedAIFileAnalyzer");
const path = require("path");
const fs = require("fs");
const config = require("../config");

class SpaceAnalyzerAIIntegration {
  constructor() {
    this.fileAnalyzer = new EnhancedAIFileAnalyzer();
    this.analysisResults = new Map();
    this.scanHistory = [];
    this.activeAnalysis = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.fileAnalyzer.on("fileAnalyzed", (analysis) => {
      console.log(`✅ File analyzed: ${analysis.metadata.fileName}`);
      this.analysisResults.set(analysis.metadata.filePath, analysis);
    });

    this.fileAnalyzer.on("batchAnalysisComplete", (result) => {
      console.log(`🎉 Batch analysis complete: ${result.results.length} files`);
      this.scanHistory.push({
        timestamp: new Date(),
        directory: result.directory,
        summary: result.summary,
        results: result.results,
      });

      // Keep only last 10 scans
      if (this.scanHistory.length > 10) {
        this.scanHistory = this.scanHistory.slice(-10);
      }
    });

    this.fileAnalyzer.on("analysisProgress", (progress) => {
      console.log(`📊 Analysis progress: ${progress.current}/${progress.total}`);
    });
  }

  async analyzeScannedDirectory(directoryPath, options = {}) {
    console.log(`🔍 Starting AI analysis of scanned directory: ${directoryPath}`);

    this.activeAnalysis = {
      directory: directoryPath,
      startTime: new Date(),
      status: "analyzing",
    };

    try {
      // Perform batch analysis
      const result = await this.fileAnalyzer.batchAnalyze(directoryPath, {
        includeContent: options.includeContent || false,
        deepAnalysis: options.deepAnalysis || false,
        generateRecommendations: options.generateRecommendations || true,
      });

      // Enhance with Space Analyzer specific insights
      const enhancedResult = await this.enhanceWithSpaceAnalyzerInsights(result, directoryPath);

      this.activeAnalysis.status = "completed";
      this.activeAnalysis.endTime = new Date();
      this.activeAnalysis.duration = this.activeAnalysis.endTime - this.activeAnalysis.startTime;

      return enhancedResult;
    } catch (error) {
      this.activeAnalysis.status = "failed";
      this.activeAnalysis.error = error.message;
      throw error;
    }
  }

  async enhanceWithSpaceAnalyzerInsights(analysisResult, directoryPath) {
    console.log("🧠 Enhancing analysis with Space Analyzer insights...");

    const enhanced = {
      ...analysisResult,
      spaceAnalyzerInsights: {
        fileManagement: await this.generateFileManagementInsights(
          analysisResult.results,
          directoryPath
        ),
        optimization: await this.generateOptimizationInsights(
          analysisResult.results,
          directoryPath
        ),
        organization: await this.generateOrganizationInsights(
          analysisResult.results,
          directoryPath
        ),
        cleanup: await this.generateCleanupInsights(analysisResult.results, directoryPath),
      },
    };

    return enhanced;
  }

  async generateFileManagementInsights(results, directoryPath) {
    // Get thresholds from config with fallback defaults
    const largeFileThreshold = config.get("analysis.largeFileThreshold", 10 * 1024 * 1024);
    const oldFileThreshold = config.get("analysis.oldFileThreshold", 365 * 24 * 60 * 60 * 1000);

    const insights = {
      largeFiles: results.filter((r) => r.metadata?.fileSize > largeFileThreshold),
      duplicates: this.findPotentialDuplicates(results),
      oldFiles: results.filter((r) => {
        const age = Date.now() - new Date(r.metadata?.lastModified).getTime();
        return age > oldFileThreshold;
      }),
      unusedFiles: this.identifyPotentiallyUnusedFiles(results),
      recommendations: [],
    };

    // Generate recommendations
    if (insights.largeFiles.length > 0) {
      insights.recommendations.push({
        type: "large-files",
        message: `Found ${insights.largeFiles.length} large files. Consider compressing or archiving.`,
        files: insights.largeFiles.map((f) => f.metadata?.fileName),
      });
    }

    if (insights.duplicates.length > 0) {
      insights.recommendations.push({
        type: "duplicates",
        message: `Found ${insights.duplicates.length} potential duplicate files.`,
        files: insights.duplicates.map((d) => `${d.file1} ↔ ${d.file2}`),
      });
    }

    if (insights.oldFiles.length > 0) {
      insights.recommendations.push({
        type: "old-files",
        message: `Found ${insights.oldFiles.length} files older than 1 year. Consider archiving.`,
        files: insights.oldFiles.map((f) => f.metadata?.fileName),
      });
    }

    return insights;
  }

  async generateOptimizationInsights(results, directoryPath) {
    const insights = {
      structure: this.analyzeDirectoryStructure(results, directoryPath),
      performance: this.analyzePerformanceImplications(results),
      storage: this.analyzeStorageOptimization(results),
      recommendations: [],
    };

    // Structure optimization
    if (insights.structure.depth > 5) {
      insights.recommendations.push({
        type: "structure-depth",
        message: "Directory structure is quite deep. Consider flattening some levels.",
        severity: "medium",
      });
    }

    // Performance implications
    if (insights.performance.largeFilesInRoot > 0) {
      insights.recommendations.push({
        type: "root-large-files",
        message: "Large files in root directory may slow down scanning.",
        severity: "high",
      });
    }

    return insights;
  }

  async generateOrganizationInsights(results, directoryPath) {
    const insights = {
      categories: this.categorizeFiles(results),
      patterns: this.identifyOrganizationPatterns(results),
      suggestions: this.generateOrganizationSuggestions(results),
      automatedActions: [],
    };

    // Automated organization suggestions
    const commonPatterns = insights.patterns.filter((p) => p.confidence > 0.8);

    for (const pattern of commonPatterns) {
      insights.automatedActions.push({
        type: "auto-organize",
        pattern: pattern.name,
        description: pattern.description,
        files: pattern.files,
        suggestedAction: pattern.suggestedAction,
      });
    }

    return insights;
  }

  async generateCleanupInsights(results, directoryPath) {
    const insights = {
      cleanupCandidates: this.identifyCleanupCandidates(results),
      spaceRecovery: this.calculateSpaceRecovery(results),
      risks: this.assessCleanupRisks(results),
      safeActions: [],
    };

    // Safe cleanup actions
    const safeFiles = insights.cleanupCandidates.filter((f) => f.risk === "low");

    for (const file of safeFiles) {
      insights.safeActions.push({
        type: "safe-delete",
        file: file.path,
        reason: file.reason,
        spaceSaved: file.size,
        confidence: file.confidence,
      });
    }

    return insights;
  }

  // Helper methods for insight generation
  findPotentialDuplicates(results) {
    const duplicates = [];
    const fileGroups = {};

    // Group by size (simple duplicate detection)
    results.forEach((result) => {
      if (!result.metadata) return;

      const size = result.metadata.fileSize;
      if (!fileGroups[size]) {
        fileGroups[size] = [];
      }
      fileGroups[size].push(result);
    });

    // Find potential duplicates
    Object.values(fileGroups).forEach((group) => {
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            duplicates.push({
              file1: group[i].metadata?.fileName,
              file2: group[j].metadata?.fileName,
              size: group[i].metadata?.fileSize,
              confidence: 0.6,
            });
          }
        }
      }
    });

    return duplicates;
  }

  identifyPotentiallyUnusedFiles(results) {
    // Simple heuristic: files with no recent modification and no references
    const now = Date.now();
    const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000;

    return results.filter((result) => {
      if (!result.metadata) return false;

      const age = now - new Date(result.metadata.lastModified).getTime();
      const isOld = age > sixMonths;
      const isConfig = [".config", ".env", ".json", ".yml", ".yaml"].includes(
        result.metadata.fileExtension
      );
      const isHidden = result.metadata.fileName.startsWith(".");

      return isOld && !isConfig && !isHidden;
    });
  }

  analyzeDirectoryStructure(results, directoryPath) {
    const depths = results.map((r) => {
      if (!r.metadata?.filePath) return 0;
      return r.metadata.filePath.split(path.sep).length - directoryPath.split(path.sep).length;
    });

    return {
      depth: Math.max(...depths),
      avgDepth: depths.reduce((a, b) => a + b, 0) / depths.length,
      totalFiles: results.length,
      fileDistribution: this.analyzeFileDistribution(results),
    };
  }

  analyzePerformanceImplications(results) {
    const largeFiles = results.filter((r) => r.metadata?.fileSize > 50 * 1024 * 1024); // > 50MB
    const rootFiles = results.filter((r) => {
      if (!r.metadata?.filePath) return false;
      const depth =
        r.metadata.filePath.split(path.sep).length -
        path.dirname(r.metadata.filePath).split(path.sep).length;
      return depth <= 1;
    });

    return {
      largeFiles: largeFiles.length,
      largeFilesInRoot: rootFiles.filter((f) => largeFiles.includes(f)).length,
      totalSize: results.reduce((sum, r) => sum + (r.metadata?.fileSize || 0), 0),
    };
  }

  analyzeStorageOptimization(results) {
    const totalSize = results.reduce((sum, r) => sum + (r.metadata?.fileSize || 0), 0);
    const compressible = results.filter((r) =>
      [".txt", ".log", ".json", ".xml"].includes(r.metadata?.fileExtension)
    );

    return {
      totalSize,
      potentialSavings: compressible.reduce((sum, r) => sum + (r.metadata?.fileSize || 0), 0) * 0.6, // 60% compression estimate
      compressibleFiles: compressible.length,
    };
  }

  categorizeFiles(results) {
    const categories = {};

    results.forEach((result) => {
      if (!result.metadata) return;

      const category = result.type || "unknown";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(result);
    });

    return categories;
  }

  identifyOrganizationPatterns(results) {
    const patterns = [];

    // Look for common patterns
    const commonPatterns = [
      {
        name: "config-files",
        description: "Configuration files scattered throughout",
        files: results.filter((r) =>
          [".json", ".yml", ".yaml", ".env"].includes(r.metadata?.fileExtension)
        ),
        confidence: 0.8,
        suggestedAction: "Move to config/ directory",
      },
      {
        name: "test-files",
        description: "Test files mixed with source",
        files: results.filter(
          (r) => r.metadata?.fileName.includes("test") || r.metadata?.fileName.includes("spec")
        ),
        confidence: 0.9,
        suggestedAction: "Organize under tests/ directory",
      },
      {
        name: "temp-files",
        description: "Temporary or cache files",
        files: results.filter(
          (r) => r.metadata?.fileName.includes("temp") || r.metadata?.fileName.includes("cache")
        ),
        confidence: 0.7,
        suggestedAction: "Move to temp/ or delete if not needed",
      },
    ];

    return commonPatterns.filter((p) => p.files.length > 0);
  }

  generateOrganizationSuggestions(results) {
    const suggestions = [];

    // Suggest creating common directories
    const neededDirs = ["src", "docs", "config", "tests", "assets", "temp"];

    neededDirs.forEach((dir) => {
      const hasDir = results.some((r) => r.metadata?.filePath.includes(dir));
      if (!hasDir) {
        suggestions.push({
          type: "create-directory",
          directory: dir,
          reason: `No ${dir}/ directory found for organization`,
        });
      }
    });

    return suggestions;
  }

  identifyCleanupCandidates(results) {
    return results
      .map((result) => {
        if (!result.metadata) return null;

        let risk = "low";
        let reason = "";
        let confidence = 0.5;

        // Assess risk based on file characteristics
        if (
          result.metadata.fileName.startsWith("temp") ||
          result.metadata.fileName.includes("cache")
        ) {
          risk = "low";
          reason = "Temporary or cache file";
          confidence = 0.9;
        } else if (result.metadata.fileExtension === ".log") {
          risk = "low";
          reason = "Log file";
          confidence = 0.8;
        } else if (
          result.metadata.fileExtension === ".bak" ||
          result.metadata.fileName.includes("backup")
        ) {
          risk = "medium";
          reason = "Backup file";
          confidence = 0.7;
        }

        return {
          path: result.metadata.filePath,
          fileName: result.metadata.fileName,
          size: result.metadata.fileSize,
          risk,
          reason,
          confidence,
        };
      })
      .filter(Boolean);
  }

  calculateSpaceRecovery(results) {
    const candidates = this.identifyCleanupCandidates(results);
    const lowRiskFiles = candidates.filter((c) => c.risk === "low");

    return {
      totalFiles: candidates.length,
      lowRiskFiles: lowRiskFiles.length,
      potentialSpace: lowRiskFiles.reduce((sum, f) => sum + f.size, 0),
      highRiskSpace: candidates
        .filter((c) => c.risk === "high")
        .reduce((sum, f) => sum + f.size, 0),
    };
  }

  assessCleanupRisks(results) {
    const risks = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    results.forEach((result) => {
      if (!result.metadata) return;

      // Critical risks
      if (
        result.metadata.fileName.includes("database") ||
        result.metadata.fileName.includes("db")
      ) {
        risks.critical.push(result.metadata.fileName);
      }
      // High risks
      else if ([".env", ".key", ".pem", ".p12"].includes(result.metadata.fileExtension)) {
        risks.high.push(result.metadata.fileName);
      }
      // Medium risks
      else if (
        result.metadata.fileExtension === ".sql" ||
        result.metadata.fileName.includes("config")
      ) {
        risks.medium.push(result.metadata.fileName);
      }
      // Low risks
      else if (
        result.metadata.fileName.includes("temp") ||
        result.metadata.fileName.includes("cache")
      ) {
        risks.low.push(result.metadata.fileName);
      }
    });

    return risks;
  }

  analyzeFileDistribution(results) {
    const distribution = {};

    results.forEach((result) => {
      if (!result.metadata) return;

      const ext = result.metadata.fileExtension || "no-extension";
      distribution[ext] = (distribution[ext] || 0) + 1;
    });

    return distribution;
  }

  getAnalysisStatus() {
    return {
      activeAnalysis: this.activeAnalysis,
      recentScans: this.scanHistory.slice(-5),
      totalAnalyses: this.analysisResults.size,
      supportedTools: Array.from(this.fileAnalyzer.tools.keys()),
    };
  }

  async getAIInterpretation(directoryPath, query) {
    console.log(`🤖 Getting AI interpretation for: ${query}`);

    // Get recent analysis results for the directory
    const recentScan = this.scanHistory
      .filter((scan) => scan.directory === directoryPath)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (!recentScan) {
      throw new Error("No recent analysis found for this directory");
    }

    // Create context for AI interpretation
    const context = {
      directory: directoryPath,
      analysisSummary: recentScan.summary,
      query: query,
      relevantFiles: this.findRelevantFiles(recentScan.results, query),
    };

    // Use the existing AI manager to get interpretation
    const aiManager = require("./OpenSourceAIManager");

    const response = await aiManager.processRequest(
      "chat",
      {
        messages: [
          {
            role: "user",
            content: this.buildInterpretationPrompt(context),
          },
        ],
      },
      {
        enableSelfLearning: true,
        enableOllama: true,
        analysisDepth: "comprehensive",
      }
    );

    return response;
  }

  findRelevantFiles(results, query) {
    // Simple relevance scoring based on file names and categories
    const queryLower = query.toLowerCase();
    const relevantFiles = results
      .filter((result) => {
        if (!result.metadata) return false;

        const fileName = result.metadata.fileName.toLowerCase();
        const category = result.type?.toLowerCase() || "";

        return (
          fileName.includes(queryLower) ||
          category.includes(queryLower) ||
          this.contentMatches(result, queryLower)
        );
      })
      .slice(0, 10); // Limit to top 10 relevant files

    return relevantFiles.map((f) => ({
      path: f.metadata.filePath,
      name: f.metadata.fileName,
      type: f.type,
      summary: f.summary || "",
    }));
  }

  contentMatches(result, query) {
    // This would check if file content matches the query
    // For now, return false as we don't want to read all file contents
    return false;
  }

  buildInterpretationPrompt(context) {
    return `
You are an AI assistant helping with file system analysis and management for Space Analyzer.

Directory: ${context.directory}
Query: ${context.query}

Analysis Summary:
- Total files: ${context.analysisSummary.totalFiles}
- Successful analyses: ${context.analysisSummary.successfulAnalyses}
- File types: ${JSON.stringify(context.analysisSummary.fileTypes || {}, null, 2)}

Relevant Files:
${context.relevantFiles.map((f) => `- ${f.name} (${f.type}): ${f.summary}`).join("\n")}

Please provide a helpful interpretation and recommendations based on the user's query and the analysis data.
        `.trim();
  }
}

module.exports = SpaceAnalyzerAIIntegration;
