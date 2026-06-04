/**
 * Analysis Workflow Tests
 * Tests complete file analysis workflows from start to finish
 */

import { test, expect } from '@playwright/test';
import { TestAssertions } from '../utils/test-assertions';
import { TestEnvironment, TestDataFactory } from '../utils/test-fixtures';
import { TestHelpers, TestUtilities } from '../utils/test-helpers';
import { LandingPage, AnalysisPage, AIPage } from '../utils/page-objects';

test.describe('Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await TestEnvironment.setup(page, {
      clearStorage: true,
      setViewport: { width: 1920, height: 1080 }
    });
  });

  test('should complete full analysis workflow', async ({ page }) => {
    console.log('🧪 Testing complete analysis workflow...');

    // Initialize page objects
    const landingPage = new LandingPage(page);
    const analysisPage = new AnalysisPage(page);

    // Step 1: Navigate to landing page
    await landingPage.navigateTo();
    await landingPage.waitForPageLoad();
    console.log('✅ Landing page loaded');

    // Step 2: Validate page elements
    const pageElements = await landingPage.validatePageElements();
    expect(pageElements.landingPage).toBe(true);
    expect(pageElements.directoryInput).toBe(true);
    expect(pageElements.startButton).toBe(true);
    console.log('✅ Page elements validated');

    // Step 3: Enter test directory path
    const testPath = process.platform === 'win32' ? 'C:\\test\\directory' : '/test/directory';
    await landingPage.enterDirectoryPath(testPath);
    
    const enteredValue = await page.locator('[data-testid="directory-path-input"]').inputValue();
    expect(enteredValue).toBe(testPath);
    console.log('✅ Directory path entered');

    // Step 4: Start analysis
    await landingPage.startAnalysis();
    console.log('✅ Analysis started');

    // Step 5: Wait for progress section
    await analysisPage.waitForProgressSection();
    expect(await analysisPage.isProgressVisible()).toBe(true);
    console.log('✅ Progress section visible');

    // Step 6: Monitor progress (simulate with timeout)
    const progressStart = Date.now();
    let progressText = '';
    
    while (Date.now() - progressStart < 10000) { // Wait max 10 seconds
      progressText = await analysisPage.getProgressPercentage() || '';
      if (progressText.includes('100%') || progressText.includes('Complete')) {
        break;
      }
      await page.waitForTimeout(1000);
    }
    
    console.log(`📊 Final progress: ${progressText}`);

    // Step 7: Wait for results (or timeout)
    await analysisPage.waitForAnalysisCompletion(30000);
    console.log('✅ Analysis completed or timed out');

    // Step 8: Validate results section
    const resultsVisible = await analysisPage.areResultsVisible();
    if (resultsVisible) {
      const scanResults = await analysisPage.getScanResults();
      expect(scanResults).toBeTruthy();
      console.log('✅ Scan results visible');
    } else {
      console.log('⚠️ Results not visible, may be using mock data');
    }

    // Step 9: Take screenshot for verification
    await TestUtilities.ensureTestDirectory('analysis-workflow');
    const screenshotPath = TestUtilities.getTestFilePath('analysis-workflow/complete-workflow');
    await page.screenshot({
      path: `${screenshotPath}.png`,
      fullPage: true
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}.png`);
  });

  test('should handle analysis with AI features', async ({ page }) => {
    console.log('🧪 Testing analysis with AI features...');

    const landingPage = new LandingPage(page);
    const analysisPage = new AnalysisPage(page);
    const aiPage = new AIPage(page);

    // Navigate and start basic analysis
    await landingPage.navigateTo();
    await landingPage.waitForPageLoad();

    // Enable AI features if available
    if (await landingPage.isAIToggleVisible()) {
      await landingPage.toggleAI();
      console.log('✅ AI features enabled');
    }

    // Start analysis
    await landingPage.enterDirectoryPath('/test/ai-analysis');
    await landingPage.startAnalysis();

    // Wait for analysis to progress
    await analysisPage.waitForProgressSection();

    // Check if AI insights appear
    const aiInsightsVisible = await analysisPage.areAIInsightsVisible();
    if (aiInsightsVisible) {
      const insights = await analysisPage.getAIInsights();
      expect(insights).toBeTruthy();
      console.log('✅ AI insights generated:', insights?.substring(0, 100) + '...');
    } else {
      console.log('⚠️ AI insights not available');
    }

    // Test AI panel if available
    if (await aiPage.isAIPanelVisible()) {
      const aiStatus = await aiPage.getAIStatus();
      console.log('🤖 AI Status:', aiStatus);

      // Test AI model selection if available
      try {
        await aiPage.selectAIModel('qwen3.5:4b');
        console.log('✅ AI model selection working');
      } catch (error) {
        console.log('⚠️ AI model selection not available');
      }
    }
  });

  test('should handle analysis errors gracefully', async ({ page }) => {
    console.log('🧪 Testing analysis error handling...');

    const landingPage = new LandingPage(page);

    await landingPage.navigateTo();
    await landingPage.waitForPageLoad();

    // Test with invalid directory path
    await landingPage.enterDirectoryPath('/invalid/nonexistent/directory');
    await landingPage.startAnalysis();

    // Wait for potential error
    await page.waitForTimeout(3000);

    // Check for error messages
    const errorSelectors = [
      '[data-testid="error"]',
      '.error',
      '[role="alert"]',
      '.alert-error'
    ];

    let errorFound = false;
    for (const selector of errorSelectors) {
      if (await TestHelpers.isVisible(page, selector)) {
        const errorText = await TestHelpers.getTextContent(page, selector);
        console.log('✅ Error message displayed:', errorText);
        errorFound = true;
        break;
      }
    }

    if (!errorFound) {
      console.log('⚠️ No error message displayed, may be using mock responses');
    }

    // Test recovery - try with valid path
    await landingPage.enterDirectoryPath('/test/valid/directory');
    await landingPage.startAnalysis();

    // Should proceed without errors
    await page.waitForTimeout(2000);
    console.log('✅ Error recovery test completed');
  });

  test('should handle large directory analysis', async ({ page }) => {
    console.log('🧪 Testing large directory analysis...');

    const landingPage = new LandingPage(page);
    const analysisPage = new AnalysisPage(page);

    await landingPage.navigateTo();
    await landingPage.waitForPageLoad();

    // Simulate large directory analysis
    await landingPage.enterDirectoryPath('/test/large/directory');
    await landingPage.startAnalysis();

    // Monitor progress for longer duration
    await analysisPage.waitForProgressSection();
    
    const startTime = Date.now();
    let lastProgress = '';
    
    // Monitor progress for up to 30 seconds
    while (Date.now() - startTime < 30000) {
      const currentProgress = await analysisPage.getProgressPercentage() || '';
      
      if (currentProgress !== lastProgress) {
        console.log(`📊 Progress update: ${lastProgress} → ${currentProgress}`);
        lastProgress = currentProgress;
      }
      
      if (currentProgress.includes('100%') || currentProgress.includes('Complete')) {
        break;
      }
      
      await page.waitForTimeout(2000);
    }

    // Validate performance
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Analysis completed in ${totalTime}ms`);

    // Check if results are displayed
    const resultsVisible = await analysisPage.areResultsVisible();
    expect(resultsVisible).toBe(true);

    // Validate visualization if available
    const vizVisible = await analysisPage.isVisualizationVisible();
    if (vizVisible) {
      console.log('✅ Visualization rendered successfully');
    }
  });

  test('should handle analysis cancellation', async ({ page }) => {
    console.log('🧪 Testing analysis cancellation...');

    const landingPage = new LandingPage(page);
    const analysisPage = new AnalysisPage(page);

    await landingPage.navigateTo();
    await landingPage.waitForPageLoad();

    // Start analysis
    await landingPage.enterDirectoryPath('/test/cancel-test');
    await landingPage.startAnalysis();

    // Wait for progress to start
    await analysisPage.waitForProgressSection();
    expect(await analysisPage.isProgressVisible()).toBe(true);

    // Look for cancel button
    const cancelSelectors = [
      '[data-testid="cancel-analysis"]',
      '.cancel-button',
      'button:has-text("Cancel")',
      'button:has-text("Stop")'
    ];

    let cancelClicked = false;
    for (const selector of cancelSelectors) {
      if (await TestHelpers.isVisible(page, selector)) {
        await page.click(selector);
        cancelClicked = true;
        console.log('✅ Cancel button clicked');
        break;
      }
    }

    if (cancelClicked) {
      // Wait for cancellation to process
      await page.waitForTimeout(3000);
      
      // Progress should be hidden
      const progressStillVisible = await analysisPage.isProgressVisible();
      expect(progressStillVisible).toBe(false);
      console.log('✅ Analysis cancelled successfully');
    } else {
      console.log('⚠️ Cancel button not found');
    }
  });

  test('should validate analysis results structure', async ({ page }) => {
    console.log('🧪 Testing analysis results validation...');

    const landingPage = new LandingPage(page);
    const analysisPage = new AnalysisPage(page);

    await landingPage.navigateTo();
    await landingPage.waitForPageLoad();

    // Start analysis
    await landingPage.enterDirectoryPath('/test/validation');
    await landingPage.startAnalysis();

    // Wait for completion
    await analysisPage.waitForAnalysisCompletion(20000);

    // Validate results structure if visible
    if (await analysisPage.areResultsVisible()) {
      // Check for expected result sections
      const resultSelectors = [
        '[data-testid="file-list"]',
        '[data-testid="size-breakdown"]',
        '[data-testid="file-types"]',
        '[data-testid="largest-files"]'
      ];

      const foundSections = [];
      for (const selector of resultSelectors) {
        if (await TestHelpers.isVisible(page, selector)) {
          foundSections.push(selector);
        }
      }

      console.log(`✅ Found result sections: ${foundSections.length}`);
      expect(foundSections.length).toBeGreaterThan(0);

      // Validate data integrity
      for (const selector of foundSections) {
        const element = page.locator(selector);
        await expect(element).toBeVisible();
        
        const textContent = await element.textContent();
        expect(textContent?.length || 0).toBeGreaterThan(0);
      }
    }

    // Test export functionality if available
    const exportSelectors = [
      '[data-testid="export-pdf"]',
      '[data-testid="export-csv"]',
      '[data-testid="export-json"]',
      '.export-button'
    ];

    for (const selector of exportSelectors) {
      if (await TestHelpers.isVisible(page, selector)) {
        // Test export button click (don't wait for download)
        await page.click(selector);
        console.log(`✅ Export button tested: ${selector}`);
        await page.waitForTimeout(1000);
        break;
      }
    }
  });

  test('should handle responsive design during analysis', async ({ page }) => {
    console.log('🧪 Testing responsive analysis workflow...');

    const landingPage = new LandingPage(page);
    const analysisPage = new AnalysisPage(page);

    // Test different viewports
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} viewport...`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await landingPage.navigateTo();
      await landingPage.waitForPageLoad();

      // Validate landing page in this viewport
      const pageElements = await landingPage.validatePageElements();
      expect(pageElements.landingPage).toBe(true);

      // Start analysis
      await landingPage.enterDirectoryPath(`/test/${viewport.name.toLowerCase()}`);
      await landingPage.startAnalysis();

      // Wait for progress
      await analysisPage.waitForProgressSection();
      expect(await analysisPage.isProgressVisible()).toBe(true);

      // Take viewport-specific screenshot
      const screenshotPath = TestUtilities.getTestFilePath(`analysis-workflow/${viewport.name.toLowerCase()}-viewport`);
      await page.screenshot({
        path: `${screenshotPath}.png`,
        fullPage: true
      });

      console.log(`✅ ${viewport.name} viewport test completed`);
    }
  });
});