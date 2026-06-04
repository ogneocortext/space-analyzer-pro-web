/**
 * Test Fixtures for Space Analyzer Application
 * Provides reusable test data and mock responses
 */

import { Page } from "@playwright/test";

export interface MockFileSystemNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
  children?: MockFileSystemNode[];
}

export interface MockAnalysisResult {
  id: string;
  timestamp: string;
  totalSize: number;
  fileCount: number;
  directoryCount: number;
  scanDuration: number;
  largestFiles: Array<{
    name: string;
    path: string;
    size: number;
  }>;
  fileTypes: Array<{
    extension: string;
    count: number;
    totalSize: number;
  }>;
  aiInsights?: {
    categories: Array<{
      name: string;
      count: number;
      size: number;
      description: string;
    }>;
    recommendations: string[];
    summary: string;
  };
}

export interface MockBackendStatus {
  status: "healthy" | "degraded" | "error";
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskSpace: {
    total: number;
    used: number;
    available: number;
  };
  services: {
    database: "online" | "offline";
    ai: "online" | "offline";
    cache: "online" | "offline";
  };
}

export interface MockAIModel {
  id: string;
  name: string;
  provider: string;
  status: "available" | "unavailable" | "loading";
  description: string;
  capabilities: string[];
}

export class TestDataFactory {
  /**
   * Generate random ID
   */
  static generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate random string
   */
  static generateRandomString(length: number = 6): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate mock file system data
   */
  static generateMockFileSystem(
    depth: number = 3,
    filesPerDir: number = 5,
  ): MockFileSystemNode {
    const generateDirectory = (
      currentDepth: number,
      path: string = "",
    ): MockFileSystemNode => {
      const dir: MockFileSystemNode = {
        id: this.generateRandomId(),
        name: `folder-${this.generateRandomString(6)}`,
        path: path,
        type: "directory",
        size: 0,
        modified: new Date().toISOString(),
        children: [],
      };

      if (currentDepth > 0) {
        for (let i = 0; i < filesPerDir; i++) {
          // Add files
          dir.children!.push({
            id: this.generateRandomId(),
            name: `file-${this.generateRandomString(6)}.txt`,
            path: `${path}/${dir.name}/file-${this.generateRandomString(6)}.txt`,
            type: "file",
            size: Math.floor(Math.random() * 1000000),
            modified: new Date().toISOString(),
          });

          // Add subdirectories
          if (i < 2) {
            dir.children!.push(
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
   * Generate mock analysis results
   */
  static generateMockAnalysisResult(): MockAnalysisResult {
    return {
      id: this.generateRandomId(),
      timestamp: new Date().toISOString(),
      totalSize: Math.floor(Math.random() * 10000000000), // Up to 10GB
      fileCount: Math.floor(Math.random() * 10000),
      directoryCount: Math.floor(Math.random() * 1000),
      scanDuration: Math.floor(Math.random() * 60000), // Up to 60 seconds
      largestFiles: Array.from({ length: 10 }, () => ({
        name: `large-file-${this.generateRandomString(6)}.bin`,
        path: `/path/to/large-file-${this.generateRandomString(6)}.bin`,
        size: Math.floor(Math.random() * 1000000000), // Up to 1GB
      })),
      fileTypes: [
        {
          extension: ".txt",
          count: Math.floor(Math.random() * 1000),
          totalSize: Math.floor(Math.random() * 100000000),
        },
        {
          extension: ".jpg",
          count: Math.floor(Math.random() * 500),
          totalSize: Math.floor(Math.random() * 500000000),
        },
        {
          extension: ".mp4",
          count: Math.floor(Math.random() * 100),
          totalSize: Math.floor(Math.random() * 2000000000),
        },
        {
          extension: ".pdf",
          count: Math.floor(Math.random() * 200),
          totalSize: Math.floor(Math.random() * 100000000),
        },
        {
          extension: ".doc",
          count: Math.floor(Math.random() * 300),
          totalSize: Math.floor(Math.random() * 50000000),
        },
      ],
      aiInsights: {
        categories: [
          {
            name: "Documents",
            count: Math.floor(Math.random() * 500),
            size: Math.floor(Math.random() * 100000000),
            description:
              "Word processing documents, spreadsheets, and presentations",
          },
          {
            name: "Media",
            count: Math.floor(Math.random() * 300),
            size: Math.floor(Math.random() * 2000000000),
            description: "Images, videos, and audio files",
          },
          {
            name: "Code",
            count: Math.floor(Math.random() * 200),
            size: Math.floor(Math.random() * 50000000),
            description: "Source code files and development resources",
          },
          {
            name: "Archives",
            count: Math.floor(Math.random() * 100),
            size: Math.floor(Math.random() * 500000000),
            description: "Compressed files and archives",
          },
        ],
        recommendations: [
          "Consider moving large media files to external storage",
          "Archive old documents that haven't been accessed recently",
          "Remove duplicate files to free up space",
          "Compress large files that are rarely used",
        ],
        summary:
          "Your storage contains a good mix of document, media, and code files. Consider organizing media files better and archiving old documents.",
      },
    };
  }

  /**
   * Generate mock backend status
   */
  static generateMockBackendStatus(
    health: "healthy" | "degraded" | "error" = "healthy",
  ): MockBackendStatus {
    return {
      status: health,
      uptime: Math.floor(Math.random() * 86400000), // Up to 24 hours in milliseconds
      memoryUsage:
        health === "healthy" ? Math.random() * 0.7 : Math.random() * 0.9,
      cpuUsage:
        health === "healthy" ? Math.random() * 0.5 : Math.random() * 0.8,
      diskSpace: {
        total: 1000000000000, // 1TB
        used: Math.floor(Math.random() * 500000000000), // Up to 500GB
        available: 500000000000, // 500GB
      },
      services: {
        database: health === "error" ? "offline" : "online",
        ai: health === "degraded" ? "offline" : "online",
        cache: "online",
      },
    };
  }

  /**
   * Generate mock AI models
   */
  static generateMockAIModels(): MockAIModel[] {
    return [
      {
        id: "qwen3.5:4b",
        name: "Qwen 3.5 4B",
        provider: "Ollama",
        status: "available",
        description: "Qwen 3.5 model with 4B parameters for general analysis",
        capabilities: ["text-analysis", "categorization", "summarization"],
      },
      {
        id: "deepseek-coder:6.7b-instruct",
        name: "DeepSeek Coder 6.7B Instruct",
        provider: "Ollama",
        status: "available",
        description: "DeepSeek Coder model optimized for code analysis",
        capabilities: [
          "text-analysis",
          "categorization",
          "code-analysis",
          "summarization",
        ],
      },
      {
        id: "gemma4:e2b",
        name: "Gemma 4 E2B",
        provider: "Ollama",
        status: "available",
        description: "Gemma 4 model with E2B parameters for efficient analysis",
        capabilities: ["text-analysis", "categorization", "summarization"],
      },
    ];
  }
}

/**
 * Test Environment Setup and Management
 */
export class TestEnvironment {
  private static setupComplete = false;

  /**
   * Setup test environment with configurable options
   */
  static async setup(
    page: Page,
    options: {
      mockAPI?: boolean;
      mockErrors?: boolean;
      clearStorage?: boolean;
      setViewport?: { width: number; height: number };
    } = {},
  ): Promise<void> {
    if (this.setupComplete && !options.mockAPI) {
      return; // Skip if already set up and not mocking
    }

    const {
      mockAPI = false,
      mockErrors = false,
      clearStorage = true,
      setViewport,
    } = options;

    try {
      // Clear storage if requested
      if (clearStorage) {
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      }

      // Set viewport if specified
      if (setViewport) {
        await page.setViewportSize(setViewport);
      }

      // Mock API responses if requested
      if (mockAPI) {
        await this.setupAPIMocks(page);
      }

      // Setup error monitoring if requested
      if (mockErrors) {
        await this.setupErrorMocks(page);
      }

      // Wait for page to be ready
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);

      this.setupComplete = true;
      console.log("✅ Test environment setup complete");
    } catch (error) {
      console.error("❌ Test environment setup failed:", error);
      throw error;
    }
  }

  /**
   * Setup API mocks for testing
   */
  private static async setupAPIMocks(page: Page): Promise<void> {
    // Mock health endpoint
    await page.route("**/api/health", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          TestDataFactory.generateMockBackendStatus("healthy"),
        ),
      });
    });

    // Mock AI models endpoint
    await page.route("**/api/ai/models", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TestDataFactory.generateMockAIModels()),
      });
    });

    console.log("🔧 API mocks configured");
  }

  /**
   * Setup error monitoring for testing
   */
  private static async setupErrorMocks(page: Page): Promise<void> {
    // Setup global error tracking
    await page.addInitScript(() => {
      (window as any).testErrors = [];

      // Capture console errors
      const originalError = console.error;
      console.error = (...args) => {
        (window as any).testErrors.push({
          type: "console",
          message: args.join(" "),
          timestamp: new Date().toISOString(),
        });
        originalError.apply(console, args);
      };

      // Capture unhandled errors
      window.addEventListener("error", (event) => {
        (window as any).testErrors.push({
          type: "unhandled",
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          timestamp: new Date().toISOString(),
        });
      });

      // Capture promise rejections
      window.addEventListener("unhandledrejection", (event) => {
        (window as any).testErrors.push({
          type: "promise",
          message: event.reason?.message || event.reason,
          timestamp: new Date().toISOString(),
        });
      });
    });

    console.log("🔧 Error monitoring configured");
  }

  /**
   * Get test errors from page
   */
  static async getTestErrors(page: Page): Promise<any[]> {
    return await page.evaluate(() => (window as any).testErrors || []);
  }

  /**
   * Reset test environment
   */
  static async reset(page: Page): Promise<void> {
    await page.evaluate(() => {
      (window as any).testErrors = [];
    });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Remove all routes
    await page.unroute("**/*");

    this.setupComplete = false;
    console.log("🔄 Test environment reset");
  }

  /**
   * Wait for Vue app to be ready
   */
  static async waitForVueApp(
    page: Page,
    timeout: number = 10000,
  ): Promise<void> {
    try {
      await page.waitForFunction(
        () => {
          return window.Vue || document.querySelector("#app");
        },
        { timeout },
      );

      // Additional wait for Vue to mount
      await page.waitForTimeout(2000);
      console.log("✅ Vue app is ready");
    } catch (error) {
      console.log("⚠️ Vue app may not be ready:", error.message);
    }
  }
}
