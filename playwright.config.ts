import { defineConfig, devices } from "@playwright/test";
import { API_SERVER_PORT, PLAYWRIGHT_BASE_URL } from "./ports.config.js";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120000, // Increased timeout for complex operations
  retries: process.env.CI ? 1 : 2, // Fewer retries in CI
  workers: process.env.CI ? 4 : parseInt(process.env.PLAYWRIGHT_WORKERS || "2"), // Parallel execution
  fullyParallel: true, // Enable full parallel execution
  maxFailures: process.env.CI ? 10 : undefined, // Stop after N failures in CI

  // Global test options
  forbidOnly: !!process.env.CI,
  grep: process.env.PLAYWRIGHT_GREP,
  grepInvert: process.env.PLAYWRIGHT_GREP_INVERT,

  // Output directory for test artifacts
  outputDir: "./test-results/artifacts",

  // Enhanced reporter configuration
  reporter: [
    [
      "html",
      {
        outputFolder: "./test-results/html-report",
        open: process.env.CI ? "never" : "on-failure",
        host: "localhost",
        port: 9323,
      },
    ],
    ["list", { printSteps: true }],
    ["json", { outputFile: "./test-results/results.json" }],
    ["junit", { outputFile: "./test-results/junit-results.xml" }],
    ["github"], // GitHub Actions annotations
    // ["allure-playwright"], // Allure reporting - requires allure-playwright package
  ],

  use: {
    headless: process.env.CI ? true : process.env.HEADLESS !== "false",
    baseURL: PLAYWRIGHT_BASE_URL,
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    trace: process.env.CI ? "retain-on-failure" : "on-first-retry",
    screenshot: process.env.CI ? "only-on-failure" : "on",
    video: process.env.CI ? "retain-on-failure" : "on",

    // Enhanced timeouts
    actionTimeout: 15000,
    navigationTimeout: 45000,

    // Test isolation
    testIdAttribute: "data-testid",

    // Network conditions
    offline: false,
    colorScheme: "light",

    // Locale and timezone
    locale: "en-US",
    timezoneId: "America/New_York",

    // User agent
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  },

  // Multiple browser projects for cross-browser testing
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use existing Chrome installation
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile testing
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
    // Tablet testing
    {
      name: "tablet",
      use: { ...devices["iPad Pro"] },
    },
  ],

  // Global setup and teardown
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",

  // Test metadata
  metadata: {
    "Test Environment": process.env.NODE_ENV || "test",
    "Browser Version": "auto-detected",
    "Test Suite": "Space Analyzer E2E",
  },

  // Web server configuration (alternative to global setup)
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "npm run server:dev",
          port: 8080,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          command: "npm run dev:no-browser",
          port: 5173,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
          stdout: "pipe",
          stderr: "pipe",
        },
      ],
});
