// Advanced Worker Thread Pool for Node.js 2025-2026
// Hardware-optimized: Uses dynamic configuration based on system specs

const { Worker, isMainThread, parentPort, threadId } = require("worker_threads");
const path = require("path");
const os = require("os");
const { EventEmitter } = require("events");
const dynamicConfig = require("./config/dynamic-config");

class CircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeout = 30000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

class WorkerPool extends EventEmitter {
  constructor(options = {}) {
    super();

    // Hardware-optimized worker pool configuration
    this.numWorkers = options.numWorkers || dynamicConfig.workerCount;
    this.workerScript = options.workerScript || path.join(__dirname, "worker.js");
    this.taskQueue = [];
    this.workers = new Map();
    this.activeWorkers = new Set();
    // Circuit breaker with hardware-optimized threshold
    this.circuitBreaker = new CircuitBreaker(
      options.failureThreshold || dynamicConfig.circuitBreakerThreshold,
      options.recoveryTimeout || 5000
    );

    this.taskIdCounter = 0;
    this.isShuttingDown = false;
    this.healthCheckInterval = null;

    this.initializeWorkers();
    this.startHealthMonitoring();
  }

  initializeWorkers() {
    for (let i = 0; i < this.numWorkers; i++) {
      this.createWorker();
    }
  }

  createWorker() {
    const worker = new Worker(this.workerScript, {
      workerData: {
        workerId: Date.now() + Math.random(),
        poolSize: this.numWorkers,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: dynamicConfig.workerMemoryMB,
        maxYoungGenerationSizeMb: Math.floor(dynamicConfig.workerMemoryMB / 4),
        codeRangeSizeMb: Math.floor(dynamicConfig.workerMemoryMB / 16),
        stackSizeMb: 16,
      },
    });

    worker.on("message", (message) => this.handleWorkerMessage(worker, message));
    worker.on("error", (error) => this.handleWorkerError(worker, error));
    worker.on("exit", (code) => this.handleWorkerExit(worker, code));

    worker.taskQueue = [];
    worker.isProcessing = false;
    worker.lastActivity = Date.now();
    worker.healthScore = 100;

    this.workers.set(worker.threadId, worker);
    this.emit("workerCreated", worker.threadId);
  }

  async executeTask(taskData, options = {}) {
    if (this.isShuttingDown) {
      throw new Error("Worker pool is shutting down");
    }

    return this.circuitBreaker.execute(async () => {
      const taskId = ++this.taskIdCounter;

      return new Promise((resolve, reject) => {
        const task = {
          id: taskId,
          data: taskData,
          options,
          resolve,
          reject,
          submittedAt: Date.now(),
          timeout: options.timeout || dynamicConfig.taskTimeout,
        };

        this.taskQueue.push(task);
        this.processQueue();

        // Set timeout with proper cleanup
        const timeoutId = setTimeout(() => {
          const index = this.taskQueue.findIndex((t) => t.id === taskId);
          if (index !== -1) {
            this.taskQueue.splice(index, 1);
            reject(new Error(`Task ${taskId} timed out`));
          }
        }, task.timeout || 30000); // Default 30s timeout

        // Store timeout ID for cleanup
        task.timeoutId = timeoutId;
      });
    });
  }

  processQueue() {
    if (this.taskQueue.length === 0) return;

    // Find available worker
    const availableWorker = this.findAvailableWorker();
    if (!availableWorker) return;

    const task = this.taskQueue.shift();
    this.assignTaskToWorker(task, availableWorker);
  }

