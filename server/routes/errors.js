/**
 * Error Management Routes
 * Provides API endpoints for viewing, managing, and exporting error logs
 */

const express = require("express");
const path = require("path");
// Simple error logger replacement
const getErrorLogger = () => ({
  error: (message) => console.error(`[ERRORS] ${message}`),
  warn: (message) => console.warn(`[ERRORS] ${message}`),
  info: (message) => console.log(`[ERRORS] ${message}`),
  debug: (message) => console.debug(`[ERRORS] ${message}`),
});

class ErrorRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    this.errorLogger = getErrorLogger();
    this.setupRoutes();
  }

  setupRoutes() {
    /**
     * Health check for error routes
     * GET /api/errors/health
     */
    this.router.get("/errors/health", (req, res) => {
      res.json({
        success: true,
        message: "Error routes are working",
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Report error from frontend
     * POST /api/errors/report
     */
    this.router.post("/errors/report", async (req, res) => {
      try {
        const errorData = req.body;

        if (!errorData || !errorData.message) {
          return res.status(400).json({
            success: false,
            error: "Invalid error data",
          });
        }

        const clientInfo = {
          userAgent: req.headers["user-agent"],
          ip: req.ip || req.connection?.remoteAddress,
          viewport: errorData.viewport,
        };

        const errorId = await this.errorLogger.logFrontendError(
          errorData,
          clientInfo,
        );

        res.json({
          success: true,
          errorId,
          message: "Error logged successfully",
        });
      } catch (error) {
        console.error("Failed to log frontend error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to log error",
        });
      }
    });

    /**
     * Get recent errors
     * GET /api/errors/recent?limit=50&source=frontend
     */
    this.router.get("/errors/recent", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 50;
        const source = req.query.source || null;

        const errors = await this.errorLogger.getRecentErrors(limit, source);

        res.json({
          success: true,
          errors,
          count: errors.length,
          meta: {
            limit,
            source,
          },
        });
      } catch (error) {
        console.error("Failed to get recent errors:", error);
        res.status(500).json({
          success: false,
          error: "Failed to retrieve errors",
        });
      }
    });

    /**
     * Get error statistics
     * GET /api/errors/stats?days=7
     */
    this.router.get("/errors/stats", async (req, res) => {
      try {
        const days = parseInt(req.query.days) || 7;
        const stats = await this.errorLogger.getErrorStats(days);

        res.json({
          success: true,
          stats,
          meta: {
            days,
            generatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error("Failed to get error stats:", error);
        res.status(500).json({
          success: false,
          error: "Failed to retrieve error statistics",
        });
      }
    });

    /**
     * Export errors to JSON
     * GET /api/errors/export?limit=1000&source=backend
     */
    this.router.get("/errors/export", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 1000;
        const source = req.query.source || null;
        const format = req.query.format || "json";

        if (format === "json") {
          const errors = await this.errorLogger.getRecentErrors(limit, source);

          res.setHeader("Content-Type", "application/json");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="errors-export-${Date.now()}.json"`,
          );

          res.json({
            exportedAt: new Date().toISOString(),
            count: errors.length,
            errors,
          });
        } else {
          res.status(400).json({
            success: false,
            error: 'Unsupported format. Use "json"',
          });
        }
      } catch (error) {
        console.error("Failed to export errors:", error);
        res.status(500).json({
          success: false,
          error: "Failed to export errors",
        });
      }
    });

    /**
     * Clear all error logs (admin only - in production should require auth)
     * DELETE /api/errors/clear
     */
    this.router.delete("/errors/clear", async (req, res) => {
      try {
        await this.errorLogger.clearAllLogs();

        res.json({
          success: true,
          message: "All error logs cleared",
        });
      } catch (error) {
        console.error("Failed to clear error logs:", error);
        res.status(500).json({
          success: false,
          error: "Failed to clear error logs",
        });
      }
    });

    /**
     * Get error by ID
     * GET /api/errors/:id
     */
    this.router.get("/errors/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const errors = await this.errorLogger.getRecentErrors(1000);
        const error = errors.find((e) => e.id === id);

        if (!error) {
          return res.status(404).json({
            success: false,
            error: "Error not found",
          });
        }

        res.json({
          success: true,
          error,
        });
      } catch (err) {
        console.error("Failed to get error by ID:", err);
        res.status(500).json({
          success: false,
          error: "Failed to retrieve error",
        });
      }
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = ErrorRoutes;
