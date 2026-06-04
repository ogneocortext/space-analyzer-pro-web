#!/usr/bin/env node

/**
 * Simple worker pool test script
 */

import { WorkerPool } from "./server/worker-pool.js";
import path from "path";

// Security: Validate paths
function validatePath(filePath) {
  const resolvedPath = path.resolve(filePath);
  const projectRoot = path.resolve(__dirname, "..", "..");
  return resolvedPath.startsWith(projectRoot);
}

async function testWorkerPool() {
  console.log("🧪 Testing Worker Pool...");

  try {
    // Initialize worker pool
    const workerPool = new WorkerPool({
      numWorkers: 2, // Use fewer workers for testing
      workerScript: path.join(__dirname, "server", "worker.js"),
    });

    console.log("✅ Worker pool initialized");

    // Test 1: Simple task
    console.log("\n📋 Test 1: Simple computation task");
    const result1 = await workerPool.executeTask({
      type: "heavyComputation",
      complexity: 100000,
    });

    console.log("✅ Simple task completed:", typeof result1);

    // Test 2: Directory scan task
    console.log("\n📋 Test 2: Directory scan task");
    const testDir = path.join(__dirname, "..", "..", "public");

    // Security: Validate test directory path
    if (!validatePath(testDir)) {
      console.error("❌ Security: Invalid test directory path");
      throw new Error("Invalid test directory path");
    }

    const result2 = await workerPool.executeTask(
      {
        type: "scanDirectory",
        directoryPath: testDir,
        taskId: "test-123",
        maxDepth: 5,
      },
      {
        timeout: 30000,
      }
    );

    console.log("✅ Directory scan completed:");
    console.log(`   Files found: ${result2.totalFiles}`);
    console.log(`   Total size: ${result2.totalSize} bytes`);
    console.log(`   Categories: ${Object.keys(result2.categories || {}).length}`);

    // Test 3: Multiple concurrent tasks
    console.log("\n📋 Test 3: Multiple concurrent tasks");
    const promises = [];

    for (let i = 0; i < 5; i++) {
      promises.push(
        workerPool.executeTask({
          type: "heavyComputation",
          complexity: 50000,
        })
      );
    }

    const results = await Promise.all(promises);
    console.log(`✅ ${results.length} concurrent tasks completed`);

    // Get worker pool stats
    console.log("\n📊 Worker Pool Stats:");
    const stats = workerPool.getStats();
    console.log(`   Total workers: ${stats.totalWorkers}`);
    console.log(`   Active workers: ${stats.activeWorkers}`);
    console.log(`   Queued tasks: ${stats.queuedTasks}`);
    console.log(`   Circuit breaker: ${stats.circuitBreakerState.state}`);

    // Shutdown worker pool
    await workerPool.shutdown();
    console.log("\n✅ Worker pool shutdown complete");
  } catch (error) {
    console.error("❌ Worker pool test failed:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 300),
    });
  }
}

// Run the test
testWorkerPool()
  .then(() => {
    console.log("\n🎉 Worker pool test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Worker pool test failed:", error);
    process.exit(1);
  });
