import { chromium } from "playwright";

async function testLauncherSimple() {
  console.log("🧪 Testing launcher functionality...\n");

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to launcher
    await page.goto("http://localhost:3000");
    await page.waitForTimeout(1000);

    // Check what's actually on the page
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Look for implementation cards
    const cards = await page.locator(".implementation-card");
    const cardCount = await cards.count();
    console.log(`📋 Found ${cardCount} implementation cards`);

    // Test clicking the first card
    if (cardCount > 0) {
      console.log("\n🎯 Testing first container click...");

      // Get the first card's implementation name
      const firstCard = cards.first();
      const implName = await firstCard.getAttribute("data-implementation");
      console.log(`🏷️  First card implementation: ${implName}`);

      // Check if there's a logger
      const loggerExists = (await page.locator("#logContent").count()) > 0;
      console.log(`🔍 Logger element exists: ${loggerExists}`);

      // Click the card
      await firstCard.click();
      await page.waitForTimeout(2000);

      // Check what happened
      const context = browser.contexts()[0];
      const pages = context.pages();
      console.log(`🌐 Browser tabs after click: ${pages.length}`);

      // Check if card was selected
      const selectedClass = await firstCard.getAttribute("class");
      const isSelected = selectedClass && selectedClass.includes("selected");
      console.log(`✅ Card selected: ${isSelected}`);
      console.log(`🏷️  Card classes: ${selectedClass}`);

      // Check console for any messages
      page.on("console", (msg) => {
        console.log(`📝 Console ${msg.type()}: ${msg.text()}`);
      });

      // Check if launcher script loaded
      const scriptLoaded = await page.evaluate(() => {
        return typeof window.ImplementationLauncher !== "undefined";
      });
      console.log(`📜 Launcher script loaded: ${scriptLoaded}`);

      // Check logger content
      const loggerEntries = await page
        .locator("#logContent .log-entry")
        .count();
      console.log(`📊 Logger entries: ${loggerEntries}`);

      if (loggerEntries > 0) {
        const firstLog = await page
          .locator("#logContent .log-entry")
          .first()
          .textContent();
        console.log(`📄 First log entry: ${firstLog}`);
      }

      // Check logger content
      const loggerEntries = await page
        .locator("#logContent .log-entry")
        .count();
      console.log(`📊 Logger entries: ${loggerEntries}`);

      if (loggerEntries > 0) {
        const firstLog = await page
          .locator("#logContent .log-entry")
          .first()
          .textContent();
        console.log(`📄 First log entry: ${firstLog}`);
      }

      // Take a screenshot to see what happened
      await page.screenshot({ path: "test-result.png" });
      console.log("📸 Screenshot saved: test-result.png");
    }
  } catch (error) {
    console.error("❌ Test error:", error.message);
  } finally {
    await browser.close();
  }
}

testLauncherSimple();
