/**
 * Optimized Test Environment Setup
 * Handles security restrictions and provides better debugging
 */

import { Page } from '@playwright/test';

export interface TestEnvironmentOptions {
  mockAPI?: boolean;
  mockErrors?: boolean;
  clearStorage?: boolean;
  setViewport?: { width: number; height: number };
  skipStorage?: boolean; // Skip localStorage/sessionStorage operations
}

export class OptimizedTestEnvironment {
  private static setupComplete = false;
  private static errors: Array<{
    type: string;
    message: string;
    timestamp: string;
    step: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: any;
  }> = [];
  private static performanceMetrics: Array<{
    operation: string;
    duration: number;
    timestamp: string;
    success: boolean;
  }> = [];
  private static logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
    category: string;
  }> = [];

  /**
   * Setup test environment with robust error handling
   */
  static async setup(page: Page, options: TestEnvironmentOptions = {}): Promise<void> {
    const {
      mockAPI = false,
      mockErrors = false,
      clearStorage = true,
      setViewport,
      skipStorage = false
    } = options;

    console.log(`🔧 Setting up test environment with options:`, {
      mockAPI,
      mockErrors,
      clearStorage,
      setViewport,
      skipStorage
    });

    try {
      // Clear errors from previous runs
      this.errors = [];

      // Set viewport if specified
      if (setViewport) {
        await page.setViewportSize(setViewport);
        console.log(`📱 Viewport set to ${setViewport.width}x${setViewport.height}`);
      }

      // Setup localStorage access with security restrictions
      await this.setupLocalStorageAccess(page);

      // Clear storage with security handling
      if (clearStorage && !skipStorage) {
        await this.safeStorageClear(page);
      }

      // Setup error monitoring
      if (mockErrors) {
        await this.setupErrorMonitoring(page);
      }

      // Setup API mocks if requested
      if (mockAPI) {
        await this.setupAPIMocks(page);
      }

      // Wait for page to be ready
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

      this.setupComplete = true;
      console.log('✅ Test environment setup completed successfully');

    } catch (error) {
      const errorInfo = {
        type: 'setup',
        message: error.message,
        timestamp: new Date().toISOString(),
        step: 'environment-setup',
        severity: 'critical' as const,
        context: {
          stack: error.stack,
          options: options
        }
      };

      this.errors.push(errorInfo);
      this.log('error', `Test environment setup failed: ${error.message}`, 'setup');
      console.error('❌ Test environment setup failed:', errorInfo);

      // Continue with basic setup even if some parts fail
      this.setupComplete = true;
    }
  }

  /**
   * Safely clear storage with enhanced error handling
   */
  private static async safeStorageClear(page: Page): Promise<void> {
    try {
      const result = await page.evaluate(() => {
        try {
          // Check if localStorage is available
          if (typeof Storage !== 'undefined' && window.localStorage) {
            localStorage.clear();
            console.log('✅ localStorage cleared successfully');
          } else {
            console.warn('⚠️ localStorage not available');
          }

          // Check if sessionStorage is available
          if (typeof Storage !== 'undefined' && window.sessionStorage) {
            sessionStorage.clear();
            console.log('✅ sessionStorage cleared successfully');
          } else {
            console.warn('⚠️ sessionStorage not available');
          }

          return {
            success: true,
            localStorageAvailable: !!window.localStorage,
            sessionStorageAvailable: !!window.sessionStorage
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            type: error.name || 'StorageError'
          };
        }
      });

      if (result.success) {
        console.log('🧹 Storage cleared:', {
          localStorage: result.localStorageAvailable,
          sessionStorage: result.sessionStorageAvailable
        });
      } else {
        console.warn('⚠️ Storage clear failed:', result.error);
      }

    } catch (error) {
      console.warn('⚠️ Could not access storage context:', error.message);
      // Don't fail the test, just log the warning
    }
  }

  /**
   * Setup localStorage access with security restrictions handling
   */
  static async setupLocalStorageAccess(page: Page): Promise<void> {
    try {
      await page.addInitScript(() => {
        // Create a safe localStorage wrapper that handles security restrictions
        const createSafeStorage = () => {
          const storage = {
            data: new Map<string, string>(),

            getItem(key: string): string | null {
              try {
                if (window.localStorage) {
                  return localStorage.getItem(key);
                }
                return this.data.get(key) || null;
              } catch (error) {
                console.warn(`⚠️ localStorage.getItem blocked for key "${key}":`, error.message);
                return this.data.get(key) || null;
              }
            },

            setItem(key: string, value: string): void {
              try {
                if (window.localStorage) {
                  localStorage.setItem(key, value);
                } else {
                  this.data.set(key, value);
                }
              } catch (error) {
                console.warn(`⚠️ localStorage.setItem blocked for key "${key}":`, error.message);
                this.data.set(key, value);
              }
            },

            removeItem(key: string): void {
              try {
                if (window.localStorage) {
                  localStorage.removeItem(key);
                } else {
                  this.data.delete(key);
                }
              } catch (error) {
                console.warn(`⚠️ localStorage.removeItem blocked for key "${key}":`, error.message);
                this.data.delete(key);
              }
            },

            clear(): void {
              try {
                if (window.localStorage) {
                  localStorage.clear();
                } else {
                  this.data.clear();
                }
              } catch (error) {
                console.warn(`⚠️ localStorage.clear blocked:`, error.message);
                this.data.clear();
              }
            }
          };

          return storage;
        };

        // Replace global localStorage with safe wrapper
        (window as any).safeLocalStorage = createSafeStorage();

        // Add helper for test environment
        (window as any).testStorage = {
          isRestricted: false,
          fallbackMode: false,

          checkAccess() {
            try {
              const test = '__test_access__';
              localStorage.setItem(test, test);
              localStorage.removeItem(test);
              this.isRestricted = false;
              return true;
            } catch (error) {
              this.isRestricted = true;
              this.fallbackMode = true;
              console.warn('🔒 localStorage access restricted, using fallback mode');
              return false;
            }
          }
        };

        // Check storage access on load
        (window as any).testStorage.checkAccess();
      });

      console.log('🔐 Safe localStorage access setup completed');
    } catch (error) {
      console.warn('⚠️ Failed to setup localStorage access:', error.message);
    }
  }

  /**
   * Enhanced logging system
   */
  private static log(level: 'debug' | 'info' | 'warn' | 'error', message: string, category: string = 'general', context?: any): void {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      category,
      context
    };

    this.logs.push(logEntry);

    // Console output with colors
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m'  // red
    };

    const reset = '\x1b[0m';
    const prefix = `${colors[level]}[${level.toUpperCase()}]${reset} [${category}]`;

    console.log(`${prefix} ${message}`);

    if (context) {
      console.log(`${prefix} Context:`, context);
    }
  }

  /**
   * Performance tracking
   */
  static async trackPerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      this.log('debug', `Starting operation: ${operation}`, 'performance');
      const result = await fn();
      const duration = Date.now() - startTime;

      this.performanceMetrics.push({
        operation,
        duration,
        timestamp,
        success: true
      });

      this.log('info', `✅ ${operation} completed in ${duration}ms`, 'performance');
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      this.performanceMetrics.push({
        operation,
        duration,
        timestamp,
        success: false
      });

      this.log('error', `❌ ${operation} failed after ${duration}ms: ${error.message}`, 'performance', {
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Get comprehensive test report
   */
  static getTestReport(): {
    errors: typeof this.errors;
    performanceMetrics: typeof this.performanceMetrics;
    logs: typeof this.logs;
    summary: {
      totalErrors: number;
      errorsByType: Record<string, number>;
      errorsBySeverity: Record<string, number>;
      avgPerformanceTime: number;
      successRate: number;
    };
  } {
    const errorsByType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const successfulOperations = this.performanceMetrics.filter(m => m.success);
    const avgPerformanceTime = successfulOperations.length > 0
      ? successfulOperations.reduce((sum, m) => sum + m.duration, 0) / successfulOperations.length
      : 0;

    const successRate = this.performanceMetrics.length > 0
      ? (successfulOperations.length / this.performanceMetrics.length) * 100
      : 0;

    return {
      errors: this.errors,
      performanceMetrics: this.performanceMetrics,
      logs: this.logs,
      summary: {
        totalErrors: this.errors.length,
        errorsByType,
        errorsBySeverity,
        avgPerformanceTime: Math.round(avgPerformanceTime * 100) / 100,
        successRate: Math.round(successRate * 100) / 100
      }
    };
  }

  /**
   * Setup error monitoring with better handling
   */
  private static async setupErrorMonitoring(page: Page): Promise<void> {
    try {
      // Monitor console errors with enhanced context
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const errorInfo = {
            type: 'console',
            message: msg.text(),
            timestamp: new Date().toISOString(),
            step: 'console-monitoring',
            severity: 'medium' as const,
            context: {
              location: msg.location(),
              args: msg.args().map(arg => arg.toString()),
              type: msg.type()
            }
          };

          this.errors.push(errorInfo);
          this.log('error', `Console error: ${msg.text()}`, 'console', errorInfo.context);
        }
      });

      // Monitor page errors with enhanced context
      page.on('pageerror', (error) => {
        const errorInfo = {
          type: 'page',
          message: error.message,
          timestamp: new Date().toISOString(),
          step: 'page-error-monitoring',
          severity: 'high' as const,
          context: {
            name: error.name,
            stack: error.stack
          }
        };

        this.errors.push(errorInfo);
        this.log('error', `Page error: ${error.message}`, 'page', errorInfo.context);
      });

      // Monitor request failures
      page.on('requestfailed', (request) => {
        const errorInfo = {
          type: 'request',
          message: `Request failed: ${request.url()} (${request.failure()?.errorText})`,
          timestamp: new Date().toISOString(),
          step: 'request-monitoring',
          severity: 'low' as const,
          context: {
            url: request.url(),
            method: request.method(),
            failure: request.failure()
          }
        };

        this.errors.push(errorInfo);
        this.log('warn', `Request failed: ${request.url()}`, 'network', errorInfo.context);
      });

      // Setup global error tracking with try-catch
      await page.addInitScript(() => {
        try {
          (window as any).testErrors = [];

          // Enhanced console error capture
          const originalError = console.error;
          console.error = (...args) => {
            try {
              (window as any).testErrors.push({
                type: 'console',
                message: args.join(' '),
                timestamp: new Date().toISOString(),
                stack: new Error().stack
              });
            } catch (e) {
              // Fallback if error tracking fails
            }
            originalError.apply(console, args);
          };

          // Enhanced unhandled error capture
          window.addEventListener('error', (event) => {
            try {
              (window as any).testErrors.push({
                type: 'unhandled',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: new Date().toISOString(),
                stack: event.error?.stack
              });
            } catch (e) {
              // Fallback
            }
          });

          // Enhanced promise rejection capture
          window.addEventListener('unhandledrejection', (event) => {
            try {
              (window as any).testErrors.push({
                type: 'promise',
                message: event.reason?.message || event.reason,
                timestamp: new Date().toISOString(),
                stack: event.reason?.stack
              });
            } catch (e) {
              // Fallback
            }
          });

        } catch (e) {
          // Global error tracking setup failed
          console.warn('⚠️ Could not setup global error tracking:', e.message);
        }
      });

      console.log('🔧 Error monitoring configured');

    } catch (error) {
      console.error('❌ Failed to setup error monitoring:', error.message);
      this.errors.push({
        type: 'monitoring-setup',
        message: error.message,
        timestamp: new Date().toISOString(),
        step: 'error-monitoring-setup'
      });
    }
  }

  /**
   * Setup API mocks with better error handling
   */
  private static async setupAPIMocks(page: Page): Promise<void> {
    try {
      // Mock health endpoint
      await page.route('**/api/health', (route) => {
        try {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              status: 'healthy',
              timestamp: new Date().toISOString(),
              uptime: 12345,
              version: '2.8.9'
            })
          });
        } catch (error) {
          console.error('❌ Failed to fulfill health endpoint mock:', error.message);
          route.abort();
        }
      });

      // Mock AI models endpoint
      await page.route('**/api/ai/models', (route) => {
        try {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'qwen3.5:4b',
                name: 'Qwen 3.5 4B',
                provider: 'Ollama',
                status: 'available',
                description: 'Test model for debugging'
              }
            ])
          });
        } catch (error) {
          console.error('❌ Failed to fulfill AI models mock:', error.message);
          route.abort();
        }
      });

      console.log('🔧 API mocks configured');

    } catch (error) {
      console.error('❌ Failed to setup API mocks:', error.message);
      this.errors.push({
        type: 'api-mock-setup',
        message: error.message,
        timestamp: new Date().toISOString(),
        step: 'api-mock-setup'
      });
    }
  }

  /**
   * Get collected errors with filtering
   */
  static getErrors(type?: string): Array<any> {
    if (type) {
      return this.errors.filter(error => error.type === type);
    }
    return [...this.errors];
  }

  /**
   * Get errors from page with fallback
   */
  static async getPageErrors(page: Page): Promise<Array<any>> {
    try {
      return await page.evaluate(() => (window as any).testErrors || []);
    } catch (error) {
      console.warn('⚠️ Could not get page errors:', error.message);
      return [];
    }
  }

  /**
   * Generate debug report
   */
  static generateDebugReport(): {
    const report = {
      timestamp: new Date().toISOString(),
      setupComplete: this.setupComplete,
      totalErrors: this.errors.length,
      errorsByType: this.errors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      errors: this.errors,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  // generateRecommendations method already defined above

  /**
   * Reset environment
   */
  static async reset(page: Page): Promise<void> {
    try {
      // Clear errors
      this.errors = [];

      // Clear page errors
      await this.safeStorageClear(page);

      // Remove all routes
      await page.unroute('**/*');

      this.setupComplete = false;
      console.log('🔄 Test environment reset completed');

    } catch (error) {
      console.error('❌ Failed to reset test environment:', error.message);
    }
  }

  /**
   * Save debug report to file
   */
  static async saveDebugReport(): Promise<void> {
    try {
      const report = this.generateDebugReport();
      const fs = require('fs');
      const path = require('path');

      const reportPath = path.join(process.cwd(), 'test-results', 'debug-report.json');

      // Ensure directory exists
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Debug report saved: ${reportPath}`);

    } catch (error) {
      console.error('❌ Failed to save debug report:', error.message);
    }
  }
}
