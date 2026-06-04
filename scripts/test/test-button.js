import { chromium } from 'playwright';

async function testButtonFunction() {
  console.log('🧪 Testing button functionality...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Test the button click directly
    const result = await page.evaluate(() => {
      const logger = document.getElementById('logger');
      const beforeHeight = logger.offsetHeight;
      console.log('Before button click:', beforeHeight);
      
      // Manually call the adjustLoggerHeight function
      if (typeof window.adjustLoggerHeight === 'function') {
        window.adjustLoggerHeight(50);
        console.log('Function called successfully');
      } else {
        console.log('Function not found');
        return { error: 'adjustLoggerHeight function not available' };
      }
      
      // Wait a moment for the change
      setTimeout(() => {
        const afterHeight = logger.offsetHeight;
        console.log('After function call:', afterHeight);
      }, 100);
      
      return { beforeHeight };
    });
    
    console.log('📊 Button test result:', result);
    
    await page.waitForTimeout(500);
    
    const afterClickHeight = await page.evaluate(() => {
      const logger = document.getElementById('logger');
      return logger.offsetHeight;
    });
    
    console.log(`📏 Height after manual test: ${afterClickHeight}px`);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testButtonFunction();