  findAvailableWorker() {
    // Find worker with lowest load and good health
    let bestWorker = null;
    let bestScore = -1;

    for (const worker of this.workers.values()) {
      if (worker.isProcessing || worker.healthScore < 50) continue;

      const queueLength = worker.taskQueue.length;
      const healthScore = worker.healthScore;
      const lastActivity = Date.now() - worker.lastActivity;

      // Score based on queue length, health, and recent activity
      const score = 100 - queueLength * 10 + healthScore * 0.5 - lastActivity / 1000;

      if (score > bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    }

    return bestWorker;
  }

  assignTaskToWorker(task, worker) {
    worker.isProcessing = true;
    worker.lastActivity = Date.now();
    worker.taskQueue.push(task);

    worker.postMessage({
      type: "task",
      taskId: task.id,
      data: task.data,
      options: task.options,
    });

    this.activeWorkers.add(worker.threadId);
  }

  handleWorkerMessage(worker, message) {
    worker.lastActivity = Date.now();

    switch (message.type) {
      case "taskComplete":
        this.handleTaskComplete(worker, message);
        break;
      case "taskError":
        this.handleTaskError(worker, message);
        break;
      case "healthCheck":
        this.updateWorkerHealth(worker, message.health);
        break;
      case "metrics":
        this.emit("workerMetrics", worker.threadId, message.metrics);
        break;
    }
  }

  handleTaskComplete(worker, message) {
    const taskIndex = worker.taskQueue.findIndex((t) => t.id === message.taskId);
    if (taskIndex !== -1) {
      const task = worker.taskQueue[taskIndex];
      worker.taskQueue.splice(taskIndex, 1);

      // Clear timeout if exists
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }

      task.resolve(message.result);
    }

    worker.isProcessing = worker.taskQueue.length > 0;
    this.activeWorkers.delete(worker.threadId);
    this.processQueue();

    this.emit("taskCompleted", message.taskId, message.result);
  }

  handleTaskError(worker, message) {
    const taskIndex = worker.taskQueue.findIndex((t) => t.id === message.taskId);
    if (taskIndex !== -1) {
      const task = worker.taskQueue[taskIndex];
      worker.taskQueue.splice(taskIndex, 1);

      // Clear timeout if exists
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }

      task.reject(new Error(message.error));
    }

    worker.isProcessing = worker.taskQueue.length > 0;
    worker.healthScore = Math.max(0, worker.healthScore - 10);
    this.activeWorkers.delete(worker.threadId);
    this.processQueue();

    this.emit("taskFailed", message.taskId, message.error);
  }

  handleWorkerError(worker, error) {
    console.error(`Worker ${worker.threadId} error:`, error);
    worker.healthScore = Math.max(0, worker.healthScore - 20);

    // Fail all pending tasks for this worker
    for (const task of worker.taskQueue) {
      // Clear timeout if exists
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }
      task.reject(new Error(`Worker error: ${error.message}`));
    }
    worker.taskQueue = [];

    worker.isProcessing = false;
    this.activeWorkers.delete(worker.threadId);

    // Replace failed worker
    this.workers.delete(worker.threadId);
    this.createWorker();
    this.processQueue();
  }

  handleWorkerExit(worker, code) {
    console.log(`Worker ${worker.threadId} exited with code ${code}`);

    this.workers.delete(worker.threadId);
    this.activeWorkers.delete(worker.threadId);

    // Fail pending tasks
    for (const task of worker.taskQueue) {
      task.reject(new Error(`Worker exited with code ${code}`));
    }

    // Create replacement worker if not shutting down
    if (!this.isShuttingDown) {
      this.createWorker();
    }

    this.processQueue();
  }

  updateWorkerHealth(worker, health) {
    worker.healthScore = Math.min(100, Math.max(0, health.score));
    worker.lastActivity = Date.now();
  }

  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      for (const worker of this.workers.values()) {
        worker.postMessage({ type: "healthCheck" });
      }
    }, 5000); // Check every 5 seconds
  }

  getStats() {
    const workers = Array.from(this.workers.values());
    const stats = {
      totalWorkers: workers.length,
      activeWorkers: this.activeWorkers.size,
      queuedTasks: this.taskQueue.length,
      circuitBreakerState: this.circuitBreaker.getState(),
      workerStats: workers.map((w) => ({
        threadId: w.threadId,
        isProcessing: w.isProcessing,
        queueLength: w.taskQueue.length,
        healthScore: w.healthScore,
        lastActivity: w.lastActivity,
      })),
    };

    return stats;
  }

  async gracefulShutdown(timeout = 30000) {
    this.isShuttingDown = true;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Wait for active tasks to complete
    const shutdownPromise = new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.activeWorkers.size === 0 && this.taskQueue.length === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Force shutdown after timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn("Force shutting down worker pool due to timeout");
        resolve();
      }, timeout);
    });

    await Promise.race([shutdownPromise, timeoutPromise]);

    // Terminate all workers
    for (const worker of this.workers.values()) {
      worker.terminate();
    }

    this.workers.clear();
    this.activeWorkers.clear();
    this.taskQueue.length = 0;

    this.emit("shutdown");
  }
}

