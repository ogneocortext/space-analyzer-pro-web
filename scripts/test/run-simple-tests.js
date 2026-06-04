#!/usr/bin/env node

/**
 * Simple Test Runner
 * Runs basic tests to identify and fix issues
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import { existsSync } from "fs";

class SimpleTestRunner {
  constructor() {
    this.testFile = "tests/e2e/basic-connectivity.spec.ts";
  }

  async run() {
    console.log("🧪 Running Simple Test Suite");

    try {
      // Check if test file exists
      if (!existsSync(this.testFile)) {
        throw new Error(`Test file not found: ${this.testFile}`);
      }

      // Run the test
      const result = await this.runTest();

      if (result.success) {
        console.log("✅ All tests passed successfully");
        console.log("\n📊 Test Results:");
        console.log(`- Tests run: ${result.testsRun}`);
        console.log(`- Passed: ${result.passed}`);
        console.log(`- Failed: ${result.failed}`);
        console.log(`- Duration: ${result.duration}ms`);
      } else {
        console.log("❌ Some tests failed");
        console.log("\n🔍 Issues found:");
        result.errors.forEach((error) => {
          console.log(`- ${error}`);
        });
      }

      return result;
    } catch (error) {
      console.error("❌ Test runner failed:", error.message);
      throw error;
    }
  }

  async runTest() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = spawn("npx", ["playwright", "test", this.testFile, "--reporter=list"], {
        stdio: "pipe",
        shell: true,
      });

      let output = "";
      let errorOutput = "";

      child.stdout.on("data", (data) => {
        output += data.toString();
        console.log(data.toString().trim());
      });

      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error(data.toString().trim());
      });

      child.on("close", (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;

        // Parse results
        const testsRun = (output.match(/✓/g) || []).length;
        const failed = (output.match(/✗/g) || []).length;
        const passed = testsRun - failed;

        const errors = [];
        if (errorOutput.includes("ECONNREFUSED")) {
          errors.push("Connection refused - services not running");
        }
        if (errorOutput.includes("timeout")) {
          errors.push("Test timeout - slow response or hanging");
        }
        if (errorOutput.includes("Cannot find module")) {
          errors.push("Missing dependencies - run npm install");
        }

        resolve({
          success,
          testsRun,
          passed,
          failed,
          duration,
          errors,
          output,
          errorOutput,
        });
      });
    });
  }
}

// Run tests
const runner = new SimpleTestRunner();
runner.run().catch(console.error);

export default SimpleTestRunner;
