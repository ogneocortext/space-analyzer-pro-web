/**
 * Custom Test Assertions for Space Analyzer Application
 * Provides reusable assertion methods for common test scenarios
 */

import { Page, Locator, expect } from '@playwright/test';
import { TestHelpers } from './test-helpers';

export class TestAssertions {
  /**
   * Assert that element is visible
   */
  static async assertElementVisible(page: Page, selector: string, timeout: number = 5000): Promise<void> {
    await expect(page.locator(selector), `Element "${selector}" should be visible`).toBeVisible({ timeout });
  }

  /**
   * Assert that element is hidden
   */
  static async assertElementHidden(page: Page, selector: string, timeout: number = 5000): Promise<void> {
    await expect(page.locator(selector), `Element "${selector}" should be hidden`).toBeHidden({ timeout });
  }

  /**
   * Assert that element has specific text
   */
  static async assertElementText(page: Page, selector: string, expectedText: string, timeout: number = 5000): Promise<void> {
    await expect(page.locator(selector), `Element "${selector}" should contain text "${expectedText}"`).toContainText(expectedText, { timeout });
  }

  /**
   * Assert that element has exact text
   */
  static async assertElementExactText(page: Page, selector: string, expectedText: string, timeout: number = 5000): Promise<void> {
    await expect(page.locator(selector), `Element "${selector}" should have exact text "${expectedText}"`).toHaveText(expectedText, { timeout });
  }

  /**
   * Assert that element is enabled
   */
  static async assertElementEnabled(page: Page, selector: string, timeout: number = 5000): Promise<void> {
    await expect(page.locator(selector), `Element "${selector}" should be enabled`).toBeEnabled({ timeout });
  }

  /**
   * Assert that element is disabled
   */
  static async assertElementDisabled(page: Page, selector: string, timeout: number = 5000): Promise<void> {
    await expect(page.locator(selector), `Element "${selector}" should be disabled`).toBeDisabled({ timeout });
  }

  /**
   * Assert that element has specific class
   */
  static async assertElementHasClass(page: Page, selector: string, className: string): Promise<void> {
    const element = page.locator(selector);
    const classes = await element.getAttribute('class');
    expect(classes, `Element "${selector}" should have class "${className}"`).toContain(className);
  }

  /**
   * Assert that element has specific attribute
   */
  static async assertElementHasAttribute(page: Page, selector: string, attribute: string, value: string): Promise<void> {
    const element = page.locator(selector);
    const attrValue = await element.getAttribute(attribute);
    expect(attrValue, `Element "${selector}" should have attribute "${attribute}" with value "${value}"`).toBe(value);
  }

  /**
   * Assert that page title contains expected text
   */
  static async assertPageTitle(page: Page, expectedTitle: string): Promise<void> {
    await expect(page, `Page title should contain "${expectedTitle}"`).toHaveTitle(new RegExp(expectedTitle, 'i'));
  }

  /**
   * Assert that URL contains expected path
   */
  static async assertUrlContains(page: Page, expectedPath: string): Promise<void> {
    await expect(page, `URL should contain "${expectedPath}"`).toHaveURL(new RegExp(expectedPath, 'i'));
  }

  /**
   * Assert that page has no console errors
   */
  static async assertNoConsoleErrors(page: Page): Promise<void> {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000); // Wait a moment to catch any errors
    
