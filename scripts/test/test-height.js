import { chromium } from 'playwright';

async function testLoggerHeight() {
  console.log('🧪 Testing logger height adjustment...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Get initial logger height
    const initialHeight = await page.evaluate(() => {
      const logger = document.getElementById('logger');
      return logger ? logger.offsetHeight : 0;
    });
    console.log(`📏 Initial logger height: ${initialHeight}px`);
    
    // Test height adjustment function
    const result = await page.evaluate(() => {
      const logger = document.getElementById('logger');
      if (!logger) return { error: 'Logger not found' };
      
      const beforeHeight = logger.offsetHeight;
      console.log('Before adjustment:', beforeHeight);
      
      // Try to increase height
      logger.style.height = '200px';
      
      const afterHeight = logger.offsetHeight;
      console.log('After adjustment:', afterHeight);
      
      return { beforeHeight, afterHeight };
    });
    
    console.log('📊 Height test result:', result);
    
    // Test the button functionality
    await page.click('.size-btn:has-text("+")');
    await page.waitForTimeout(500);
    
    const afterClickHeight = await page.evaluate(() => {
      const logger = document.getElementById('logger');
      return logger ? logger.offsetHeight : 0;
    });
    console.log(`📏 Height after + button: ${afterClickHeight}px`);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testLoggerHeight();