#!/usr/bin/env node

/**
 * Playwright Test Runner Script
 * Provides a comprehensive test runner with various options and configurations
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";

class PlaywrightTestRunner {
  constructor() {
    this.options = {
      browser: "chromium",
      reporter: "html",
      timeout: 120000,
      retries: 2,
      workers: 1,
      headless: true,
      testDir: "tests/e2e",
      grep: "",
      grepInvert: "",
      project: "",
      shard: "",
      updateSnapshots: false,
      debug: false,
      trace: "retain-on-failure",
      video: "retain-on-failure",
      screenshot: "only-on-failure",
    };
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case "--browser":
        case "-b":
          this.options.browser = nextArg || "chromium";
          i++;
          break;
        case "--reporter":
        case "-r":
          this.options.reporter = nextArg || "html";
          i++;
          break;
        case "--timeout":
        case "-t":
          this.options.timeout = parseInt(nextArg) || 120000;
          i++;
          break;
        case "--retries":
          this.options.retries = parseInt(nextArg) || 2;
          i++;
          break;
        case "--workers":
        case "-w":
          this.options.workers = parseInt(nextArg) || 1;
          i++;
          break;
        case "--test-dir":
          this.options.testDir = nextArg || "tests/e2e";
          i++;
          break;
        case "--grep":
          this.options.grep = nextArg || "";
          i++;
          break;
        case "--grep-invert":
          this.options.grepInvert = nextArg || "";
          i++;
          break;
        case "--project":
          this.options.project = nextArg || "";
          i++;
          break;
        case "--shard":
          this.options.shard = nextArg || "";
          i++;
          break;
        case "--update-snapshots":
          this.options.updateSnapshots = true;
          break;
        case "--debug":
          this.options.debug = true;
          this.options.headless = false;
          this.options.workers = 1;
          break;
        case "--trace":
          this.options.trace = nextArg || "retain-on-failure";
          i++;
          break;
        case "--video":
          this.options.video = nextArg || "retain-on-failure";
          i++;
          break;
        case "--screenshot":
          this.options.screenshot = nextArg || "only-on-failure";
          i++;
          break;
        case "--headed":
          this.options.headless = false;
          break;
        case "--help":
        case "-h":
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith("--")) {
            console.warn(`Unknown option: ${arg}`);
          }
      }
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
🎭 Playwright Test Runner

Usage: node scripts/run-playwright-tests.js [options]

Options:
  -b, --browser <browser>        Browser to run tests on (chromium, firefox, webkit) [default: chromium]
  -r, --reporter <reporter>      Reporter to use (html, list, json, junit) [default: html]
  -t, --timeout <ms>            Test timeout in milliseconds [default: 120000]
  --retries <count>             Number of retries [default: 2]
  -w, --workers <count>         Number of workers [default: 1]
  --test-dir <path>             Test directory path [default: tests/e2e]
  --grep <pattern>              Run tests matching pattern
  --grep-invert <pattern>       Run tests not matching pattern
  --project <name>              Run specific project
  --shard <shard>               Run tests in shard (e.g., 1/3)
  --update-snapshots            Update snapshots
  --debug                       Run in debug mode (headed, single worker)
  --trace <mode>                Trace mode (on, off, retain-on-failure) [default: retain-on-failure]
  --video <mode>                Video mode (on, off, retain-on-failure) [default: retain-on-failure]
  --screenshot <mode>           Screenshot mode (on, off, only-on-failure) [default: only-on-failure]
  --headed                      Run in headed mode
  -h, --help                    Show this help message

Examples:
  node scripts/run-playwright-tests.js --browser firefox --reporter list
  node scripts/run-playwright-tests.js --grep "smoke" --workers 4
  node scripts/run-playwright-tests.js --debug --test-dir tests/e2e/smoke
  node scripts/run-playwright-tests.js --shard "1/3" --project chromium
  node scripts/run-playwright-tests.js --update-snapshots --grep "visual"

Test Categories:
  smoke                         Run smoke tests
  regression                    Run regression tests
  accessibility                 Run accessibility tests
  performance                   Run performance tests
  mobile                        Run mobile tests
  security                      Run security tests
  all                           Run all tests
    `);
  }

  /**
   * Build Playwright command
   */
  buildCommand() {
    const args = ["playwright", "test", this.options.testDir];

    // Add browser option
    if (this.options.browser) {
      args.push(`--browser=${this.options.browser}`);
    }

    // Add reporter option
    if (this.options.reporter) {
      args.push(`--reporter=${this.options.reporter}`);
    }

    // Add timeout option
    if (this.options.timeout) {
      args.push(`--timeout=${this.options.timeout}`);
    }

    // Add retries option
    if (this.options.retries > 0) {
      args.push(`--retries=${this.options.retries}`);
    }

    // Add workers option
    if (this.options.workers > 0) {
      args.push(`--workers=${this.options.workers}`);
    }

    // Add grep option
    if (this.options.grep) {
      args.push(`--grep=${this.options.grep}`);
    }

    // Add grep invert option
    if (this.options.grepInvert) {
      args.push(`--grep-invert=${this.options.grepInvert}`);
    }

    // Add project option
    if (this.options.project) {
      args.push(`--project=${this.options.project}`);
    }

    // Add shard option
    if (this.options.shard) {
      args.push(`--shard=${this.options.shard}`);
    }

    // Add update snapshots option
    if (this.options.updateSnapshots) {
      args.push("--update-snapshots");
    }

    // Add trace option
    if (this.options.trace) {
      args.push(`--trace=${this.options.trace}`);
    }

    // Add video option
    if (this.options.video) {
      args.push(`--video=${this.options.video}`);
    }

    // Add screenshot option
    if (this.options.screenshot) {
      args.push(`--screenshot=${this.options.screenshot}`);
    }

    // Add headed option
    if (!this.options.headless) {
      args.push("--headed");
    }

    return args;
  }

  /**
   * Run tests
   */
  async runTests() {
    console.log("🎭 Starting Playwright Test Runner");
    console.log("📋 Configuration:", JSON.stringify(this.options, null, 2));

    // Ensure test directory exists
    if (!fs.existsSync(this.options.testDir)) {
      console.error(`❌ Test directory does not exist: ${this.options.testDir}`);
      process.exit(1);
    }

    // Build command
    const command = this.buildCommand();
    console.log("🚀 Running command:", command.join(" "));

    // Run tests
    return new Promise((resolve, reject) => {
      const child = spawn("npx", command, {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          CI: process.env.CI || "false",
          NODE_ENV: "test",
          PWDEBUG: this.options.debug ? "1" : "0",
        },
      });

      child.on("close", (code) => {
        if (code === 0) {
          console.log("✅ Tests completed successfully");
          resolve(code);
        } else {
          console.log(`❌ Tests failed with exit code ${code}`);
          process.exit(code);
        }
      });

      child.on("error", (error) => {
        console.error("❌ Error running tests:", error);
        process.exit(1);
      });
    });
  }

  /**
   * Run specific test category
   */
  async runTestCategory(category) {
    const categoryConfigs = {
      smoke: {
        testDir: "tests/e2e/smoke",
        grep: "smoke",
        reporter: "list",
        timeout: 60000,
        retries: 1,
      },
      regression: {
        testDir: "tests/e2e/regression",
        grep: "regression",
        reporter: "html",
        timeout: 120000,
        retries: 2,
      },
      accessibility: {
        testDir: "tests/e2e/accessibility",
        grep: "accessibility",
        reporter: "html",
        timeout: 90000,
        retries: 1,
      },
      performance: {
        testDir: "tests/e2e/performance",
        grep: "performance",
        reporter: "json",
        timeout: 180000,
        retries: 1,
      },
      mobile: {
        testDir: "tests/e2e/mobile",
        grep: "mobile",
        reporter: "html",
        timeout: 120000,
        retries: 2,
      },
      security: {
        testDir: "tests/e2e/security",
        grep: "security",
        reporter: "html",
        timeout: 90000,
        retries: 1,
      },
      all: {
        testDir: "tests/e2e",
        grep: "",
        reporter: "html",
        timeout: 120000,
        retries: 2,
      },
    };

    const config = categoryConfigs[category];
    if (!config) {
      console.error(`❌ Unknown test category: ${category}`);
      process.exit(1);
    }

    // Apply category configuration
    Object.assign(this.options, config);

    console.log(`🎯 Running ${category} tests`);
    await this.runTests();
  }

  /**
   * Setup test environment
   */
  async setupEnvironment() {
    console.log("🔧 Setting up test environment...");

    // Create test results directory
    const resultsDir = path.join(process.cwd(), "test-results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Create screenshots directory
    const screenshotsDir = path.join(resultsDir, "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Create videos directory
    const videosDir = path.join(resultsDir, "videos");
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    console.log("✅ Test environment setup complete");
  }

  /**
   * Cleanup test environment
   */
  async cleanupEnvironment() {
    console.log("🧹 Cleaning up test environment...");

    // Clean up old test results (keep last 5 runs)
    const resultsDir = path.join(process.cwd(), "test-results");
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir);
      const htmlReports = files.filter((file) => file.startsWith("playwright-report-"));

      if (htmlReports.length > 5) {
        htmlReports
          .sort()
          .slice(0, -5)
          .forEach((report) => {
            const reportPath = path.join(resultsDir, report);
            if (fs.statSync(reportPath).isDirectory()) {
              fs.rmSync(reportPath, { recursive: true, force: true });
            }
          });
      }
    }

    console.log("✅ Test environment cleanup complete");
  }

  /**
   * Main execution method
   */
  async run() {
    try {
      // Parse arguments
      this.parseArgs();

      // Setup environment
      await this.setupEnvironment();

      // Check if running a specific category
      const category = process.argv.find((arg) =>
        [
          "smoke",
          "regression",
          "accessibility",
          "performance",
          "mobile",
          "security",
          "all",
        ].includes(arg)
      );

      if (category) {
        await this.runTestCategory(category);
      } else {
        await this.runTests();
      }

      // Cleanup environment
      await this.cleanupEnvironment();

      console.log("🎉 Playwright test runner completed successfully");
    } catch (error) {
      console.error("❌ Playwright test runner failed:", error);
      process.exit(1);
    }
  }
}

// Run the test runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new PlaywrightTestRunner();
  runner.run();
}

export default PlaywrightTestRunner;
