/**
 * Optimized Connectivity Tests
 * Enhanced debugging and error handling capabilities
 */

import { test, expect } from '@playwright/test';
import { OptimizedTestEnvironment } from '../utils/test-environment-optimized';

test.describe('Optimized Connectivity Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup with optimized environment that handles security issues
    await OptimizedTestEnvironment.setup(page, {
      mockAPI: false, // Use real API for connectivity tests
      mockErrors: true,
      clearStorage: true,
      setViewport: { width: 1920, height: 1080 },
      skipStorage: false // Try storage operations but handle failures
    });
  });

  test.afterEach(async ({ page }) => {
    // Generate debug report after each test
    await OptimizedTestEnvironment.saveDebugReport();
    await OptimizedTestEnvironment.reset(page);
  });

  test('should connect to frontend application with enhanced debugging', async ({ page }) => {
    console.log('🧪 Testing enhanced frontend connectivity...');

    const testStartTime = Date.now();
    let frontendConnected = false;
    let pageLoadTime = 0;
    let pageTitle = '';
    let pageErrors: any[] = [];

    try {
      // Navigate with enhanced error handling
      console.log('🔄 Navigating to frontend...');
      const response = await page.goto('http://localhost:5173', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      pageLoadTime = Date.now() - testStartTime;
      console.log(`⏱️ Page load time: ${pageLoadTime}ms`);
      console.log(`📊 Response status: ${response?.status()}`);

      // Check response
      if (response && response.ok()) {
        frontendConnected = true;
        console.log('✅ Frontend responded successfully');
      } else {
        console.log('⚠️ Frontend response issue:', response?.status());
      }

      // Get page title with error handling
      try {
        pageTitle = await page.title();
        console.log(`📝 Page title: "${pageTitle}"`);
      } catch (error) {
        console.log('⚠️ Could not get page title:', error.message);
      }

      // Check for basic page structure
      console.log('🔍 Checking page structure...');
      
      const structureChecks = {
        hasApp: false,
        hasMain: false,
        hasBody: false,
        hasVue: false
      };

      try {
        // Check for Vue app
        structureChecks.hasVue = await page.evaluate(() => {
          return !!(window.Vue || document.querySelector('#app'));
        });
        
        // Check for main content areas
        structureChecks.hasMain = await page.locator('main, .main-content, .container, #app').first().isVisible().catch(() => false);
        structureChecks.hasBody = await page.locator('body').isVisible().catch(() => false);
        structureChecks.hasApp = await page.locator('#app').isVisible().catch(() => false);
        
        console.log('📊 Page structure:', structureChecks);
      } catch (error) {
        console.log('⚠️ Structure check failed:', error.message);
      }

      // Collect any page errors
      pageErrors = await OptimizedTestEnvironment.getPageErrors(page);
      if (pageErrors.length > 0) {
        console.log(`❌ Found ${pageErrors.length} page errors:`, pageErrors);
      }

      // Enhanced assertions with better error messages
      expect(response?.status(), 'Frontend should respond with valid status').toBeLessThan(500);
      expect(pageTitle, 'Page should have a title').toBeTruthy();
      expect(pageTitle.length, 'Page title should not be empty').toBeGreaterThan(0);
      
      // At least one structure element should be present
      const hasAnyStructure = Object.values(structureChecks).some(Boolean);
      expect(hasAnyStructure, 'Page should have basic structure').toBe(true);

      console.log('✅ Enhanced frontend connectivity test completed');

    } catch (error) {
      console.error('❌ Frontend connectivity test failed:', error.message);
      
      // Take screenshot for debugging
      try {
        await page.screenshot({
          path: `test-results/frontend-connectivity-error-${Date.now()}.png`,
          fullPage: true
        });
      } catch (screenshotError) {
        console.log('⚠️ Could not take error screenshot');
      }
      
      throw error;
    }

    // Log comprehensive test results
    const testResults = {
      frontendConnected,
      pageLoadTime,
      pageTitle,
      pageErrors,
      structureChecks,
      testDuration: Date.now() - testStartTime
    };

    console.log('📊 Test Results:', JSON.stringify(testResults, null, 2));
  });

  test('should connect to backend API with comprehensive validation', async ({ page }) => {
    console.log('🧪 Testing enhanced backend connectivity...');

    const testStartTime = Date.now();
    let apiConnected = false;
    let apiResponse: any = null;
    let responseTime = 0;

    try {
      // Test direct API call
      console.log('🔄 Testing backend health endpoint...');
      const apiStartTime = Date.now();
      
      const response = await page.goto('http://localhost:8080/api/health', { 
        timeout: 10000 
      });
      
      responseTime = Date.now() - apiStartTime;
      console.log(`⏱️ API response time: ${responseTime}ms`);
      console.log(`📊 API status: ${response?.status()}`);

      if (response && response.ok()) {
        apiConnected = true;
        
        try {
          apiResponse = await response.json();
          console.log('📊 API response:', apiResponse);
        } catch (parseError) {
          console.log('⚠️ Could not parse API response:', parseError.message);
          apiResponse = { parseError: parseError.message };
        }
      } else {
        console.log('⚠️ API response issue:', response?.status());
      }

      // Test alternative endpoints if health fails
      if (!apiConnected) {
        console.log('🔄 Testing alternative endpoints...');
        
        const alternatives = [
          'http://localhost:8080/api/status',
          'http://localhost:8080/api/info',
          'http://localhost:8080/api/version'
        ];

        for (const endpoint of alternatives) {
          try {
            console.log(`🔄 Trying ${endpoint}...`);
            const altResponse = await page.goto(endpoint, { timeout: 5000 });
            
            if (altResponse && altResponse.ok()) {
              console.log(`✅ Alternative endpoint ${endpoint} responded successfully`);
              apiConnected = true;
              break;
            }
          } catch (altError) {
            console.log(`⚠️ Alternative endpoint ${endpoint} failed:`, altError.message);
          }
        }
      }

      // Enhanced assertions
      expect(response?.status(), 'API should respond with valid status').toBeLessThan(500);
      
      if (apiResponse) {
        expect(apiResponse, 'API response should be valid object').toBeDefined();
        
        // Check for expected properties
        const hasExpectedProps = apiResponse && (
          apiResponse.success !== undefined ||
          apiResponse.status !== undefined ||
          apiResponse.health !== undefined
        );
        
        if (hasExpectedProps) {
          console.log('✅ API response has expected structure');
        } else {
          console.log('⚠️ API response missing expected properties');
        }
      }

      console.log('✅ Enhanced backend connectivity test completed');

    } catch (error) {
      console.error('❌ Backend connectivity test failed:', error.message);
      
      // Try to get more error context
      try {
        const pageErrors = await OptimizedTestEnvironment.getPageErrors(page);
        if (pageErrors.length > 0) {
          console.log('📊 Page errors during API test:', pageErrors);
        }
      } catch (pageError) {
        console.log('⚠️ Could not get page errors during API test');
      }
      
      throw error;
    }

    // Log comprehensive test results
    const testResults = {
      apiConnected,
      responseTime,
      apiResponse,
      testDuration: Date.now() - testStartTime
    };

    console.log('📊 API Test Results:', JSON.stringify(testResults, null, 2));
  });

  test('should test comprehensive endpoint availability', async ({ page }) => {
    console.log('🧪 Testing comprehensive endpoint availability...');

    const endpoints = [
      { path: '/api/health', expected: true, description: 'Health check' },
      { path: '/api/info', expected: true, description: 'System info' },
      { path: '/api/version', expected: true, description: 'Version info' },
      { path: '/api/status', expected: true, description: 'Status check' },
      { path: '/api/ai/models', expected: false, description: 'AI models (may not be available)' },
      { path: '/api/analysis/start', expected: false, description: 'Analysis start (requires POST)' },
      { path: '/api/files/list', expected: false, description: 'Files list (requires parameters)' }
    ];

    const results = [];
    const testStartTime = Date.now();

    for (const endpoint of endpoints) {
      const endpointStartTime = Date.now();
      let result: any = {
        path: endpoint.path,
        description: endpoint.description,
        success: false,
        status: null,
        responseTime: 0,
        error: null
      };

      try {
        console.log(`🔄 Testing ${endpoint.path}...`);
        const response = await page.goto(`http://localhost:8080${endpoint.path}`, { 
          timeout: 5000 
        });
        
        result.responseTime = Date.now() - endpointStartTime;
        result.status = response?.status();
        
        if (response && response.ok()) {
          result.success = true;
          try {
            result.data = await response.json();
            console.log(`✅ ${endpoint.path}: ${JSON.stringify(result.data).substring(0, 100)}...`);
          } catch (parseError) {
            result.parseError = parseError.message;
            console.log(`⚠️ ${endpoint.path}: Parse error - ${parseError.message}`);
          }
        } else {
          console.log(`❌ ${endpoint.path}: HTTP ${result.status}`);
        }
        
      } catch (error) {
        result.error = error.message;
        console.log(`❌ ${endpoint.path}: ${error.message}`);
      }
      
      results.push(result);
      
      // Add small delay between requests
      await page.waitForTimeout(100);
    }

    // Analyze results
    const successfulEndpoints = results.filter(r => r.success);
    const failedEndpoints = results.filter(r => r.success === false);
    const avgResponseTime = results
      .filter(r => r.responseTime > 0)
      .reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    console.log(`📊 Endpoint Test Summary:`);
    console.log(`   ✅ Successful: ${successfulEndpoints.length}/${results.length}`);
    console.log(`   ❌ Failed: ${failedEndpoints.length}/${results.length}`);
    console.log(`   ⏱️ Average response time: ${avgResponseTime.toFixed(2)}ms`);

    // Enhanced assertions
    expect(successfulEndpoints.length, 'Should have at least some working endpoints').toBeGreaterThan(0);
    expect(successfulEndpoints.length, 'Should not have all endpoints failing').toBeGreaterThan(results.length / 2);

    // Log detailed results
    const testResults = {
      totalEndpoints: results.length,
      successfulEndpoints: successfulEndpoints.length,
      failedEndpoints: failedEndpoints.length,
      avgResponseTime,
      results,
      testDuration: Date.now() - testStartTime
    };

    console.log('📊 Comprehensive Endpoint Results:', JSON.stringify(testResults, null, 2));
  });

  test('should handle network resilience and timeouts', async ({ page }) => {
    console.log('🧪 Testing network resilience...');

    const testStartTime = Date.now();
    const resilienceResults = [];

    // Test 1: Slow response handling
    console.log('🔄 Testing slow response handling...');
    try {
      // Mock slow response
      await page.route('**/api/health', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, status: 'healthy', delayed: true })
          });
        }, 3000); // 3 second delay
      });

      const slowStart = Date.now();
      const response = await page.goto('http://localhost:8080/api/health', { timeout: 10000 });
      const slowTime = Date.now() - slowStart;
      
      resilienceResults.push({
        test: 'slow-response',
        success: response && response.ok(),
        responseTime: slowTime,
        expectedTime: '>3000ms',
        actualTime: `${slowTime}ms`
      });
      
      console.log(`📊 Slow response test: ${slowTime}ms`);
      
    } catch (error) {
      resilienceResults.push({
        test: 'slow-response',
        success: false,
        error: error.message
      });
    }

    // Remove mock
    await page.unroute('**/api/health');

    // Test 2: Connection failure handling
    console.log('🔄 Testing connection failure handling...');
    try {
      // Mock connection failure
      await page.route('**/api/health', (route) => {
        route.abort('failed');
      });

      const failStart = Date.now();
      await page.goto('http://localhost:8080/api/health', { timeout: 5000 });
      const failTime = Date.now() - failStart;
      
      resilienceResults.push({
        test: 'connection-failure',
        success: false, // Expected to fail
        responseTime: failTime,
        expectedTime: 'Should fail quickly',
        actualTime: `${failTime}ms`
      });
      
      console.log(`📊 Connection failure test: ${failTime}ms`);
      
    } catch (error) {
      resilienceResults.push({
        test: 'connection-failure',
        success: false,
        error: error.message
      });
    }

    // Remove mock
    await page.unroute('**/api/health');

    // Test 3: Retry mechanism
    console.log('🔄 Testing retry mechanism...');
    let retrySuccess = false;
    let retryAttempts = 0;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        retryAttempts++;
        console.log(`🔄 Retry attempt ${i + 1}/${maxRetries}...`);
        
        const response = await page.goto('http://localhost:8080/api/health', { 
          timeout: 5000 
        });
        
        if (response && response.ok()) {
          retrySuccess = true;
          console.log(`✅ Retry ${i + 1} successful`);
          break;
        }
        
      } catch (error) {
        console.log(`❌ Retry ${i + 1} failed:`, error.message);
        
        if (i < maxRetries - 1) {
          await page.waitForTimeout(1000); // Wait before retry
        }
      }
    }

    resilienceResults.push({
      test: 'retry-mechanism',
      success: retrySuccess,
      attempts: retryAttempts,
      maxAttempts: maxRetries
    });

    // Analyze resilience results
    const successfulResilienceTests = resilienceResults.filter(r => r.success).length;
    
    console.log('📊 Resilience Test Summary:');
    resilienceResults.forEach(result => {
      console.log(`   ${result.test}: ${result.success ? '✅' : '❌'} ${result.actualTime || result.error}`);
    });

    // Enhanced assertions
    expect(successfulResilienceTests, 'Should have some successful resilience tests').toBeGreaterThan(0);
    expect(retrySuccess, 'Retry mechanism should eventually succeed').toBe(true);

    // Log comprehensive results
    const testResults = {
      totalTests: resilienceResults.length,
      successfulTests: successfulResilienceTests,
      results: resilienceResults,
      testDuration: Date.now() - testStartTime
    };

    console.log('📊 Network Resilience Results:', JSON.stringify(testResults, null, 2));
  });
});