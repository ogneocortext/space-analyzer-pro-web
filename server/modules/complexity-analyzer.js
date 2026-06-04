/**
 * Code Complexity Analyzer
 * Calculates complexity metrics for code files
 * Supports: JavaScript, TypeScript, Python, Java, C/C++, C#, Go, Rust
 */

const fs = require('fs').promises;
const path = require('path');

class ComplexityAnalyzer {
  /**
   * Analyze a code file for complexity metrics
   */
  async analyzeFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const ext = path.extname(filePath).toLowerCase();
      
      const metrics = {
        filePath,
        language: this.detectLanguage(ext),
        linesOfCode: 0,
        logicalLines: 0,
        commentLines: 0,
        blankLines: 0,
        cyclomaticComplexity: 1, // Base complexity
        cognitiveComplexity: 0,
        functionCount: 0,
        maxFunctionLength: 0,
        averageFunctionLength: 0,
        nestingDepth: 0,
        maintainabilityIndex: 0,
        halsteadMetrics: {
          vocabulary: 0,
          length: 0,
          volume: 0,
          difficulty: 0,
          effort: 0
        }
      };

      // Calculate basic metrics
      this.calculateBasicMetrics(content, metrics);
      
      // Language-specific complexity analysis
      switch (metrics.language) {
        case 'javascript':
        case 'typescript':
          this.analyzeJavaScript(content, metrics);
          break;
        case 'python':
          this.analyzePython(content, metrics);
          break;
        case 'java':
        case 'csharp':
          this.analyzeCStyle(content, metrics);
          break;
        case 'go':
          this.analyzeGo(content, metrics);
          break;
        case 'rust':
          this.analyzeRust(content, metrics);
          break;
        default:
          this.analyzeGeneric(content, metrics);
      }

      // Calculate maintainability index
      this.calculateMaintainabilityIndex(metrics);

      // Determine complexity grade
      metrics.complexityGrade = this.getComplexityGrade(metrics);
      metrics.refactoringPriority = this.getRefactoringPriority(metrics);

