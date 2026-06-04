#!/usr/bin/env node

/**
 * Accessibility Testing Script
 * Runs automated accessibility tests using axe-core
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

class AccessibilityTestRunner {
  constructor() {
    this.options = {
      testDir: "tests/e2e/accessibility",
      reporter: "html",
      wcagLevel: "WCAG2AA", // WCAG 2.0 Level AA
      tags: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
    };
  }

  async run() {
    console.log("♿ Starting Accessibility Tests");

    // Ensure test directory exists
    this.ensureDirectories();

    // Run accessibility tests
    const command = this.buildCommand();
    console.log("🚀 Running:", command.join(" "));

    return new Promise((resolve, reject) => {
      const child = spawn("npx", command, {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          ACCESSIBILITY_TEST: "true",
          WCAG_LEVEL: this.options.wcagLevel,
        },
      });

      child.on("close", (code) => {
        if (code === 0) {
          console.log("✅ Accessibility tests completed successfully");
          resolve();
        } else {
          console.error("❌ Accessibility tests failed");
          reject(new Error(`Accessibility tests exited with code ${code}`));
        }
      });
    });
  }

  ensureDirectories() {
    if (!fs.existsSync(this.options.testDir)) {
      fs.mkdirSync(this.options.testDir, { recursive: true });
      console.log(`📁 Created directory: ${this.options.testDir}`);
    }
  }

  buildCommand() {
    const args = [
      "playwright",
      "test",
      this.options.testDir,
      "--reporter=html",
      "--grep=accessibility",
    ];

    return args;
  }
}

// Run accessibility tests
if (require.main === module) {
  const runner = new AccessibilityTestRunner();
  runner.run().catch(console.error);
}

module.exports = AccessibilityTestRunner;
