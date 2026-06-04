/**
 * Global setup for Playwright tests
 * Initializes logging and starts the dev server if needed
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting Playwright test setup...');

  // Create test results directories
  const resultsDir = path.join(process.cwd(), 'test-results');
  const logsDir = path.join(resultsDir, 'logs');
  const screenshotsDir = path.join(resultsDir, 'screenshots');

  [resultsDir, logsDir, screenshotsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  console.log('✅ Test directories created');
  console.log('📝 Logs will be saved to:', logsDir);
  console.log('📸 Screenshots will be saved to:', screenshotsDir);

  // Check if backend is already running
  const backendRunning = await isServerRunning('http://127.0.0.1:8080/api/health');
  if (backendRunning) {
    console.log('✅ Backend server already running on port 8080');
  } else {
    console.log('🔧 Starting backend server...');
    const backendProcess = spawn('node', ['server/server.js'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true
    });

    // Wait for backend to be ready
    await waitForServer('http://127.0.0.1:8080/api/health', 30000);
    console.log('✅ Backend server ready on port 8080');

    // Store process ID for cleanup
    if (backendProcess.pid) {
      process.env.BACKEND_PID = backendProcess.pid.toString();
    }
  }

  // Check if frontend is already running
  const frontendRunning = await isServerRunning('http://localhost:5173');
  if (frontendRunning) {
    console.log('✅ Frontend dev server already running on port 5173');
  } else {
    console.log('🔧 Starting frontend dev server...');
    const frontendProcess = spawn('npm', ['run', 'dev:no-browser'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, BROWSER: 'none' }
    });

    // Wait for frontend to be ready
    await waitForServer('http://localhost:5173', 30000);
    console.log('✅ Frontend dev server ready on port 5173');

    // Store process ID for cleanup
    if (frontendProcess.pid) {
      process.env.FRONTEND_PID = frontendProcess.pid.toString();
    }
  }
}

function waitForServer(url: string, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkServer = () => {
      const req = http.get(url, (res) => {
        // Accept 200 (healthy) or 503 (degraded but running) as success
        if (res.statusCode === 200 || res.statusCode === 503) {
          resolve();
        } else {
          retry();
        }
      });

      req.on('error', retry);
      req.setTimeout(5000, () => {
        req.destroy();
        retry();
      });

      function retry() {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Server at ${url} did not start within ${timeout}ms`));
        } else {
          setTimeout(checkServer, 1000);
        }
      }
    };

    checkServer();
  });
}

function isServerRunning(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

export default globalSetup;
