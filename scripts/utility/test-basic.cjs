const { chromium } = require('playwright');

async function basicTest() {
  console.log('🔍 Running basic frontend test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.error('🚨 Page Error:', error.message);
  });
  
  try {
    console.log('🌐 Testing basic connection...');
    
    // Try without waiting for domcontentloaded
    await page.goto('http://localhost:5180/', { timeout: 10000 });
    
    // Wait a bit and see what loads
    await page.waitForTimeout(5000);
    
    // Check page content
    const pageContent = await page.content();
    console.log('📄 Page HTML length:', pageContent.length);
    
    // Check for any visible content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('📝 Body text preview:', bodyText.substring(0, 200));
    
    // Check if app element exists
    const appExists = await page.evaluate(() => {
      return !!document.getElementById('app');
    });
    console.log('📱 App element exists:', appExists);
    
    if (appExists) {
      const appContent = await page.evaluate(() => {
        return document.getElementById('app').innerHTML.substring(0, 500);
      });
      console.log('📱 App content preview:', appContent);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'basic-test.png', fullPage: true });
    console.log('📸 Screenshot saved as basic-test.png');
    
  } catch (error) {
    console.error('❌ Basic test failed:', error);
  } finally {
    await browser.close();
  }
}

basicTest().catch(console.error);