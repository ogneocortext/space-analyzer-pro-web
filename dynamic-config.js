/**
 * Dynamic Configuration Loader
 * Loads hardware-aware configuration for all server components
 */

const { getHardwareConfig } = require("./hardware-detector");

// Config promise - resolved on first access
let hardwareConfig = null;
let configPromise = null;

async function loadConfig(force = false) {
  if (!configPromise || force) {
    configPromise = getHardwareConfig(force)
      .then((config) => {
        hardwareConfig = config;
        return config;
      })
      .catch((err) => {
        console.error("Failed to load hardware config:", err);
        // Fallback to safe defaults
        const fallback = {
          specs: {
            cpu: { cores: 4, model: "Unknown" },
            memory: { totalGB: 16 },
            gpu: { primaryGPU: null },
            isLaptop: false,
          },
          tier: "mid-range",
          powerProfile: "balanced",
          config: {
            maxConcurrentRequests: 10,
            maxConcurrentAIRequests: 5,
            workerCount: 4,
            workerMemoryMB: 1024,
            bodyParserLimit: "100mb",
            proxyTimeout: 300000,
            taskTimeout: 300000,
            cacheSize: 100,
            cacheExpiry: 5 * 60 * 1000,
            ollamaBatchSize: 512,
            ollamaContextSize: 2048,
            aiModel: "phi4-mini:latest",
            enableCompression: false,
            circuitBreakerThreshold: 20,
            maxFileScanConcurrency: 5,
          },
        };
        hardwareConfig = fallback;
        return fallback;
      });
  }
  return await configPromise;
}

// Export individual config values (may be null until loaded)
module.exports = {
  // Hardware specs
  get hardware() {
    return hardwareConfig?.specs;
  },
  get tier() {
    return hardwareConfig?.tier;
  },
  get powerProfile() {
    return hardwareConfig?.powerProfile;
  },

  // Performance settings
  get maxConcurrentRequests() {
    return hardwareConfig?.config?.maxConcurrentRequests;
  },
  get maxConcurrentAIRequests() {
    return hardwareConfig?.config?.maxConcurrentAIRequests;
  },
  get workerCount() {
    return hardwareConfig?.config?.workerCount;
  },
  get workerMemoryMB() {
    return hardwareConfig?.config?.workerMemoryMB;
  },
  get bodyParserLimit() {
    return hardwareConfig?.config?.bodyParserLimit;
  },
  get proxyTimeout() {
    return hardwareConfig?.config?.proxyTimeout;
  },
  get taskTimeout() {
    return hardwareConfig?.config?.taskTimeout;
  },

  // Cache settings
  get cacheSize() {
    return hardwareConfig?.config?.cacheSize;
  },
  get cacheExpiry() {
    return hardwareConfig?.config?.cacheExpiry;
  },

  // AI/Ollama settings
  get ollamaBatchSize() {
    return hardwareConfig?.config?.ollamaBatchSize;
  },
  get ollamaContextSize() {
    return hardwareConfig?.config?.ollamaContextSize;
  },
  get aiModel() {
    return hardwareConfig?.config?.aiModel;
  },

  // Feature toggles
  get enableCompression() {
    return hardwareConfig?.config?.enableCompression;
  },
  get circuitBreakerThreshold() {
    return hardwareConfig?.config?.circuitBreakerThreshold;
  },
  get maxFileScanConcurrency() {
    return hardwareConfig?.config?.maxFileScanConcurrency;
  },

  // Full config object
  get fullConfig() {
    return hardwareConfig?.config;
  },

  // Async getter for when you need to ensure config is loaded
  getConfig: (force = false) => loadConfig(force),

  // Utility function to log current config
  logConfig: async (force = false) => {
    // Only log once per process, and skip if SA_QUIET is set
    if (global.__SA_CONFIG_LOGGED__ && !force) return;
    if (process.env.SA_QUIET && !force) return;
    global.__SA_CONFIG_LOGGED__ = true;

    let config;
    try {
      config = await loadConfig(force);
    } catch (error) {
      console.warn("⚠️ Hardware config failed to load, using defaults for logging");
      // Use safe defaults for logging
      config = {
        tier: "mid-range",
        powerProfile: "balanced",
        specs: {
          cpu: { cores: 4, model: "Unknown" },
          memory: { totalGB: 16 },
          gpu: { primaryGPU: null },
          isLaptop: false,
        },
        config: {
          workerCount: 4,
          workerMemoryMB: 1024,
          maxConcurrentAIRequests: 5,
          aiModel: "phi4-mini:latest",
          bodyParserLimit: "100mb",
        },
      };
    }
    const hasOverride =
      process.env.SA_CPU_CORES ||
      process.env.SA_MEMORY_GB ||
      process.env.SA_HARDWARE_TIER ||
      process.env.SA_IS_LAPTOP !== undefined ||
      process.env.SA_AI_MODEL;

    console.log("\n🖥️  Hardware Configuration");
    if (hasOverride) {
      console.log("⚠️  MANUAL OVERRIDE ACTIVE (env vars set)");
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Tier: ${config?.tier?.toUpperCase?.() || "MID-RANGE"}`);
    console.log(`Power Profile: ${config?.powerProfile || "balanced"}`);
    console.log(
      `CPU: ${config?.specs?.cpu?.cores || 4} cores (${config?.specs?.cpu?.model || "Unknown"})`
    );
    console.log(`Memory: ${config?.specs?.memory?.totalGB || 16} GB`);
    console.log(`GPU: ${config?.specs?.gpu?.primaryGPU?.name || "None detected"}`);
    console.log(
      `Device: ${config?.specs?.isLaptop ? "Laptop (conservative)" : "Desktop (maximum performance)"}`
    );
    if (config?.specs?.ollamaModels && config.specs.ollamaModels.length > 0) {
      console.log(`🦙 Ollama Models: ${config.specs.ollamaModels.join(", ")}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(
      `Workers: ${config?.config?.workerCount || 4} (${config?.config?.workerMemoryMB || 1024}MB each)`
    );
    console.log(`  ↳ Purpose: Parallel file scanning, AI analysis, and CPU-intensive tasks`);
    console.log(`  ↳ Status: Active - worker pool initialized and ready`);
    console.log(`Max Concurrent AI: ${config?.config?.maxConcurrentAIRequests || 5}`);
    console.log(`AI Model: ${config?.config?.aiModel || "phi4-mini:latest"}`);
    console.log(`Body Parser Limit: ${config?.config?.bodyParserLimit || "100mb"}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (!hasOverride) {
      console.log("💡 To override: set SA_CPU_CORES=16 SA_MEMORY_GB=32 SA_HARDWARE_TIER=high-end");
      console.log("   Other vars: SA_IS_LAPTOP=false SA_AI_MODEL=phi4-mini:latest");
    }
    console.log("");
  },
};
