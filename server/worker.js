const { parentPort, workerData } = require("worker_threads");
const os = require("os");
const v8 = require("v8");

const workerId = workerData.workerId;

// Health monitoring
function getHealthMetrics() {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  const cpuUsage = process.cpuUsage();

  // Calculate health score based on memory and CPU
  const memoryPressure = memUsage.heapUsed / memUsage.heapTotal;
  const healthScore = Math.max(0, 100 - memoryPressure * 50 - cpuUsage.user / 1000000);

  return {
    score: Math.round(healthScore),
    memory: memUsage,
    uptime,
    cpu: cpuUsage,
    activeTasks: 0, // Will be updated by pool
  };
}

// Task processing
parentPort.on("message", async (message) => {
  try {
    switch (message.type) {
      case "task":
        const startTime = Date.now();
        const result = await processTask(message.data, message.options);
        const processingTime = Date.now() - startTime;

        parentPort.postMessage({
          type: "taskComplete",
          taskId: message.taskId,
          result: {
            ...result,
            processingTime,
            workerId,
          },
        });
        break;

      case "healthCheck":
        parentPort.postMessage({
          type: "healthCheck",
          health: getHealthMetrics(),
        });
        break;

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  } catch (error) {
    parentPort.postMessage({
      type: "taskError",
      taskId: message.taskId,
      error: error.message,
      stack: error.stack,
    });
  }
});

// Task processing function - customize based on your needs
async function processTask(data, options) {
  // File analysis task
  if (data.type === "analyzeFile") {
    const fs = require("fs").promises;
    const path = require("path");

    try {
      const stats = await fs.stat(data.filePath);
      const content = await fs.readFile(data.filePath, "utf8");
      const lines = content.split("\n").length;
      const extension = path.extname(data.filePath);

      return {
        filePath: data.filePath,
        size: stats.size,
        lines,
        extension,
        lastModified: stats.mtime,
        analysis: analyzeFileContent(content, extension),
      };
    } catch (error) {
      throw new Error(`File analysis failed: ${error.message}`);
    }
  }

  // AI processing task
  if (data.type === "processAI") {
    // Simulate AI processing with different workloads
    const processingTime = Math.random() * 2000 + 500; // 500ms to 2.5s
    await new Promise((resolve) => setTimeout(resolve, processingTime));

    return {
      input: data.input,
      output: `AI Processed: ${data.input}`,
      confidence: Math.random(),
      processingTime,
      modelUsed: "optimized-model-v2026",
      tokensProcessed: Math.floor(data.input.length / 4),
    };
  }

  // Batch file processing
  if (data.type === "batchAnalyze") {
    const fs = require("fs").promises;
    const path = require("path");

    const results = [];
    for (const filePath of data.files) {
      try {
        const stats = await fs.stat(filePath);
        const extension = path.extname(filePath);
        const category = categorizeFile(path.basename(filePath));

        results.push({
          path: filePath,
          size: stats.size,
          extension,
          category,
          lastModified: stats.mtime,
        });
      } catch (error) {
        results.push({
          path: filePath,
          error: error.message,
        });
      }
    }

    return {
      batchId: data.batchId,
      totalFiles: data.files.length,
      processedFiles: results.length,
      results,
      processingStats: {
        averageFileSize: results.reduce((sum, r) => sum + (r.size || 0), 0) / results.length,
        categoriesFound: [...new Set(results.map((r) => r.category).filter(Boolean))].length,
      },
    };
  }

  // Directory scanning task
  if (data.type === "scanDirectory") {
    const fs = require("fs").promises;
    const path = require("path");
    const walkdir = require("walkdir");

    return new Promise((resolve, reject) => {
      const files = [];
      let totalSize = 0;
      const startTime = Date.now();

      const emitter = walkdir(data.directoryPath, {
        follow_symlinks: false,
        no_return: true,
        max_depth: data.maxDepth || 20,
      });

      emitter.on("path", async (filePath, stat) => {
        if (stat.isFile()) {
          try {
            const extension = path.extname(filePath);
            const category = categorizeFile(path.basename(filePath));

            files.push({
              name: path.basename(filePath),
              path: filePath,
              size: stat.size,
              extension,
              category,
              modified: stat.mtime,
              is_hidden: path.basename(filePath).startsWith("."),
            });

            totalSize += stat.size;

            // Report progress periodically
            if (files.length % 100 === 0) {
              parentPort.postMessage({
                type: "progress",
                taskId: data.taskId,
                progress: {
                  files: files.length,
                  totalSize,
                  currentFile: filePath,
                },
              });
            }
          } catch (error) {
            // Skip files that can't be accessed
          }
        }
      });

      emitter.on("end", () => {
        const processingTime = Date.now() - startTime;
        resolve({
          directoryPath: data.directoryPath,
          totalFiles: files.length,
          totalSize,
          files,
          processingTime,
          categories: categorizeFiles(files),
        });
      });

      emitter.on("error", (error) => {
        console.error(`Worker scan error for ${data.directoryPath}:`, error);

        // Provide more detailed error information
        const enhancedError = new Error(`Directory scan failed: ${error.message}`);
        enhancedError.code = error.code || "SCAN_ERROR";
        enhancedError.path = data.directoryPath;
        enhancedError.originalError = error;

        reject(enhancedError);
      });
    });
  }

  // Heavy computation task (for testing worker load)
  if (data.type === "heavyComputation") {
    const { complexity = 1000000 } = data;

    // Simulate CPU-intensive work
    let result = 0;
    for (let i = 0; i < complexity; i++) {
      result += Math.sin(i) * Math.cos(i);
      if (i % 100000 === 0) {
        // Yield control to prevent blocking
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    return {
      computation: "heavy",
      complexity,
      result: result.toFixed(2),
      performance: {
        operationsPerSecond: (complexity / (Date.now() - Date.now() + 1)) * 1000,
      },
    };
  }

  // Memory-intensive task
  if (data.type === "memoryIntensive") {
    const { size = 1000000 } = data;

    // Allocate and process large array
    const largeArray = new Array(size).fill(0).map((_, i) => ({
      id: i,
      value: Math.random(),
      data: `Item ${i}`.repeat(10),
    }));

    // Process array
    const processed = largeArray.map((item) => ({
      ...item,
      processed: true,
      hash: require("crypto").createHash("md5").update(item.data).digest("hex").substring(0, 8),
    }));

    // Calculate statistics
    const stats = {
      totalItems: processed.length,
      averageValue: processed.reduce((sum, item) => sum + item.value, 0) / processed.length,
      memoryUsage: process.memoryUsage().heapUsed,
    };

    return {
      taskType: "memoryIntensive",
      size,
      stats,
      sampleResults: processed.slice(0, 5), // Return first 5 results
    };
  }

  // Default task processing
  return {
    input: data,
    output: `Processed by worker ${workerId}`,
    timestamp: new Date().toISOString(),
    workerInfo: {
      id: workerId,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
  };
}

function analyzeFileContent(content, extension) {
  // Advanced content analysis
  const analysis = {
    totalChars: content.length,
    totalWords: content.split(/\s+/).filter((word) => word.length > 0).length,
    totalLines: content.split("\n").length,
    emptyLines: content.split("\n").filter((line) => line.trim().length === 0).length,
    hasImports: false,
    hasExports: false,
    hasComments: false,
    language: "unknown",
    complexity: {
      functions: 0,
      classes: 0,
      imports: 0,
      exports: 0,
    },
  };

  // Language-specific analysis
  if (extension === ".js" || extension === ".jsx") {
    analysis.language = "JavaScript";
    analysis.hasImports = /import\s+.*\s+from/.test(content) || /require\(/.test(content);
    analysis.hasExports = /export\s+/.test(content) || /module\.exports/.test(content);
    analysis.hasComments = /\/\/|\/\*/.test(content);
    analysis.complexity.functions = (
      content.match(/function\s+\w+|const\s+\w+\s*=\s*\(.*\)\s*=>/g) || []
    ).length;
    analysis.complexity.classes = (content.match(/class\s+\w+/g) || []).length;
  } else if (extension === ".ts" || extension === ".tsx") {
    analysis.language = "TypeScript";
    analysis.hasImports = /import\s+/.test(content);
    analysis.hasExports = /export\s+/.test(content);
    analysis.hasComments = /\/\/|\/\*/.test(content);
    analysis.complexity.functions = (
      content.match(/function\s+\w+|const\s+\w+\s*:\s*\w+\s*=\s*\(.*\)\s*=>/g) || []
    ).length;
    analysis.complexity.classes = (content.match(/class\s+\w+/g) || []).length;
    analysis.complexity.imports = (content.match(/import\s+.*\s+from/g) || []).length;
  } else if (extension === ".py") {
    analysis.language = "Python";
    analysis.hasImports = /import\s+|from\s+.*\s+import/.test(content);
    analysis.hasComments = /#/.test(content);
    analysis.complexity.functions = (content.match(/def\s+\w+/g) || []).length;
    analysis.complexity.classes = (content.match(/class\s+\w+/g) || []).length;
  } else if (extension === ".rs") {
    analysis.language = "Rust";
    analysis.hasImports = /use\s+|extern\s+crate/.test(content);
    analysis.hasComments = /\/\/|\/\*/.test(content);
    analysis.complexity.functions = (content.match(/fn\s+\w+/g) || []).length;
    analysis.complexity.imports = (content.match(/use\s+/g) || []).length;
  } else if (
    extension === ".cpp" ||
    extension === ".hpp" ||
    extension === ".c" ||
    extension === ".h"
  ) {
    analysis.language = "C/C++";
    analysis.hasImports = /#include/.test(content);
    analysis.hasComments = /\/\/|\/\*/.test(content);
    analysis.complexity.functions = (
      content.match(/(?:int|void|char|float|double|bool)\s+\w+\s*\(/g) || []
    ).length;
    analysis.complexity.classes = (content.match(/class\s+\w+|struct\s+\w+/g) || []).length;
  }
}

function categorizeFiles(files) {
  const categories = {};
  for (const file of files) {
    const category = file.category || "Other";
    if (!categories[category]) {
      categories[category] = {
        count: 0,
        size: 0,
        files: [],
      };
    }
    categories[category].count++;
    categories[category].size += file.size || 0;
    categories[category].files.push({
      name: file.name,
      size: file.size,
      path: file.path,
    });
  }
  return categories;
}

// Send periodic health updates
setInterval(() => {
  parentPort.postMessage({
    type: "healthCheck",
    health: getHealthMetrics(),
  });
}, 10000); // Every 10 seconds

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log(`Worker ${workerId} shutting down gracefully`);
  parentPort.postMessage({
    type: "shutdown",
    workerId,
  });
});

process.on("SIGINT", () => {
  console.log(`Worker ${workerId} received interrupt signal`);
  process.exit(0);
});
