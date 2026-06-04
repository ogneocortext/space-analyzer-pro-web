/**
 * Dynamic Connectivity Tests with Automatic Server Management
 * Tests that can start servers, detect ports, and avoid conflicts automatically
 */

import { test, expect } from '@playwright/test';
import { setupTestEnvironment, ServerManager } from '../utils/server-manager';

test.describe('Dynamic Connectivity Tests', () => {
  let serverManager: ServerManager;
  let devServer: any;
  let backendServer: any;

  test.beforeAll(async () => {
    serverManager = ServerManager.getInstance();
  });

  test.beforeEach(async ({ page }) => {
    // Setup test environment with dynamic server management
    ({ devServer, backendServer } = await setupTestEnvironment(page));
    
    // Wait a moment for servers to be fully ready
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    // Clean up servers after all tests
    await serverManager.stopAllServers();
  });

  test('should connect to dynamically started frontend server', async ({ page }) => {
    console.log('🧪 Testing dynamic frontend server connection...');
    
    const testResults = {
      startTime: Date.now(),
      frontendConnected: false,
      pageTitle: '',
      pageLoadTime: 0,
      errors: [],
      structure: {},
      serverUrl: devServer.url
    };

    try {
      console.log(`🔄 Navigating to frontend at ${devServer.url}...`);
      const navStartTime = Date.now();
      
      const response = await page.goto(devServer.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      testResults.pageLoadTime = Date.now() - navStartTime;
      console.log(`⏱️ Navigation completed in ${testResults.pageLoadTime}ms`);
      console.log(`📊 Response status: ${response?.status()}`);
      
      if (response && response.ok()) {
        testResults.frontendConnected = true;
        console.log('✅ Frontend connection successful');
        
        // Get page title
        try {
          testResults.pageTitle = await page.title();
          console.log(`📝 Page title: "${testResults.pageTitle}"`);
        } catch (titleError) {
          testResults.errors.push(`Title error: ${titleError.message}`);
          console.log('⚠️ Could not get page title:', titleError.message);
        }
        
        // Check page structure
        try {
          testResults.structure = {
            hasApp: await page.locator('#app').isVisible().catch(() => false),
            hasMain: await page.locator('main, .main-content').first().isVisible().catch(() => false),
            hasBody: await page.locator('body').isVisible().catch(() => false),
            viewport: page.viewportSize()
          };
          console.log('🏗️ Page structure:', testResults.structure);
        } catch (structureError) {
          testResults.errors.push(`Structure check error: ${structureError.message}`);
          console.log('⚠️ Structure check failed:', structureError.message);
        }
        
      } else {
        testResults.errors.push(`HTTP ${response?.status()}`);
        console.log(`❌ Frontend HTTP error: ${response?.status()}`);
      }
      
    } catch (error) {
      testResults.errors.push(`Navigation error: ${error.message}`);
      console.log('❌ Navigation failed:', error.message);
    }
    
    // Assertions
    expect(testResults.frontendConnected, 'Frontend should connect').toBe(true);
    expect(testResults.pageLoadTime, 'Page should load within 15 seconds').toBeLessThan(15000);
    expect(testResults.pageTitle, 'Page should have a title').toBeTruthy();
    
    console.log('✅ Dynamic frontend test completed successfully');
  });

  test('should connect to dynamically started backend server', async ({ page }) => {
    console.log('🧪 Testing dynamic backend server connection...');
    
    const testResults = {
      startTime: Date.now(),
      backendConnected: false,
      endpoints: [],
      errors: [],
      serverUrl: backendServer.url
    };

    const endpoints = [
      { path: '/api/health', method: 'GET', expected: true },
      { path: '/api/debug/routes', method: 'GET', expected: true },
      { path: '/api/test', method: 'GET', expected: true },
      { path: '/api/status', method: 'GET', expected: true },
    ];

    for (const endpoint of endpoints) {
      const endpointResult = {
        path: endpoint.path,
        method: endpoint.method,
        success: false,
        responseTime: 0,
        status: null,
        data: null,
        error: null
      };

      try {
        console.log(`🔄 Testing ${endpoint.method} ${backendServer.url}${endpoint.path}...`);
        const startTime = Date.now();
        
        const response = await page.goto(`${backendServer.url}${endpoint.path}`, { 
          timeout: 10000 
        });
        
        endpointResult.responseTime = Date.now() - startTime;
        endpointResult.status = response?.status();
        
        if (response && response.ok()) {
          endpointResult.success = true;
          
          try {
            endpointResult.data = await response.json();
            console.log(`✅ ${endpoint.path}: Success (${endpointResult.responseTime}ms)`);
          } catch (parseError) {
            endpointResult.error = `Parse error: ${parseError.message}`;
            console.log(`⚠️ ${endpoint.path}: Parse error - ${parseError.message}`);
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

    // Assertions
    expect(testResults.backendConnected, 'Backend should have at least one working endpoint').toBe(true);
    expect(successfulEndpoints.length, 'Should not have all endpoints failing').toBeGreaterThan(0);

    console.log('✅ Dynamic backend test completed successfully');
  });

  test('should handle port conflicts gracefully', async ({ page }) => {
    console.log('🧪 Testing port conflict handling...');
    
    // Get current server info
    const currentDevServer = serverManager.getDevelopmentServerUrl();
    const currentBackendServer = serverManager.getBackendServerUrl();
    
    console.log(`📡 Current dev server: ${currentDevServer}`);
    console.log(`📡 Current backend server: ${currentBackendServer}`);
    
    // Verify servers are running on different ports
    expect(currentDevServer).not.toBe('http://localhost:5173');
    expect(currentBackendServer).not.toBe('http://localhost:8080');
    
    // Test that we can still connect to both servers
    const devResponse = await page.goto(currentDevServer, { timeout: 10000 });
    expect(devResponse?.ok()).toBe(true);
    
    const backendResponse = await page.goto(`${currentBackendServer}/api/health`, { timeout: 10000 });
    expect(backendResponse?.ok()).toBe(true);
    
    console.log('✅ Port conflict handling test completed successfully');
  });

  test('should test complete workflow with dynamic servers', async ({ page }) => {
    console.log('🧪 Testing complete workflow with dynamic servers...');
    
    // Navigate to frontend
    await page.goto(serverManager.getDevelopmentServerUrl());
    await page.waitForLoadState('domcontentloaded');
    
    // Test navigation to scan page
    await page.goto(`${serverManager.getDevelopmentServerUrl()}/scan`);
    await page.waitForLoadState('domcontentloaded');
    
    // Test backend API call
    const healthResponse = await page.request.get(`${serverManager.getBackendServerUrl()}/api/health`);
    expect(healthResponse.ok()).toBe(true);
    
    const healthData = await healthResponse.json();
    expect(healthData.success).toBe(true);
    
    console.log('✅ Complete workflow test completed successfully');
  });
});