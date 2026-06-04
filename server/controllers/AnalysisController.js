/**
 * Analysis Controller
 * Handles code quality analysis using ESLint and other static analysis tools
 * Phase 1 of Static Analysis Integration
 */

const { exec: execCallback } = require("child_process");
const util = require("util");
const path = require("path");
const fs = require("fs").promises;

const exec = util.promisify(execCallback);

class AnalysisController {
  constructor(server) {
    this.server = server;
    this.toolsAvailable = {
      eslint: false,
      typescript: false,
      security: false,
      complexity: false,
    };
    this.checkToolAvailability();
  }

  /**
   * Check which analysis tools are available
   */
  async checkToolAvailability() {
    try {
      await exec("npx eslint --version");
      this.toolsAvailable.eslint = true;
      console.log("✅ ESLint available");
    } catch {
      console.log("⚠️ ESLint not available");
    }

    try {
      await exec("npx tsc --version");
      this.toolsAvailable.typescript = true;
      console.log("✅ TypeScript available");
    } catch {
      console.log("⚠️ TypeScript not available");
    }
  }

  /**
   * Run comprehensive code quality analysis
   */
  async analyzeCodeQuality(projectPath) {
    const startTime = Date.now();
    const results = {
      success: true,
      projectPath,
      timestamp: new Date().toISOString(),
      toolsUsed: [],
      summary: {
        totalFiles: 0,
        totalIssues: 0,
        errors: 0,
        warnings: 0,
        fixable: 0,
      },
      analysis: {
        eslint: null,
        complexity: null,
        dependencies: null,
      },
      duration: 0,
    };

    try {
      // Run ESLint analysis
      if (this.toolsAvailable.eslint) {
        results.analysis.eslint = await this.runESLint(projectPath);
        results.toolsUsed.push("eslint");
      }

      // Run complexity analysis
      results.analysis.complexity = await this.analyzeComplexity(projectPath);
      results.toolsUsed.push("complexity");

      // Aggregate results
      this.aggregateResults(results);

      results.duration = Date.now() - startTime;
      return results;
    } catch (error) {
      return {
        success: false,
        projectPath,
        timestamp: new Date().toISOString(),
        error: error.message,
        toolsAvailable: this.toolsAvailable,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Run ESLint analysis on JavaScript/TypeScript files
   */
  async runESLint(projectPath) {
    try {
      // Check for ESLint config
      const configFiles = [
        ".eslintrc.js",
        ".eslintrc.json",
        ".eslintrc",
        "eslint.config.js",
        "eslint.config.mjs",
      ];

      let hasConfig = false;
      for (const configFile of configFiles) {
        try {
          await fs.access(path.join(projectPath, configFile));
          hasConfig = true;
          break;
        } catch {
          continue;
        }
      }

      // Build ESLint command
      let eslintCmd = "npx eslint";

      if (!hasConfig) {
        // Use default recommended rules
        eslintCmd +=
          ' --rule "quotes:[error,double]" --rule "semi:[error,always]" --rule "no-unused-vars:error"';
      }

      // Run ESLint with JSON output
      const extensions = "js,jsx,ts,tsx,mjs,cjs";
      const cmd = `${eslintCmd} "${projectPath}/**/*.{${extensions}}" --format json --max-warnings 1000`;

      const { stdout, stderr } = await exec(cmd, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      }).catch((err) => {
        // ESLint returns exit code 1 when it finds issues, which is normal
        if (err.stdout) {
          return { stdout: err.stdout, stderr: err.stderr };
        }
        throw err;
      });

      // Parse ESLint results with error handling
      let eslintResults;
      try {
        eslintResults = JSON.parse(stdout || "[]");
      } catch (parseError) {
        console.error("❌ Failed to parse ESLint output:", parseError);
        return {
          status: "failed",
          error: "Invalid JSON output from ESLint",
          issues: [],
          summary: { total: 0, errors: 0, warnings: 0 },
        };
      }

      return this.transformESLintResults(eslintResults);
    } catch (error) {
      console.error("ESLint analysis failed:", error.message);
      return {
        status: "failed",
        error: error.message,
        issues: [],
        summary: { total: 0, errors: 0, warnings: 0 },
      };
    }
  }

  /**
   * Transform ESLint JSON output to our format
   */
  transformESLintResults(eslintResults) {
    const issues = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    let fixable = 0;

    for (const result of eslintResults) {
      const filePath = result.filePath;

      for (const message of result.messages) {
        const issue = {
          file: filePath,
          line: message.line || 1,
          column: message.column || 1,
          rule: message.ruleId || "syntax",
          message: message.message,
          severity: message.severity === 2 ? "error" : "warning",
          category: this.categorizeIssue(message.ruleId, message.message),
          fixable: message.fix !== undefined,
          suggestion: message.suggestion,
        };

        issues.push(issue);

        if (message.severity === 2) {
          totalErrors++;
        } else {
          totalWarnings++;
        }

        if (message.fix) {
          fixable++;
        }
      }
    }

    // Sort by severity (errors first) then by file
    issues.sort((a, b) => {
      if (a.severity === b.severity) {
        return a.file.localeCompare(b.file);
      }
      return a.severity === "error" ? -1 : 1;
    });

    return {
      status: "completed",
      summary: {
        total: issues.length,
        errors: totalErrors,
        warnings: totalWarnings,
        fixable,
        filesAnalyzed: eslintResults.length,
      },
      issues,
      score: this.calculateQualityScore(totalErrors, totalWarnings, eslintResults.length),
    };
  }

  /**
   * Categorize an issue based on rule and message
   */
  categorizeIssue(ruleId, message) {
    if (!ruleId) return "syntax";

    const categoryMap = {
      // Security
      "security/detect-object-injection": "security",
      "security/detect-non-literal-regexp": "security",
      "security/detect-unsafe-regex": "security",
      "no-eval": "security",
      "no-implied-eval": "security",

      // Performance
      "no-console": "performance",
      complexity: "performance",
      "max-lines": "performance",

      // Style
      quotes: "style",
      semi: "style",
      indent: "style",
      "comma-dangle": "style",
      "no-trailing-spaces": "style",

      // Best Practices
      "no-unused-vars": "best-practices",
      "no-undef": "best-practices",
      "prefer-const": "best-practices",
      "no-var": "best-practices",
      eqeqeq: "best-practices",

      // Type Safety (TypeScript)
      "@typescript-eslint/no-explicit-any": "type-safety",
      "@typescript-eslint/explicit-function-return-type": "type-safety",
    };

    // Check for exact match
    if (categoryMap[ruleId]) {
      return categoryMap[ruleId];
    }

    // Check for partial matches
    if (ruleId.includes("security")) return "security";
    if (ruleId.includes("@typescript-eslint")) return "type-safety";
    if (ruleId.includes("import")) return "imports";
    if (ruleId.includes("react")) return "react";

    return "best-practices";
  }

  /**
   * Calculate code quality score (0-100)
   */
  calculateQualityScore(errors, warnings, filesAnalyzed) {
    if (filesAnalyzed === 0) return 100;

    // Base score
    let score = 100;

    // Deduct for errors (5 points each)
    score -= errors * 5;

    // Deduct for warnings (1 point each, max 20)
    score -= Math.min(warnings, 20);

    // Normalize by file count (reduce penalty for large codebases)
    const normalizedScore = score * Math.min(1, 10 / filesAnalyzed);

    return Math.max(0, Math.min(100, Math.round(normalizedScore)));
  }

  /**
   * Analyze code complexity
   */
  async analyzeComplexity(projectPath) {
    try {
      // Simple complexity analysis without external tools
      const complexityResults = await this.calculateComplexity(projectPath);

      return {
        status: "completed",
        summary: complexityResults.summary,
        files: complexityResults.files,
      };
    } catch (error) {
      return {
        status: "failed",
        error: error.message,
        summary: { averageComplexity: 0, totalFunctions: 0 },
      };
    }
  }

  /**
   * Calculate cyclomatic complexity
   */
  async calculateComplexity(projectPath) {
    const results = {
      summary: {
        totalFunctions: 0,
        averageComplexity: 0,
        highComplexity: 0, // Functions with complexity > 10
        veryHighComplexity: 0, // Functions with complexity > 20
      },
      files: [],
    };

    try {
      const files = await this.getCodeFiles(projectPath);
      let totalComplexity = 0;

      for (const file of files.slice(0, 50)) {
        // Analyze first 50 files for performance
        try {
          const content = await fs.readFile(file, "utf-8");
          const fileAnalysis = this.analyzeFileComplexity(content, file);

          results.files.push(fileAnalysis);
          results.summary.totalFunctions += fileAnalysis.functions.length;
          totalComplexity += fileAnalysis.averageComplexity;

          for (const func of fileAnalysis.functions) {
            if (func.complexity > 10) results.summary.highComplexity++;
            if (func.complexity > 20) results.summary.veryHighComplexity++;
          }
        } catch {
          // Skip files that can't be read
          continue;
        }
      }

      results.summary.averageComplexity =
        results.files.length > 0
          ? Math.round((totalComplexity / results.files.length) * 10) / 10
          : 0;

      return results;
    } catch (error) {
      console.error("Complexity analysis failed:", error);
      return results;
    }
  }

  /**
   * Analyze complexity of a single file
   */
  analyzeFileComplexity(content, filePath) {
    const lines = content.split("\n");
    const functions = [];

    // Simple regex-based function detection
    const functionPatterns = [
      /(?:async\s+)?function\s+(\w+)\s*\(/g,
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
      /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g, // Method detection
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of functionPatterns) {
        const match = pattern.exec(line);
        if (match) {
          const complexity = this.calculateFunctionComplexity(lines, i);
          functions.push({
            name: match[1] || `anonymous_${i}`,
            line: i + 1,
            complexity,
            lines: this.countFunctionLines(lines, i),
          });
        }
        pattern.lastIndex = 0; // Reset regex
      }
    }

    const avgComplexity =
      functions.length > 0
        ? functions.reduce((sum, f) => sum + f.complexity, 0) / functions.length
        : 0;

    return {
      file: filePath,
      totalLines: lines.length,
      functions,
      averageComplexity: Math.round(avgComplexity * 10) / 10,
    };
  }

  /**
   * Calculate cyclomatic complexity of a function
   */
  calculateFunctionComplexity(lines, startLine) {
    const complexityIndicators = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bdo\b/g,
      /\?\s*[^:]+\s*:/g, // Ternary operators
      /\|\|/g, // Logical OR
      /&&/g, // Logical AND
    ];

    let complexity = 1; // Base complexity
    let braceCount = 0;
    let inFunction = false;

    for (let i = startLine; i < lines.length && i < startLine + 100; i++) {
      const line = lines[i];

      // Track function boundaries
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (i === startLine) {
        inFunction = true;
      } else if (braceCount <= 0 && inFunction) {
        break;
      }

      // Count complexity indicators
      for (const pattern of complexityIndicators) {
        const matches = line.match(pattern);
        if (matches) {
          complexity += matches.length;
        }
      }
    }

    return Math.min(complexity, 50); // Cap at 50
  }

  /**
   * Count lines in a function
   */
  countFunctionLines(lines, startLine) {
    let braceCount = 0;
    let lineCount = 0;

    for (let i = startLine; i < lines.length && i < startLine + 200; i++) {
      const line = lines[i];
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      lineCount++;

      if (braceCount <= 0 && i > startLine) {
        break;
      }
    }

    return lineCount;
  }

  /**
   * Get all code files in a directory
   */
  async getCodeFiles(dir, files = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and common ignore directories
          if (
            entry.name === "node_modules" ||
            entry.name === ".git" ||
            entry.name === "dist" ||
            entry.name === "build" ||
            entry.name === "coverage"
          ) {
            continue;
          }
          await this.getCodeFiles(fullPath, files);
        } else if (this.isCodeFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }

    return files;
  }

