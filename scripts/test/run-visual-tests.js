#!/usr/bin/env node

/**
 * Visual Regression Testing Script
 * Runs visual comparison tests using Playwright's screenshot comparison
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

class VisualTestRunner {
  constructor() {
    this.options = {
      testDir: "tests/e2e/visual",
      baselineDir: "tests/baseline",
      actualDir: "test-results/visual",
      reporter: "html",
      viewport: { width: 1280, height: 720 },
      fullPage: true,
      threshold: 0.2,
    };
  }

  async run() {
    console.log("🎨 Starting Visual Regression Tests");

    // Ensure directories exist
    this.ensureDirectories();

    // Run visual tests
    const command = this.buildCommand();
    console.log("🚀 Running:", command.join(" "));

    return new Promise((resolve, reject) => {
      const child = spawn("npx", command, {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          VISUAL_TEST: "true",
          UPDATE_BASELINE: process.env.UPDATE_BASELINE || "false",
        },
      });

      child.on("close", (code) => {
        if (code === 0) {
          console.log("✅ Visual tests completed successfully");
          resolve();
        } else {
          console.error("❌ Visual tests failed");
          reject(new Error(`Visual tests exited with code ${code}`));
        }
      });
    });
  }

  ensureDirectories() {
    const dirs = [this.options.testDir, this.options.baselineDir, this.options.actualDir];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  buildCommand() {
    const args = [
      "playwright",
      "test",
      this.options.testDir,
      "--reporter=html",
      "--update-snapshots=" + (process.env.UPDATE_BASELINE === "true" ? "all" : "missing"),
      "--screenshot=only-on-failure",
      "--video=off",
      "--trace=off",
    ];

    return args;
  }
}

// Run visual tests
if (require.main === module) {
  const runner = new VisualTestRunner();
  runner.run().catch(console.error);
}

module.exports = VisualTestRunner;
