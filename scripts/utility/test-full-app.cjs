const { chromium } = require('playwright');

async function testFullApp() {
  console.log('🔍 Testing full Space Analyzer application...');
  
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
    console.log('🌐 Navigating to full application...');
    
    await page.goto('http://localhost:5177/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for app to load
    await page.waitForTimeout(5000);
    
    // Check if app loaded
    const appElement = await page.$('#app');
    if (appElement) {
      const appContent = await appElement.innerHTML();
      console.log('📱 App loaded successfully!');
      
      // Check for navigation
      const navLinks = await page.$$('nav a');
      console.log(`🧭 Found ${navLinks.length} navigation links`);
      
      // Try to navigate to different pages
      for (let i = 0; i < Math.min(navLinks.length, 3); i++) {
        const link = navLinks[i];
        const text = await link.textContent();
        console.log(`🔗 Clicking: ${text}`);
        await link.click();
        await page.waitForTimeout(2000);
      }
      
    } else {
      console.log('❌ App failed to load');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'full-app-debug.png', fullPage: true });
    console.log('📸 Screenshot saved as full-app-debug.png');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testFullApp().catch(console.error);