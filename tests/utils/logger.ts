/**
 * Test Logger - Detailed logging for Playwright tests
 * Tracks user actions, API calls, and errors for debugging
 */

import fs from 'fs';
import path from 'path';

export interface TestLogEntry {
  timestamp: string;
  test: string;
  action: string;
  details: any;
  screenshot?: string;
  error?: string;
}

class TestLogger {
  private logs: TestLogEntry[] = [];
  private logFile: string;
  private testDir: string;

  constructor(testName: string) {
    this.testDir = path.join(process.cwd(), 'test-results', 'logs');
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
    this.logFile = path.join(this.testDir, `${testName.replace(/\s+/g, '_')}.json`);
  }

  log(action: string, details: any = {}) {
    const entry: TestLogEntry = {
      timestamp: new Date().toISOString(),
      test: this.logFile,
      action,
      details,
    };
    this.logs.push(entry);
    this.writeLog();
    
    // Console output for immediate feedback
    console.log(`[${entry.timestamp}] ${action}`, details);
  }

  logError(action: string, error: Error, details: any = {}) {
    const entry: TestLogEntry = {
      timestamp: new Date().toISOString(),
      test: this.logFile,
      action,
      details,
      error: error.message,
    };
    this.logs.push(entry);
    this.writeLog();
    console.error(`[ERROR] ${action}:`, error.message, details);
  }

  logScreenshot(action: string, screenshotPath: string) {
    const entry: TestLogEntry = {
      timestamp: new Date().toISOString(),
      test: this.logFile,
      action,
      details: { screenshot: screenshotPath },
      screenshot: screenshotPath,
    };
    this.logs.push(entry);
    this.writeLog();
  }

  private writeLog() {
    fs.writeFileSync(this.logFile, JSON.stringify(this.logs, null, 2));
  }

  getLogs(): TestLogEntry[] {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.writeLog();
  }
}

export default TestLogger;
