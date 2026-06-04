/**
 * Simplified Connectivity Debug Tests
 * Focus on clear debugging output and error handling
 */

import { test, expect } from "@playwright/test";
import { setupTestEnvironment } from "../utils/server-manager";

test.describe("Connectivity Debug Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment with dynamic server management
    const { devServer, backendServer } = await setupTestEnvironment(page);
    console.log(`📡 Dev server: ${devServer.url}`);
    console.log(`📡 Backend server: ${backendServer.url}`);

    // Wait a moment for servers to be fully ready
    await page.waitForTimeout(2000);
  });

  test("should provide detailed frontend connection analysis", async ({
    page,
  }) => {
    console.log("🧪 Starting detailed frontend connection analysis...");

    const testResults = {
      startTime: Date.now(),
      frontendConnected: false,
      pageTitle: "",
      pageLoadTime: 0,
      errors: [],
      structure: {},
      screenshot: null,
    };

    try {
      // Navigate with detailed timing
      console.log("🔄 Navigating to frontend...");
      const navStartTime = Date.now();

      // Use dynamic server URL (page.goto is already set up to use dynamic URLs)
      const response = await page.goto("http://localhost:5173", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      testResults.pageLoadTime = Date.now() - navStartTime;
      console.log(`⏱️ Navigation completed in ${testResults.pageLoadTime}ms`);
      console.log(`📊 Response status: ${response?.status()}`);

      if (response && response.ok()) {
        testResults.frontendConnected = true;
        console.log("✅ Frontend connection successful");

        // Get page title with error handling
        try {
          testResults.pageTitle = await page.title();
          console.log(`📝 Page title: "${testResults.pageTitle}"`);
        } catch (titleError) {
          testResults.errors.push(`Title error: ${titleError.message}`);
          console.log("⚠️ Could not get page title:", titleError.message);
        }

        // Check page structure with error handling
        try {
          testResults.structure = {
            hasApp: await page
              .locator("#app")
              .isVisible()
              .catch(() => false),
            hasMain: await page
              .locator("main, .main-content")
              .first()
              .isVisible()
              .catch(() => false),
            hasBody: await page
              .locator("body")
              .isVisible()
              .catch(() => false),
            viewport: page.viewportSize(),
          };
          console.log("🏗️ Page structure:", testResults.structure);
        } catch (structureError) {
          testResults.errors.push(
            `Structure check error: ${structureError.message}`,
          );
          console.log("⚠️ Structure check failed:", structureError.message);
        }

        // Check for console errors
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });

        // Wait a bit to collect errors
        await page.waitForTimeout(2000);

        if (consoleErrors.length > 0) {
          testResults.errors.push(...consoleErrors);
          console.log("❌ Console errors found:", consoleErrors);
        } else {
          console.log("✅ No console errors detected");
        }
      } else {
        testResults.errors.push(`HTTP ${response?.status()}`);
        console.log(`❌ Frontend HTTP error: ${response?.status()}`);
      }
    } catch (error) {
      testResults.errors.push(`Navigation error: ${error.message}`);
      console.log("❌ Navigation failed:", error.message);
    }

    // Take screenshot for debugging
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const screenshotPath = `test-results/frontend-debug-${timestamp}.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      testResults.screenshot = screenshotPath;
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    } catch (screenshotError) {
      console.log("⚠️ Screenshot failed:", screenshotError.message);
    }

    // Log comprehensive results
    testResults.endTime = Date.now();
    testResults.duration = testResults.endTime - testResults.startTime;

    console.log("📊 Frontend Test Results:");
    console.log(`   Connected: ${testResults.frontendConnected}`);
    console.log(`   Load Time: ${testResults.pageLoadTime}ms`);
    console.log(`   Title: "${testResults.pageTitle}"`);
    console.log(`   Errors: ${testResults.errors.length}`);
    if (testResults.errors.length > 0) {
      testResults.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error}`);
      });
    }
    console.log(`   Duration: ${testResults.duration}ms`);
    console.log(`   Screenshot: ${testResults.screenshot || "None"}`);

    // Basic assertions
    expect(testResults.frontendConnected, "Frontend should connect").toBe(true);
    expect(
      testResults.pageLoadTime,
      "Page should load within 15 seconds",
    ).toBeLessThan(15000);

    if (testResults.errors.length > 0) {
      console.warn("⚠️ Test completed but with errors - check logs above");
    } else {
      console.log("✅ Frontend test completed successfully");
    }
  });

  test("should provide detailed backend analysis", async ({ page }) => {
    console.log("🧪 Starting detailed backend analysis...");

    const testResults = {
      startTime: Date.now(),
      backendConnected: false,
      endpoints: [],
      errors: [],
      recommendations: [],
    };

    const endpoints = [
      { path: "/api/health", method: "GET", expected: true },
      { path: "/api/debug/routes", method: "GET", expected: true },
      { path: "/api/test", method: "GET", expected: true },
      { path: "/api/status", method: "GET", expected: true },
    ];

    for (const endpoint of endpoints) {
      const endpointResult = {
        path: endpoint.path,
        method: endpoint.method,
        success: false,
        responseTime: 0,
        status: null,
        data: null,
        error: null,
      };

      try {
        console.log(`🔄 Testing ${endpoint.method} ${endpoint.path}...`);
        const startTime = Date.now();

        const response = await page.goto(
          `http://localhost:8080${endpoint.path}`,
          {
            timeout: 10000,
          },
        );

        endpointResult.responseTime = Date.now() - startTime;
        endpointResult.status = response?.status();

        if (response && response.ok()) {
          endpointResult.success = true;

          try {
            endpointResult.data = await response.json();
            console.log(
              `✅ ${endpoint.path}: Success (${endpointResult.responseTime}ms)`,
            );
          } catch (parseError) {
            endpointResult.error = `Parse error: ${parseError.message}`;
            console.log(
              `⚠️ ${endpoint.path}: Parse error - ${parseError.message}`,
            );
          }
        } else {
          endpointResult.error = `HTTP ${response?.status()}`;
          console.log(`❌ ${endpoint.path}: HTTP ${response?.status()}`);
        }
      } catch (error) {
        endpointResult.error = `Request error: ${error.message}`;
        console.log(`❌ ${endpoint.path}: Request failed - ${error.message}`);
      }

      testResults.endpoints.push(endpointResult);

      // Small delay between requests
      await page.waitForTimeout(500);
    }

    // Analyze results
    const successfulEndpoints = testResults.endpoints.filter((e) => e.success);
    const failedEndpoints = testResults.endpoints.filter((e) => !e.success);

    testResults.backendConnected = successfulEndpoints.length > 0;

    // Generate recommendations
    if (failedEndpoints.length === 0) {
      testResults.recommendations.push(
        "All endpoints are responding correctly",
      );
    } else if (successfulEndpoints.length > 0) {
      testResults.recommendations.push(
        "Some endpoints working - check failed ones for configuration issues",
      );
    } else {
      testResults.recommendations.push(
        "No endpoints responding - check if backend server is running",
      );
    }

    // Log comprehensive results
    testResults.endTime = Date.now();
    testResults.duration = testResults.endTime - testResults.startTime;

    console.log("📊 Backend Test Results:");
    console.log(`   Connected: ${testResults.backendConnected}`);
    console.log(
      `   Successful: ${successfulEndpoints.length}/${endpoints.length}`,
    );
    console.log(`   Failed: ${failedEndpoints.length}/${endpoints.length}`);

    failedEndpoints.forEach((endpoint) => {
      console.log(
        `   ❌ ${endpoint.path}: ${endpoint.error || "Unknown error"}`,
      );
    });

    console.log(`   Duration: ${testResults.duration}ms`);
    console.log("   Recommendations:");
    testResults.recommendations.forEach((rec) => {
      console.log(`     • ${rec}`);
    });

    // Assertions
    expect(
      testResults.backendConnected,
      "Backend should have at least one working endpoint",
    ).toBe(true);
    expect(
      successfulEndpoints.length,
      "Should not have all endpoints failing",
    ).toBeGreaterThan(0);

    if (testResults.backendConnected) {
      console.log("✅ Backend test completed successfully");
    } else {
      console.warn(
        "⚠️ Backend test completed with issues - check recommendations above",
      );
    }
  });

  test("should test basic functionality with detailed feedback", async ({
    page,
  }) => {
    console.log("🧪 Testing basic application functionality...");

    const testResults = {
      startTime: Date.now(),
      interactions: [],
      errors: [],
      overallSuccess: false,
    };

    try {
      await page.goto("http://localhost:5174", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Test navigation to scan page first
      const navigationTest = {
        action: "Navigate to scan page",
        success: false,
        error: null,
      };

      try {
        // Use dynamic server URL (page.goto is already set up to use dynamic URLs)
        await page.goto("http://localhost:5173/scan", {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });
        await page.waitForTimeout(2000); // Wait for page to load
        navigationTest.success = true;
        console.log("✅ Navigation to scan page: Success");
      } catch (navError) {
        navigationTest.error = navError.message;
        console.log(`❌ Navigation error: ${navError.message}`);
      }

      testResults.interactions.push(navigationTest);

      // Test directory selection button (based on actual ScanView DOM)
      const buttonTest = {
        selector: 'button:has-text("📁 Select Directory to Scan")',
        found: false,
        clickable: false,
        error: null,
      };

      try {
        const buttonElement = page.locator(buttonTest.selector).first();
        buttonTest.found = await buttonElement.isVisible().catch(() => false);

        if (buttonTest.found) {
          await buttonElement.click();
          buttonTest.clickable = true;
          console.log("✅ Directory button test: Success");
        } else {
          console.log("⚠️ No directory selection button found");
        }
      } catch (buttonError) {
        buttonTest.error = buttonError.message;
        console.log(`❌ Button field test error: ${buttonError.message}`);
      }

      testResults.interactions.push(buttonTest);

      // Test basic navigation
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);

      testResults.interactions.push({
        type: "navigation",
        url: currentUrl,
        success: true,
      });
    } catch (error) {
      testResults.errors.push(`Functionality test error: ${error.message}`);
      console.log(`❌ Functionality test failed: ${error.message}`);
    }

    // Analyze results
    const successfulInteractions = testResults.interactions.filter(
      (i) => i.success && !i.error,
    );
    const failedInteractions = testResults.interactions.filter(
      (i) => !i.success || i.error,
    );

    testResults.overallSuccess =
      successfulInteractions.length > 0 && failedInteractions.length === 0;

    // Log comprehensive results
    testResults.endTime = Date.now();
    testResults.duration = testResults.endTime - testResults.startTime;

    console.log("📊 Functionality Test Results:");
    console.log(`   Overall Success: ${testResults.overallSuccess}`);
    console.log(`   Successful Interactions: ${successfulInteractions.length}`);
    console.log(`   Failed Interactions: ${failedInteractions.length}`);

    testResults.interactions.forEach((interaction) => {
      const status = interaction.success ? "✅" : "❌";
      const type = interaction.type || "unknown";
      console.log(
        `   ${status} ${type}: ${interaction.error || interaction.url || "Completed"}`,
      );
    });

    if (testResults.errors.length > 0) {
      testResults.errors.forEach((error, index) => {
        console.log(`   ❌ Error ${index + 1}: ${error}`);
      });
    }

    console.log(`   Duration: ${testResults.duration}ms`);

    // Assertions
    expect(testResults.overallSuccess, "Basic functionality should work").toBe(
      true,
    );

    if (testResults.overallSuccess) {
      console.log("✅ Functionality test completed successfully");
    } else {
      console.warn(
        "⚠️ Functionality test completed with issues - check logs above",
      );
    }
  });
});
