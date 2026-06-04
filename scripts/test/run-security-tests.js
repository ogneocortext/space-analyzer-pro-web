#!/usr/bin/env node

/**
 * Security Testing Script
 * Runs security tests including OWASP checks and dependency scanning
 */

import { spawn } from "child_process";
import fs from "fs/promises";

class SecurityTestRunner {
  constructor() {
    this.options = {
      testDir: "tests/e2e/security",
      reportDir: "test-results/security",
      severity: ["high", "critical"],
    };
  }

  async run() {
    console.log("🔒 Starting Security Tests");

    // Ensure directories exist
    this.ensureDirectories();

    try {
      // Run dependency audit
      await this.runDependencyAudit();

      // Run security E2E tests
      await this.runSecurityE2ETests();

      console.log("✅ Security tests completed successfully");
    } catch (error) {
      console.error("❌ Security tests failed:", error.message);
      throw error;
    }
  }

  ensureDirectories() {
    if (!fs.existsSync(this.options.reportDir)) {
      fs.mkdirSync(this.options.reportDir, { recursive: true });
      console.log(`📁 Created directory: ${this.options.reportDir}`);
    }
  }

  async runDependencyAudit() {
    console.log("🔍 Running dependency audit...");

    return new Promise((resolve, reject) => {
      const child = spawn("npm", ["audit", "--json"], {
        stdio: "pipe",
        shell: true,
      });

      let output = "";
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        try {
          const auditResult = JSON.parse(output);
          this.saveAuditReport(auditResult);
          resolve();
        } catch (error) {
          console.error("Failed to parse audit results:", error);
          reject(error);
        }
      });
    });
  }

  async runSecurityE2ETests() {
    console.log("🛡️ Running security E2E tests...");

    return new Promise((resolve, reject) => {
      const command = [
        "playwright",
        "test",
        this.options.testDir,
        "--reporter=json",
        "--grep=security",
      ];

      const child = spawn("npx", command, {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          SECURITY_TEST: "true",
        },
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Security E2E tests exited with code ${code}`));
        }
      });
    });
  }

  saveAuditReport(auditResult) {
    const reportPath = `${this.options.reportDir}/dependency-audit.json`;
    fs.writeFileSync(reportPath, JSON.stringify(auditResult, null, 2));
    console.log(`📄 Dependency audit report saved to: ${reportPath}`);

    // Log high/critical vulnerabilities
    const vulnerabilities = auditResult.vulnerabilities || {};
    const highVulns = Object.values(vulnerabilities).filter((v) =>
      this.options.severity.includes(v.severity)
    );

    if (highVulns.length > 0) {
      console.warn(`⚠️ Found ${highVulns.length} high/critical vulnerabilities`);
      highVulns.forEach((vuln) => {
        console.warn(`  - ${vuln.name}: ${vuln.severity}`);
      });
    } else {
      console.log("✅ No high/critical vulnerabilities found");
    }
  }
}

// Run security tests
if (require.main === module) {
  const runner = new SecurityTestRunner();
  runner.run().catch(console.error);
}

module.exports = SecurityTestRunner;
