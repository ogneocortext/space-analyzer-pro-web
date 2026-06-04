/**
 * Simple Test Assertions
 * Basic assertion utilities for testing
 */

import { Page, expect } from '@playwright/test';

export class SimpleAssertions {
  static async assertPageTitle(page: Page, expectedTitle: string): Promise<void> {
    const title = await page.title();
    expect(title).toContain(expectedTitle);
  }

  static async assertElementVisible(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  static async assertElementExists(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  static async assertAPIResponse(response: any, expectedStatus: number = 200): Promise<void> {
    expect(response.status()).toBe(expectedStatus);
  }
}

export default SimpleAssertions;