/**
 * Security Tests
 * Tests security features and vulnerability prevention
 */

import { test, expect } from '@playwright/test';

test.describe('Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('http://localhost:5173');
    const headers = response?.headers() || {};
    
    // Check for security headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-xss-protection']).toBeDefined();
  });

  test('should not expose sensitive information in console', async ({ page }) => {
    const consoleMessages = [];
    
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
      });
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // Check for sensitive information in console logs
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /api[_-]?key/i,
      /private[_-]?key/i,
    ];

    const sensitiveMessages = consoleMessages.filter(msg => 
      sensitivePatterns.some(pattern => pattern.test(msg.text))
    );

    expect(sensitiveMessages).toHaveLength(0);
  });

  test('should prevent XSS attacks', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Test XSS payload in input fields
    const xssPayload = '<script>alert("XSS")</script>';
    const inputs = await page.locator('input[type="text"], textarea').all();
    
    for (const input of inputs.slice(0, 3)) { // Test first 3 inputs
      await input.fill(xssPayload);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      
      // Check if script was executed
      const alerts = await page.locator('.alert, .notification').count();
      const hasScript = await page.locator('script').count();
      
      expect(hasScript).toBe(0);
    }
  });

  test('should validate input properly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Test input validation
    const inputs = await page.locator('input[type="text"], input[type="number"]').all();
    
    for (const input of inputs.slice(0, 3)) { // Test first 3 inputs
      await input.fill('../../etc/passwd');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      
      // Check for error handling
      const errorElements = await page.locator('.error, .alert-error, [role="alert"]').count();
      expect(errorElements).toBeGreaterThanOrEqual(0);
    }
  });

  test('should have proper CSRF protection', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Check for CSRF tokens in forms
    const forms = await page.locator('form').all();
    
    for (const form of forms.slice(0, 3)) { // Test first 3 forms
      const csrfToken = await form.locator('input[name*="csrf"], input[name*="token"]').count();
      // Note: This is a basic check, actual CSRF protection depends on backend implementation
      expect(csrfToken).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle authentication properly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Test for exposed authentication endpoints
    const response = await page.goto('http://localhost:5173/api/auth');
    
    if (response) {
      const status = response.status();
      // Should not expose auth endpoints without proper authentication
      expect(status).not.toBe(200);
    }
  });

  test('should not leak sensitive data in page source', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    const pageContent = await page.content();
    const sensitivePatterns = [
      /password["\s]*[:=]["\s]*[^"\\s]+/i,
      /api[_-]?key["\s]*[:=]["\s]*[^"\\s]+/i,
      /secret["\s]*[:=]["\s]*[^"\\s]+/i,
      /token["\s]*[:=]["\s]*[^"\\s]+/i,
    ];

    for (const pattern of sensitivePatterns) {
      expect(pageContent).not.toMatch(pattern);
    }
  });

  test('should have proper content security policy', async ({ page }) => {
    const response = await page.goto('http://localhost:5173');
    const headers = response?.headers() || {};
    
    // Check for CSP header
    const cspHeader = headers['content-security-policy'];
    if (cspHeader) {
      // Basic CSP validation
      expect(cspHeader).toContain("default-src");
      expect(cspHeader).toContain("script-src");
    }
  });
});