// Worker thread script (to be created as worker.js)
const workerScript = `
const { parentPort, workerData } = require('worker_threads');
const os = require('os');
const v8 = require('v8');

const workerId = workerData.workerId;

// Health monitoring
function getHealthMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();

    // Calculate health score based on memory and CPU
    const memoryPressure = memUsage.heapUsed / memUsage.heapTotal;
    const healthScore = Math.max(0, 100 - (memoryPressure * 50) - (cpuUsage.user / 1000000));

    return {
        score: Math.round(healthScore),
        memory: memUsage,
        uptime,
        cpu: cpuUsage,
        activeTasks: 0 // Will be updated by pool
    };
}

// Task processing
parentPort.on('message', async (message) => {
    try {
        switch (message.type) {
            case 'task':
                const startTime = Date.now();
                const result = await processTask(message.data, message.options);
                const processingTime = Date.now() - startTime;

                parentPort.postMessage({
                    type: 'taskComplete',
                    taskId: message.taskId,
                    result: {
                        ...result,
                        processingTime,
                        workerId
                    }
                });
                break;

            case 'healthCheck':
                parentPort.postMessage({
                    type: 'healthCheck',
                    health: getHealthMetrics()
                });
                break;

            default:
                throw new Error(\`Unknown message type: \${message.type}\`);
        }
    } catch (error) {
        parentPort.postMessage({
            type: 'taskError',
            taskId: message.taskId,
            error: error.message,
            stack: error.stack
        });
    }
});

// Task processing function - customize based on your needs
async function processTask(data, options) {
    // Example: File analysis task
    if (data.type === 'analyzeFile') {
        const fs = require('fs').promises;
        const path = require('path');

        try {
            const stats = await fs.stat(data.filePath);
            const content = await fs.readFile(data.filePath, 'utf8');
            const lines = content.split('\\n').length;
            const extension = path.extname(data.filePath);

            return {
                filePath: data.filePath,
                size: stats.size,
                lines,
                extension,
                lastModified: stats.mtime,
                analysis: analyzeFileContent(content, extension)
            };
        } catch (error) {
            throw new Error(\`File analysis failed: \${error.message}\`);
        }
    }

    // AI processing task
    if (data.type === 'processAI') {
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

        return {
            input: data.input,
            output: \`Processed: \${data.input}\`,
            confidence: Math.random(),
            processingTime: Math.random() * 1000
        };
    }

    // Default task processing
    return {
        input: data,
        output: \`Processed by worker \${workerId}\`,
        timestamp: new Date().toISOString()
    };
}

function analyzeFileContent(content, extension) {
    // Basic content analysis
    const analysis = {
        totalChars: content.length,
        totalWords: content.split(/\\s+/).length,
        totalLines: content.split('\\n').length,
        hasImports: false,
        language: 'unknown'
    };

    // Detect language and features
    if (extension === '.js' || extension === '.jsx') {
        analysis.language = 'JavaScript';
        analysis.hasImports = content.includes('import') || content.includes('require');
    } else if (extension === '.ts' || extension === '.tsx') {
        analysis.language = 'TypeScript';
        analysis.hasImports = content.includes('import');
    } else if (extension === '.py') {
        analysis.language = 'Python';
        analysis.hasImports = content.includes('import') || content.includes('from');
    } else if (extension === '.rs') {
        analysis.language = 'Rust';
        analysis.hasImports = content.includes('use ') || content.includes('extern');
    } else if (extension === '.cpp' || extension === '.hpp' || extension === '.c' || extension === '.h') {
        analysis.language = 'C/C++';
        analysis.hasImports = content.includes('#include');
    }

    return analysis;
}

// Send periodic health updates
setInterval(() => {
    parentPort.postMessage({
        type: 'healthCheck',
        health: getHealthMetrics()
    });
}, 10000); // Every 10 seconds
`;

module.exports = { WorkerPool, CircuitBreaker };

// Export the worker script content for creating worker.js
module.exports.workerScript = workerScript;
