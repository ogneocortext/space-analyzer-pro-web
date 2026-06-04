import { chromium } from 'playwright';

async function debugTest() {
  console.log('🧪 Debug test...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Check if script loaded
    const scriptLoaded = await page.evaluate(() => {
      console.log('Checking window objects...');
      console.log('ImplementationLauncher:', typeof window.ImplementationLauncher);
      console.log('clearLog:', typeof window.clearLog);
      return {
        launcher: typeof window.ImplementationLauncher,
        clearLog: typeof window.clearLog,
        logContent: !!document.getElementById('logContent')
      };
    });
    
    console.log('📜 Script loaded:', scriptLoaded);
    
    // Try to manually trigger a click
    const result = await page.evaluate(() => {
      const card = document.querySelector('.implementation-card');
      if (card) {
        console.log('Found card:', card.dataset.implementation);
        card.click();
        return {
          clicked: true,
          implementation: card.dataset.implementation
        };
      }
      return { clicked: false };
    });
    
    console.log('🎯 Click result:', result);
    await page.waitForTimeout(1000);
    
    // Check logger after click
    const logCount = await page.evaluate(() => {
      const logs = document.querySelectorAll('#logContent .log-entry');
      return logs.length;
    });
    
    console.log(`📊 Logs after click: ${logCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugTest();