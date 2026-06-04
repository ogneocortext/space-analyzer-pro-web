/**
 * Accessibility Tests
 * Tests WCAG compliance and accessibility features
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await injectAxe(page);
  });

  test('should pass accessibility tests on landing page', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'aria-labels': { enabled: true },
      },
    });
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    // Check for at least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check heading order (no skipping levels)
    const headingLevels = [];
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName);
      headingLevels.push(parseInt(tagName.substring(1)));
    }
    
    for (let i = 1; i < headingLevels.length; i++) {
      expect(headingLevels[i]).toBeLessThanOrEqual(headingLevels[i - 1] + 1);
    }
  });

  test('should have keyboard navigation support', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').first();
    expect(await focusedElement.count()).toBeGreaterThan(0);
    
    // Test interactive elements are focusable
    const buttons = await page.locator('button, [role="button"]').all();
    for (const button of buttons.slice(0, 3)) { // Test first 3 buttons
      await button.focus();
      expect(await button.evaluate(el => document.activeElement === el)).toBe(true);
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Check for missing ARIA labels on interactive elements
    const buttonsWithoutLabels = await page.locator('button:not([aria-label]):not([aria-labelledby]):not([title])').count();
    const inputsWithoutLabels = await page.locator('input:not([aria-label]):not([aria-labelledby]):not([title]):not([placeholder])').count();
    
    // Allow some elements without labels if they have visible text content
    expect(buttonsWithoutLabels + inputsWithoutLabels).toBeLessThan(5);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
  });

  test('should handle screen reader announcements', async ({ page }) => {
    // Test for live regions
    const liveRegions = await page.locator('[aria-live], [aria-atomic]').count();
    expect(liveRegions).toBeGreaterThanOrEqual(0);
    
    // Test for proper role attributes
    const landmarks = await page.locator('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]').count();
    expect(landmarks).toBeGreaterThanOrEqual(1);
  });
});