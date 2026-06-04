#!/usr/bin/env node

/**
 * Space Analyzer Pro - Port Configuration & Management
 * Detects, checks, and manages port usage
 */

import http from "http";
import { execSync } from "child_process";

const PORTS = {
  frontend: { port: 5173, name: "Frontend Dev Server" },
  backend: { port: 8080, name: "Backend API Server" },
  ai: { port: 5000, name: "AI Service" },
  ollama: { port: 11434, name: "Ollama AI Server" },
};

function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.on("error", () => resolve(false)); // Port in use
    server.on("listening", () => {
      server.close();
      resolve(true); // Port available
    });
    server.listen(port, "127.0.0.1");
  });
}

function findProcessOnPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", timeout: 3000 });
    const lines = result.trim().split("\n").filter((l) => l.includes("LISTENING"));
    if (lines.length > 0) {
      const parts = lines[0].trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      try {
        const procInfo = execSync(`tasklist /fi "PID eq ${pid}" /nh`, { encoding: "utf8", timeout: 2000 });
        return { pid, name: procInfo.trim().split(/\s+/)[0] || "Unknown" };
      } catch {
        return { pid, name: "Unknown" };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function detect() {
  console.log("🔌 Space Analyzer Pro - Port Detection");
  console.log("════════════════════════════════════════\n");

  for (const [key, info] of Object.entries(PORTS)) {
    const available = await checkPort(info.port);
    const status = available ? "✅ Available" : "❌ In use";
    console.log(`${status} - ${info.name} (port ${info.port})`);

    if (!available) {
      const proc = findProcessOnPort(info.port);
      if (proc) {
        console.log(`   → Process: ${proc.name} (PID: ${proc.pid})`);
      }
    }
  }
  console.log("");
}

async function status() {
  console.log("🔌 Space Analyzer Pro - Port Status");
  console.log("═════════════════════════════════════\n");

  let anyRunning = false;

  for (const [key, info] of Object.entries(PORTS)) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${info.port}`, (res) => {
          console.log(`✅ ${info.name} is responding on port ${info.port}`);
          anyRunning = true;
          resolve();
        });
        req.on("error", () => {
          console.log(`❌ ${info.name} is NOT running on port ${info.port}`);
          resolve();
        });
        req.setTimeout(2000, () => {
          req.destroy();
          console.log(`❌ ${info.name} timed out on port ${info.port}`);
          resolve();
        });
      });
    } catch {
      console.log(`❌ ${info.name} is NOT running on port ${info.port}`);
    }
  }

  if (!anyRunning) {
    console.log("\n⚠️  No services are currently running.");
    console.log("   Start them with: npm run start\n");
  } else {
    console.log("\n💡 To stop all services, press Ctrl+C in the terminal where they're running\n");
  }
}

async function clear() {
  console.log("🔌 Space Analyzer Pro - Port Clear");
  console.log("══════════════════════════════════════\n");

  for (const [key, info] of Object.entries(PORTS)) {
    const available = await checkPort(info.port);
    if (!available) {
      const proc = findProcessOnPort(info.port);
      if (proc) {
        console.log(`Attempting to free port ${info.port} (${info.name})...`);
        try {
          execSync(`taskkill /pid ${proc.pid} /f 2>nul`, { stdio: "pipe" });
          console.log(`   ✅ Process ${proc.name} (PID: ${proc.pid}) killed, port ${info.port} freed\n`);
        } catch {
          console.log(`   ❌ Could not kill process ${proc.name} (PID: ${proc.pid})\n`);
        }
      } else {
        console.log(`   ⚠️  Port ${info.port} is in use but process could not be identified\n`);
      }
    } else {
      console.log(`   ℹ️  Port ${info.port} is already available\n`);
    }
  }
}

async function update() {
  console.log("🔌 Space Analyzer Pro - Config Update");
  console.log("══════════════════════════════════════\n");
  console.log("Port configuration is managed via environment variables:");
  console.log("  PORT=8080        - Backend server port");
  console.log("  VITE_PORT=5173   - Frontend dev server port\n");
  console.log("To change ports, set the environment variable before running.");
  console.log("Example: PORT=3000 npm run server\n");
}

// Main CLI
const command = process.argv[2] || "detect";

switch (command) {
  case "detect":
    detect().catch(console.error);
    break;
  case "status":
    status().catch(console.error);
    break;
  case "clear":
    clear().catch(console.error);
    break;
  case "update":
    update().catch(console.error);
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log("Usage: node scripts/port-config.js [detect|status|clear|update]");
    process.exit(1);
}