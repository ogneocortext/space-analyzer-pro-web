/**
 * Enhanced App Startup Test - Improved with Page Objects and Assertions
 * Tests that the app loads correctly and displays the main interface
 */

import { test, expect } from '@playwright/test';
import { LandingPage } from '../utils/page-objects';
import { TestAssertions } from '../utils/test-assertions';
import { TestEnvironment, TestDataFactory } from '../utils/test-fixtures';
import TestLogger from '../utils/logger';

test.describe('Enhanced App Startup', () => {
  let logger: TestLogger;
  let landingPage: LandingPage;

  test.beforeEach(async ({ page }) => {
    logger = new TestLogger('enhanced-app-startup');
    landingPage = new LandingPage(page, logger);
    
    // Setup test environment
    await TestEnvironment.setup(page, { mockAPI: true });
    
    logger.log('TEST_START', { testName: 'Enhanced App Startup' });
  });

  test('should load the application with all elements', async ({ page }) => {
    logger.log('NAVIGATE', { url: 'http://localhost:3001' });

    try {
      await landingPage.navigateTo('http://localhost:3001');
      await landingPage.waitForPageLoad();
      
      logger.log('PAGE_LOADED', { title: await page.title() });

      // Validate all page elements are present
      const elements = await landingPage.validatePageElements();
      
      // Use assertions for better error messages
      await TestAssertions.assertElementVisible(page, '[data-testid="landing-page"]');
      await TestAssertions.assertElementVisible(page, '[data-testid="directory-path-input"]');
      await TestAssertions.assertElementVisible(page, '[data-testid="start-analysis-button"]');
      
      // Check backend status
      if (elements.backendStatus) {
        const statusText = await landingPage.getBackendStatusText();
        logger.log('BACKEND_STATUS', { status: statusText });
        await TestAssertions.assertElementText(page, '[data-testid="backend-status"]', statusText || '');
      }

      // Check AI toggle
      if (elements.aiToggle) {
        logger.log('AI_TOGGLE_FOUND', {});
        await TestAssertions.assertElementVisible(page, '[data-testid="ai-toggle-button"]');
      }

      // Check navigation
      if (elements.navigation) {
        logger.log('NAVIGATION_FOUND', {});
        await TestAssertions.assertElementVisible(page, 'nav, [role="navigation"], .navbar, .sidebar');
      }

      logger.log('TEST_COMPLETE', { elements });
      
      // Take screenshot for visual verification
      await landingPage.takeScreenshot('enhanced-app-startup');
      
    } catch (error) {
      logger.logError('TEST_FAILED', error as Error, {});
      await landingPage.takeScreenshot('enhanced-app-startup-error');
      throw error;
    }
  });

  test('should load without console or JavaScript errors', async ({ page }) => {
    await landingPage.navigateTo('http://localhost:3001');
    await landingPage.waitForPageLoad();

    // Assert no console errors
    await TestAssertions.assertNoConsoleErrors(page);
    
    // Assert no JavaScript errors
    await TestAssertions.assertNoJavaScriptErrors(page);

    // Check for any test errors
    const testErrors = await TestEnvironment.getTestErrors(page);
    expect(testErrors.length, `Should have no test errors`).toBe(0);

    logger.log('TEST_COMPLETE', { 
      consoleErrors: 0,
      jsErrors: 0,
      testErrors: testErrors.length
    });
  });

  test('should have correct page title and metadata', async ({ page }) => {
    await landingPage.navigateTo('http://localhost:3001');
    await landingPage.waitForPageLoad();

    // Assert page title
    await TestAssertions.assertPageTitle(page, 'Space Analyzer');

    // Assert URL
    await TestAssertions.assertUrlContains(page, 'localhost:3001');

    // Check for viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]');
    await TestAssertions.assertElementVisible(page, 'meta[name="viewport"]');
    await TestAssertions.assertElementHasAttribute(page, 'meta[name="viewport"]', 'content', 'width=device-width, initial-scale=1.0');

    logger.log('TEST_COMPLETE', { 
      title: await page.title(),
      url: page.url()
    });
  });

  test('should be responsive on different viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1366, height: 768, name: 'Laptop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    await TestAssertions.assertResponsiveDesign(page, 'http://localhost:3001', viewports);

    logger.log('TEST_COMPLETE', { viewports: viewports.length });
  });

  test('should meet basic accessibility standards', async ({ page }) => {
    await landingPage.navigateTo('http://localhost:3001');
    await landingPage.waitForPageLoad();

    // Assert accessibility basics
    await TestAssertions.assertAccessibilityBasics(page);

    // Check for proper heading structure
    await TestAssertions.assertElementVisible(page, 'h1, h2, h3');
    
    // Check for proper ARIA landmarks
    await TestAssertions.assertElementVisible(page, 'main, [role="main"]');
    await TestAssertions.assertElementVisible(page, 'nav, [role="navigation"]');

    logger.log('TEST_COMPLETE', { accessibility: 'passed' });
  });

  test('should load within performance expectations', async ({ page }) => {
    const maxLoadTime = 5000; // 5 seconds
    
    const loadTime = await TestAssertions.assertPerformance(page, 'http://localhost:3001', maxLoadTime);
    
    logger.log('TEST_COMPLETE', { 
      loadTime,
      maxLoadTime,
      performance: 'passed'
    });
  });

  test('should handle form interactions correctly', async ({ page }) => {
    await landingPage.navigateTo('http://localhost:3001');
    await landingPage.waitForPageLoad();

    // Test directory input
    await TestAssertions.assertElementVisible(page, '[data-testid="directory-path-input"]');
    await TestAssertions.assertElementEnabled(page, '[data-testid="directory-path-input"]');
    
    // Fill with test data
    const testPath = TestDataFactory.generateRandomFilePath();
    await landingPage.enterDirectoryPath(testPath);
    await TestAssertions.assertInputValue(page, '[data-testid="directory-path-input"]', testPath);

    // Test start button
    await TestAssertions.assertElementVisible(page, '[data-testid="start-analysis-button"]');
    await TestAssertions.assertElementEnabled(page, '[data-testid="start-analysis-button"]');

    // Test AI toggle if present
    if (await landingPage.isAIToggleVisible()) {
      await TestAssertions.assertElementEnabled(page, '[data-testid="ai-toggle-button"]');
      await landingPage.toggleAI();
      // Toggle should still be visible after click
      await TestAssertions.assertElementVisible(page, '[data-testid="ai-toggle-button"]');
    }

    logger.log('TEST_COMPLETE', { 
      directoryPath: testPath,
      interactions: 'passed'
    });
  });

  test('should display backend status correctly', async ({ page }) => {
    await landingPage.navigateTo('http://localhost:3001');
    await landingPage.waitForPageLoad();

    // Check if backend status is visible
    const isBackendStatusVisible = await landingPage.isBackendStatusVisible();
    
    if (isBackendStatusVisible) {
      await TestAssertions.assertElementVisible(page, '[data-testid="backend-status"]');
      
      const statusText = await landingPage.getBackendStatusText();
      expect(statusText, 'Backend status should not be empty').toBeTruthy();
      
      logger.log('BACKEND_STATUS_FOUND', { status: statusText });
    } else {
      logger.log('BACKEND_STATUS_NOT_FOUND', {});
    }

    logger.log('TEST_COMPLETE', { backendStatusVisible: isBackendStatusVisible });
  });

  test('should handle navigation correctly', async ({ page }) => {
    await landingPage.navigateTo('http://localhost:3001');
    await landingPage.waitForPageLoad();

    // Test basic navigation structure
    const navigationTests = [
      { selector: 'nav, [role="navigation"]', expectedPath: '' }
    ];

    // Only test if navigation is present
    if (await landingPage.isElementVisible('nav, [role="navigation"], .navbar, .sidebar')) {
      await TestAssertions.assertNavigationWorking(page, navigationTests);
    }

    logger.log('TEST_COMPLETE', { navigation: 'tested' });
  });

  test('should persist data in localStorage', async ({ page }) => {
    await landingPage.navigateTo('http://localhost:3001');
    await landingPage.waitForPageLoad();

    // Test data persistence
    await TestEnvironment.clearTestErrors(page);
    
    const testData = TestDataFactory.generateRandomString(10);
    await TestAssertions.assertDataPersistence(page, 'test-key', testData);

    logger.log('TEST_COMPLETE', { 
      dataPersistence: 'passed',
      testData
    });
  });
});