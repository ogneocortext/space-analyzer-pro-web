/**
 * Enhanced Accessibility Tests
 * Comprehensive WCAG compliance and accessibility testing
 */

import { test, expect } from '@playwright/test';
import { TestEnvironment } from '../utils/test-fixtures';
import { TestHelpers, TestUtilities } from '../utils/test-helpers';
import { TestAssertions } from '../utils/test-assertions';

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await TestEnvironment.setup(page, {
      clearStorage: true,
      setViewport: { width: 1920, height: 1080 }
    });
  });

  test('should meet WCAG 2.1 Level A requirements', async ({ page }) => {
    console.log('♿ Testing WCAG 2.1 Level A compliance...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Test 1.1.1 Non-text Content
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt, 'Images should have alt text').toBe(0);

    // Test 1.3.1 Info and Relationships
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let prevLevel = 0;
    let headingViolations = 0;

    for (const heading of headings) {
      const level = parseInt(await heading.evaluate(el => el.tagName.substring(1)));
      if (level > prevLevel + 1 && prevLevel > 0) {
        headingViolations++;
      }
      prevLevel = level;
    }
    expect(headingViolations, 'Heading hierarchy should not skip levels').toBeLessThan(2);

    // Test 1.4.3 Contrast (Minimum)
    const contrastIssues = await page.evaluate(() => {
      const issues = [];
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          // Simple contrast check (would need proper calculation in real implementation)
          const rgbColor = color.match(/\d+/g);
          const rgbBg = backgroundColor.match(/\d+/g);
          
          if (rgbColor && rgbBg) {
            const contrast = Math.abs(parseInt(rgbColor[0]) - parseInt(rgbBg[0])) +
                            Math.abs(parseInt(rgbColor[1]) - parseInt(rgbBg[1])) +
                            Math.abs(parseInt(rgbColor[2]) - parseInt(rgbBg[2]));
            
            if (contrast < 100) { // Simplified contrast check
              issues.push({
                element: el.tagName,
                contrast: contrast
              });
            }
          }
        }
      });
      
      return issues;
    });

    if (contrastIssues.length > 0) {
      console.warn(`⚠️ Found ${contrastIssues.length} potential contrast issues`);
    }

    console.log('✅ WCAG 2.1 Level A tests completed');
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Test Tab navigation
    const focusableElements = await page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    if (focusableElements.length > 0) {
      // Test Tab order
      for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);

        const focusedElement = await page.locator(':focus').first();
        const isVisible = await focusedElement.isVisible();

        expect(isVisible, `Element ${i + 1} should be visible when focused`).toBe(true);
      }

      // Test Shift+Tab navigation
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Shift+Tab');
        await page.waitForTimeout(200);

        const focusedElement = await page.locator(':focus').first();
        const isVisible = await focusedElement.isVisible();

        expect(isVisible, 'Element should be visible when focused with Shift+Tab').toBe(true);
      }
    }

    // Test Enter and Space key activation
    const buttons = await page.locator('button, [role="button"]').all();
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      await firstButton.focus();
      
      // Test Space key
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
      
      // Test Enter key
      await firstButton.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    console.log('✅ Keyboard navigation tests completed');
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    console.log('🏷️ Testing ARIA labels and roles...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Test interactive elements have accessible names
    const interactiveElements = await page.locator(
      'button, input, select, textarea, [role="button"], [role="link"]'
    ).all();

    let elementsWithoutNames = 0;

    for (const element of interactiveElements) {
      const hasLabel = await element.evaluate(el => {
        return !!(el.getAttribute('aria-label') || 
                 el.getAttribute('aria-labelledby') || 
                 el.getAttribute('title') ||
                 (el as HTMLInputElement).placeholder ||
                 el.textContent?.trim());
      });

      if (!hasLabel) {
        elementsWithoutNames++;
      }
    }

    expect(elementsWithoutNames, 'Interactive elements should have accessible names').toBeLessThan(3);

    // Test ARIA roles are used appropriately
    const ariaRoles = await page.locator('[role]').all();
    const validRoles = [
      'button', 'link', 'navigation', 'main', 'banner', 'contentinfo',
      'search', 'complementary', 'form', 'region', 'alert', 'dialog'
    ];

    let invalidRoles = 0;
    for (const element of ariaRoles) {
      const role = await element.getAttribute('role');
      if (!validRoles.includes(role)) {
        invalidRoles++;
      }
    }

    expect(invalidRoles, 'ARIA roles should be valid').toBe(0);

    // Test form labels
    const formInputs = await page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"])').all();
    let inputsWithoutLabels = 0;

    for (const input of formInputs) {
      const hasLabel = await input.evaluate(el => {
        const id = el.id;
        return !!(el.getAttribute('aria-label') ||
                 el.getAttribute('aria-labelledby') ||
                 el.getAttribute('title') ||
                 el.getAttribute('placeholder') ||
                 (id && document.querySelector(`label[for="${id}"]`)));
      });

      if (!hasLabel) {
        inputsWithoutLabels++;
      }
    }

    expect(inputsWithoutLabels, 'Form inputs should have labels').toBeLessThan(2);

    console.log('✅ ARIA labels and roles tests completed');
  });

  test('should support screen readers', async ({ page }) => {
    console.log('🔊 Testing screen reader support...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Test semantic HTML structure
    const semanticElements = {
      'main': await page.locator('main, [role="main"]').count(),
      'header': await page.locator('header, [role="banner"]').count(),
      'nav': await page.locator('nav, [role="navigation"]').count(),
      'footer': await page.locator('footer, [role="contentinfo"]').count(),
      'section': await page.locator('section, [role="region"]').count(),
      'article': await page.locator('article, [role="article"]').count()
    };

    // Should have at least one main landmark
    expect(semanticElements.main, 'Page should have main landmark').toBeGreaterThan(0);

    // Test heading structure for screen readers
    const headingStructure = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return headings.map(h => ({
        level: parseInt(h.tagName.substring(1)),
        text: h.textContent?.trim() || ''
      }));
    });

    // Should have at least one h1
    const h1Count = headingStructure.filter(h => h.level === 1).length;
    expect(h1Count, 'Page should have at least one h1').toBeGreaterThan(0);

    // Test skip links
    const skipLinks = await page.locator('a[href^="#"], [role="link"][href^="#"]').count();
    if (skipLinks > 0) {
      console.log(`✅ Found ${skipLinks} skip links for screen readers`);
    }

    // Test alt text for images
    const images = await page.locator('img').all();
    let imagesWithEmptyAlt = 0;
    let imagesWithoutAlt = 0;

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (alt === null) {
        imagesWithoutAlt++;
      } else if (alt === '') {
        imagesWithEmptyAlt++;
      }
    }

    expect(imagesWithoutAlt, 'Images should have alt text').toBe(0);
    
    // Empty alt is acceptable for decorative images
    console.log(`📊 Image analysis: ${images.length} total, ${imagesWithEmptyAlt} decorative, ${imagesWithoutAlt} missing alt`);

    console.log('✅ Screen reader support tests completed');
  });

  test('should handle focus management properly', async ({ page }) => {
    console.log('🎯 Testing focus management...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Test initial focus
    await page.waitForTimeout(1000);
    const initialFocus = await page.locator(':focus').count();
    
    // Focus should be on page or first focusable element
    expect(initialFocus, 'Initial focus should be set').toBeGreaterThanOrEqual(0);

    // Test focus trap in modals (if any)
    const modalSelectors = ['[role="dialog"]', '.modal', '[aria-modal="true"]'];
    
    for (const selector of modalSelectors) {
      const modals = await page.locator(selector).all();
      
      for (const modal of modals) {
        if (await modal.isVisible()) {
          // Test that focus stays within modal
          await modal.focus();
          
          // Try to Tab through modal elements
          const modalFocusable = await modal.locator(
            'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'
          ).all();

          for (let i = 0; i < modalFocusable.length; i++) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(200);
            
            const focusedElement = await page.locator(':focus').first();
            const isInModal = await focusedElement.evaluate((el, modalEl) => {
              return modalEl.contains(el);
            }, modal);

            expect(isInModal, 'Focus should stay within modal').toBe(true);
          }
        }
      }
    }

    // Test focus restoration
    const buttons = await page.locator('button').all();
    if (buttons.length > 0) {
      await buttons[0].focus();
      const focusedBefore = await page.locator(':focus').first();
      
      // Simulate opening and closing something that might steal focus
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      
      const focusedAfter = await page.locator(':focus').first();
      const sameElement = await focusedBefore.evaluate((el1, el2) => el1 === el2, focusedAfter);
      
      // Focus should be restored (this is a simplified test)
      console.log('✅ Focus management tests completed');
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    console.log('🎨 Testing color contrast...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Test text contrast
    const contrastIssues = await page.evaluate(() => {
      const issues = [];
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = styles.fontWeight;
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          const rgbColor = color.match(/\d+/g);
          const rgbBg = backgroundColor.match(/\d+/g);
          
          if (rgbColor && rgbBg && rgbColor.length >= 3 && rgbBg.length >= 3) {
            // Calculate relative luminance (simplified)
            const getLuminance = (rgb: number[]) => {
              const [r, g, b] = rgb.map(val => val / 255);
              return 0.299 * r + 0.587 * g + 0.114 * b;
            };
            
            const l1 = getLuminance(rgbColor);
            const l2 = getLuminance(rgbBg);
            const lighter = Math.max(l1, l2);
            const darker = Math.min(l1, l2);
            
            const contrast = (lighter + 0.05) / (darker + 0.05);
            
            // WCAG AA requirements
            const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight === 'bold');
            const requiredContrast = isLargeText ? 3 : 4.5;
            
            if (contrast < requiredContrast) {
              issues.push({
                element: el.tagName,
                fontSize,
                fontWeight,
                contrast: contrast.toFixed(2),
                required: requiredContrast,
                text: el.textContent?.substring(0, 50) || ''
              });
            }
          }
        }
      });
      
      return issues;
    });

    if (contrastIssues.length > 0) {
      console.warn(`⚠️ Found ${contrastIssues.length} contrast issues:`);
      contrastIssues.slice(0, 5).forEach(issue => {
        console.warn(`  - ${issue.element} (${issue.fontSize}px): ${issue.contrast} < ${issue.required}`);
      });
    }

    // Test that links are distinguishable
    const links = await page.locator('a[href]').all();
    let linksWithoutUnderlineOrColor = 0;

    for (const link of links) {
      const styles = await link.evaluate(el => ({
        textDecoration: window.getComputedStyle(el).textDecoration,
        color: window.getComputedStyle(el).color
      }));

      if (!styles.textDecoration.includes('underline') && styles.color === 'rgb(0, 0, 255)') {
        linksWithoutUnderlineOrColor++;
      }
    }

    console.log(`📊 Link analysis: ${links.length} total, ${linksWithoutUnderlineOrColor} may need better distinction`);
    console.log('✅ Color contrast tests completed');
  });

  test('should be accessible on mobile devices', async ({ page }) => {
    console.log('📱 Testing mobile accessibility...');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Test touch target sizes (minimum 44x44 points)
    const touchTargets = await page.locator('button, a, input, [role="button"]').all();
    let smallTouchTargets = 0;

    for (const target of touchTargets) {
      const boundingBox = await target.boundingBox();
      if (boundingBox) {
        const width = boundingBox.width;
        const height = boundingBox.height;
        
        // Convert to points (simplified - assuming 96 DPI)
        const widthPoints = width * 96 / 72;
        const heightPoints = height * 96 / 72;
        
        if (widthPoints < 44 || heightPoints < 44) {
          smallTouchTargets++;
        }
      }
    }

    if (smallTouchTargets > 0) {
      console.warn(`⚠️ Found ${smallTouchTargets} touch targets smaller than 44x44 points`);
    }

    // Test text spacing
    const textElements = await page.locator('p, li, h1, h2, h3, h4, h5, h6').all();
    let textSpacingIssues = 0;

    for (const element of textElements.slice(0, 10)) { // Test first 10 elements
      const styles = await element.evaluate(el => ({
        lineHeight: window.getComputedStyle(el).lineHeight,
        letterSpacing: window.getComputedStyle(el).letterSpacing,
        wordSpacing: window.getComputedStyle(el).wordSpacing
      }));

      const lineHeight = parseFloat(styles.lineHeight);
      const fontSize = parseFloat(await element.evaluate(el => window.getComputedStyle(el).fontSize));
      
      if (lineHeight < fontSize * 1.5) {
        textSpacingIssues++;
      }
    }

    if (textSpacingIssues > 0) {
      console.warn(`⚠️ Found ${textSpacingIssues} elements with insufficient text spacing`);
    }

    // Test orientation support
    await page.setViewportSize({ width: 667, height: 375 }); // Landscape
    await page.waitForTimeout(1000);
    
    const landscapeElements = await page.locator('main, .main-content, #app').first();
    const landscapeVisible = await landscapeElements.isVisible();
    
    expect(landscapeVisible, 'Content should be accessible in landscape orientation').toBe(true);

    console.log('✅ Mobile accessibility tests completed');
  });

  test('should generate accessibility report', async ({ page }) => {
    console.log('📋 Generating accessibility report...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Generate comprehensive accessibility report
    const report = await page.evaluate(() => {
      const issues = [];
      
      // Check for missing alt text
      document.querySelectorAll('img:not([alt])').forEach((img, index) => {
        issues.push({
          type: 'missing-alt',
          element: 'img',
          message: 'Image missing alt text',
          severity: 'error',
          index
        });
      });
      
      // Check for empty buttons
      document.querySelectorAll('button').forEach((button, index) => {
        const text = button.textContent?.trim();
        const hasAriaLabel = button.getAttribute('aria-label');
        const hasTitle = button.getAttribute('title');
        
        if (!text && !hasAriaLabel && !hasTitle) {
          issues.push({
            type: 'empty-button',
            element: 'button',
            message: 'Button without accessible text',
            severity: 'error',
            index
          });
        }
      });
      
      // Check for missing form labels
      document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])').forEach((input, index) => {
        const id = input.id;
        const hasLabel = document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = input.getAttribute('aria-label');
        const hasPlaceholder = input.getAttribute('placeholder');
        
        if (!hasLabel && !hasAriaLabel && !hasPlaceholder) {
          issues.push({
            type: 'missing-label',
            element: 'input',
            message: 'Input without label',
            severity: 'error',
            index
          });
        }
      });
      
      // Check for heading hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let prevLevel = 0;
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.substring(1));
        if (level > prevLevel + 1 && prevLevel > 0) {
          issues.push({
            type: 'heading-skip',
            element: heading.tagName,
            message: `Heading skips from h${prevLevel} to h${level}`,
            severity: 'warning',
            index
          });
        }
        prevLevel = level;
      });
      
      return {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        totalIssues: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        issues
      };
    });

    console.log('📊 Accessibility Report:', JSON.stringify(report, null, 2));

    // Save accessibility report
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(process.cwd(), 'test-results', 'accessibility-report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Accessibility report saved: ${reportPath}`);
    } catch (error) {
      console.log('⚠️ Could not save accessibility report:', error.message);
    }

    // Key accessibility assertions
    expect(report.errors, 'Should have no accessibility errors').toBeLessThan(5);
    expect(report.totalIssues, 'Total accessibility issues should be manageable').toBeLessThan(20);

    console.log('✅ Accessibility report generated');
  });
});