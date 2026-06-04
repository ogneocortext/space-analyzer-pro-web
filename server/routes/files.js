/**
 * File Operations Routes Module
 * Handles file management: delete, rename, reveal, search
 */

const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");

class FileRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    this.setupRoutes();
  }

  /**
   * Sanitize search query to prevent ReDoS attacks
   * @param {string} query - Raw search query
   * @returns {string|null} Sanitized query or null if invalid
   */
  sanitizeSearchQuery(query) {
    if (!query || typeof query !== "string") {
      return null;
    }

    // Limit length to prevent excessive processing
    const MAX_LENGTH = 100;
    let sanitized = query.slice(0, MAX_LENGTH);

    // Remove regex special characters that could cause ReDoS
    const dangerousChars = /[.*+?^${}()|[\]\\]/g;
    sanitized = sanitized.replace(dangerousChars, "");

    // Check for repeated characters that could cause catastrophic backtracking
    const repeatedPattern = /(.)(\1{10,})/;
    if (repeatedPattern.test(sanitized)) {
      // Remove excessive repeated characters
      sanitized = sanitized.replace(/(.)(\1{10,})/g, "$1$1$1");
    }

    // Trim whitespace
    sanitized = sanitized.trim();

    // Return null if empty after sanitization
    if (sanitized.length === 0) {
      return null;
    }

    return sanitized;
  }

  setupRoutes() {
    // Delete file
    this.router.post("/delete", async (req, res) => {
      try {
        const { path: filePath } = req.body;

        if (!filePath || !this.server.isValidPath(filePath)) {
          return res.status(400).json({ error: "Invalid path" });
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "File not found" });
        }

        // Delete the file
        fs.unlinkSync(filePath);

        res.json({
          success: true,
          message: "File deleted successfully",
          path: filePath,
        });
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Rename file
    this.router.post("/rename", async (req, res) => {
      try {
        const { oldPath, newName } = req.body;

        if (!oldPath || !newName || !this.server.isValidPath(oldPath)) {
          return res.status(400).json({ error: "Invalid path or name" });
        }

        // Check if file exists
        if (!fs.existsSync(oldPath)) {
          return res.status(404).json({ error: "File not found" });
        }

        // Build new path
        const dir = path.dirname(oldPath);
        const newPath = path.join(dir, newName);

        // Check if new name already exists
        if (fs.existsSync(newPath)) {
          return res.status(409).json({ error: "A file with that name already exists" });
        }

        // Rename the file
        fs.renameSync(oldPath, newPath);

        res.json({
          success: true,
          message: "File renamed successfully",
          oldPath,
          newPath,
        });
      } catch (error) {
        console.error("Rename error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Reveal file in explorer
    this.router.post("/reveal", async (req, res) => {
      const { path: filePath } = req.body;

      if (!filePath || !this.server.isValidPath(filePath)) {
        return res.status(400).json({ error: "Invalid path" });
      }

      try {
        let command, args;
        if (process.platform === "win32") {
          command = "explorer";
          args = ["/select", filePath];
        } else if (process.platform === "darwin") {
          command = "open";
          args = ["-R", filePath];
        } else {
          command = "xdg-open";
          args = [path.dirname(filePath)];
        }

        spawn(command, args, { shell: false });

        res.json({ success: true });
      } catch (error) {
        console.error("Reveal error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Open file explorer at location
    this.router.post("/open-explorer", async (req, res) => {
      try {
        const homeDir = os.homedir();
        if (process.platform === "win32") {
          spawn("explorer", [homeDir]);
        } else if (process.platform === "darwin") {
          spawn("open", [homeDir]);
        } else {
          spawn("xdg-open", [homeDir]);
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Open explorer error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Search files
    this.router.post("/search", async (req, res) => {
      try {
        const {
          directory,
          query,
          extensions = [],
          categories = [],
          minSize,
          maxSize,
          dateFrom,
          dateTo,
          limit = 100,
        } = req.body;

        if (!directory) {
          return res.status(400).json({ error: "Directory is required" });
        }

        // Get analysis data
        let files = [];
        for (const [id, data] of this.server.analysisResults) {
          if (data.directory === directory || data.directoryPath === directory) {
            files = data.files || [];
            break;
          }
        }

        if (files.length === 0) {
          return res.status(404).json({ error: "No analysis data found for this directory" });
        }

        // Apply filters
        let results = files;

        if (query) {
          // Sanitize query to prevent ReDoS attacks
          const sanitizedQuery = this.sanitizeSearchQuery(query);
          if (sanitizedQuery === null) {
            return res.status(400).json({ error: "Invalid search query" });
          }
          const queryLower = sanitizedQuery.toLowerCase();
          results = results.filter(
            (f) =>
              f.name.toLowerCase().includes(queryLower) || f.path.toLowerCase().includes(queryLower)
          );
        }

        if (extensions.length > 0) {
          results = results.filter((f) => {
            const ext = path.extname(f.name).toLowerCase().replace(".", "");
            return extensions.includes(ext);
          });
        }

        if (categories.length > 0) {
          results = results.filter((f) => categories.includes(f.category));
        }

        if (minSize !== undefined) {
          results = results.filter((f) => f.size >= minSize);
        }

        if (maxSize !== undefined) {
          results = results.filter((f) => f.size <= maxSize);
        }

        // Date filtering would require mtime from stats

        // Sort by relevance (name match priority)
        if (query) {
          results.sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
            const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            return b.size - a.size;
          });
        } else {
          results.sort((a, b) => b.size - a.size);
        }

        // Limit results
        const limitedResults = results.slice(0, limit);

        res.json({
          success: true,
          directory,
          query,
          results: limitedResults,
          total: results.length,
          filters: {
            extensions,
            categories,
            minSize,
            maxSize,
          },
        });
      } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Browse for folder (folder selection dialog)
    this.router.post("/browse", async (req, res) => {
      try {
        // Since we can't actually open a file dialog from the server,
        // we return common directories as suggestions
        const os = require("os");
        const homeDir = os.homedir();
        const path = require("path");
        const fs = require("fs");

        const commonPaths = [
          { name: "Home", path: homeDir },
          { name: "Documents", path: path.join(homeDir, "Documents") },
          { name: "Downloads", path: path.join(homeDir, "Downloads") },
          { name: "Desktop", path: path.join(homeDir, "Desktop") },
          { name: "Pictures", path: path.join(homeDir, "Pictures") },
          { name: "Music", path: path.join(homeDir, "Music") },
          { name: "Videos", path: path.join(homeDir, "Videos") },
        ].filter((p) => fs.existsSync(p.path));

        // Add root drives on Windows
        if (process.platform === "win32") {
          const drives = ["C:", "D:", "E:"].filter((d) => fs.existsSync(d + "\\"));
          drives.forEach((drive) => {
            commonPaths.unshift({ name: `${drive} Drive`, path: drive + "\\" });
          });
        }

        res.json({
          success: true,
          message: "Select a directory path from the suggestions or provide your own",
          suggestions: commonPaths,
          platform: process.platform,
        });
      } catch (error) {
        console.error("Browse error:", error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = FileRoutes;
