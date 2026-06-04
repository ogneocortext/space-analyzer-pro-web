#!/usr/bin/env node

/**
 * Space Analyzer Pro - Redundancy Cleanup Report
 * Reports on redundant files that could be cleaned up
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("📋 Space Analyzer Pro - Redundancy Cleanup Report");
console.log("════════════════════════════════════════════════════\n");

// Known redundant patterns to check
const patterns = {
  "Duplicate Vite configs in root": [
    "vite.config.ts",
    "vite.config.simple.ts",
  ],
  "Duplicate tsconfig files in root": [
    "tsconfig.json",
  ],
  "Old server files in root (now in server/)": [
    "dev-server.js",
    "dev-server.cjs",
    "launcher-server.js",
    "launcher-backend.cjs",
  ],
  "Standalone HTML files (now served via dist/)": [
    "launcher.html",
    "index-clean.html",
    "index-enhanced.html",
    "index-minimal.html",
    "launcher-fixed.html",
  ],
  "Standalone CSS/JS in root (now in src/)": [
    "launcher-styles.css",
    "launcher-script.js",
  ],
  "Old build artifacts in root": [
    "build_output.txt",
    "build_results.txt",
    "gui_build_output.txt",
    "build.bat",
    "build.ps1",
    "build-desktop.ps1",
    "build-rust-with-vs.bat",
    "build-wsl.ps1",
  ],
  "Obsolete documentation in root": [
    "BUILD_AND_DEPLOYMENT.md",
    "BUILD_DIAGNOSIS_REPORT.md",
    "CLEANUP_REPORT.md",
    "CLICK_TEST_RESULTS.md",
    "GUI_INTEGRATION_GUIDE.md",
    "IMPLEMENTATION_GUIDE.md",
    "INTEGRATION_GUIDE.md",
    "LOGGER_DOCUMENTATION.md",
    "LOGGER_TEST_GUIDE.md",
    "PERMANENT_PATH_CONFIGURATION.md",
    "PERMANENT_RUST_BUILD_SOLUTION.md",
    "PROJECT_ROADMAP.md",
    "PROJECT_STRUCTURE.md",
    "QUICK_BUILD_FIX.md",
    "SELF_CLICKING_FIX.md",
    "WINDOWS_BUILD_TROUBLESHOOTING.md",
  ],
};

let totalRedundant = 0;
let totalSize = 0;

for (const [category, files] of Object.entries(patterns)) {
  console.log(`📁 ${category}:`);
  let found = false;

  for (const file of files) {
    const filePath = path.join(root, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`   📄 ${file} (${sizeKB} KB)`);
      totalRedundant++;
      totalSize += stats.size;
      found = true;
    }
  }

  if (!found) {
    console.log(`   ✅ All cleaned up`);
  }
  console.log("");
}

// Count total files in root
const rootFiles = fs.readdirSync(root).filter((f) => {
  try {
    return fs.statSync(path.join(root, f)).isFile();
  } catch {
    return false;
  }
});

console.log("════════════════════════════════════════════════════");
console.log(`\n📊 Summary:`);
console.log(`   Total root-level files: ${rootFiles.length}`);
console.log(`   Redundant files found: ${totalRedundant}`);
console.log(`   Total redundant size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log("");

if (totalRedundant === 0) {
  console.log("✅ No redundant files found - project is clean!\n");
} else {
  console.log(`⚠️  ${totalRedundant} redundant files found. Consider removing them with:\n`);
  console.log("   npm run cleanup\n");
}