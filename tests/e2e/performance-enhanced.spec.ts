/**
 * Enhanced Performance Tests
 * Comprehensive performance monitoring and validation
 */

import { test, expect } from '@playwright/test';
import { TestAssertions } from '../utils/test-assertions';
import { TestEnvironment } from '../utils/test-fixtures';
import { TestHelpers, PerformanceMonitor } from '../utils/test-helpers';

test.describe('Performance Monitoring', () => {
  let performanceMonitor: PerformanceMonitor;

  test.beforeEach(async ({ page }) => {
    performanceMonitor = new PerformanceMonitor();
    await TestEnvironment.setup(page, {
      clearStorage: true,
      setViewport: { width: 1920, height: 1080 }
    });
  });

  test('should measure page load performance', async ({ page }) => {
    console.log('🚀 Measuring page load performance...');

    const endTimer = performanceMonitor.startTimer('page-load');

    // Navigate to frontend
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await TestHelpers.waitForNetworkIdle(page);

    const loadTime = endTimer();
    console.log(`⏱️ Page load time: ${loadTime.toFixed(2)}ms`);

    // Performance assertions
    expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds

    // Collect detailed metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
        loadComplete: navigation.loadEventEnd - navigation.startTime,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        domInteractive: navigation.domInteractive - navigation.startTime
      };
    });

    console.log('📊 Detailed performance metrics:', metrics);

    // Assert key performance indicators
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    expect(metrics.firstContentfulPaint).toBeLessThan(2000);
    expect(metrics.domInteractive).toBeLessThan(2500);

    // Check for performance budget violations
    const violations = [];
    if (metrics.domContentLoaded > 3000) violations.push('DOM Content Loaded too slow');
    if (metrics.firstContentfulPaint > 2000) violations.push('First Contentful Paint too slow');
    if (loadTime > 5000) violations.push('Total load time too slow');

    if (violations.length > 0) {
      console.warn('⚠️ Performance violations:', violations);
    }
  });

  test('should monitor memory usage during analysis', async ({ page }) => {
    console.log('🧠 Monitoring memory usage...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Baseline memory measurement
    const baselineMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (baselineMemory) {
      console.log('📊 Baseline memory:', {
        used: `${(baselineMemory.used / 1024 / 1024).toFixed(2)}MB`,
        total: `${(baselineMemory.total / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(baselineMemory.limit / 1024 / 1024).toFixed(2)}MB`
      });
    }

    // Simulate analysis workflow
    const endTimer = performanceMonitor.startTimer('analysis-workflow');

    await page.fill('[data-testid="directory-path-input"], input[type="text"]', '/test/performance');
    await page.click('[data-testid="start-analysis-button"], button');

    // Wait for progress
    await page.waitForSelector('[data-testid="progress-section"], .progress', { timeout: 10000 });

    // Monitor memory during analysis
    const analysisMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    const workflowTime = endTimer();

    if (baselineMemory && analysisMemory) {
      const memoryIncrease = analysisMemory.used - baselineMemory.used;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      console.log('📊 Memory during analysis:', {
        used: `${(analysisMemory.used / 1024 / 1024).toFixed(2)}MB`,
        increase: `+${memoryIncreaseMB.toFixed(2)}MB`,
        workflowTime: `${workflowTime.toFixed(2)}ms`
      });

      // Memory usage should be reasonable
      expect(memoryIncreaseMB).toBeLessThan(100); // Less than 100MB increase
    }
  });

  test('should measure network performance', async ({ page }) => {
    console.log('🌐 Measuring network performance...');

    // Monitor network requests
    const requests: Array<{ url: string; method: string; status: number; duration: number; size: number }> = [];
    
    page.on('request', request => {
      const startTime = Date.now();
      
      request.on('response', response => {
        requests.push({
          url: request.url(),
          method: request.method(),
          status: response.status(),
          duration: Date.now() - startTime,
          size: response.headers()['content-length'] ? parseInt(response.headers()['content-length']) : 0
        });
      });
    });

    const endTimer = performanceMonitor.startTimer('network-performance');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    const totalTime = endTimer();

    // Analyze network performance
    const totalRequests = requests.length;
    const totalSize = requests.reduce((sum, req) => sum + req.size, 0);
    const avgResponseTime = requests.reduce((sum, req) => sum + req.duration, 0) / totalRequests;
    const slowRequests = requests.filter(req => req.duration > 1000);
    const failedRequests = requests.filter(req => req.status >= 400);

    console.log('📊 Network performance metrics:', {
      totalRequests,
      totalSize: `${(totalSize / 1024).toFixed(2)}KB`,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      slowRequests: slowRequests.length,
      failedRequests: failedRequests.length,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    // Performance assertions
    expect(totalRequests).toBeLessThan(50); // Reasonable number of requests
    expect(avgResponseTime).toBeLessThan(500); // Average response under 500ms
    expect(failedRequests.length).toBe(0); // No failed requests
    expect(slowRequests.length).toBeLessThan(5); // Few slow requests
  });

  test('should test rendering performance', async ({ page }) => {
    console.log('🎨 Testing rendering performance...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Measure frame rate during interactions
    const frameRates: number[] = [];
    
    await page.evaluate(() => {
      let frameCount = 0;
      let lastTime = performance.now();
      
      function countFrames() {
        frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - lastTime >= 1000) {
          (window as any).testFrameRate = frameCount;
          frameCount = 0;
          lastTime = currentTime;
        }
        
        requestAnimationFrame(countFrames);
      }
      
      requestAnimationFrame(countFrames);
    });

    // Simulate user interactions
    const interactions = [
      () => page.hover('button, [role="button"]'),
      () => page.click('input[type="text"], input'),
      () => page.fill('input[type="text"], 'test input'),
      () => page.keyboard.press('Tab'),
      () => page.keyboard.press('Enter')
    ];

    for (const interaction of interactions) {
      try {
        await interaction();
        
        // Wait and collect frame rate
        await page.waitForTimeout(500);
        
        const frameRate = await page.evaluate(() => (window as any).testFrameRate || 0);
        if (frameRate > 0) {
          frameRates.push(frameRate);
        }
      } catch (error) {
        // Interaction might not be possible, continue
      }
    }

    if (frameRates.length > 0) {
      const avgFrameRate = frameRates.reduce((sum, fr) => sum + fr, 0) / frameRates.length;
      const minFrameRate = Math.min(...frameRates);
      
      console.log('📊 Rendering performance:', {
        avgFrameRate: `${avgFrameRate.toFixed(1)} FPS`,
        minFrameRate: `${minFrameRate} FPS`,
        measurements: frameRates.length
      });

      // Rendering should be smooth
      expect(avgFrameRate).toBeGreaterThan(30); // Average above 30 FPS
      expect(minFrameRate).toBeGreaterThan(15); // Minimum above 15 FPS
    }
  });

  test('should measure backend API performance', async ({ page }) => {
    console.log('🔧 Testing backend API performance...');

    const apiMetrics: Array<{ endpoint: string; responseTime: number; status: number }> = [];

    // Monitor API calls
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const startTime = Date.now();
        
        response.text().then(() => {
          apiMetrics.push({
            endpoint: response.url(),
            responseTime: Date.now() - startTime,
            status: response.status()
          });
        });
      }
    });

    // Navigate and trigger API calls
    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Try to trigger analysis to make API calls
    try {
      await page.fill('input[type="text"]', '/test/api-performance');
      await page.click('button');
      await page.waitForTimeout(3000);
    } catch (error) {
      // API calls might not be triggered in test environment
    }

    // Also test direct API calls
    const endpoints = [
      '/api/health',
      '/api/info',
      '/api/version',
      '/api/status'
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      try {
        const response = await page.goto(`http://localhost:8080${endpoint}`);
        const responseTime = Date.now() - startTime;
        
        if (response) {
          apiMetrics.push({
            endpoint,
            responseTime,
            status: response.status()
          });
        }
      } catch (error) {
        console.log(`⚠️ API endpoint ${endpoint} not available`);
      }
    }

    if (apiMetrics.length > 0) {
      const avgResponseTime = apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / apiMetrics.length;
      const maxResponseTime = Math.max(...apiMetrics.map(m => m.responseTime));
      const failedCalls = apiMetrics.filter(m => m.status >= 400);

      console.log('📊 API performance metrics:', {
        totalCalls: apiMetrics.length,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${maxResponseTime}ms`,
        failedCalls: failedCalls.length
      });

      // API performance assertions
      expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second
      expect(maxResponseTime).toBeLessThan(5000); // Max under 5 seconds
      expect(failedCalls.length).toBeLessThan(apiMetrics.length * 0.1); // Less than 10% failure rate
    }
  });

  test('should test performance under load', async ({ page }) => {
    console.log('⚡ Testing performance under load...');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    const loadTestTimer = performanceMonitor.startTimer('load-test');

    // Simulate rapid interactions
    const interactions = [];
    for (let i = 0; i < 20; i++) {
      interactions.push(
        page.hover('button, [role="button"]').catch(() => {}),
        page.click('input[type="text"]').catch(() => {}),
        page.fill('input[type="text"]', `test-${i}`).catch(() => {}),
        page.keyboard.press('Tab').catch(() => {}),
        page.keyboard.press('Enter').catch(() => {})
      );
    }

    // Execute interactions rapidly
    await Promise.all(interactions);

    const loadTestTime = loadTestTimer();

    // Measure performance impact
    const memoryAfterLoad = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize
      } : null;
    });

    console.log('📊 Load test results:', {
      interactions: interactions.length,
      totalTime: `${loadTestTime.toFixed(2)}ms`,
      avgInteractionTime: `${(loadTestTime / interactions.length).toFixed(2)}ms`,
      memoryAfterLoad: memoryAfterLoad ? 
        `${(memoryAfterLoad.used / 1024 / 1024).toFixed(2)}MB` : 'N/A'
    });

    // Performance should remain acceptable under load
    expect(loadTestTime).toBeLessThan(10000); // Complete within 10 seconds
    expect(loadTestTime / interactions.length).toBeLessThan(500); // Each interaction under 500ms
  });

  test('should generate performance report', async ({ page }) => {
    console.log('📋 Generating performance report...');

    // Run comprehensive performance test
    const endTimer = performanceMonitor.startTimer('comprehensive-test');

    await page.goto('http://localhost:5173');
    await TestHelpers.waitForNetworkIdle(page);

    // Collect all performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');
      
      return {
        timing: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
          loadComplete: navigation.loadEventEnd - navigation.startTime,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        },
        resources: {
          total: resources.length,
          totalSize: resources.reduce((sum, r) => sum + (r as any).transferSize, 0),
          imageCount: resources.filter(r => r.initiatorType === 'img').length,
          scriptCount: resources.filter(r => r.initiatorType === 'script').length,
          cssCount: resources.filter(r => r.initiatorType === 'css').length
        },
        memory: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      };
    });

    const totalTime = endTimer();

    // Generate performance report
    const report = {
      timestamp: new Date().toISOString(),
      testDuration: totalTime,
      metrics,
      monitorMetrics: performanceMonitor.getMetrics(),
      recommendations: []
    };

    // Add recommendations based on metrics
    if (metrics.timing.domContentLoaded > 3000) {
      report.recommendations.push('Consider optimizing DOM parsing and script loading');
    }
    
    if (metrics.timing.firstContentfulPaint > 2000) {
      report.recommendations.push('Optimize critical rendering path and reduce render-blocking resources');
    }
    
    if (metrics.resources.total > 50) {
      report.recommendations.push('Consider bundling and reducing number of HTTP requests');
    }
    
    if (metrics.memory && metrics.memory.used > 50 * 1024 * 1024) {
      report.recommendations.push('Monitor memory usage and implement memory optimization');
    }

    console.log('📊 Performance Report:', JSON.stringify(report, null, 2));

    // Save performance report
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(process.cwd(), 'test-results', 'performance-report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Performance report saved: ${reportPath}`);
    } catch (error) {
      console.log('⚠️ Could not save performance report:', error.message);
    }

    // Key performance assertions
    expect(metrics.timing.domContentLoaded).toBeLessThan(5000);
    expect(metrics.timing.firstContentfulPaint).toBeLessThan(3000);
    expect(totalTime).toBeLessThan(15000);
  });
});