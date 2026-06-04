#!/usr/bin/env node

/**
 * Space Analyzer Pro - Fix Build Environment
 * Checks and fixes common build environment issues
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("🔧 Space Analyzer Pro - Build Environment Fixer");
console.log("══════════════════════════════════════════════════\n");

let fixes = 0;
let issues = 0;

// 1. Check Node.js version
console.log("1. Checking Node.js version...");
const nodeVersion = process.version;
console.log(`   Node.js: ${nodeVersion}`);
const major = parseInt(nodeVersion.slice(1).split(".")[0]);
if (major >= 26) {
  console.log("   ✅ Node.js version is compatible\n");
} else {
  console.log("   ⚠️  Node.js 26+ recommended. Current: " + nodeVersion + "\n");
  issues++;
}

// 2. Check if node_modules exists
console.log("2. Checking node_modules...");
const nmPath = path.join(root, "node_modules");
if (fs.existsSync(nmPath)) {
  // Check for essential packages
  const essential = ["vite", "vue", "vue-router", "pinia", "express", "ws", "cors"];
  const missing = essential.filter((pkg) => !fs.existsSync(path.join(nmPath, pkg)));
  if (missing.length === 0) {
    console.log("   ✅ All essential packages installed\n");
  } else {
    console.log(`   ⚠️  Missing packages: ${missing.join(", ")}`);
    console.log("   Running npm install...");
    try {
      execSync("npm install", { cwd: root, stdio: "inherit" });
      console.log("   ✅ npm install completed\n");
      fixes++;
    } catch (e) {
      console.log(`   ❌ npm install failed: ${e.message}\n`);
      issues++;
    }
  }
} else {
  console.log("   ❌ node_modules not found!");
  console.log("   Running npm install...");
  try {
    execSync("npm install", { cwd: root, stdio: "inherit" });
    console.log("   ✅ npm install completed\n");
    fixes++;
  } catch (e) {
    console.log(`   ❌ npm install failed: ${e.message}\n`);
    issues++;
  }
}

// 3. Check vite.config exists
console.log("3. Checking Vite config...");
const viteConfig = path.join(root, "config", "vite.config.ts");
const rootViteConfig = path.join(root, "vite.config.ts");
if (fs.existsSync(viteConfig)) {
  console.log(`   ✅ config/vite.config.ts found\n`);
} else if (fs.existsSync(rootViteConfig)) {
  console.log(`   ℹ️  Using root vite.config.ts\n`);
} else {
  console.log("   ❌ No vite config found!\n");
  issues++;
}

// 4. Check tsconfig
console.log("4. Checking TypeScript config...");
const tsconfig = path.join(root, "config", "tsconfig.json");
if (fs.existsSync(tsconfig)) {
  console.log("   ✅ TypeScript config found\n");
} else if (fs.existsSync(path.join(root, "tsconfig.json"))) {
  console.log("   ℹ️  Root tsconfig.json found\n");
} else {
  console.log("   ⚠️  No tsconfig.json found\n");
  issues++;
}

// 5. Clean Vite cache
console.log("5. Cleaning Vite cache...");
try {
  execSync("rmdir /s /q node_modules/.vite 2>nul", { cwd: root, stdio: "pipe" });
  console.log("   ✅ Vite cache cleaned\n");
  fixes++;
} catch {
  console.log("   ℹ️  No Vite cache to clean\n");
}

// Summary
console.log("══════════════════════════════════════════════════");
console.log(`\n📊 Summary:`);
console.log(`   Issues found: ${issues}`);
console.log(`   Fixes applied: ${fixes}`);
console.log("");

if (issues === 0) {
  console.log("✅ Build environment looks good! Try building with: npm run build\n");
} else {
  console.log("⚠️  Some issues were found. Try running this script again.\n");
}