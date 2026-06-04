/**
 * Enhanced Test Runner for Space Analyzer Application
 * Provides utilities for running tests with different configurations
 */

import { test, expect, devices } from '@playwright/test';
import { TestEnvironment } from './test-fixtures';
import TestLogger from './logger';

export interface TestRunnerOptions {
  mockAPI?: boolean;
  mockErrors?: boolean;
  slowResponses?: boolean;
  responseDelay?: number;
  headless?: boolean;
  viewport?: { width: number; height: number };
  device?: string;
  locale?: string;
  timezone?: string;
}

export class TestRunner {
  private options: TestRunnerOptions;
  private logger: TestLogger;

  constructor(options: TestRunnerOptions = {}) {
    this.options = {
      mockAPI: true,
      mockErrors: false,
      slowResponses: false,
      responseDelay: 5000,
      headless: true,
      viewport: { width: 1920, height: 1080 },
      device: 'Desktop Chrome',
      locale: 'en-US',
      timezone: 'America/New_York',
      ...options
    };
    this.logger = new TestLogger('test-runner');
  }

  /**
   * Setup test environment with custom options
   */
  async setup(page: any): Promise<void> {
    // Apply viewport settings
    if (this.options.viewport) {
      await page.setViewportSize(this.options.viewport);
    }

    // Apply locale settings
    if (this.options.locale) {
      await page.setExtraHTTPHeaders({
        'Accept-Language': this.options.locale
      });
    }

    // Setup test environment
    await TestEnvironment.setup(page, {
      mockAPI: this.options.mockAPI,
      mockErrors: this.options.mockErrors,
      slowResponses: this.options.slowResponses,
      responseDelay: this.options.responseDelay
    });

    this.logger.log('TEST_RUNNER_SETUP', {
      options: this.options,
      device: this.options.device
    });
  }

  /**
   * Create a test with custom configuration
   */
  static createTest(name: string, testFn: (page: any) => Promise<void>, options: TestRunnerOptions = {}) {
    test(name, async ({ page }) => {
      const runner = new TestRunner(options);
      await runner.setup(page);
      await testFn(page);
    });
  }

  /**
   * Create a test suite for multiple devices
   */
  static createDeviceTests(testName: string, testFn: (page: any) => Promise<void>, options: TestRunnerOptions = {}) {
    const devices = [
      { name: 'Desktop Chrome', device: devices['Desktop Chrome'] },
      { name: 'Desktop Firefox', device: devices['Desktop Firefox'] },
      { name: 'Desktop Safari', device: devices['Desktop Safari'] },
      { name: 'Mobile Chrome', device: devices['Pixel 5'] },
      { name: 'Mobile Safari', device: devices['iPhone 12'] },
      { name: 'Tablet', device: devices['iPad Pro'] }
    ];

    devices.forEach(({ name, device }) => {
      test.describe(`${testName} - ${name}`, () => {
        test('should work correctly', async ({ page }) => {
          const runner = new TestRunner({
            ...options,
            device: name,
            viewport: { width: device.viewport.width, height: device.viewport.height }
          });
          
          await runner.setup(page);
          await testFn(page);
        });
      });
    });
  }

  /**
   * Create a test suite for different locales
   */
  static createLocaleTests(testName: string, testFn: (page: any) => Promise<void>, locales: string[] = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP']) {
    locales.forEach(locale => {
      test.describe(`${testName} - ${locale}`, () => {
        test('should work correctly', async ({ page }) => {
          const runner = new TestRunner({
            locale,
            timezone: 'UTC'
          });
          
          await runner.setup(page);
          await testFn(page);
        });
      });
    });
  }

  /**
   * Create a test suite for different network conditions
   */
  static createNetworkTests(testName: string, testFn: (page: any) => Promise<void>) {
    const networkConditions = [
      { name: 'Fast 3G', download: 1.5 * 1024 * 1024, upload: 750 * 1024, latency: 40 },
      { name: 'Slow 3G', download: 500 * 1024, upload: 500 * 1024, latency: 400 },
      { name: 'Offline', download: 0, upload: 0, latency: 0 }
    ];

    networkConditions.forEach(({ name, download, upload, latency }) => {
      test.describe(`${testName} - ${name}`, () => {
        test('should work correctly', async ({ page, context }) => {
          // Apply network conditions
          if (name === 'Offline') {
            await context.setOffline(true);
          } else {
            await context.route('**/*', (route) => {
              // Simulate network conditions
              setTimeout(() => route.continue(), latency);
            });
          }

          const runner = new TestRunner();
          await runner.setup(page);
          await testFn(page);
        });
      });
    });
  }

  /**
   * Create a test suite for accessibility testing
   */
  static createAccessibilityTests(testName: string, testFn: (page: any) => Promise<void>) {
    test.describe(`${testName} - Accessibility`, () => {
      test('should meet WCAG standards', async ({ page }) => {
        const runner = new TestRunner();
        await runner.setup(page);
        
        // Enable accessibility testing
        await page.addInitScript(() => {
          // Add accessibility testing helpers
          (window as any).accessibilityTest = true;
        });
        
        await testFn(page);
        
        // Run accessibility audit
        const axeResults = await page.evaluate(() => {
          return (window as any).axe?.run();
        });
        
        if (axeResults && axeResults.violations.length > 0) {
          console.error('Accessibility violations found:', axeResults.violations);
        }
        
        expect(axeResults?.violations?.length || 0).toBe(0);
      });
    });
  }

