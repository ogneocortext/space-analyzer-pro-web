#!/usr/bin/env node

/**
 * Space Analyzer Pro - Status Check
 * Checks which services are running and their status
 */

import http from "http";

const BACKEND_URL = "http://localhost:8080";
const FRONTEND_URL = "http://localhost:5173";

function checkUrl(url, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ name, status: "✅ Running", url, details: json });
        } catch {
          resolve({ name, status: "⚠️  Responding (not JSON)", url, details: data.substring(0, 100) });
        }
      });
    });
    req.on("error", () => {
      resolve({ name, status: "❌ Not running", url, details: null });
    });
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ name, status: "❌ Timeout", url, details: null });
    });
  });
}

async function checkAll() {
  console.log("🔍 Space Analyzer Pro - Service Status Check");
  console.log("═══════════════════════════════════════════════\n");

  const results = await Promise.all([
    checkUrl(`${BACKEND_URL}/api/health`, "Backend API"),
    checkUrl(FRONTEND_URL, "Frontend Dev Server"),
  ]);

  for (const result of results) {
    console.log(`${result.status} ${result.name}`);
    console.log(`   URL: ${result.url}`);
    if (result.details && result.details.status) {
      console.log(`   Version: ${result.details.version || "unknown"}`);
      console.log(`   Status: ${result.details.status}`);
      console.log(`   Uptime: ${Math.round(result.details.uptime || 0)}s`);
    }
    console.log("");
  }

  const running = results.filter((r) => r.status.includes("✅")).length;
  const total = results.length;
  console.log(`📊 ${running}/${total} services running\n`);
}

checkAll().catch(console.error);