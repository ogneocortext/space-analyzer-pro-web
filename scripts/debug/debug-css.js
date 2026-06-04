import { chromium } from 'playwright';

async function debugLoggerCSS() {
  console.log('🧪 Debugging logger CSS...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Check what CSS classes are applied
    const cssInfo = await page.evaluate(() => {
      const logger = document.getElementById('logger');
      if (!logger) return { error: 'Logger not found' };
      
      return {
        classes: logger.className,
        computedHeight: window.getComputedStyle(logger).height,
        computedMinHeight: window.getComputedStyle(logger).minHeight,
        computedMaxHeight: window.getComputedStyle(logger).maxHeight,
        styleHeight: logger.style.height,
        offsetHeight: logger.offsetHeight
      };
    });
    
    console.log('🎨 CSS Info:', cssInfo);
    
    // Force remove collapsed class and set height
    await page.evaluate(() => {
      const logger = document.getElementById('logger');
      if (logger) {
        logger.classList.remove('collapsed');
        logger.style.height = '200px';
        logger.style.minHeight = '60px';
        logger.style.maxHeight = '400px';
      }
    });
    
    await page.waitForTimeout(500);
    
    const afterFix = await page.evaluate(() => {
      const logger = document.getElementById('logger');
      return logger ? logger.offsetHeight : 0;
    });
    
    console.log(`📏 Height after forcing: ${afterFix}px`);
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await browser.close();
  }
}

debugLoggerCSS();