/**
 * Hardware Detector - Automatically detects system capabilities
 * and provides optimal configuration recommendations
 */

const os = require("os");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class HardwareDetector {
  constructor() {
    this.specs = null;
    this.manualOverride = this.checkManualOverride();
    this.detectPromise = null;
    this.cacheFile = path.join(__dirname, "..", ".hardware-cache.json");
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  async detect(force = false) {
    if (this.detectPromise && !force) return this.detectPromise;

    this.detectPromise = (async () => {
      // Try to load from cache first
      if (!force && fs.existsSync(this.cacheFile)) {
        try {
          const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, "utf8"));
          const isFresh = Date.now() - cacheData.timestamp < this.cacheTTL;

          if (isFresh && !process.env.SA_FORCE_CONFIG_SCAN) {
            this.specs = cacheData.specs;
            return this.specs;
          }
        } catch (e) {
          // Cache corrupted, proceed to detect
        }
      }

      // Perform actual detection
      const cpu = this.detectCPU();
      const memory = this.detectMemory();
      const gpu = this.detectGPU();
      const disk = this.detectDisk();
      const os = this.detectOS();
      const isLaptop = this.detectIfLaptop();

      const partialSpecs = { cpu, memory, gpu, isLaptop };
      const powerProfile = this.detectPowerProfile(partialSpecs);
      const ollamaModels = await this.detectOllamaModels();

      const specs = {
        cpu,
        memory,
        gpu,
        disk,
        os,
        isLaptop,
        powerProfile,
        ollamaModels,
      };

      specs.tier = this.calculateTier(specs);
      specs.recommendations = this.generateRecommendations(specs);

      this.specs = specs;

      // Save to cache
      try {
        fs.writeFileSync(
          this.cacheFile,
          JSON.stringify(
            {
              timestamp: Date.now(),
              specs: this.specs,
            },
            null,
            2
          )
        );
      } catch (e) {
        // Failed to save cache, not critical
      }

      return this.specs;
    })();

    return this.detectPromise;
  }

  /**
   * Check for manual hardware specification via environment variables
   * Allows users to override incorrect auto-detection
   */
  checkManualOverride() {
    const override = {
      cpuCores: process.env.SA_CPU_CORES ? parseInt(process.env.SA_CPU_CORES) : null,
      memoryGB: process.env.SA_MEMORY_GB ? parseInt(process.env.SA_MEMORY_GB) : null,
      tier: process.env.SA_HARDWARE_TIER || null,
      isLaptop: process.env.SA_IS_LAPTOP ? process.env.SA_IS_LAPTOP === "true" : null,
      aiModel: process.env.SA_AI_MODEL || null,
    };

    if (Object.values(override).some((v) => v !== null)) {
      console.log("⚙️  Using manual hardware override from environment variables");
      console.log("   Set SA_CPU_CORES, SA_MEMORY_GB, SA_HARDWARE_TIER, SA_IS_LAPTOP, SA_AI_MODEL");
    }

    return override;
  }

  detectCPU() {
    const cpus = os.cpus();
    let cpuCount = cpus.length;
    let model = cpus[0]?.model || "Unknown";

    // Try to get more accurate info on Windows via WMIC
    if (process.platform === "win32") {
      try {
        const wmicOutput = execSync(
          "wmic cpu get NumberOfLogicalProcessors,NumberOfCores,Name /format:csv 2>nul",
          { encoding: "utf8", timeout: 3000, windowsHide: true }
        );
        const lines = wmicOutput
          .trim()
          .split("\n")
          .filter((l) => l.includes(","));
        if (lines.length > 0) {
          const parts = lines[lines.length - 1].split(",");
          if (parts.length >= 3) {
            const logicalCores = parseInt(parts[parts.length - 2]) || cpuCount;
            const physicalCores = parseInt(parts[parts.length - 3]) || Math.ceil(cpuCount / 2);
            const cpuName = parts[parts.length - 1].trim();
            if (cpuName && cpuName !== "Name") {
              model = cpuName;
              cpuCount = logicalCores;
            }
          }
        }
      } catch (e) {
        // WMIC failed, use Node.js detection
      }
    }

    // Apply manual override if set
    if (this.manualOverride.cpuCores) {
      cpuCount = this.manualOverride.cpuCores;
      console.log(`   CPU cores manually set to ${cpuCount}`);
    }

    // More comprehensive performance tier detection
    const modelLower = model.toLowerCase();
    const isHighEnd =
      /(i9|ryzen 9|threadripper|xeon.*(gold|platinum)|epyc|m3 max|m2 max|m3 pro|m2 pro)/i.test(
        model
      );
    const isMidRange = /(i7|i5|ryzen 7|ryzen 5|xeon|m1|m2|m3)/i.test(model) && !isHighEnd;
    const isLowEnd =
      /(i3|ryzen 3|pentium|celeron|atom)/i.test(model) ||
      (!isHighEnd && !isMidRange && cpuCount <= 4);

    return {
      cores: cpuCount,
      physicalCores: Math.ceil(cpuCount / 2),
      model: model,
      speed: cpus[0]?.speed || 0,
      isHighEnd,
      isMidRange,
      isLowEnd,
    };
  }

  detectMemory() {
    let totalBytes = os.totalmem();
    const freeBytes = os.freemem();

    // Try more accurate Windows detection
    if (process.platform === "win32") {
      try {
        const wmicOutput = execSync(
          "wmic ComputerSystem get TotalPhysicalMemory /format:csv 2>nul",
          { encoding: "utf8", timeout: 3000, windowsHide: true }
        );
        const lines = wmicOutput
          .trim()
          .split("\n")
          .filter((l) => l.includes(","));
        if (lines.length > 0) {
          const parts = lines[lines.length - 1].split(",");
          const detectedBytes = parseInt(parts[parts.length - 1]);
          if (detectedBytes > 0) {
            totalBytes = detectedBytes;
          }
        }
      } catch (e) {
        // WMIC failed, use Node.js detection
      }
    }

    let totalGB = Math.floor(totalBytes / 1024 ** 3);
    const freeGB = Math.floor(freeBytes / 1024 ** 3);

    // Apply manual override if set
    if (this.manualOverride.memoryGB) {
      totalGB = this.manualOverride.memoryGB;
      totalBytes = totalGB * 1024 ** 3;
      console.log(`   Memory manually set to ${totalGB} GB`);
    }

    return {
      totalBytes,
      freeBytes,
      totalGB,
      freeGB,
      totalMB: Math.floor(totalBytes / 1024 ** 2),
      isHighEnd: totalGB >= 32,
      isMidRange: totalGB >= 16 && totalGB < 32,
      isLowEnd: totalGB < 16,
    };
  }

  detectGPU() {
    const gpus = [];

    try {
      // Windows - try nvidia-smi first
      if (process.platform === "win32") {
        try {
          const nvidiaOutput = execSync(
            "nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader",
            { encoding: "utf8", timeout: 5000 }
          );
          const lines = nvidiaOutput.trim().split("\n");
          lines.forEach((line) => {
            const [name, memory, driver] = line.split(",").map((s) => s.trim());
            const memoryMB = parseInt(memory) || 0;
            gpus.push({
              name,
              vendor: "NVIDIA",
              memoryMB,
              memoryGB: Math.floor(memoryMB / 1024),
              driver,
              isNVIDIA: true,
              isAMD: false,
              isIntel: false,
              isApple: false,
            });
          });
        } catch (e) {
          // No NVIDIA GPU or nvidia-smi not available
        }
      }

      // macOS - check for Apple Silicon
      if (process.platform === "darwin") {
        try {
          const systemProfiler = execSync("system_profiler SPDisplaysDataType -json", {
            encoding: "utf8",
            timeout: 5000,
          });
          const displayData = JSON.parse(systemProfiler);
          // Parse Apple GPU info
          gpus.push({
            name: "Apple Silicon",
            vendor: "Apple",
            isApple: true,
            isUnifiedMemory: true,
          });
        } catch (e) {
          // Fallback - assume Intel Mac
        }
      }

      // Linux - check lspci
      if (process.platform === "linux") {
        try {
          const lspci = execSync("lspci | grep -i vga", { encoding: "utf8", timeout: 5000 });
          if (lspci.includes("NVIDIA")) {
            gpus.push({ name: "NVIDIA GPU", vendor: "NVIDIA", isNVIDIA: true });
          } else if (lspci.includes("AMD")) {
            gpus.push({ name: "AMD GPU", vendor: "AMD", isAMD: true });
          } else if (lspci.includes("Intel")) {
            gpus.push({ name: "Intel GPU", vendor: "Intel", isIntel: true });
          }
        } catch (e) {
          // lspci not available
        }
      }
    } catch (error) {
      // GPU detection failed, use CPU fallback
    }

    // Determine GPU tier
    const hasHighEndGPU = gpus.some((g) =>
      /(RTX 40|RTX 3090|RTX 3080|A100|H100|A6000|M3 Max|M2 Max)/i.test(g.name)
    );
    const hasMidRangeGPU = gpus.some((g) =>
      /(RTX 30|RTX 3070|RTX 3060|RTX 2080|RX 6800|RX 6700|M3 Pro|M2 Pro|M3|M2)/i.test(g.name)
    );

    return {
      gpus,
      count: gpus.length,
      hasGPU: gpus.length > 0,
      hasHighEndGPU,
      hasMidRangeGPU,
      hasLowEndGPU: !hasHighEndGPU && !hasMidRangeGPU && gpus.length > 0,
      isIntegratedOnly: gpus.length === 0 || gpus.every((g) => g.isIntel),
      primaryGPU: gpus[0] || null,
    };
  }

  detectOllamaModels() {
    try {
      const http = require("http");
      return new Promise((resolve) => {
        const req = http.request(
          {
            hostname: "localhost",
            port: 11434,
            path: "/api/tags",
            method: "GET",
            timeout: 3000,
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => {
              data += chunk;
            });
            res.on("end", () => {
              if (res.statusCode === 200) {
                try {
                  const parsed = JSON.parse(data);
                  const models = parsed.models?.map((m) => m.name) || [];
                  resolve(models);
                } catch (e) {
                  resolve([]);
                }
              } else {
                resolve([]);
              }
            });
          }
        );
        req.on("error", () => resolve([]));
        req.on("timeout", () => {
          req.destroy();
          resolve([]);
        });
        req.end();
      });
    } catch (e) {
      return Promise.resolve([]);
    }
  }

  detectDisk() {
    try {
      const stats = fs.statSync(process.cwd());
      return {
        cwd: process.cwd(),
        platform: process.platform,
      };
    } catch (e) {
      return { platform: process.platform };
    }
  }

  detectOS() {
    return {
      platform: process.platform,
      arch: process.arch,
      version: os.release(),
      isWindows: process.platform === "win32",
      isMac: process.platform === "darwin",
      isLinux: process.platform === "linux",
    };
  }

  detectIfLaptop() {
    // Check manual override first
    if (this.manualOverride.isLaptop !== null) {
      return this.manualOverride.isLaptop;
    }

    try {
      if (process.platform === "win32") {
        // Check for battery presence via WMIC
        try {
          const wmicOutput = execSync("wmic path Win32_Battery get BatteryStatus 2>nul", {
            encoding: "utf8",
            timeout: 3000,
            windowsHide: true,
          });
          if (wmicOutput.includes("1") || wmicOutput.includes("2") || wmicOutput.includes("3")) {
            return true; // Battery present
          }
        } catch (e) {
          // No battery or WMIC failed
        }

        // Fallback: check chassis type via WMIC
        try {
          const chassisOutput = execSync("wmic SystemEnclosure get ChassisTypes 2>nul", {
            encoding: "utf8",
            timeout: 3000,
            windowsHide: true,
          });
          // Chassis types: 8=Laptop, 9=Subnotebook, 10=Portable, 11=Handheld, 12=Docking, 14=Subnotebook, 30=Tablet, 31=Convertible, 32=Detachable
          const laptopTypes = ["8", "9", "10", "11", "14", "30", "31", "32"];
          if (laptopTypes.some((t) => chassisOutput.includes(t))) {
            return true;
          }
        } catch (e) {
          // Failed, assume desktop
        }
      }
      if (process.platform === "darwin") {
        const pmset = execSync("pmset -g batt 2>&1", { encoding: "utf8", timeout: 3000 });
        return pmset.includes("Battery") || pmset.includes("Battery Power");
      }
    } catch (e) {
      // Assume desktop if can't detect
    }
    return false;
  }

  detectPowerProfile(specs) {
    if (specs?.isLaptop) {
      // Conservative for laptops on battery
      return "balanced";
    }
    if (specs?.cpu?.isHighEnd && specs?.memory?.isHighEnd) {
      return "performance";
    }
    if (specs?.cpu?.isLowEnd || specs?.memory?.isLowEnd) {
      return "efficiency";
    }
    return "balanced";
  }

  calculateTier(specs) {
    // Check for manual tier override
    if (this.manualOverride.tier) {
      console.log(`   Hardware tier manually set to '${this.manualOverride.tier}'`);
      return this.manualOverride.tier;
    }

    const { cpu, memory, gpu } = specs;
    let score = 0;

    // CPU scoring based on core count and tier
    if (cpu.isHighEnd || cpu.cores >= 16) score += 3;
    else if (cpu.isMidRange || cpu.cores >= 8) score += 2;
    else score += 1;

    // Memory scoring
    if (memory.isHighEnd) score += 3;
    else if (memory.isMidRange) score += 2;
    else score += 1;

    // GPU scoring (optional, doesn't penalize score if no GPU)
    if (gpu.hasHighEndGPU) score += 3;
    else if (gpu.hasMidRangeGPU) score += 2;
    else if (gpu.hasGPU) score += 1;

    if (score >= 7) return "high-end";
    if (score >= 5) return "mid-range";
    return "entry-level";
  }

  generateRecommendations(specs) {
    if (!specs) {
      console.warn("⚠️ Specs object is null, using default recommendations");
      return {
        aiModel: "phi4-mini:latest",
        workerCount: 4,
        workerMemoryMB: 1024,
      };
    }

    const { cpu, memory, gpu, tier, powerProfile, ollamaModels } = specs;

    // Ensure all components have valid values
    if (!cpu || !memory || !gpu) {
      console.warn("⚠️ Incomplete hardware specs detected, using defaults");
      return {
        aiModel: "phi4-mini:latest",
        workerCount: 4,
        workerMemoryMB: 1024,
      };
    }

    // Select best model from actual installed Ollama models
    let selectedModel = this.manualOverride.aiModel;

    if (!selectedModel && ollamaModels.length > 0) {
      // Priority order based on model quality and hardware
      const modelPriority = [
        // High-end models (use if GPU available)
        /(qwen2.5:14b|llama3:70b|mistral:7b|gemma2:27b)/i,
        // Mid-range models
        /(qwen2.5:7b|llama3:8b|gemma2:9b|deepseek:coder)/i,
        // Fast models
        /(phi4|phi3|gemma3:4b|tinyllama)/i,
        // Fallback to any model
        /.*/,
      ];

      for (const pattern of modelPriority) {
        const match = ollamaModels.find((m) => pattern.test(m));
        if (match) {
          selectedModel = match;
          break;
        }
      }
    }

    if (!selectedModel) {
      selectedModel = gpu.hasHighEndGPU
        ? "qwen2.5:14b"
        : gpu.hasGPU
          ? "qwen2.5:7b"
          : "phi4-mini:latest";
    }

    const configs = {
      "high-end": {
        // Maximum performance
        maxConcurrentRequests: 50,
        maxConcurrentAIRequests: 20,
        workerCount: Math.max(8, cpu.cores),
        workerMemoryMB: 4096,
        bodyParserLimit: "1gb",
        proxyTimeout: 600000, // 10 minutes
        taskTimeout: 600000,
        cacheSize: 500,
        cacheExpiry: 10 * 60 * 1000, // 10 minutes
        ollamaBatchSize: 2048,
        ollamaContextSize: 8192,
        enableCompression: false,
        circuitBreakerThreshold: 100,
        maxFileScanConcurrency: 20,
        aiModel: selectedModel,
      },
      "mid-range": {
        // Balanced performance
        maxConcurrentRequests: 20,
        maxConcurrentAIRequests: 10,
        workerCount: Math.max(4, cpu.cores - 2),
        workerMemoryMB: 2048,
        bodyParserLimit: "500mb",
        proxyTimeout: 300000, // 5 minutes
        taskTimeout: 300000,
        cacheSize: 200,
        cacheExpiry: 5 * 60 * 1000,
        ollamaBatchSize: 1024,
        ollamaContextSize: 4096,
        enableCompression: false,
        circuitBreakerThreshold: 50,
        maxFileScanConcurrency: 10,
        aiModel: selectedModel,
      },
      "entry-level": {
        // Conservative for limited resources
        maxConcurrentRequests: 5,
        maxConcurrentAIRequests: 3,
        workerCount: Math.max(2, Math.floor(cpu.cores / 2)),
        workerMemoryMB: 1024,
        bodyParserLimit: "100mb",
        proxyTimeout: 120000, // 2 minutes
        taskTimeout: 120000,
        cacheSize: 50,
        cacheExpiry: 3 * 60 * 1000,
        ollamaBatchSize: 512,
        ollamaContextSize: 2048,
        enableCompression: false,
        circuitBreakerThreshold: 20,
        maxFileScanConcurrency: 4,
        aiModel: selectedModel || "phi4-mini:latest",
      },
    };

    // Adjust for laptops (more conservative)
    if (this.specs.isLaptop && tier === "high-end") {
      return configs["mid-range"]; // Downgrade high-end laptops to mid-range config
    }

    // Adjust for power profile
    if (powerProfile === "efficiency") {
      const efficiencyConfig = { ...configs["entry-level"] };
      efficiencyConfig.aiModel = "phi4-mini:latest"; // Always use small model
      return efficiencyConfig;
    }

    return configs[tier] || configs["mid-range"];
  }

  async getConfig() {
    if (!this.specs) await this.detect();
    return {
      specs: this.specs,
      config: this.specs.recommendations,
      tier: this.specs.tier,
      powerProfile: this.specs.powerProfile,
    };
  }

  toJSON() {
    return JSON.stringify(this.getConfig(), null, 2);
  }
}

// Singleton instance
let detector = null;

function getHardwareDetector() {
  if (!detector) {
    detector = new HardwareDetector();
  }
  return detector;
}

async function getHardwareConfig(force = false) {
  return await getHardwareDetector().getConfig(force);
}

module.exports = {
  HardwareDetector,
  getHardwareDetector,
  getHardwareConfig,
};
