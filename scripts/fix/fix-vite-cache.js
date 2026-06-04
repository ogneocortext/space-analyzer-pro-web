#!/usr/bin/env node

/**
 * Vite Cache Fix Script
 * Clears Vite cache and resolves common build issues
 */

import fs from "fs";
import path from "path";
import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

class ViteCacheFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.cacheDirs = [
      "node_modules/.vite",
      "node_modules/.cache",
      "dist",
      ".vite",
      "coverage",
      "playwright-report",
      "allure-results",
      "allure-report"
    ];
    this.tempFiles = [
      "*.log",
      "*.tmp",
      "*.temp",
      "vite.config.*.timestamp-*"
    ];
  }

  log(message, level = "INFO") {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      INFO: "\x1b[36m",
      WARN: "\x1b[33m",
      ERROR: "\x1b[31m",
      SUCCESS: "\x1b[32m",
      RESET: "\x1b[0m",
    };
    
    console.log(`${colors[level]}[${timestamp}] ${message}${colors.RESET}`);
  }

  async clearCacheDirectories() {
    this.log("🧹 Clearing Vite cache directories...", "INFO");

    for (const dir of this.cacheDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      
      try {
        if (fs.existsSync(dirPath)) {
          this.log(`Removing: ${dir}`, "WARN");
          
          // Remove directory recursively
          await fs.promises.rm(dirPath, { recursive: true, force: true });
          this.log(`✅ Removed: ${dir}`, "SUCCESS");
        } else {
          this.log(`ℹ️  Not found: ${dir}`, "INFO");
        }
      } catch (error) {
        this.log(`❌ Failed to remove ${dir}: ${error.message}`, "ERROR");
      }
    }
  }

  async clearTempFiles() {
    this.log("🧹 Clearing temporary files...", "INFO");

    for (const pattern of this.tempFiles) {
      try {
        const command = process.platform === "win32" 
          ? `del /s /q "${pattern}" 2>nul || echo ""`
          : `find . -name "${pattern}" -delete 2>/dev/null || echo ""`;
        
        await execAsync(command, { cwd: this.projectRoot });
        this.log(`✅ Cleared pattern: ${pattern}`, "SUCCESS");
      } catch (error) {
        // Ignore errors for temp file cleanup
        this.log(`ℹ️  No files found for pattern: ${pattern}`, "INFO");
      }
    }
  }

  async clearNodeCache() {
    this.log("🧹 Clearing Node.js module cache...", "INFO");

    try {
      await execAsync("npm cache clean --force", { timeout: 10000 });
      this.log("✅ Cleared npm cache", "SUCCESS");
    } catch (error) {
      this.log(`⚠️  npm cache clean failed: ${error.message}`, "WARN");
    }

    try {
      // Clear Node.js require cache
      if (global.require && global.require.cache) {
        Object.keys(global.require.cache).forEach(key => {
          delete global.require.cache[key];
        });
        this.log("✅ Cleared Node.js require cache", "SUCCESS");
      }
    } catch (error) {
      this.log(`⚠️  Require cache clear failed: ${error.message}`, "WARN");
    }
  }

  async resetPackageLock() {
    this.log("🔄 Checking package-lock.json...", "INFO");

    const packageLockPath = path.join(this.projectRoot, "package-lock.json");
    
    if (fs.existsSync(packageLockPath)) {
      try {
        // Backup the lock file
        const backupPath = path.join(this.projectRoot, "package-lock.json.backup");
        await fs.promises.copyFile(packageLockPath, backupPath);
        this.log("✅ Backed up package-lock.json", "SUCCESS");
        
        // Remove the lock file
        await fs.promises.unlink(packageLockPath);
        this.log("✅ Removed package-lock.json", "SUCCESS");
        
        this.log("💡 Run 'npm install' to regenerate lock file", "INFO");
      } catch (error) {
        this.log(`❌ Failed to reset package-lock.json: ${error.message}`, "ERROR");
      }
    } else {
      this.log("ℹ️  package-lock.json not found", "INFO");
    }
  }

  async checkDependencies() {
    this.log("🔍 Checking for missing dependencies...", "INFO");

    const packageJsonPath = path.join(this.projectRoot, "package.json");
    
    if (!fs.existsSync(packageJsonPath)) {
      this.log("❌ package.json not found", "ERROR");
      return false;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const nodeModulesPath = path.join(this.projectRoot, "node_modules");
      
      let missingDeps = [];
      
      // Check dependencies
      if (packageJson.dependencies) {
        for (const dep of Object.keys(packageJson.dependencies)) {
          const depPath = path.join(nodeModulesPath, dep);
          if (!fs.existsSync(depPath)) {
            missingDeps.push(dep);
          }
        }
      }

      // Check devDependencies
      if (packageJson.devDependencies) {
        for (const dep of Object.keys(packageJson.devDependencies)) {
          const depPath = path.join(nodeModulesPath, dep);
          if (!fs.existsSync(depPath)) {
            missingDeps.push(dep);
          }
        }
      }

      if (missingDeps.length > 0) {
        this.log(`⚠️  Missing dependencies: ${missingDeps.slice(0, 5).join(", ")}${missingDeps.length > 5 ? "..." : ""}`, "WARN");
        this.log("💡 Run 'npm install' to install missing dependencies", "INFO");
        return false;
      } else {
        this.log("✅ All dependencies found", "SUCCESS");
        return true;
      }
    } catch (error) {
      this.log(`❌ Failed to check dependencies: ${error.message}`, "ERROR");
      return false;
    }
  }

  async runViteBuild() {
    this.log("🚀 Testing Vite build...", "INFO");

    return new Promise((resolve) => {
      const vite = spawn("npm", ["run", "build"], {
        stdio: "pipe",
        shell: true,
        cwd: this.projectRoot,
      });

      let output = "";
      let errorOutput = "";

      vite.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      vite.stderr.on("data", (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      vite.on("close", (code) => {
        if (code === 0) {
          this.log("✅ Vite build successful", "SUCCESS");
          resolve(true);
        } else {
          this.log(`❌ Vite build failed with code ${code}`, "ERROR");
          resolve(false);
        }
      });

      vite.on("error", (error) => {
        this.log(`❌ Vite build error: ${error.message}`, "ERROR");
        resolve(false);
      });
    });
  }

  async run() {
    console.log("🔧 Vite Cache Fix Tool\n");

    try {
      // Step 1: Clear cache directories
      await this.clearCacheDirectories();
      
      // Step 2: Clear temporary files
      await this.clearTempFiles();
      
      // Step 3: Clear Node.js cache
      await this.clearNodeCache();
      
      // Step 4: Check dependencies
      const depsOk = await this.checkDependencies();
      
      if (!depsOk) {
        console.log("\n💡 Next steps:");
        console.log("   1. Run 'npm install' to install dependencies");
        console.log("   2. Run this script again");
        console.log("   3. If issues persist, try 'npm run build' manually");
        return;
      }
      
      // Step 5: Test build
      console.log("\n🧪 Testing build after cache cleanup...");
      const buildSuccess = await this.runViteBuild();
      
      if (buildSuccess) {
        console.log("\n✅ Vite cache fix completed successfully!");
        console.log("   Your build environment is now clean and working.");
      } else {
        console.log("\n⚠️  Build still has issues. Additional steps:");
        console.log("   1. Try 'npm run build' manually to see detailed errors");
        console.log("   2. Check for TypeScript errors with 'npm run type-check'");
        console.log("   3. Verify all dependencies are compatible");
      }
      
    } catch (error) {
      console.error("\n❌ Cache fix failed:", error.message);
      process.exit(1);
    }
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught error:", error.message);
  process.exit(1);
});

// Run cache fix
new ViteCacheFixer().run().catch(console.error);