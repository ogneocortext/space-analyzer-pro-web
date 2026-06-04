#!/usr/bin/env node

/**
 * Space Analyzer Pro - Cleanup
 * Cleans up processes, cache, and temporary files
 */

import { execSync } from "child_process";

console.log("🧹 Space Analyzer Pro - Cleanup");
console.log("════════════════════════════════\n");

try {
  // 1. Kill any existing server/dev processes
  console.log("1. Killing existing processes...");
  try {
    execSync("taskkill /f /im node.exe 2>nul", { stdio: "pipe" });
    console.log("   ✅ Node processes terminated");
  } catch {
    console.log("   ✅ No node processes to kill (or already stopped)");
  }

  // 2. Clean Vite cache
  console.log("2. Cleaning Vite cache...");
  try {
    execSync("npx vite clean 2>nul", { stdio: "pipe" });
    console.log("   ✅ Vite cache cleaned");
  } catch {
    try {
      execSync("rmdir /s /q node_modules/.vite 2>nul", { stdio: "pipe" });
      console.log("   ✅ Vite cache cleaned");
    } catch {
      console.log("   ℹ️  No Vite cache to clean");
    }
  }

  // 3. Clean dist folder
  console.log("3. Cleaning dist folder...");
  try {
    execSync("rmdir /s /q dist 2>nul", { stdio: "pipe" });
    console.log("   ✅ dist folder removed");
  } catch {
    console.log("   ℹ️  No dist folder to clean");
  }

  // 4. Clean temp files
  console.log("4. Cleaning temp files...");
  try {
    execSync("del /q /f nul 2>nul", { stdio: "pipe" });
    console.log("   ✅ Temp files cleaned");
  } catch {
    console.log("   ℹ️  No temp files to clean");
  }

  console.log("\n✅ Cleanup complete!\n");
} catch (error) {
  console.error("❌ Cleanup error:", error.message);
  process.exit(1);
}