      return metrics;
    } catch (err) {
      console.error(`Error analyzing ${filePath}:`, err.message);
      return null;
    }
  }

  /**
   * Detect programming language from extension
   */
  detectLanguage(ext) {
    const languages = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.php': 'php',
      '.rb': 'ruby'
    };
    return languages[ext] || 'generic';
  }

  /**
   * Calculate basic line metrics
   */
  calculateBasicMetrics(content, metrics) {
    const lines = content.split('\n');
    let inMultiLineComment = false;
    let commentStart = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Count total lines
      metrics.linesOfCode++;

      // Check for blank lines
      if (trimmed === '') {
        metrics.blankLines++;
        continue;
      }

      // Handle multi-line comments
      if (inMultiLineComment) {
        metrics.commentLines++;
        if (trimmed.includes('*/') || trimmed.includes("'''")) {
          inMultiLineComment = false;
        }
        continue;
      }

      // Check for comment starts
      if (trimmed.startsWith('/*') || trimmed.startsWith("'''")) {
        metrics.commentLines++;
        inMultiLineComment = true;
        continue;
      }

      // Single line comments
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || 
          trimmed.startsWith('--') || trimmed.startsWith('/*')) {
        metrics.commentLines++;
        continue;
      }

      // Logical line of code
      metrics.logicalLines++;
    }
  }

  /**
   * Analyze JavaScript/TypeScript complexity
   */
  analyzeJavaScript(content, metrics) {
    // Count functions
    const functionMatches = content.match(/\b(function|const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/g) || [];
    const methodMatches = content.match(/\b(async\s*)?\w+\s*\([^)]*\)\s*\{/g) || [];
    const arrowMatches = content.match(/\([^)]*\)\s*=>/g) || [];
    
    metrics.functionCount = functionMatches.length + methodMatches.length + arrowMatches.length;

    // Calculate cyclomatic complexity
    const complexityKeywords = ['if', 'else', 'while', 'for', 'forEach', 'map', 'filter', 'reduce', 
                                'switch', 'case', 'catch', '&&', '||', '?'];
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        metrics.cyclomaticComplexity += matches.length;
      }
    });

    // Count ternary operators
    const ternaryMatches = content.match(/\?\s*[^:]*\s*:/g) || [];
    metrics.cyclomaticComplexity += ternaryMatches.length;

    // Calculate nesting depth
    const lines = content.split('\n');
    let currentDepth = 0;
    let maxDepth = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Increase depth
      if (/\{\s*$/.test(trimmed) || /\{\s*\/\//.test(trimmed)) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      
      // Decrease depth
      if (/^\s*\}/.test(trimmed)) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
    
    metrics.nestingDepth = maxDepth;

    // Estimate function lengths
    this.estimateFunctionLengths(content, metrics, /\bfunction\b|\b=>\b|\basync\b/);

    // Calculate cognitive complexity (simplified)
    metrics.cognitiveComplexity = this.calculateCognitiveComplexity(content);
  }

  /**
   * Analyze Python complexity
   */
  analyzePython(content, metrics) {
    // Count functions and methods
    const functionMatches = content.match(/^\s*def\s+\w+\s*\(/gm) || [];
    const classMatches = content.match(/^\s*class\s+\w+/gm) || [];
    
    metrics.functionCount = functionMatches.length;

    // Calculate cyclomatic complexity
    const complexityKeywords = ['if', 'elif', 'else', 'while', 'for', 'except', 
                                'with', 'and', 'or', 'assert'];
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        metrics.cyclomaticComplexity += matches.length;
      }
    });

    // Count list comprehensions (add complexity)
    const comprehensionMatches = content.match(/\[.*for.*in.*\]/g) || [];
    metrics.cyclomaticComplexity += comprehensionMatches.length;

    // Calculate nesting depth
    const lines = content.split('\n');
    let currentDepth = 0;
    let maxDepth = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      
      // Calculate indentation level (assuming 4 spaces)
      const indent = line.match(/^(\s*)/)[0].length;
      const depth = Math.floor(indent / 4);
      maxDepth = Math.max(maxDepth, depth);
    }
    
    metrics.nestingDepth = maxDepth;

    // Estimate function lengths
    this.estimateFunctionLengths(content, metrics, /^\s*def\s+/m);

    metrics.cognitiveComplexity = this.calculateCognitiveComplexity(content);
  }

  /**
   * Analyze C-style languages (Java, C#, C/C++)
   */
  analyzeCStyle(content, metrics) {
    // Count functions
    const functionMatches = content.match(/\b\w+\s+\w+\s*\([^)]*\)\s*\{/g) || [];
    metrics.functionCount = functionMatches.length;

    // Calculate cyclomatic complexity
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 
                                'catch', 'catch', '&&', '||', '?'];
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        metrics.cyclomaticComplexity += matches.length;
      }
    });

    // Calculate nesting depth
    const lines = content.split('\n');
    let currentDepth = 0;
    let maxDepth = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('{')) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      
      if (trimmed.includes('}')) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
    
    metrics.nestingDepth = maxDepth;

    // Estimate function lengths
    this.estimateFunctionLengths(content, metrics, /\b\w+\s+\w+\s*\(/);

    metrics.cognitiveComplexity = this.calculateCognitiveComplexity(content);
  }

  /**
   * Analyze Go complexity
   */
  analyzeGo(content, metrics) {
    // Count functions
    const functionMatches = content.match(/^\s*func\s+/gm) || [];
    metrics.functionCount = functionMatches.length;

    // Calculate cyclomatic complexity
    const complexityKeywords = ['if', 'else', 'for', 'switch', 'case', 
                                'select', 'go', 'defer', '&&', '||'];
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        metrics.cyclomaticComplexity += matches.length;
      }
    });

    metrics.cognitiveComplexity = this.calculateCognitiveComplexity(content);
  }

  /**
   * Analyze Rust complexity
   */
  analyzeRust(content, metrics) {
    // Count functions
    const functionMatches = content.match(/^\s*fn\s+\w+/gm) || [];
    metrics.functionCount = functionMatches.length;

    // Calculate cyclomatic complexity
    const complexityKeywords = ['if', 'else', 'while', 'for', 'match', 'Some', 
                                'None', 'Ok', 'Err', '&&', '||'];
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        metrics.cyclomaticComplexity += matches.length;
      }
    });

    // Count match arms (high complexity)
    const matchArms = content.match(/=>\s*\{/g) || [];
    metrics.cyclomaticComplexity += matchArms.length;

    metrics.cognitiveComplexity = this.calculateCognitiveComplexity(content);
  }

  /**
   * Generic analysis for other languages
   */
  analyzeGeneric(content, metrics) {
    // Basic complexity estimation
    const conditionalMatches = content.match(/\b(if|else|while|for|switch|case|and|or)\b/gi) || [];
    metrics.cyclomaticComplexity = 1 + conditionalMatches.length;
    
    metrics.cognitiveComplexity = Math.floor(metrics.cyclomaticComplexity * 0.8);
  }

  /**
   * Estimate function lengths from content
   */
  estimateFunctionLengths(content, metrics, functionPattern) {
    const lines = content.split('\n');
    const functionStartRegex = functionPattern;
    
    let currentFunctionLines = 0;
    let inFunction = false;
    let braceCount = 0;
    let functionLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check for function start
      if (functionStartRegex.test(line) && !inFunction) {
        inFunction = true;
        braceCount = 0;
        currentFunctionLines = 1;
        continue;
      }
      
      if (inFunction) {
        currentFunctionLines++;
        
        // Track braces for C-style languages
        if (trimmed.includes('{')) braceCount++;
        if (trimmed.includes('}')) braceCount--;
        
        // Track indentation for Python
        if (metrics.language === 'python') {
          if (trimmed !== '' && !line.startsWith(' ') && !line.startsWith('\t')) {
            functionLines.push(currentFunctionLines);
            inFunction = false;
            currentFunctionLines = 0;
          }
        }
        
        // End of function for C-style
        if (braceCount === 0 && trimmed.includes('}')) {
          functionLines.push(currentFunctionLines);
          inFunction = false;
          currentFunctionLines = 0;
        }
      }
    }
    
    if (functionLines.length > 0) {
      metrics.maxFunctionLength = Math.max(...functionLines);
      metrics.averageFunctionLength = functionLines.reduce((a, b) => a + b, 0) / functionLines.length;
    }
  }

  /**
   * Calculate cognitive complexity (simplified model)
   */
  calculateCognitiveComplexity(content) {
    let cognitiveScore = 0;
    
    // Nesting increments
    const nestingMatches = content.match(/\b(if|while|for|switch)\b/g) || [];
    cognitiveScore += nestingMatches.length;
    
    // Sequence of logical operators
    const logicalMatches = content.match(/&&|\|\|/g) || [];
    cognitiveScore += logicalMatches.length * 0.5;
    
    // Recursion detection (simplified)
    const lines = content.split('\n');
    for (const line of lines) {
      if (/\b\w+\s*\(.*\)\s*\{/.test(line) && line.includes('(')) {
        const potentialFuncName = line.match(/\b(\w+)\s*\(/)?.[1];
        if (potentialFuncName && content.includes(potentialFuncName)) {
          // Check for self-call
          const selfCallRegex = new RegExp(`\\b${potentialFuncName}\\s*\\(`, 'g');
          const calls = content.match(selfCallRegex) || [];
          if (calls.length > 1) {
            cognitiveScore += 3; // Recursion penalty
          }
        }
      }
    }
    
    return Math.floor(cognitiveScore);
  }

  /**
   * Calculate maintainability index (0-100 scale)
   * Based on Microsoft Research formula
   */
  calculateMaintainabilityIndex(metrics) {
    // Simplified maintainability calculation
    const avgCyclomatic = metrics.functionCount > 0 ? 
      metrics.cyclomaticComplexity / metrics.functionCount : metrics.cyclomaticComplexity;
    
    const avgFunctionLength = metrics.averageFunctionLength || 0;
    const commentRatio = metrics.linesOfCode > 0 ? 
      (metrics.commentLines / metrics.linesOfCode) : 0;
    
    // Higher is better (0-100)
    let index = 100;
    
    // Penalize high cyclomatic complexity
    index -= avgCyclomatic * 3;
    
    // Penalize long functions
    index -= avgFunctionLength * 0.5;
    
    // Reward comments
    index += commentRatio * 20;
    
    // Penalize nesting depth
    index -= metrics.nestingDepth * 2;
    
    // Clamp to 0-100
    metrics.maintainabilityIndex = Math.max(0, Math.min(100, Math.round(index)));
  }

  /**
   * Get complexity grade
   */
  getComplexityGrade(metrics) {
    const cc = metrics.cyclomaticComplexity;
    const mi = metrics.maintainabilityIndex;
    
    if (cc <= 10 && mi >= 80) return 'A';
    if (cc <= 20 && mi >= 60) return 'B';
    if (cc <= 40 && mi >= 40) return 'C';
    if (cc <= 60 && mi >= 20) return 'D';
    return 'F';
  }

  /**
   * Get refactoring priority
   */
  getRefactoringPriority(metrics) {
    const cc = metrics.cyclomaticComplexity;
    const mi = metrics.maintainabilityIndex;
    const avgFuncLength = metrics.averageFunctionLength;
    
    if (cc > 50 || mi < 30 || avgFuncLength > 100) return 'critical';
    if (cc > 30 || mi < 50 || avgFuncLength > 50) return 'high';
    if (cc > 15 || mi < 70) return 'medium';
    return 'low';
  }

  /**
   * Batch analyze multiple files
   */
  async analyzeFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      const metrics = await this.analyzeFile(filePath);
      if (metrics) {
        results.push(metrics);
      }
    }
    
    return results;
  }

  /**
   * Get summary statistics for a set of files
   */
  getSummaryStats(metricsArray) {
    if (metricsArray.length === 0) return null;
    
    const totalFiles = metricsArray.length;
    const totalLOC = metricsArray.reduce((sum, m) => sum + m.logicalLines, 0);
    const avgComplexity = metricsArray.reduce((sum, m) => sum + m.cyclomaticComplexity, 0) / totalFiles;
    const avgMaintainability = metricsArray.reduce((sum, m) => sum + m.maintainabilityIndex, 0) / totalFiles;
    
    // Grade distribution
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    metricsArray.forEach(m => grades[m.complexityGrade]++);
    
    // Priority distribution
    const priorities = { critical: 0, high: 0, medium: 0, low: 0 };
    metricsArray.forEach(m => priorities[m.refactoringPriority]++);
    
    // Most complex files
    const mostComplex = [...metricsArray]
      .sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity)
      .slice(0, 10);
    
    // Least maintainable files
    const leastMaintainable = [...metricsArray]
      .sort((a, b) => a.maintainabilityIndex - b.maintainabilityIndex)
      .slice(0, 10);
    
    return {
      totalFiles,
      totalLOC,
      avgComplexity: Math.round(avgComplexity * 100) / 100,
      avgMaintainability: Math.round(avgMaintainability * 100) / 100,
      gradeDistribution: grades,
      priorityDistribution: priorities,
      mostComplexFiles: mostComplex,
      leastMaintainableFiles: leastMaintainable,
      filesNeedingRefactoring: metricsArray.filter(m => 
        m.refactoringPriority === 'critical' || m.refactoringPriority === 'high'
      ).length
    };
  }
}

module.exports = ComplexityAnalyzer;
