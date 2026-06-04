#!/usr/bin/env node

/**
 * QA Tools Setup Script
 * Installs and configures all QA tools for the project
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

class QAToolsSetup {
  constructor() {
    this.packages = [
      "@sentry/vue",
      "@sentry/tracing",
      "@testing-library/vue",
      "@testing-library/jest-dom",
      "allure-commandline",
      "allure-playwright",
      "newman",
      "artillery",
      "axe-playwright",
    ];

    this.directories = [
      "tests/e2e/visual",
      "tests/e2e/accessibility",
      "tests/e2e/security",
      "tests/api",
      "tests/load",
      "tests/baseline",
      "allure-results",
      "allure-report",
      "test-results/visual",
      "test-results/security",
    ];
  }

  async setup() {
    console.log("🚀 Setting up QA Tools for Space Analyzer");

    try {
      // Create directories
      await this.createDirectories();

      // Install packages
      await this.installPackages();

      // Create environment file template
      await this.createEnvTemplate();

      // Update configuration files
      await this.updateConfigurations();

      console.log("✅ QA Tools setup completed successfully");
      console.log("\n📋 Next steps:");
      console.log("1. Add your Sentry DSN to .env file");
      console.log("2. Run: npm run test:e2e:allure");
      console.log("3. Run: npm run test:api");
      console.log("4. Run: npm run test:load");
      console.log("5. Run: npm run report:allure");
    } catch (error) {
      console.error("❌ QA Tools setup failed:", error.message);
      process.exit(1);
    }
  }

  async createDirectories() {
    console.log("📁 Creating test directories...");

    for (const dir of this.directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`  ✅ Created: ${dir}`);
      }
    }
  }

  async installPackages() {
    console.log("📦 Installing QA packages...");

    return new Promise((resolve, reject) => {
      const child = spawn("npm", ["install", "--save-dev", ...this.packages], {
        stdio: "inherit",
        shell: true,
      });

      child.on("close", (code) => {
        if (code === 0) {
          console.log("✅ Packages installed successfully");
          resolve();
        } else {
          reject(new Error(`Package installation failed with code ${code}`));
        }
      });
    });
  }

  async createEnvTemplate() {
    console.log("📝 Creating environment template...");

    const envTemplate = `# Sentry Configuration
VITE_SENTRY_DSN=your-sentry-dsn-here
VITE_APP_VERSION=2.8.9

# Testing Configuration
PLAYWRIGHT_WORKERS=4
PLAYWRIGHT_BROWSER=chromium
PLAYWRIGHT_HEADLESS=true

# API Testing
API_BASE_URL=http://localhost:8080
API_TIMEOUT=30000

# Load Testing
LOAD_TEST_TARGET=http://localhost:8080
LOAD_TEST_DURATION=300

# Visual Testing
UPDATE_BASELINE=false
VISUAL_TEST_THRESHOLD=0.2

# Accessibility Testing
WCAG_LEVEL=WCAG2AA
ACCESSIBILITY_TAGS=wcag2a,wcag2aa,best-practice

# Security Testing
SECURITY_SEVERITY=high,critical
SKIP_DEPENDENCY_AUDIT=false
`;

    if (!fs.existsSync(".env.example")) {
      fs.writeFileSync(".env.example", envTemplate);
      console.log("  ✅ Created: .env.example");
    }
  }

  async updateConfigurations() {
    console.log("⚙️ Updating configuration files...");

    // Update vitest config for component testing
    const vitestConfig = `import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})`;

    if (!fs.existsSync("vitest.config.ts")) {
      fs.writeFileSync("vitest.config.ts", vitestConfig);
      console.log("  ✅ Updated: vitest.config.ts");
    }
  }
}

// Run setup
const setup = new QAToolsSetup();
setup.setup().catch(console.error);

export default QAToolsSetup;
