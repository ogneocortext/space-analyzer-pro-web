import { chromium } from "playwright";

async function testLauncher() {
  console.log("🧪 Testing Space Analyzer Launcher with Playwright...\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to launcher
    console.log("📍 Opening launcher...");
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Take screenshot of initial state
    await page.screenshot({ path: "launcher-initial.png" });
    console.log("📸 Screenshot saved: launcher-initial.png");

    // Check if logger exists and is working
    const loggerContent = await page.locator("#logContent");
    const loggerExists = await loggerContent.isVisible();
    console.log(`🔍 Logger exists: ${loggerExists}`);

    // Get all implementation cards
    const cards = await page.locator(".implementation-card");
    const cardCount = await cards.count();
    console.log(`📋 Found ${cardCount} implementation cards`);

    // Test each container click
    const implementations = [
      "clean",
      "enhanced",
      "minimal",
      "original",
      "rust",
    ];

    for (let i = 0; i < cardCount && i < implementations.length; i++) {
      const impl = implementations[i];
      console.log(`\n🎯 Testing ${impl} container...`);

      // Get current log entries count
      const beforeLogs = await loggerContent.locator(".log-entry").count();

      // Click the container
      await cards.nth(i).click();
      await page.waitForTimeout(500);

      // Check if logger registered the click
      const afterLogs = await loggerContent.locator(".log-entry").count();
      const newLogs = afterLogs - beforeLogs;

      console.log(`📝 Log entries added: ${newLogs}`);

      // Get the latest log entries
      if (newLogs > 0) {
        const latestLog = await loggerContent
          .locator(".log-entry")
          .first()
          .textContent();
        console.log(`📄 Latest log: ${latestLog}`);
      }

      // Check if card is selected
      const isSelected = await cards.nth(i).hasClass("selected");
      console.log(`✅ Card selected: ${isSelected}`);

      // Check if new tab opened
      const pages = context.pages();
      console.log(`🌐 Browser tabs open: ${pages.length}`);

      // Take screenshot after click
      await page.screenshot({ path: `launcher-${impl}-clicked.png` });
      console.log(`📸 Screenshot saved: launcher-${impl}-clicked.png`);
    }

    // Test logger clear functionality
    console.log("\n🧹 Testing logger clear...");
    await page.click(".clear-btn");
    await page.waitForTimeout(200);

    const logsAfterClear = await loggerContent.locator(".log-entry").count();
    console.log(`📝 Logs after clear: ${logsAfterClear}`);

    // Final screenshot
    await page.screenshot({ path: "launcher-final.png" });
    console.log("📸 Final screenshot saved: launcher-final.png");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    await page.screenshot({ path: "launcher-error.png" });
  } finally {
    await browser.close();
  }
}

// Run the test
testLauncher().catch(console.error);