  /**
   * Create a test suite for performance testing
   */
  static createPerformanceTests(testName: string, testFn: (page: any) => Promise<void>, thresholds: { loadTime?: number; renderTime?: number; memoryUsage?: number } = {}) {
    test.describe(`${testName} - Performance`, () => {
      test('should meet performance thresholds', async ({ page }) => {
        const runner = new TestRunner();
        await runner.setup(page);
        
        // Start performance monitoring
        const startTime = Date.now();
        const startMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
        
        await testFn(page);
        
        // Calculate metrics
        const loadTime = Date.now() - startTime;
        const endMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
        const memoryUsage = endMemory - startMemory;
        
        // Assert thresholds
        if (thresholds.loadTime) {
          expect(loadTime, `Load time should be under ${thresholds.loadTime}ms`).toBeLessThan(thresholds.loadTime);
        }
        
        if (thresholds.memoryUsage) {
          expect(memoryUsage, `Memory usage should be under ${thresholds.memoryUsage} bytes`).toBeLessThan(thresholds.memoryUsage);
        }
        
        // Log performance metrics
        console.log(`Performance metrics for ${testName}:`, {
          loadTime,
          memoryUsage,
          startMemory,
          endMemory
        });
      });
    });
  }

  /**
   * Create a test suite for error handling
   */
  static createErrorHandlingTests(testName: string, testFn: (page: any) => Promise<void>) {
    test.describe(`${testName} - Error Handling`, () => {
      test('should handle errors gracefully', async ({ page }) => {
        const runner = new TestRunner({ mockErrors: true });
        await runner.setup(page);
        
        // Monitor for unhandled errors
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          errors.push(error.message);
        });
        
        await testFn(page);
        
        // Assert no unhandled errors
        expect(errors.length, 'Should have no unhandled errors').toBe(0);
      });
    });
  }

  /**
   * Create a test suite for security testing
   */
  static createSecurityTests(testName: string, testFn: (page: any) => Promise<void>) {
    test.describe(`${testName} - Security`, () => {
      test('should meet security standards', async ({ page }) => {
        const runner = new TestRunner();
        await runner.setup(page);
        
        await testFn(page);
        
        // Check for security headers
        const response = await page.goto(page.url());
        const headers = response?.headers();
        
        // Assert security headers are present
        expect(headers?.['x-frame-options'], 'Should have X-Frame-Options header').toBeTruthy();
        expect(headers?.['x-content-type-options'], 'Should have X-Content-Type-Options header').toBeTruthy();
        expect(headers?.['x-xss-protection'], 'Should have X-XSS-Protection header').toBeTruthy();
        
        // Check for HTTPS in production
        if (!page.url().includes('localhost') && !page.url().includes('127.0.0.1')) {
          expect(page.url(), 'Should use HTTPS in production').toStartWith('https://');
        }
      });
    });
  }

  /**
   * Get current test configuration
   */
  getOptions(): TestRunnerOptions {
    return { ...this.options };
  }

  /**
   * Update test configuration
   */
  updateOptions(newOptions: Partial<TestRunnerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.logger.log('TEST_RUNNER_OPTIONS_UPDATED', { options: this.options });
  }
}

/**
 * Pre-configured test runners for common scenarios
 */
export const TestRunners = {
  /**
   * Standard test runner with mocks
   */
  standard: new TestRunner({
    mockAPI: true,
    headless: true,
    viewport: { width: 1920, height: 1080 }
  }),

  /**
   * Mobile test runner
   */
  mobile: new TestRunner({
    mockAPI: true,
    headless: true,
    viewport: { width: 375, height: 667 },
    device: 'Mobile Chrome'
  }),

  /**
   * Tablet test runner
   */
  tablet: new TestRunner({
    mockAPI: true,
    headless: true,
    viewport: { width: 768, height: 1024 },
    device: 'Tablet'
  }),

  /**
   * Performance test runner
   */
  performance: new TestRunner({
    mockAPI: false, // Use real API for performance testing
    headless: true,
    viewport: { width: 1920, height: 1080 }
  }),

  /**
   * Error test runner
   */
  error: new TestRunner({
    mockAPI: true,
    mockErrors: true,
    headless: true,
    viewport: { width: 1920, height: 1080 }
  }),

  /**
   * Slow network test runner
   */
  slowNetwork: new TestRunner({
    mockAPI: true,
    slowResponses: true,
    responseDelay: 5000,
    headless: true,
    viewport: { width: 1920, height: 1080 }
  }),

  /**
   * Accessibility test runner
   */
  accessibility: new TestRunner({
    mockAPI: true,
    headless: true,
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US'
  })
};

export default TestRunner;