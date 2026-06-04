/**
 * Test Helper Utilities
 * Common functions and utilities for E2E tests
 */

import { Page, expect } from "@playwright/test";

export class TestHelpers {
  /**
   * Wait for element to be visible and stable
   */
  static async waitForElement(
    page: Page,
    selector: string,
    timeout: number = 5000,
  ): Promise<void> {
    await page.waitForSelector(selector, { state: "visible", timeout });
    await page.waitForTimeout(200); // Additional wait for stability
  }

  /**
   * Wait for element to be hidden
   */
  static async waitForHidden(
    page: Page,
    selector: string,
    timeout: number = 5000,
  ): Promise<void> {
    await page.waitForSelector(selector, { state: "hidden", timeout });
  }

  /**
   * Click element with retry mechanism
   */
  static async clickWithRetry(
    page: Page,
    selector: string,
    maxRetries: number = 3,
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.click(selector);
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await page.waitForTimeout(500);
      }
    }
  }

  /**
   * Fill input with typing simulation
   */
  static async fillWithTyping(
    page: Page,
    selector: string,
    text: string,
  ): Promise<void> {
    await page.fill(selector, "");
    await page.type(selector, text, { delay: 50 });
  }

  /**
   * Check if element exists
   */
  static async elementExists(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get element count
   */
  static async getElementCount(page: Page, selector: string): Promise<number> {
    return await page.locator(selector).count();
  }

  /**
   * Wait for network to be idle
   */
  static async waitForNetworkIdle(
    page: Page,
    timeout: number = 10000,
  ): Promise<void> {
    await page.waitForLoadState("networkidle", { timeout });
  }

  /**
   * Take screenshot with timestamp
   */
  static async takeScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await page.screenshot({
      path: `test-screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  }

  /**
   * Check for console errors
   */
  static async checkConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    return errors;
  }

  /**
   * Check for page errors
   */
  static async checkPageErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    return errors;
  }

  /**
   * Navigate to route and wait for load
   */
  static async navigateTo(page: Page, route: string): Promise<void> {
    await page.goto(route);
    await this.waitForNetworkIdle(page);
  }

  /**
   * Get viewport size
   */
  static async getViewportSize(
    page: Page,
  ): Promise<{ width: number; height: number }> {
    const viewport = page.viewportSize();
    return viewport || { width: 1280, height: 720 };
  }

  /**
   * Set viewport size and wait
   */
  static async setViewportSize(
    page: Page,
    width: number,
    height: number,
  ): Promise<void> {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(500);
  }

  /**
   * Test responsive design
   */
  static async testResponsive(
    page: Page,
    route: string,
    viewports: Array<{ width: number; height: number; name: string }>,
  ): Promise<void> {
    for (const viewport of viewports) {
      await this.setViewportSize(page, viewport.width, viewport.height);
      await this.navigateTo(page, route);

      // Check if main content is visible
      const mainContent = page.locator("main, .main-content, .container");
      await expect(mainContent).toBeVisible();

      console.log(
        `✓ Responsive test passed for ${viewport.name} (${viewport.width}x${viewport.height})`,
      );
    }
  }

  /**
   * Test accessibility basics
   */
  static async testAccessibilityBasics(page: Page): Promise<void> {
    // Check for ARIA labels on interactive elements
    const buttons = page.locator("button:not([aria-label]):not([title])");
    const inputs = page.locator(
      "input:not([aria-label]):not([title]):not([placeholder])",
    );

    // Warn about missing ARIA labels (not fail, as some elements might not need them)
    const buttonCount = await buttons.count();
    const inputCount = await inputs.count();

    if (buttonCount > 0) {
      console.warn(
        `⚠️ Found ${buttonCount} buttons without ARIA labels or titles`,
      );
    }

    if (inputCount > 0) {
      console.warn(
        `⚠️ Found ${inputCount} inputs without ARIA labels, titles, or placeholders`,
      );
    }

    // Test keyboard navigation
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    const focused = page.locator(":focus");
    expect(await focused.count()).toBeGreaterThan(0);
  }

  /**
   * Test performance basics
   */
  static async testPerformanceBasics(
    page: Page,
    route: string,
    maxLoadTime: number = 5000,
  ): Promise<number> {
    const startTime = Date.now();
    await this.navigateTo(page, route);
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(maxLoadTime);
    return loadTime;
  }

  /**
   * Generate random test data
   */
  static generateRandomString(length: number = 10): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random email
   */
  static generateRandomEmail(): string {
    return `test-${this.generateRandomString(8)}@example.com`;
  }

  /**
   * Generate random file name
   */
  static generateRandomFileName(extension: string = "txt"): string {
    return `test-file-${this.generateRandomString(6)}.${extension}`;
  }

  /**
   * Wait for animation to complete
   */
  static async waitForAnimation(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    await expect(element).toBeVisible();

    // Wait for CSS transitions to complete
    await page.waitForFunction((sel) => {
      const el = document.querySelector(sel);
      return el && getComputedStyle(el).transitionDuration === "0s";
    }, selector);
  }

  /**
   * Hover over element
   */
  static async hover(page: Page, selector: string): Promise<void> {
    await page.hover(selector);
    await page.waitForTimeout(300); // Wait for hover effects
  }

  /**
   * Right-click on element
   */
  static async rightClick(page: Page, selector: string): Promise<void> {
    await page.click(selector, { button: "right" });
    await page.waitForTimeout(300);
  }

  /**
   * Drag and drop
   */
  static async dragAndDrop(
    page: Page,
    sourceSelector: string,
    targetSelector: string,
  ): Promise<void> {
    await page.dragAndDrop(sourceSelector, targetSelector);
    await page.waitForTimeout(500);
  }

  /**
   * Upload file
   */
  static async uploadFile(
    page: Page,
    selector: string,
    filePath: string,
  ): Promise<void> {
    const fileInput = page.locator(selector);
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(1000);
  }

  /**
   * Get text content of element
   */
  static async getTextContent(
    page: Page,
    selector: string,
  ): Promise<string | null> {
    return await page.locator(selector).textContent();
  }

  /**
   * Get attribute value
   */
  static async getAttribute(
    page: Page,
    selector: string,
    attribute: string,
  ): Promise<string | null> {
    return await page.locator(selector).getAttribute(attribute);
  }

  /**
   * Check if element has class
   */
  static async hasClass(
    page: Page,
    selector: string,
    className: string,
  ): Promise<boolean> {
    const element = page.locator(selector);
    const classes = await element.getAttribute("class");
    return classes ? classes.includes(className) : false;
  }

  /**
   * Wait for element to have specific text
   */
  static async waitForText(
    page: Page,
    selector: string,
    text: string,
    timeout: number = 5000,
  ): Promise<void> {
    await page.waitForSelector(`${selector}:has-text("${text}")`, { timeout });
  }

  /**
   * Check if element is visible
   */
  static async isVisible(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { state: "visible", timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if element is hidden
   */
  static async isHidden(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { state: "hidden", timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scroll element into view
   */
  static async scrollIntoView(page: Page, selector: string): Promise<void> {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }

  /**
   * Get computed style
   */
  static async getComputedStyle(
    page: Page,
    selector: string,
    property: string,
  ): Promise<string> {
    return await page.locator(selector).evaluate((el, prop) => {
      return window.getComputedStyle(el).getPropertyValue(prop);
    }, property);
  }

  /**
   * Mock API responses
   */
  static async mockAPI(page: Page, url: string, response: any): Promise<void> {
    await page.route(url, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Wait for API call
   */
  static async waitForAPICall(page: Page, url: string): Promise<any> {
    let apiResponse: any;

    await page.route(url, (route) => {
      route.continue();
    });

    page.on("response", (response) => {
      if (response.url().includes(url)) {
        apiResponse = response;
      }
    });

    await page.waitForFunction((url) => {
      return window.performance
        .getEntriesByType("resource")
        .some((entry) => entry.name.includes(url));
    }, url);

    return apiResponse;
  }

  /**
   * Clear local storage
   */
  static async clearLocalStorage(page: Page): Promise<void> {
    await page.evaluate(() => {
      localStorage.clear();
    });
  }

  /**
   * Clear session storage
   */
  static async clearSessionStorage(page: Page): Promise<void> {
    await page.evaluate(() => {
      sessionStorage.clear();
    });
  }

  /**
   * Set local storage item
   */
  static async setLocalStorage(
    page: Page,
    key: string,
    value: string,
  ): Promise<void> {
    await page.evaluate(
      (k, v) => {
        localStorage.setItem(k, v);
      },
      key,
      value,
    );
  }

  /**
   * Get local storage item
   */
  static async getLocalStorage(
    page: Page,
    key: string,
  ): Promise<string | null> {
    return await page.evaluate((k) => {
      return localStorage.getItem(k);
    }, key);
  }

  /**
   * Common viewports for responsive testing
   */
  static readonly COMMON_VIEWPORTS = [
    { width: 1920, height: 1080, name: "Desktop" },
    { width: 1366, height: 768, name: "Laptop" },
    { width: 768, height: 1024, name: "Tablet" },
    { width: 375, height: 667, name: "Mobile" },
  ];

  /**
   * Common file types for testing
   */
  static readonly FILE_TYPES = {
    image: ["jpg", "png", "gif", "webp"],
    document: ["pdf", "doc", "docx", "txt"],
    video: ["mp4", "avi", "mov", "webm"],
    audio: ["mp3", "wav", "ogg", "flac"],
    archive: ["zip", "rar", "7z", "tar"],
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: Array<{ name: string; value: number; timestamp: number }> =
    [];

  /**
   * Start timing an operation
   */
  startTimer(name: string): () => number {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metrics.push({
        name,
        value: duration,
        timestamp: Date.now(),
      });

      return duration;
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(): Array<{ name: string; value: number; timestamp: number }> {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): Array<{ value: number; timestamp: number }> {
    return this.metrics
      .filter((metric) => metric.name === name)
      .map((metric) => ({ value: metric.value, timestamp: metric.timestamp }));
  }

  /**
   * Get average time for operation
   */
  getAverageTime(name: string): number {
    const nameMetrics = this.getMetricsByName(name);
    if (nameMetrics.length === 0) return 0;

    const total = nameMetrics.reduce((sum, metric) => sum + metric.value, 0);
    return total / nameMetrics.length;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Data generation utilities
 */
export class DataGenerator {
  /**
   * Generate mock file system data
   */
  static generateMockFileSystem(
    depth: number = 3,
    filesPerDir: number = 5,
  ): any {
    const generateDirectory = (
      currentDepth: number,
      path: string = "",
    ): any => {
      const dir = {
        id: TestHelpers.generateRandomString(8),
        name: `folder-${TestHelpers.generateRandomString(6)}`,
        path: path,
        type: "directory",
        size: 0,
        modified: new Date(),
        children: [],
      };

      if (currentDepth > 0) {
        for (let i = 0; i < filesPerDir; i++) {
          // Add files
          dir.children.push({
            id: TestHelpers.generateRandomString(8),
            name: `file-${TestHelpers.generateRandomString(6)}.txt`,
            path: `${path}/${dir.name}/file-${TestHelpers.generateRandomString(6)}.txt`,
            type: "file",
            size: Math.floor(Math.random() * 1000000),
            modified: new Date(),
          });

          // Add subdirectories
          if (i < 2) {
            dir.children.push(
              generateDirectory(currentDepth - 1, `${path}/${dir.name}`),
            );
          }
        }
      }

      return dir;
    };

    return generateDirectory(depth);
  }

  /**
   * Generate mock usage data
   */
  static generateMockUsageData(nodeIds: string[]): any[] {
    return nodeIds.map((nodeId) => ({
      nodeId,
      accessCount: Math.floor(Math.random() * 100),
      lastAccessed: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ),
      accessPattern: ["regular", "sporadic", "burst", "declining"][
        Math.floor(Math.random() * 4)
      ],
      averageSessionTime: Math.floor(Math.random() * 3600),
      peakUsageTimes: Array.from(
        { length: Math.floor(Math.random() * 5) },
        () => Math.floor(Math.random() * 24),
      ),
    }));
  }

  /**
   * Generate mock performance metrics
   */
  static generateMockPerformanceMetrics(): any {
    return {
      renderTime: Math.random() * 100,
      memoryUsage: Math.random() * 500 * 1024 * 1024,
      fps: 30 + Math.random() * 90,
      nodeCount: Math.floor(Math.random() * 10000),
      loadTime: Math.random() * 5000,
      interactionCount: Math.floor(Math.random() * 1000),
    };
  }
}

/**
 * Additional utility methods for test helpers
 */
export class TestUtilities {
  /**
   * Safe navigation with retry
   */
  static async safeNavigate(
    page: Page,
    url: string,
    maxRetries: number = 3,
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await TestHelpers.waitForNetworkIdle(page);
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.log(`Navigation attempt ${i + 1} failed, retrying...`);
        await page.waitForTimeout(2000);
      }
    }
  }

  /**
   * Wait for element with multiple selectors
   */
  static async waitForAnyElement(
    page: Page,
    selectors: string[],
    timeout: number = 5000,
  ): Promise<string | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      for (const selector of selectors) {
        if (await TestHelpers.isVisible(page, selector)) {
          return selector;
        }
      }
      await page.waitForTimeout(500);
    }

    return null;
  }

  /**
   * Generate test file path with timestamp
   */
  static getTestFilePath(fileName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `test-results/${fileName}-${timestamp}`;
  }

  /**
   * Ensure test directory exists
   */
  static ensureTestDirectory(dirPath: string): void {
    const fs = require("fs");
    const path = require("path");
    const fullPath = path.join(process.cwd(), "test-results", dirPath);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  /**
   * Get element with fallback selectors
   */
  static async getElementWithFallback(
    page: Page,
    primarySelector: string,
    fallbackSelectors: string[],
  ): Promise<any> {
    // Try primary selector first
    if (await TestHelpers.isVisible(page, primarySelector)) {
      return page.locator(primarySelector);
    }

    // Try fallback selectors
    for (const selector of fallbackSelectors) {
      if (await TestHelpers.isVisible(page, selector)) {
        return page.locator(selector);
      }
    }

    throw new Error(
      `No element found with primary selector "${primarySelector}" or fallback selectors`,
    );
  }

  /**
   * Check page health
   */
  static async checkPageHealth(page: Page): Promise<{
    hasErrors: boolean;
    hasWarnings: boolean;
    errorCount: number;
    warningCount: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Listen for console messages
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      } else if (msg.type() === "warning") {
        warnings.push(msg.text());
      }
    });

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    // Wait a bit to collect errors
    await page.waitForTimeout(2000);

    return {
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
      errorCount: errors.length,
      warningCount: warnings.length,
    };
  }

  /**
   * Clean up test artifacts
   */
  static async cleanupTestArtifacts(
    olderThanHours: number = 24,
  ): Promise<void> {
    const fs = require("fs");
    const path = require("path");
    const testResultsDir = path.join(process.cwd(), "test-results");

    if (!fs.existsSync(testResultsDir)) return;

    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;

    const cleanupDirectory = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old test file: ${filePath}`);
        } else if (stats.isDirectory()) {
          cleanupDirectory(filePath);
        }
      });
    };

    cleanupDirectory(testResultsDir);
  }
}
