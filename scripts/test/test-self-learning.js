#!/usr/bin/env node

/**
 * Self-Learning System Test Script
 * Tests the AI self-learning capabilities and ML categorization
 */

import { spawn } from "child_process";
import http from "http";

class SelfLearningTestRunner {
  constructor() {
    this.backendUrl = "http://localhost:8080";
    this.testResults = [];
  }

  log(message, level = "INFO") {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      INFO: "\x1b[36m",
      WARN: "\x1b[33m",
      ERROR: "\x1b[31m",
      SUCCESS: "\x1b[32m",
      RESET: "\x1b[0m",
    };
    
    console.log(`${colors[level]}[${timestamp}] ${message}${colors.RESET}`);
  }

  async makeRequest(path, method = "GET", data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "localhost",
        port: 8080,
        path: path,
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null,
          });
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async testLearningEndpoints() {
    this.log("Testing Self-Learning System Endpoints...", "INFO");

    const tests = [
      {
        name: "Learning System Status",
        path: "/api/learning/status",
        method: "GET",
      },
      {
        name: "AI Model Training",
        path: "/api/learning/train",
        method: "POST",
        data: { model_type: "file_categorizer" },
      },
      {
        name: "Learning Analytics",
        path: "/api/learning/analytics",
        method: "GET",
      },
      {
        name: "Model Performance",
        path: "/api/learning/performance",
        method: "GET",
      },
    ];

    for (const test of tests) {
      try {
        this.log(`Running: ${test.name}`, "INFO");
        const result = await this.makeRequest(test.path, test.method, test.data);
        
        if (result.status === 200) {
          this.log(`✅ ${test.name} - SUCCESS`, "SUCCESS");
          this.testResults.push({ test: test.name, status: "PASS" });
        } else {
          this.log(`❌ ${test.name} - FAILED (${result.status})`, "ERROR");
          this.testResults.push({ test: test.name, status: "FAIL", error: result.status });
        }
      } catch (error) {
        this.log(`❌ ${test.name} - ERROR: ${error.message}`, "ERROR");
        this.testResults.push({ test: test.name, status: "ERROR", error: error.message });
      }
    }
  }

  async checkBackendHealth() {
    try {
      const result = await this.makeRequest("/api/health");
      return result.status === 200;
    } catch (error) {
      return false;
    }
  }

  async run() {
    console.log("🧠 Self-Learning System Test Runner\n");

    // Check if backend is running
    const isBackendHealthy = await this.checkBackendHealth();
    if (!isBackendHealthy) {
      this.log("❌ Backend is not running. Please start the server first.", "ERROR");
      this.log("   Run: npm run server", "INFO");
      process.exit(1);
    }

    this.log("✅ Backend is healthy", "SUCCESS");

    // Run tests
    await this.testLearningEndpoints();

    // Display results
    console.log("\n📊 Test Results:");
    const passed = this.testResults.filter(r => r.status === "PASS").length;
    const failed = this.testResults.filter(r => r.status === "FAIL").length;
    const errors = this.testResults.filter(r => r.status === "ERROR").length;

    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Errors: ${errors}`);

    if (failed > 0 || errors > 0) {
      console.log("\n❌ Some tests failed:");
      this.testResults
        .filter(r => r.status !== "PASS")
        .forEach(r => console.log(`   - ${r.test}: ${r.error || r.status}`));
      process.exit(1);
    } else {
      console.log("\n✅ All tests passed!");
    }
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught error:", error.message);
  process.exit(1);
});

// Run tests
new SelfLearningTestRunner().run().catch(console.error);