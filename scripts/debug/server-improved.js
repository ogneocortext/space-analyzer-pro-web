/**
 * Space Analyzer - Improved Backend Server
 * Enhanced with better error handling, retry logic, and graceful degradation
 */

// Global error handling to prevent crashes
process.on("uncaughtException", (error) => {
  console.error("💥 UNCAUGHT EXCEPTION - Server will stay running:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ UNHANDLED REJECTION at:", promise, "reason:", reason);
});

// Dynamic memory management based on system resources
const os = require("os");
const systemMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
const maxMemoryGB = Math.min(Math.floor(systemMemoryGB * 0.6), 8); // 60% of system memory, max 8GB

const v8 = require("v8");
v8.setFlagsFromString(`--max-old-space-size=${maxMemoryGB * 1024}`);
console.log(
  `📊 Memory limit set to ${maxMemoryGB}GB (${Math.round((maxMemoryGB / systemMemoryGB) * 100)}% of system memory)`,
);

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { EventEmitter } = require("events");
const { Temporal } = require("@js-temporal/polyfill");

// Import improved database manager
const DatabaseManager = require("./db/database-manager");

// Load environment variables
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

// Import routes and utilities
const RoutesManager = require("./routes");
const { isValidPath, normalizePath } = require("./modules/file-utils");

// Simple error logger replacement
const getErrorLogger = () => ({
  error: (message) => console.error(`[SERVER] ${message}`),
  warn: (message) => console.warn(`[SERVER] ${message}`),
  info: (message) => console.log(`[SERVER] ${message}`),
  debug: (message) => console.debug(`[SERVER] ${message}`),
});

class ImprovedSpaceAnalyzerServer {
  constructor() {
    this.app = express();
    // Use fixed port 8080 as expected by the status check
    this.port = process.env.PORT || 8080;
    this.eventEmitter = new EventEmitter();
    this.errorLogger = getErrorLogger();
    this.rateLimitStore = new Map();

    // Service status tracking
    this.services = {
      database: { status: "unknown", manager: null },
      routes: { status: "unknown", loaded: 0 },
      server: { status: "unknown", startTime: null },
    };

    // Performance metrics
    this.metrics = {
      initTime: 0,
      requestCount: 0,
      errorCount: 0,
      memoryUsage: 0,
      uptime: 0,
    };

    this.initialize();
  }

  async initialize() {
    const startTime = Date.now();

    try {
      console.log("🚀 Initializing Space Analyzer Server (Improved)...\n");

      // Initialize services in dependency order
      await this.initializeDatabase();
      await this.setupMiddleware();
      await this.setupRoutes();
      await this.setupErrorHandling();
      await this.startServer();

      this.metrics.initTime = Date.now() - startTime;
      this.services.server.status = "running";
      this.services.server.startTime = Date.now();

      console.log(
        `\n✅ Server initialized successfully in ${this.metrics.initTime}ms`,
      );
      this.printStartupSummary();

      // Start performance monitoring
      this.startPerformanceMonitoring();
    } catch (error) {
      console.error("\n❌ Server initialization failed:", error.message);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Initialize database with improved manager
   */
  async initializeDatabase() {
    console.log("🗄️ Initializing database...");

    try {
      const dbPath = path.join(__dirname, "data", "space-analyzer.db");
      this.services.database.manager = new DatabaseManager({
        dbPath,
        maxRetries: 3,
        retryDelay: 1000,
        healthCheckInterval: 30000,
      });

      // Listen to database events
      this.services.database.manager.on("initialization:start", () => {
        console.log("🔄 Database initialization starting...");
      });

      this.services.database.manager.on("initialization:success", (metrics) => {
        console.log(`✅ Database initialized in ${metrics.initTime}ms`);
        this.services.database.status = "healthy";
      });

      this.services.database.manager.on("initialization:error", (error) => {
        console.error("❌ Database initialization failed:", error.message);
        this.services.database.status = "failed";
      });

      this.services.database.manager.on("health:check", (health) => {
        this.services.database.status = health.status;
      });

      // Initialize database with timeout
      const initPromise = this.services.database.manager.initialize();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Database initialization timeout")),
          10000,
        ),
      );

      await Promise.race([initPromise, timeoutPromise]);

      // Verify database is actually ready
      const dbStatus = this.services.database.manager.getStatus();
      if (dbStatus.initialized && dbStatus.health !== "failed") {
        this.services.database.status = "healthy";
        console.log("✅ Database successfully initialized and ready");
      } else {
        throw new Error("Database not properly initialized");
      }
    } catch (error) {
      console.error("❌ Database initialization failed:", error.message);
      console.log("🔄 Attempting to use fallback database initialization...");

      // Try fallback initialization with basic SQLite
      try {
        await this.initializeFallbackDatabase();
        this.services.database.status = "degraded";
        console.log(
          "⚠️ Using fallback database mode - some features may be limited",
        );
      } catch (fallbackError) {
        console.error(
          "❌ Fallback database also failed:",
          fallbackError.message,
        );
        this.services.database.status = "failed";
        console.log(
          "🔄 Continuing without database - some features will be limited",
        );

        // Create a mock database manager for compatibility
        this.services.database.manager = {
          getDatabase: () => null,
          getStatus: () => ({ initialized: false, health: "failed" }),
          close: () => Promise.resolve(),
          runQuery: () => Promise.resolve([]),
          runWrite: () => Promise.resolve({ id: 0, changes: 0 }),
        };
      }
    }
  }

