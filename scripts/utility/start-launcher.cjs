#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Starting Space Analyzer Launcher...");

// Check if launcher-server.js exists
const launcherPath = path.join(__dirname, "launcher-server.js");
if (!require("fs").existsSync(launcherPath)) {
  console.error("❌ launcher-server.js not found");
  process.exit(1);
}

// Start the launcher server
const launcher = spawn("node", [launcherPath], {
  stdio: "inherit",
  cwd: __dirname,
});

launcher.on("error", (error) => {
  console.error("❌ Failed to start launcher:", error.message);
  process.exit(1);
});

launcher.on("close", (code) => {
  console.log(`\n📋 Launcher exited with code: ${code}`);
  process.exit(code);
});

// Browser auto-open disabled - user will refresh manually
console.log("📋 Launcher ready - refresh your browser tab to see changes");

console.log("⏳ Waiting for launcher to start...");
