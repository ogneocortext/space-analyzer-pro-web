const { chromium } = require('playwright');

async function debugFrontend() {
  console.log('🔍 Starting Playwright frontend debugging...');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    devtools: true   // Open devtools
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers()
    });
  });
  
  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
    console.error('🚨 Page Error:', error.message);
  });
  
  // Capture response issues
  const failedRequests = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
      console.error(`❌ Failed Request: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('🌐 Navigating to frontend...');
    
    // Navigate with extended timeout
    await page.goto('http://localhost:5176/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait a bit more to see if anything loads
    await page.waitForTimeout(10000);
    
    // Check page content
    const pageContent = await page.content();
    console.log('📄 Page HTML length:', pageContent.length);
    
    // Check if Vue app mounted
    const appElement = await page.$('#app');
    if (appElement) {
      const appContent = await appElement.innerHTML();
      console.log('📱 App content:', appContent.substring(0, 500));
    } else {
      console.log('❌ No #app element found');
    }
    
    // Check for any visible elements
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('📝 Body text:', bodyText.substring(0, 200));
    
    // Take screenshot
    await page.screenshot({ path: 'frontend-debug.png', fullPage: true });
    console.log('📸 Screenshot saved as frontend-debug.png');
    
  } catch (error) {
    console.error('❌ Navigation error:', error);
  } finally {
    // Print summary
    console.log('\n📊 DEBUG SUMMARY:');
    console.log(`Console Messages: ${consoleMessages.length}`);
    console.log(`Network Requests: ${networkRequests.length}`);
    console.log(`Page Errors: ${pageErrors.length}`);
    console.log(`Failed Requests: ${failedRequests.length}`);
    
    if (pageErrors.length > 0) {
      console.log('\n🚨 PAGE ERRORS:');
      pageErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.message}`);
      });
    }
    
    if (failedRequests.length > 0) {
      console.log('\n❌ FAILED REQUESTS:');
      failedRequests.forEach((req, i) => {
        console.log(`${i + 1}. ${req.status} ${req.url}`);
      });
    }
    
    await browser.close();
  }
}

debugFrontend().catch(console.error);