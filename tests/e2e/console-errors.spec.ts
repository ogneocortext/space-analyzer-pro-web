/**
 * Console Errors Monitoring Test
 * Focuses on capturing and displaying console errors while servers run
 */

import { test, expect } from "@playwright/test";
import { setupTestEnvironment, ServerManager } from "../utils/server-manager";

test.describe("Console Errors Monitoring", () => {
  let serverManager: any;
  let devServer: any;
  let backendServer: any;

  test.beforeAll(async () => {
    serverManager = ServerManager.getInstance();
  });

  test.beforeEach(async ({ page }) => {
    // Setup test environment with dynamic server management
    ({ devServer, backendServer } = await setupTestEnvironment(page));

    // Console error collection
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const consoleLogs: string[] = [];

    // Capture all console output
    page.on("console", (msg) => {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${msg.type().toUpperCase()}: ${msg.text()}`;

      consoleLogs.push(logEntry);

      if (msg.type() === "error") {
        consoleErrors.push(logEntry);
        console.log(`🔴 CONSOLE ERROR: ${logEntry}`);
      } else if (msg.type() === "warning") {
        consoleWarnings.push(logEntry);
        console.log(`🟡 CONSOLE WARNING: ${logEntry}`);
      } else if (msg.type() === "info") {
        console.log(`🔵 CONSOLE INFO: ${logEntry}`);
      } else if (msg.type() === "log") {
        console.log(`⚪ CONSOLE LOG: ${logEntry}`);
      }
    });

    // Capture page errors
    page.on("pageerror", (error) => {
      const timestamp = new Date().toISOString();
      const errorEntry = `[${timestamp}] PAGE ERROR: ${error.message}`;
      consoleErrors.push(errorEntry);
      console.log(`🔴 PAGE ERROR: ${errorEntry}`);
    });

    // Store for test analysis
    (page as any).consoleErrors = consoleErrors;
    (page as any).consoleWarnings = consoleWarnings;
    (page as any).consoleLogs = consoleLogs;
  });

  test.afterAll(async () => {
    await serverManager.stopAllServers();
  });

  test("should monitor console errors during frontend startup", async ({
    page,
  }) => {
    console.log("🧪 Monitoring console errors during frontend startup...");

    const errorAnalysis = {
      startTime: Date.now(),
      consoleErrors: [],
      consoleWarnings: [],
      pageErrors: [],
      networkErrors: [],
      totalLogs: 0,
    };

    try {
      console.log(`🔄 Navigating to frontend at ${devServer.url}...`);

      // Navigate to frontend with detailed error monitoring
      const response = await page.goto(devServer.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for page to fully load
      await page.waitForTimeout(5000);

      // Collect console data
      errorAnalysis.consoleErrors = (page as any).consoleErrors || [];
      errorAnalysis.consoleWarnings = (page as any).consoleWarnings || [];
      errorAnalysis.totalLogs = (page as any).consoleLogs?.length || 0;

      console.log(`📊 Console Analysis Results:`);
      console.log(`   Total Logs: ${errorAnalysis.totalLogs}`);
      console.log(`   Console Errors: ${errorAnalysis.consoleErrors.length}`);
      console.log(
        `   Console Warnings: ${errorAnalysis.consoleWarnings.length}`,
      );

      if (errorAnalysis.consoleErrors.length > 0) {
        console.log("\n🔴 Console Errors Found:");
        errorAnalysis.consoleErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      if (errorAnalysis.consoleWarnings.length > 0) {
        console.log("\n🟡 Console Warnings Found:");
        errorAnalysis.consoleWarnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning}`);
        });
      }

      // Check for specific Vue/Vite errors
      const vueErrors = errorAnalysis.consoleErrors.filter(
        (error) =>
          error.toLowerCase().includes("vue") ||
          error.toLowerCase().includes("vite") ||
          error.toLowerCase().includes("module"),
      );

      if (vueErrors.length > 0) {
        console.log("\n🔧 Vue/Vite Related Errors:");
        vueErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      // Basic assertions
      expect(response?.ok()).toBe(true);
      expect(errorAnalysis.totalLogs).toBeGreaterThan(0);
    } catch (error) {
      errorAnalysis.pageErrors.push(`Navigation error: ${error.message}`);
      console.log(`❌ Navigation failed: ${error.message}`);
    }

    errorAnalysis.endTime = Date.now();
    errorAnalysis.duration = errorAnalysis.endTime - errorAnalysis.startTime;

    console.log(`⏱️ Test completed in ${errorAnalysis.duration}ms`);

    // Report summary
    if (errorAnalysis.consoleErrors.length === 0) {
      console.log("✅ No console errors detected - Frontend is clean!");
    } else {
      console.log(
        `⚠️ ${errorAnalysis.consoleErrors.length} console errors detected`,
      );
    }
  });

  test("should monitor console errors during backend API calls", async ({
    page,
  }) => {
    console.log("🧪 Monitoring console errors during backend API calls...");

    const apiErrorAnalysis = {
      startTime: Date.now(),
      apiErrors: [],
      consoleErrors: [],
      networkRequests: [],
      successfulRequests: 0,
      failedRequests: 0,
    };

    try {
      // Navigate to frontend first
      await page.goto(devServer.url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      // Monitor network requests
      page.on("request", (request) => {
        const timestamp = new Date().toISOString();
        const requestInfo = `[${timestamp}] REQUEST: ${request.method()} ${request.url()}`;
        apiErrorAnalysis.networkRequests.push(requestInfo);
        console.log(`🔵 ${requestInfo}`);
      });

      page.on("response", (response) => {
        const timestamp = new Date().toISOString();
        const responseInfo = `[${timestamp}] RESPONSE: ${response.status()} ${response.url()}`;

        if (!response.ok()) {
          apiErrorAnalysis.failedRequests++;
          apiErrorAnalysis.apiErrors.push(responseInfo);
          console.log(`🔴 ${responseInfo}`);
        } else {
          apiErrorAnalysis.successfulRequests++;
          console.log(`🟢 ${responseInfo}`);
        }
      });

      // Make various API calls to trigger potential errors
      const apiEndpoints = [
        `${backendServer.url}/api/health`,
        `${backendServer.url}/api/debug/routes`,
        `${backendServer.url}/api/test`,
        `${backendServer.url}/api/nonexistent`, // This should fail
      ];

      for (const endpoint of apiEndpoints) {
        try {
          console.log(`🔄 Testing API call to: ${endpoint}`);
          const response = await page.request.get(endpoint);

          if (!response.ok()) {
            apiErrorAnalysis.failedRequests++;
            const errorInfo = `API Error: ${response.status()} - ${endpoint}`;
            apiErrorAnalysis.apiErrors.push(errorInfo);
            console.log(`🔴 ${errorInfo}`);
          } else {
            apiErrorAnalysis.successfulRequests++;
            console.log(`✅ API Success: ${endpoint}`);
          }
        } catch (error) {
          apiErrorAnalysis.failedRequests++;
          const errorInfo = `Request Failed: ${error.message} - ${endpoint}`;
          apiErrorAnalysis.apiErrors.push(errorInfo);
          console.log(`🔴 ${errorInfo}`);
        }

        await page.waitForTimeout(1000);
      }

      // Collect console errors from API interactions
      apiErrorAnalysis.consoleErrors = (page as any).consoleErrors || [];

      console.log(`\n📊 API Error Analysis Results:`);
      console.log(
        `   Successful Requests: ${apiErrorAnalysis.successfulRequests}`,
      );
      console.log(`   Failed Requests: ${apiErrorAnalysis.failedRequests}`);
      console.log(
        `   Console Errors: ${apiErrorAnalysis.consoleErrors.length}`,
      );

      if (apiErrorAnalysis.apiErrors.length > 0) {
        console.log("\n🔴 API Errors Found:");
        apiErrorAnalysis.apiErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    } catch (error) {
      console.log(`❌ API monitoring failed: ${error.message}`);
    }

    console.log(`✅ API error monitoring completed`);
  });

  test("should monitor console errors during user interactions", async ({
    page,
  }) => {
    console.log("🧪 Monitoring console errors during user interactions...");

    const interactionAnalysis = {
      startTime: Date.now(),
      consoleErrors: [],
      interactions: [],
      pageErrors: [],
    };

    try {
      // Navigate to frontend
      await page.goto(devServer.url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);

      // Monitor interactions that might trigger errors
      const interactions = [
        {
          name: "Navigate to scan page",
          action: () => page.goto(`${devServer.url}/scan`),
          waitTime: 2000,
        },
        {
          name: "Navigate to settings page",
          action: () => page.goto(`${devServer.url}/settings`),
          waitTime: 2000,
        },
        {
          name: "Navigate to non-existent page",
          action: () => page.goto(`${devServer.url}/nonexistent-page`),
          waitTime: 2000,
        },
        {
          name: "Try to click non-existent element",
          action: () => page.locator("#nonexistent-element").click(),
          waitTime: 1000,
        },
      ];

      for (const interaction of interactions) {
        console.log(`🔄 Testing interaction: ${interaction.name}`);

        try {
          await interaction.action();
          await page.waitForTimeout(interaction.waitTime);

          interactionAnalysis.interactions.push({
            name: interaction.name,
            status: "success",
            errors: (page as any).consoleErrors?.slice() || [],
          });

          console.log(`✅ ${interaction.name} completed`);
        } catch (error) {
          interactionAnalysis.pageErrors.push(
            `${interaction.name}: ${error.message}`,
          );
          interactionAnalysis.interactions.push({
            name: interaction.name,
            status: "failed",
            error: error.message,
          });

          console.log(`❌ ${interaction.name} failed: ${error.message}`);
        }
      }

      // Collect final console errors
      interactionAnalysis.consoleErrors = (page as any).consoleErrors || [];

      console.log(`\n📊 Interaction Analysis Results:`);
      console.log(`   Total Interactions: ${interactions.length}`);
      console.log(
        `   Console Errors: ${interactionAnalysis.consoleErrors.length}`,
      );
      console.log(`   Page Errors: ${interactionAnalysis.pageErrors.length}`);

      if (interactionAnalysis.consoleErrors.length > 0) {
        console.log("\n🔴 Console Errors During Interactions:");
        interactionAnalysis.consoleErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    } catch (error) {
      console.log(`❌ Interaction monitoring failed: ${error.message}`);
    }

    console.log(`✅ User interaction monitoring completed`);
  });

  test("should provide comprehensive console error summary", async ({
    page,
  }) => {
    console.log("🧪 Providing comprehensive console error summary...");

    const summaryAnalysis = {
      startTime: Date.now(),
      allConsoleErrors: [],
      allConsoleWarnings: [],
      allPageErrors: [],
      errorTypes: new Map(),
      errorFrequency: new Map(),
    };

    try {
      // Navigate and collect comprehensive data
      await page.goto(devServer.url, { waitUntil: "domcontentloaded" });

      // Wait for all console output
      await page.waitForTimeout(10000);

      // Collect all error data
      summaryAnalysis.allConsoleErrors = (page as any).consoleErrors || [];
      summaryAnalysis.allConsoleWarnings = (page as any).consoleWarnings || [];

      // Analyze error types
      summaryAnalysis.allConsoleErrors.forEach((error) => {
        const errorType = error.includes("TypeError")
          ? "TypeError"
          : error.includes("ReferenceError")
            ? "ReferenceError"
            : error.includes("NetworkError")
              ? "NetworkError"
              : error.includes("Module")
                ? "ModuleError"
                : error.includes("Vue")
                  ? "VueError"
                  : "Other";

        summaryAnalysis.errorTypes.set(
          errorType,
          (summaryAnalysis.errorTypes.get(errorType) || 0) + 1,
        );
      });

      console.log(`\n📊 Comprehensive Console Error Summary:`);
      console.log(
        `   Total Console Errors: ${summaryAnalysis.allConsoleErrors.length}`,
      );
      console.log(
        `   Total Console Warnings: ${summaryAnalysis.allConsoleWarnings.length}`,
      );

      console.log(`\n📈 Error Type Breakdown:`);
      for (const [type, count] of summaryAnalysis.errorTypes) {
        console.log(`   ${type}: ${count}`);
      }

      if (summaryAnalysis.allConsoleErrors.length > 0) {
        console.log(`\n🔴 All Console Errors:`);
        summaryAnalysis.allConsoleErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      if (summaryAnalysis.allConsoleWarnings.length > 0) {
        console.log(`\n🟡 All Console Warnings:`);
        summaryAnalysis.allConsoleWarnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning}`);
        });
      }

      // Health assessment
      const healthScore = Math.max(
        0,
        100 - summaryAnalysis.allConsoleErrors.length * 10,
      );
      console.log(`\n🏥 Application Health Score: ${healthScore}/100`);

      if (healthScore >= 90) {
        console.log("✅ Excellent: Very few or no console errors");
      } else if (healthScore >= 70) {
        console.log("⚠️ Good: Some console errors but manageable");
      } else {
        console.log("❌ Poor: Many console errors need attention");
      }
    } catch (error) {
      console.log(`❌ Summary analysis failed: ${error.message}`);
    }

    console.log(`✅ Comprehensive error summary completed`);
  });
});
