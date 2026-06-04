#!/usr/bin/env node

/**
 * Space Analyzer Pro - Start All Services
 * Starts both frontend dev server and backend API server
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("🚀 Space Analyzer Pro - Starting all services...");
console.log("═══════════════════════════════════════════\n");

// Start backend server
const serverProcess = spawn("node", ["server/server-improved.js"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT: "8080" },
});

// Start frontend dev server
const frontendProcess = spawn("npx", ["vite", "--port", "5173", "--host"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, BROWSER: "none" },
});

// Give them a moment to start, then open browser
setTimeout(() => {
  console.log("\n✅ Services started!");
  console.log("📡 Backend API:  http://localhost:8080");
  console.log("🎨 Frontend:     http://localhost:5173");
  console.log("💚 Health check: http://localhost:8080/api/health");
  console.log("\nPress Ctrl+C to stop all services\n");
}, 2000);

// Handle shutdown
function shutdown() {
  console.log("\n🛑 Shutting down all services...");
  serverProcess.kill("SIGTERM");
  frontendProcess.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

serverProcess.on("close", (code) => {
  console.log(`Backend server exited with code ${code}`);
  if (code !== 0) {
    console.log("⚠️  Backend server encountered an issue. Frontend may still be running.");
  }
});

frontendProcess.on("close", (code) => {
  console.log(`Frontend dev server exited with code ${code}`);
  process.exit(code);
});