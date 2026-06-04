/**
 * NLP Routes Module
 * Handles natural language search, suggestions, and query history
 */

const express = require("express");

class NLPRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    this.queryHistory = new Map();
    this.popularQueries = new Map();
    this.setupRoutes();
  }

  setupRoutes() {
    // Natural language search
    this.router.post("/nlp/search", async (req, res) => {
      try {
        const { query, directory, options = {} } = req.body;

        if (!query) {
          return res.status(400).json({
            success: false,
            error: "Query is required",
          });
        }

        // Track query
        this.trackQuery(query);

        // Parse natural language query
        const parsedQuery = this.parseNaturalLanguage(query);

        // Search in analysis results with enhanced context
        let results = [];
        let suggestions = [];

        // Check in-memory analysis results
        if (this.server?.analysisResults) {
          for (const [id, data] of this.server.analysisResults) {
            if (data.files) {
              const matchingFiles = data.files.filter((file) => {
                return this.matchesQuery(file, parsedQuery);
              });
              results.push(
                ...matchingFiles.map((f) => ({
                  ...f,
                  analysisId: id,
                  analysisPath: data.directory || data.scan_config?.path,
                  relevanceScore: this.calculateRelevanceScore(f, parsedQuery),
                }))
              );
            }
          }
        }

        // Also check database for additional analysis data
        if (this.server?.knowledgeDB?.db) {
          try {
            const dbAnalyses = await this.server.knowledgeDB.getRecentAnalyses(10);
            for (const analysis of dbAnalyses) {
              if (analysis.analysis_data && analysis.analysis_data.files) {
                const matchingFiles = analysis.analysis_data.files.filter((file) => {
                  return this.matchesQuery(file, parsedQuery);
                });
                results.push(
                  ...matchingFiles.map((f) => ({
                    ...f,
                    analysisId: analysis.id,
                    analysisPath: analysis.directory,
                    fromDatabase: true,
                    relevanceScore: this.calculateRelevanceScore(f, parsedQuery),
                  }))
                );
              }
            }
          } catch (dbError) {
            console.warn("Failed to search database for NLP:", dbError.message);
          }
        }

        // Sort results by relevance score
        results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

        // Generate suggestions based on query
        suggestions = this.generateSuggestions(query);

        res.json({
          success: true,
          query,
          parsedQuery,
          results: results.slice(0, options.limit || 50),
          total: results.length,
          suggestions,
        });
      } catch (error) {
        console.error("NLP search error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get suggestions for query prefix
    this.router.get("/nlp/suggestions/:prefix", async (req, res) => {
      try {
        const { prefix } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const suggestions = this.generateSuggestions(prefix).slice(0, limit);

        res.json({
          success: true,
          prefix: decodeURIComponent(prefix),
          suggestions,
        });
      } catch (error) {
        console.error("NLP suggestions error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get popular queries
    this.router.get("/nlp/popular", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 10;

        const popular = Array.from(this.popularQueries.entries())
          .map(([query, count]) => ({ query, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

        res.json({
          success: true,
          popular,
        });
      } catch (error) {
        console.error("NLP popular error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Get query history
    this.router.get("/nlp/history", async (req, res) => {
      try {
        const history = Array.from(this.queryHistory.entries())
          .map(([query, data]) => ({
            query,
            count: data.count,
            lastUsed: data.lastUsed,
          }))
          .sort((a, b) => b.lastUsed - a.lastUsed);

        res.json({
          success: true,
          history,
        });
      } catch (error) {
        console.error("NLP history error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  }

  trackQuery(query) {
    const normalized = query.toLowerCase().trim();
    const now = Date.now();

    // Update history
    if (this.queryHistory.has(normalized)) {
      const data = this.queryHistory.get(normalized);
      data.count++;
      data.lastUsed = now;
    } else {
      this.queryHistory.set(normalized, { count: 1, lastUsed: now });
    }

    // Update popular
    if (this.popularQueries.has(normalized)) {
      this.popularQueries.set(normalized, this.popularQueries.get(normalized) + 1);
    } else {
      this.popularQueries.set(normalized, 1);
    }
  }

  parseNaturalLanguage(query) {
    const lowerQuery = query.toLowerCase();

    // Extract file type patterns
    const fileTypeMatch = lowerQuery.match(/\.(\w+)/g);
    const fileTypes = fileTypeMatch ? fileTypeMatch.map((ext) => ext.replace(".", "")) : [];

    // Extract size patterns
    const sizeMatch = lowerQuery.match(
      /(larger? than|bigger than|smaller? than|less than)\s+(\d+(?:\.\d+)?)\s*(gb|mb|kb|bytes?)/i
    );
    let sizeFilter = null;
    if (sizeMatch) {
      const operator = sizeMatch[1];
      const value = parseFloat(sizeMatch[2]);
      const unit = sizeMatch[3].toLowerCase();
      const multiplier =
        unit === "gb" ? 1024 * 1024 * 1024 : unit === "mb" ? 1024 * 1024 : unit === "kb" ? 1024 : 1;
      sizeFilter = {
        operator: operator.includes("large") || operator.includes("bigger") ? ">" : "<",
        value: value * multiplier,
      };
    }

    // Extract date patterns
    const dateMatch = lowerQuery.match(
      /(newer? than|older than|after|before|in the last)\s+(\d+)\s*(day|week|month|year)s?/i
    );
    let dateFilter = null;
    if (dateMatch) {
      const operator = dateMatch[1];
      const value = parseInt(dateMatch[2]);
      const unit = dateMatch[3].toLowerCase();
      const days =
        unit === "day"
          ? value
          : unit === "week"
            ? value * 7
            : unit === "month"
              ? value * 30
              : value * 365;
      dateFilter = {
        operator: operator.includes("new") || operator.includes("after") ? ">" : "<",
        days,
      };
    }

    // Extract category patterns
    const categories = [];
    const categoryKeywords = {
      image: ["image", "picture", "photo", "jpg", "jpeg", "png", "gif"],
      video: ["video", "movie", "mp4", "avi", "mkv"],
      audio: ["audio", "music", "song", "mp3", "wav"],
      document: ["document", "pdf", "doc", "text", "word"],
      code: ["code", "source", "programming", "javascript", "python"],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((kw) => lowerQuery.includes(kw))) {
        categories.push(category);
      }
    }

    return {
      original: query,
      fileTypes,
      sizeFilter,
      dateFilter,
      categories,
      keywords: lowerQuery.split(/\s+/).filter((w) => w.length > 2),
    };
  }

  matchesQuery(file, parsedQuery) {
    const fileName = (file.name || "").toLowerCase();
    const filePath = (file.path || "").toLowerCase();
    const fileCategory = (file.category || "").toLowerCase();
    const fileExtension = (file.extension || "").toLowerCase().replace(".", "");

    // Check file types
    if (parsedQuery.fileTypes.length > 0) {
      if (!parsedQuery.fileTypes.includes(fileExtension)) {
        return false;
      }
    }

    // Check categories
    if (parsedQuery.categories.length > 0) {
      if (!parsedQuery.categories.includes(fileCategory)) {
        return false;
      }
    }

    // Check keywords
    const searchText = `${fileName} ${filePath}`;
    const hasKeyword = parsedQuery.keywords.some((kw) => searchText.includes(kw));

    return hasKeyword;
  }

  generateSuggestions(prefix) {
    const lowerPrefix = prefix.toLowerCase();
    const commonSuggestions = [
      "large files",
      "old files",
      "duplicate files",
      "images",
      "videos",
      "documents",
      "temporary files",
      "files larger than 100MB",
      "files older than 30 days",
      "empty directories",
    ];

    return commonSuggestions.filter(
      (s) =>
        s.toLowerCase().includes(lowerPrefix) || lowerPrefix.includes(s.toLowerCase().split(" ")[0])
    );
  }

  calculateRelevanceScore(file, parsedQuery) {
    let score = 0;

    // Name matching (highest weight)
    if (file.name && parsedQuery.terms) {
      const nameLower = file.name.toLowerCase();
      parsedQuery.terms.forEach((term) => {
        if (nameLower.includes(term.toLowerCase())) {
          score += 10;
        }
      });
    }

    // Extension matching
    if (file.extension && parsedQuery.fileTypes) {
      if (parsedQuery.fileTypes.includes(file.extension.toLowerCase())) {
        score += 5;
      }
    }

    // Size matching
    if (parsedQuery.sizeRange && file.size) {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB >= parsedQuery.sizeRange.min && sizeMB <= parsedQuery.sizeRange.max) {
        score += 3;
      }
    }

    // Path matching
    if (file.path && parsedQuery.terms) {
      const pathLower = file.path.toLowerCase();
      parsedQuery.terms.forEach((term) => {
        if (pathLower.includes(term.toLowerCase())) {
          score += 2;
        }
      });
    }

    return score;
  }

  getRouter() {
    return this.router;
  }
}

module.exports = NLPRoutes;