  /**
   * Check if a file is a code file
   */
  isCodeFile(filename) {
    const codeExtensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte"];
    return codeExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Aggregate all analysis results
   */
  aggregateResults(results) {
    // ESLint summary
    if (results.analysis.eslint) {
      results.summary.totalIssues += results.analysis.eslint.summary.total;
      results.summary.errors += results.analysis.eslint.summary.errors;
      results.summary.warnings += results.analysis.eslint.summary.warnings;
      results.summary.fixable += results.analysis.eslint.summary.fixable;
      results.summary.totalFiles += results.analysis.eslint.summary.filesAnalyzed;
    }

    // Complexity summary
    if (results.analysis.complexity) {
      results.summary.complexity = results.analysis.complexity.summary;
    }
  }

  /**
   * Get available analysis tools status
   */
  async getToolStatus() {
    return {
      success: true,
      tools: this.toolsAvailable,
      installCommands: {
        eslint: "npm install --save-dev eslint",
        typescript:
          "npm install --save-dev typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin",
        security: "npm install --save-dev eslint-plugin-security",
        sonarjs: "npm install --save-dev eslint-plugin-sonarjs",
      },
    };
  }

  /**
   * Analyze a single file
   */
  async analyzeSingleFile(filePath) {
    try {
      // Verify file exists
      await fs.access(filePath);

      // Run ESLint on single file
      let eslintResult = null;
      if (this.toolsAvailable.eslint && this.isCodeFile(filePath)) {
        try {
          const { stdout } = await exec(`npx eslint "${filePath}" --format json`, {
            timeout: 10000,
          }).catch((err) => ({ stdout: err.stdout || "[]" }));

          eslintResult = this.transformESLintResults(JSON.parse(stdout || "[]"));
        } catch (e) {
          console.error("Single file ESLint failed:", e.message);
        }
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, "utf-8");
      const complexity = this.analyzeFileComplexity(content, filePath);

      return {
        success: true,
        file: filePath,
        stats: {
          size: stats.size,
          modified: stats.mtime,
          lines: content.split("\n").length,
        },
        eslint: eslintResult,
        complexity: complexity,
      };
    } catch (error) {
      return {
        success: false,
        file: filePath,
        error: error.message,
      };
    }
  }
}

module.exports = AnalysisController;