  /**
   * Setup security and middleware
   */
  setupSecurity() {
    // Security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
      }),
    );

    // CORS configuration - Updated to include port 5182
    this.app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(",") || [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:5175",
          "http://localhost:5176",
          "http://localhost:5177",
          "http://localhost:5178",
          "http://localhost:5179",
          "http://localhost:5180",
          "http://localhost:5181",
          "http://localhost:5182",
          "http://localhost:8082",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      }),
    );

    // Rate limiting
    this.setupRateLimiting();
  }

  /**
   * Enhanced rate limiting with better tracking
   */
  setupRateLimiting() {
    const WINDOW_MS = 60 * 1000; // 1 minute
    const MAX_REQUESTS = 100;

    this.app.use((req, res, next) => {
      const clientIp = req.ip || req.connection.remoteAddress || "unknown";
      const now = Date.now();

      let entry = this.rateLimitStore.get(clientIp);
      if (!entry) {
        entry = { count: 0, resetTime: now + WINDOW_MS, firstRequest: now };
        this.rateLimitStore.set(clientIp, entry);
      }

      // Reset if window has passed
      if (now > entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + WINDOW_MS;
      }

      // Check limit
      if (entry.count >= MAX_REQUESTS) {
        this.metrics.errorCount++;
        return res.status(429).json({
          success: false,
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          windowMs: WINDOW_MS,
          maxRequests: MAX_REQUESTS,
        });
      }

      entry.count++;
      next();
    });
  }

  /**
   * Setup middleware stack
   */
  async setupMiddleware() {
    console.log("⚙️ Setting up middleware...");

    this.setupSecurity();

    // Compression
    this.app.use(
      compression({
        threshold: 1024, // Only compress responses > 1KB
        level: 6, // Compression level (1-9)
      }),
    );

    // Body parsing
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // Static files
    const distPath = path.join(__dirname, "..", "dist");
    if (fs.existsSync(distPath)) {
      this.app.use(
        express.static(distPath, {
          maxAge: "1d", // Cache for 1 day
          etag: true,
          lastModified: true,
        }),
      );
      console.log(`📁 Serving static files from: ${distPath}`);
    }

    // Request logging
    this.app.use((req, res, next) => {
      this.metrics.requestCount++;
      const start = Date.now();

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === "development") {
          console.log(
            `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
          );
        }
      });

      next();
    });
  }

  /**
   * Fallback database initialization using basic SQLite
   */
  async initializeFallbackDatabase() {
    console.log("🔄 Initializing fallback database...");

    const sqlite3 = require("sqlite3").verbose();
    const dbPath = path.join(__dirname, "data", "space-analyzer.db");

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create a simple database connection
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(
        dbPath,
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        (err) => {
          if (err) {
            console.error(
              "❌ Fallback database connection failed:",
              err.message,
            );
            reject(err);
          } else {
            console.log("✅ Fallback database connected successfully");

            // Create basic tables
            db.serialize(() => {
              db.run(`
                CREATE TABLE IF NOT EXISTS files (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  path TEXT UNIQUE NOT NULL,
                  name TEXT NOT NULL,
                  size INTEGER DEFAULT 0,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);

              db.run(`
                CREATE TABLE IF NOT EXISTS settings (
                  key TEXT PRIMARY KEY,
                  value TEXT NOT NULL,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);
            });

            // Configure database for better performance
            db.serialize(() => {
              // Enable WAL mode for better concurrency
              db.run("PRAGMA journal_mode = WAL");
              db.run("PRAGMA synchronous = NORMAL");
              db.run("PRAGMA cache_size = -10000");

              // Create additional essential tables
              db.run(`
                CREATE TABLE IF NOT EXISTS analysis_results (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  file_id INTEGER,
                  analysis_type TEXT NOT NULL,
                  result TEXT NOT NULL,
                  confidence REAL DEFAULT 0.0,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
                )
              `);

              db.run(`
                CREATE TABLE IF NOT EXISTS system_health (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  metric_name TEXT NOT NULL,
                  metric_value REAL NOT NULL,
                  status TEXT NOT NULL,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);

              // Create indexes for better performance
              db.run(
                "CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)",
              );
              db.run(
                "CREATE INDEX IF NOT EXISTS idx_files_modified_at ON files(modified_at)",
              );
              db.run(
                "CREATE INDEX IF NOT EXISTS idx_analysis_results_file_id ON analysis_results(file_id)",
              );
              db.run(
                "CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health(timestamp)",
              );
            });

            // Store the enhanced database reference
            this.services.database.manager = {
              getDatabase: () => db,
              getStatus: () => ({
                initialized: true,
                health: "degraded",
                path: dbPath,
                fallback: true,
              }),
              close: () => new Promise((res) => db.close(res)),
              runQuery: (sql, params = []) => {
                return new Promise((resolve, reject) => {
                  db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                  });
                });
              },
              runWrite: (sql, params = []) => {
                return new Promise((resolve, reject) => {
                  db.run(sql, params, function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, changes: this.changes });
                  });
                });
              },
              get: (sql, params = []) => {
                return new Promise((resolve, reject) => {
                  db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                  });
                });
              },
            };

            resolve(db);
          }
        },
      );
    });
  }

  /**
   * Setup routes with error handling
   */
  async setupRoutes() {
    console.log("🛣️ Setting up routes...");

    try {
      // Get database reference safely
      let database = null;
      try {
        database = this.services.database.manager?.getDatabase();
      } catch (dbError) {
        console.warn(
          "⚠️ Database not available for routes, running in limited mode",
        );
      }

      // RoutesManager expects the server instance as the first parameter
      const routesManager = new RoutesManager(this);

      // Wait for routes to be initialized
      await routesManager.waitForInitialization();

      // Add debug middleware to track all requests
      this.app.use((req, res, next) => {
        console.log(`🔍 ${req.method} ${req.originalUrl}`);
        next();
      });

      // Add a simple test route to verify Express is working
      this.app.get("/api/test", (req, res) => {
        res.json({
          success: true,
          message: "Test endpoint working",
          timestamp: new Date().toISOString(),
        });
      });

      // Add general routes directly to ensure they work
      this.app.get("/api/health", (req, res) => {
        console.log("🏥 Health endpoint accessed directly");
        res.json({
          success: true,
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: "2.8.9",
          environment: process.env.NODE_ENV || "development",
        });
      });

      this.app.get("/api/debug/routes", (req, res) => {
        console.log("🔍 Debug routes endpoint accessed directly");
        res.json({
          success: true,
          routes: {
            general: ["/api/health", "/api/debug/routes", "/api/test"],
            analysis: ["/api/analysis/*"],
            ai: ["/api/ai/*"],
            files: ["/api/files/*"],
            settings: ["/api/settings/*"],
          },
          timestamp: new Date().toISOString(),
        });
      });

      // Mount all routes to the Express app
      routesManager.mountAll(this.app);

      // Store routesManager for debugging
      this.routesManager = routesManager;

      this.services.routes.status = "loaded";
      this.services.routes.loaded = routesManager.getRouteCount();

      if (!database) {
        console.log(
          `✅ ${this.services.routes.loaded} routes loaded in degraded mode`,
        );
        this.services.routes.status = "degraded";
      } else {
        console.log(`✅ ${this.services.routes.loaded} routes loaded`);
      }
    } catch (error) {
      console.error("❌ Failed to setup routes:", error.message);
      this.services.routes.status = "failed";

      // Setup basic routes even if full setup fails
      console.log("🔄 Setting up minimal routes...");
      this.setupMinimalRoutes();
      this.services.routes.status = "minimal";
      this.services.routes.loaded = 5; // Basic routes count
    }
  }

  /**
   * Setup minimal essential routes when full setup fails
   */
  setupMinimalRoutes() {
    // Health endpoint is handled by general routes
    // This minimal setup only adds backup routes

    // Basic status endpoint
    this.app.get("/api/status", (req, res) => {
      res.json({
        success: true,
        status: "degraded",
        message: "Limited functionality available",
        availableEndpoints: ["/api/health", "/api/status"],
      });
    });

    console.log("✅ Minimal routes configured");
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Global error handler - must come after all routes
    this.app.use((error, req, res, next) => {
      this.metrics.errorCount++;

      // Log error
      this.errorLogger.logError(error, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Don't send error details in production
      const isDevelopment = process.env.NODE_ENV === "development";

      res.status(error.status || 500).json({
        success: false,
        error: error.name || "Internal Server Error",
        message: isDevelopment ? error.message : "An error occurred",
        ...(isDevelopment && { stack: error.stack }),
      });
    });

    // Final 404 handler for unmatched routes - must be last middleware
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableEndpoints: this.getAvailableEndpoints(),
      });
    });
  }

  /**
   * Start HTTP server
   */
  async startServer() {
    console.log(
      `🚀 Starting server${this.port ? ` on port ${this.port}` : " on auto-assigned port"}...`,
    );

    return new Promise((resolve, reject) => {
      const server = http.createServer(this.app);

      server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          if (this.port === 0) {
            // If auto-assign failed, try a specific port
            this.port = 8085;
            console.log(`⚠️ Auto-assign failed, trying port ${this.port}...`);
            setTimeout(
              () => this.startServer().then(resolve).catch(reject),
              1000,
            );
          } else {
            reject(new Error(`Port ${this.port} is already in use`));
          }
        } else {
          reject(error);
        }
      });

      server.listen(this.port, () => {
        const actualPort = server.address().port;
        this.port = actualPort; // Update port with actual assigned port

        console.log(`🌐 Server running on port ${this.port}`);
        console.log(
          `📊 Health check: http://localhost:${this.port}/api/health`,
        );
        console.log(
          `🔍 Debug routes: http://localhost:${this.port}/api/debug/routes`,
        );
        console.log(`🌐 API available at: http://localhost:${this.port}/api`);

        // Write port to a file for frontend to read
        this.writePortToFile(this.port);

        resolve(server);
      });
    });
  }

  /**
   * Write the actual port to a file for frontend detection
   */
  writePortToFile(port) {
    const fs = require("fs");
    const path = require("path");

    try {
      const portFile = path.join(__dirname, "..", ".backend-port");
      fs.writeFileSync(portFile, port.toString());
      console.log(`📝 Port ${port} written to .backend-port file`);
    } catch (error) {
      console.warn("⚠️ Could not write port file:", error.message);
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      this.metrics.memoryUsage = process.memoryUsage().heapUsed;
      this.metrics.uptime = process.uptime();

      // Emit metrics for monitoring
      this.eventEmitter.emit("metrics:update", this.metrics);

      // Log warnings for high memory usage
      const memoryMB = this.metrics.memoryUsage / (1024 * 1024);
      if (memoryMB > 1000) {
        console.warn(`⚠️ High memory usage: ${memoryMB.toFixed(2)}MB`);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get available endpoints for debugging
   */
  getAvailableEndpoints() {
    const endpoints = [];

    // Check if routes are mounted and return actual endpoints
    if (this.routesManager) {
      try {
        const routes = this.routesManager.getMountedRoutes();
        return (
          routes || [
            "/api/health",
            "/api/debug/routes",
            "/api/analysis/*",
            "/api/files/*",
            "/api/settings/*",
          ]
        );
      } catch (error) {
        console.warn("Could not get mounted routes:", error.message);
      }
    }

    return [
      "/api/health",
      "/api/debug/routes",
      "/api/analysis/*",
      "/api/files/*",
      "/api/settings/*",
    ];
  }

  /**
   * Print startup summary
   */
  printStartupSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("🎯 SPACE ANALYZER SERVER - STARTUP SUMMARY");
    console.log("=".repeat(60));
    console.log(`📊 Initialization Time: ${this.metrics.initTime}ms`);
    console.log(`🗄️ Database Status: ${this.services.database.status}`);
    console.log(`🛣️ Routes Loaded: ${this.services.routes.loaded}`);
    console.log(`💾 Memory Limit: ${maxMemoryGB}GB`);
    console.log(`🌐 Server Port: ${this.port}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("=".repeat(60));
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log("\n🛑 Shutting down server...");

    try {
      // Close database
      if (this.services.database.manager) {
        await this.services.database.manager.close();
      }

      console.log("✅ Server shutdown complete");
    } catch (error) {
      console.error("❌ Error during shutdown:", error.message);
    }
  }
}

// Handle shutdown signals
const server = new ImprovedSpaceAnalyzerServer();

process.on("SIGINT", async () => {
  console.log("\n📡 Received SIGINT");
  await server.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n📡 Received SIGTERM");
  await server.shutdown();
  process.exit(0);
});

// Export for testing
module.exports = ImprovedSpaceAnalyzerServer;
