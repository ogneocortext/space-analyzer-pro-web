#!/usr/bin/env node

/**
 * 3D Browser Test Script
 * Tests 3D visualization and browser compatibility features
 */

import { spawn } from "child_process";
import http from "http";

class Browser3DTestRunner {
  constructor() {
    this.backendUrl = "http://localhost:8080";
    this.frontendUrl = "http://localhost:5173";
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

  async makeRequest(url, method = "GET", data = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
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
          try {
            const data = body ? JSON.parse(body) : null;
            resolve({
              status: res.statusCode,
              data: data,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: body,
            });
          }
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

  async test3DEndpoints() {
    this.log("Testing 3D Browser Features...", "INFO");

    const tests = [
      {
        name: "3D File Structure API",
        path: "/api/files/3d-structure",
        method: "GET",
      },
      {
        name: "WebGL Support Check",
        path: "/api/system/webgl-support",
        method: "GET",
      },
      {
        name: "3D Visualization Data",
        path: "/api/analysis/3d-visualization",
        method: "GET",
      },
      {
        name: "Browser Compatibility",
        path: "/api/system/browser-compatibility",
        method: "GET",
      },
    ];

    for (const test of tests) {
      try {
        this.log(`Running: ${test.name}`, "INFO");
        const result = await this.makeRequest(
          `${this.backendUrl}${test.path}`,
          test.method,
          test.data,
        );

        if (result.status === 200) {
          this.log(`✅ ${test.name} - SUCCESS`, "SUCCESS");
          this.testResults.push({ test: test.name, status: "PASS" });
        } else {
          this.log(`❌ ${test.name} - FAILED (${result.status})`, "ERROR");
          this.testResults.push({
            test: test.name,
            status: "FAIL",
            error: result.status,
          });
        }
      } catch (error) {
        this.log(`❌ ${test.name} - ERROR: ${error.message}`, "ERROR");
        this.testResults.push({
          test: test.name,
          status: "ERROR",
          error: error.message,
        });
      }
    }
  }

  async testFrontend3D() {
    this.log("Testing Frontend 3D Components...", "INFO");

    try {
      const result = await this.makeRequest(this.frontendUrl);
      if (result.status === 200) {
        this.log("✅ Frontend is accessible", "SUCCESS");
        this.testResults.push({ test: "Frontend 3D Access", status: "PASS" });
      } else {
        this.log(`❌ Frontend not accessible (${result.status})`, "ERROR");
        this.testResults.push({
          test: "Frontend 3D Access",
          status: "FAIL",
          error: result.status,
        });
      }
    } catch (error) {
      this.log(`❌ Frontend 3D test failed: ${error.message}`, "ERROR");
      this.testResults.push({
        test: "Frontend 3D Access",
        status: "ERROR",
        error: error.message,
      });
    }
  }

  async checkServiceHealth() {
    try {
      const backendResult = await this.makeRequest(
        `${this.backendUrl}/api/health`,
      );
      const frontendResult = await this.makeRequest(this.frontendUrl);

      return {
        backend: backendResult.status === 200,
        frontend: frontendResult.status === 200,
      };
    } catch (error) {
      return {
        backend: false,
        frontend: false,
      };
    }
  }

  async run() {
    console.log("🌐 3D Browser Test Runner\n");

    // Check if services are running
    const health = await this.checkServiceHealth();

    if (!health.backend) {
      this.log(
        "❌ Backend is not running. Please start the server first.",
        "ERROR",
      );
      this.log("   Run: npm run server", "INFO");
      process.exit(1);
    }

    if (!health.frontend) {
      this.log(
        "❌ Frontend is not running. Please start the dev server first.",
        "ERROR",
      );
      this.log("   Run: npm run dev", "INFO");
      process.exit(1);
    }

    this.log("✅ Both services are healthy", "SUCCESS");

    // Run tests
    await this.test3DEndpoints();
    await this.testFrontend3D();

    // Display results
    console.log("\n📊 Test Results:");
    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;
    const errors = this.testResults.filter((r) => r.status === "ERROR").length;

    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Errors: ${errors}`);

    if (failed > 0 || errors > 0) {
      console.log("\n❌ Some tests failed:");
      this.testResults
        .filter((r) => r.status !== "PASS")
        .forEach((r) => console.log(`   - ${r.test}: ${r.error || r.status}`));
      process.exit(1);
    } else {
      console.log("\n✅ All 3D browser tests passed!");
    }
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught error:", error.message);
  process.exit(1);
});

// Run tests
new Browser3DTestRunner().run().catch(console.error);
