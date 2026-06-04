/**
 * Routes Index
 * Aggregates all route modules for the Space Analyzer API
 */

const AnalysisRoutes = require("./analysis");
// AI routes consolidated into ai-models
const AIModelsRoutes = require("./ai-models");
const FileRoutes = require("./files");
const ExportRoutes = require("./exports");
const ComplexityRoutes = require("./complexity");
const ReportsRoutes = require("./reports");
const SettingsRoutes = require("./settings");
const OrchestrateRoutes = require("./orchestrate");
const SystemRoutes = require("./system");
const ErrorRoutes = require("./errors");
const LearningRoutes = require("./learning");
const NLPRoutes = require("./nlp");
const GeneralRoutes = require("./general");

class RoutesManager {
  constructor(server) {
    this.server = server;
    this.routes = {};
    this.routeCache = new Map(); // Cache for route modules
    this.initializationPromise = null;
    this.initialized = false;
  }

  async waitForInitialization() {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeRoutes();
    }
    return this.initializationPromise;
  }

  async initializeRoutes() {
    if (this.initialized) {
      console.log("⚡ Routes already initialized, skipping...");
      return;
    }

    this.initialized = true;
    // Initialize all route modules in parallel for faster startup
    console.log("🔄 Initializing route modules in parallel...");

    const routeModules = [
      { name: "analysis", Module: AnalysisRoutes },
      { name: "files", Module: FileRoutes },
      { name: "exports", Module: ExportRoutes },
      { name: "complexity", Module: ComplexityRoutes },
      { name: "reports", Module: ReportsRoutes },
      { name: "settings", Module: SettingsRoutes },
      { name: "orchestrate", Module: OrchestrateRoutes },
      { name: "system", Module: SystemRoutes },
      { name: "errors", Module: ErrorRoutes },
      { name: "learning", Module: LearningRoutes },
      { name: "nlp", Module: NLPRoutes },
      { name: "aiModels", Module: AIModelsRoutes },
      {
        name: "general",
        Module: GeneralRoutes,
        mountAtRoot: true,
        forceReload: true,
      },
    ];

    // Initialize all routes in parallel with caching
    const initializationPromises = routeModules.map(
      async ({ name, Module, mountAtRoot, forceReload }) => {
        try {
          // Force reload analysis routes to clear cache
          const cacheKey = `${name}_${Module.name}`;
          let route = null;

          if (name === "analysis") {
            // Force reload analysis routes
            this.routeCache.delete(cacheKey);
            route = new Module(this.server);
            this.routeCache.set(cacheKey, route);
            console.log(`🔄 Reloaded route module: ${name}`);
          } else {
            // Check cache first for other routes
            route = this.routeCache.get(cacheKey);

            if (!route) {
              // Create new route instance if not cached
              route = new Module(this.server);
              this.routeCache.set(cacheKey, route);
              console.log(`📦 Cached route module: ${name}`);
            } else {
              console.log(`⚡ Using cached route: ${name}`);
            }
          }

          return {
            name,
            route,
            success: true,
            fromCache:
              !!route && this.routeCache.has(cacheKey) && name !== "analysis",
            mountAtRoot,
          };
        } catch (error) {
          console.error(`❌ Failed to initialize ${name}:`, error.message);
          return { name, error, success: false };
        }
      },
    );

    // Wait for all routes to initialize
    const results = await Promise.all(initializationPromises);

    // Store successful route initializations
    const successfulRoutes = [];
    const failedRoutes = [];
    const cachedRoutes = [];

    results.forEach(({ name, route, error, success, fromCache }) => {
      if (success && route) {
        this.routes[name] = route;
        successfulRoutes.push(name);
        if (fromCache) {
          cachedRoutes.push(name);
        }
        console.log(`✅ Route ${name} initialized successfully`);
      } else if (error) {
        failedRoutes.push({ name, error });
        console.error(`❌ Route ${name} failed:`, error.message);
      } else {
        console.error(`❌ Route ${name} failed: No route object returned`);
      }
    });

    // Log summary with cache statistics
    const cacheHitRate =
      cachedRoutes.length > 0
        ? Math.round((cachedRoutes.length / successfulRoutes.length) * 100)
        : 0;
    console.log(
      ` Initialized ${successfulRoutes.length}/${routeModules.length} route modules (${cachedRoutes.length} from cache, ${cacheHitRate}% hit rate)`,
    );

    if (failedRoutes.length > 0) {
      console.log(
        ` Failed routes: ${failedRoutes.map((r) => `${r.name}: ${r.error?.message || r.error}`).join(", ")}`,
      );
    }
  }

  async mountAll(app) {
    // Ensure routes are initialized before mounting
    await this.initialize();

    // Check if routes are initialized
    if (!this.routes || Object.keys(this.routes).length === 0) {
      console.error("❌ No routes initialized, cannot mount routes");
      return;
    }

    // Mount all routes to the Express app
    const routeMappings = [
      { name: "analysis", route: this.routes.analysis },
      { name: "ai", route: this.routes.ai },
      { name: "aiService", route: this.routes.aiService },
      { name: "files", route: this.routes.files },
      { name: "exports", route: this.routes.exports },
      { name: "complexity", route: this.routes.complexity },
      { name: "reports", route: this.routes.reports },
      { name: "settings", route: this.routes.settings },
      { name: "orchestrate", route: this.routes.orchestrate },
      { name: "system", route: this.routes.system },
      { name: "errors", route: this.routes.errors },
      { name: "learning", route: this.routes.learning },
      { name: "nlp", route: this.routes.nlp },
      { name: "aiModels", route: this.routes.aiModels },
      { name: "general", route: this.routes.general, mountAtRoot: true },
    ];

    let mountedCount = 0;
    routeMappings.forEach(({ name, route, mountAtRoot }) => {
      if (route && typeof route.getRouter === "function") {
        // Mount routes with their specific base paths
        // General routes mount at /api, others at /api/{name}
        const basePath = mountAtRoot ? "/api" : `/api/${name}`;
        app.use(basePath, route.getRouter());
        console.log(`✅ Mounted ${name} routes at ${basePath}`);
        mountedCount++;
      } else {
        console.error(`❌ Route ${name} is not properly initialized`);
      }
    });

    console.log(
      `✅ ${mountedCount}/${routeMappings.length} API routes mounted successfully`,
    );
    console.log(
      "📍 API endpoints: /api/analysis/*, /api/ai/*, /api/errors/*, /api/learning/*, /api/nlp/*, /api/ai-models/*",
    );

    // Store mounted routes for debugging
    this.mountedRoutes = routeMappings
      .filter(({ route }) => route && typeof route.getRouter === "function")
      .map(({ name, mountAtRoot }) => {
        const basePath = mountAtRoot ? "/api" : `/api/${name}`;
        return `${basePath}/*`;
      });
  }

  // Get actual mounted routes
  getMountedRoutes() {
    return (
      this.mountedRoutes || [
        "/api/health",
        "/api/debug/routes",
        "/api/analysis/*",
        "/api/ai/*",
        "/api/files/*",
        "/api/settings/*",
      ]
    );
  }

  // Access to individual route modules if needed
  getAnalysisRoutes() {
    return this.routes.analysis;
  }

  getAIRoutes() {
    return this.routes.ai;
  }

  getFileRoutes() {
    return this.routes.files;
  }

  getExportRoutes() {
    return this.routes.exports;
  }

  getComplexityRoutes() {
    return this.routes.complexity;
  }

  getReportsRoutes() {
    return this.routes.reports;
  }

  getSettingsRoutes() {
    return this.routes.settings;
  }

  getRouteCount() {
    return Object.keys(this.routes).length;
  }

  initialize() {
    return this.waitForInitialization();
  }
}

module.exports = RoutesManager;