    expect(errors.length, `Page should have no console errors`).toBe(0);
  }

  /**
   * Assert that page has no JavaScript errors
   */
  static async assertNoJavaScriptErrors(page: Page): Promise<void> {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.waitForTimeout(1000); // Wait a moment to catch any errors
    
    expect(errors.length, `Page should have no JavaScript errors`).toBe(0);
  }

  /**
   * Assert that element count matches expected
   */
  static async assertElementCount(page: Page, selector: string, expectedCount: number): Promise<void> {
    const count = await page.locator(selector).count();
    expect(count, `Expected ${expectedCount} elements matching "${selector}", but found ${count}`).toBe(expectedCount);
  }

  /**
   * Assert that input field has specific value
   */
  static async assertInputValue(page: Page, selector: string, expectedValue: string): Promise<void> {
    const value = await page.locator(selector).inputValue();
    expect(value, `Input "${selector}" should have value "${expectedValue}"`).toBe(expectedValue);
  }

  /**
   * Assert that checkbox is checked
   */
  static async assertCheckboxChecked(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector), `Checkbox "${selector}" should be checked`).toBeChecked();
  }

  /**
   * Assert that checkbox is unchecked
   */
  static async assertCheckboxUnchecked(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector), `Checkbox "${selector}" should be unchecked`).not.toBeChecked();
  }

  /**
   * Assert that dropdown has selected option
   */
  static async assertDropdownSelected(page: Page, selector: string, expectedOption: string): Promise<void> {
    await expect(page.locator(selector), `Dropdown "${selector}" should have option "${expectedOption}" selected`).toHaveValue(expectedOption);
  }

  /**
   * Assert that element is within viewport
   */
  static async assertElementInViewport(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    await expect(element, `Element "${selector}" should be in viewport`).toBeInViewport();
  }

  /**
   * Assert that element is focused
   */
  static async assertElementFocused(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector), `Element "${selector}" should be focused`).toBeFocused();
  }

  /**
   * Assert that API response is successful
   */
  static async assertAPIResponse(response: any, expectedStatus: number = 200): Promise<void> {
    expect(response.status(), `API response should have status ${expectedStatus}`).toBe(expectedStatus);
  }

  /**
   * Assert that API response contains expected data
   */
  static async assertAPIResponseData(response: any, expectedData: any): Promise<void> {
    const responseData = await response.json();
    expect(responseData, `API response should contain expected data`).toMatchObject(expectedData);
  }

  /**
   * Assert that loading state is shown
   */
  static async assertLoadingState(page: Page, loadingSelector: string = '[data-testid="loading"], .loading, .spinner'): Promise<void> {
    await this.assertElementVisible(page, loadingSelector);
  }

  /**
   * Assert that loading state is hidden
   */
  static async assertLoadingComplete(page: Page, loadingSelector: string = '[data-testid="loading"], .loading, .spinner'): Promise<void> {
    await this.assertElementHidden(page, loadingSelector);
  }

  /**
   * Assert that error message is shown
   */
  static async assertErrorMessage(page: Page, expectedMessage: string, errorSelector: string = '[data-testid="error"], .error, [role="alert"]'): Promise<void> {
    await this.assertElementVisible(page, errorSelector);
    await this.assertElementText(page, errorSelector, expectedMessage);
  }

  /**
   * Assert that success message is shown
   */
  static async assertSuccessMessage(page: Page, expectedMessage: string, successSelector: string = '[data-testid="success"], .success, .alert-success'): Promise<void> {
    await this.assertElementVisible(page, successSelector);
    await this.assertElementText(page, successSelector, expectedMessage);
  }

  /**
   * Assert that navigation menu is working
   */
  static async assertNavigationWorking(page: Page, navigationTests: Array<{ selector: string; expectedPath: string }>): Promise<void> {
    for (const test of navigationTests) {
      await page.click(test.selector);
      await this.assertUrlContains(page, test.expectedPath);
    }
  }

  /**
   * Assert that responsive design works
   */
  static async assertResponsiveDesign(page: Page, route: string, viewports: Array<{ width: number; height: number; name: string }>): Promise<void> {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);
      
      // Check that main content is still visible
      const mainContent = page.locator('main, .main-content, .container');
      await expect(mainContent, `Main content should be visible on ${viewport.name} (${viewport.width}x${viewport.height})`).toBeVisible();
    }
  }

  /**
   * Assert that accessibility basics are met
   */
  static async assertAccessibilityBasics(page: Page): Promise<void> {
    // Check for ARIA labels on interactive elements
    const buttonsWithoutLabels = await page.locator('button:not([aria-label]):not([title])').count();
    const inputsWithoutLabels = await page.locator('input:not([aria-label]):not([title]):not([placeholder])').count();
    
    expect(buttonsWithoutLabels, `Should have no buttons without ARIA labels`).toBe(0);
    expect(inputsWithoutLabels, `Should have no inputs without ARIA labels, titles, or placeholders`).toBe(0);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused, `Should be able to navigate with keyboard`).toHaveCount(1);
  }

  /**
   * Assert that performance meets expectations
   */
  static async assertPerformance(page: Page, route: string, maxLoadTime: number = 5000): Promise<number> {
    const startTime = Date.now();
    await page.goto(route, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime, `Page should load within ${maxLoadTime}ms`).toBeLessThan(maxLoadTime);
    return loadTime;
  }

  /**
   * Assert that file upload works
   */
  static async assertFileUpload(page: Page, fileInputSelector: string, filePath: string): Promise<void> {
    const fileInput = page.locator(fileInputSelector);
    await fileInput.setInputFiles(filePath);
    
    // Verify file was selected
    const files = await fileInput.inputFiles();
    expect(files.length, `File should be uploaded`).toBeGreaterThan(0);
  }

  /**
   * Assert that form validation works
   */
  static async assertFormValidation(page: Page, formSelector: string, submitSelector: string, validationTests: Array<{ inputSelector: string; validationMessage: string }>): Promise<void> {
    for (const test of validationTests) {
      // Clear input and try to submit
      await page.locator(test.inputSelector).clear();
      await page.locator(submitSelector).click();
      
      // Check for validation message
      await this.assertElementVisible(page, '[data-testid="validation-error"], .error-message');
      await this.assertElementText(page, '[data-testid="validation-error"], .error-message', test.validationMessage);
    }
  }

  /**
   * Assert that data persistence works
   */
  static async assertDataPersistence(page: Page, key: string, value: string): Promise<void> {
    // Set value in localStorage
    await page.evaluate((k, v) => localStorage.setItem(k, v), key, value);
    
    // Reload page
    await page.reload();
    
    // Check that value is still there
    const storedValue = await page.evaluate((k) => localStorage.getItem(k), key);
    expect(storedValue, `Data should persist in localStorage`).toBe(value);
  }

  /**
   * Assert that AI analysis is working
   */
  static async assertAIAnalysis(page: Page, timeout: number = 30000): Promise<void> {
    // Start AI analysis
    await page.click('[data-testid="ai-analyze-button"]');
    
    // Wait for AI results
    await this.assertElementVisible(page, '[data-testid="ai-results"]', timeout);
    
    // Check that AI insights are present
    await this.assertElementVisible(page, '[data-testid="ai-insights"]');
    
    // Check that recommendations are present
    await this.assertElementVisible(page, '[data-testid="ai-recommendations"]');
  }

  /**
   * Assert that scan results are displayed correctly
   */
  static async assertScanResults(page: Page, timeout: number = 60000): Promise<void> {
    // Wait for scan results
    await this.assertElementVisible(page, '[data-testid="scan-results"]', timeout);
    
    // Check that key metrics are displayed
    await this.assertElementVisible(page, '[data-testid="total-size"]');
    await this.assertElementVisible(page, '[data-testid="file-count"]');
    await this.assertElementVisible(page, '[data-testid="directory-count"]');
    
    // Check that file types are displayed
    await this.assertElementVisible(page, '[data-testid="file-types"]');
    
    // Check that largest files are displayed
    await this.assertElementVisible(page, '[data-testid="largest-files"]');
  }

  /**
   * Assert that error handling works correctly
   */
  static async assertErrorHandling(page: Page, errorScenario: () => Promise<void>, expectedErrorMessage: string): Promise<void> {
    await errorScenario();
    
    // Check that error is displayed
    await this.assertErrorMessage(page, expectedErrorMessage);
    
    // Check that error can be dismissed
    await page.click('[data-testid="error-dismiss"], .error-dismiss');
    await this.assertElementHidden(page, '[data-testid="error-container"]');
  }
}