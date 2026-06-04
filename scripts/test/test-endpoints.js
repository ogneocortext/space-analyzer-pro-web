#!/usr/bin/env node

/**
 * Endpoint Test Script
 * Tests all available API endpoints to identify missing or broken ones
 */

import http from "http";

const BASE_URL = "http://localhost:8080";

// Test endpoints
const endpoints = [
  // Core endpoints
  { path: "/api/health", method: "GET", description: "Health check" },
  { path: "/api/info", method: "GET", description: "API info" },
  { path: "/api/status", method: "GET", description: "Status" },
  { path: "/api/version", method: "GET", description: "Version" },
  { path: "/api/debug/routes", method: "GET", description: "Debug routes" },

  // Analysis endpoints
  { path: "/api/analysis/start", method: "POST", description: "Start analysis" },
  { path: "/api/analysis/current", method: "GET", description: "Current analysis" },
  { path: "/api/analysis/cancel", method: "POST", description: "Cancel analysis" },
  { path: "/api/analysis/status/:id", method: "GET", description: "Analysis status" },
  { path: "/api/analysis/progress/:id", method: "GET", description: "Analysis progress" },
  {
    path: "/api/analysis/progress/stream/:id",
    method: "GET",
    description: "Analysis progress stream",
  },
  { path: "/api/analysis/health", method: "GET", description: "Analysis health" },
  { path: "/api/analysis/history", method: "GET", description: "Analysis history" },
  { path: "/api/analysis/history/test-id", method: "GET", description: "Analysis by ID" },

  // AI endpoints
  { path: "/api/ai/status", method: "GET", description: "AI status" },
  { path: "/api/ai/chat", method: "POST", description: "AI chat" },
  { path: "/api/ai/analyze", method: "POST", description: "AI analyze" },
  { path: "/api/ai/insights", method: "POST", description: "AI insights" },
  { path: "/api/ai/summarize", method: "POST", description: "AI summarize" },
  { path: "/api/ai/nl-query", method: "POST", description: "AI natural language query" },
  { path: "/api/ai/cleanup/analyze", method: "POST", description: "AI cleanup analyze" },

  // Files endpoints
  { path: "/api/files/list", method: "GET", description: "Files list" },
  { path: "/api/files/delete", method: "POST", description: "Files delete" },
  { path: "/api/files/rename", method: "POST", description: "Files rename" },
  { path: "/api/files/reveal", method: "POST", description: "Files reveal" },
  { path: "/api/files/open-explorer", method: "POST", description: "Open explorer" },
  { path: "/api/files/search", method: "POST", description: "Files search" },
  { path: "/api/files/browse", method: "POST", description: "Files browse" },

  // System endpoints
  { path: "/api/system/info", method: "GET", description: "System info" },
  { path: "/api/system/metrics", method: "GET", description: "System metrics" },

  // Settings endpoints
  { path: "/api/settings", method: "GET", description: "Get settings" },
  { path: "/api/settings", method: "POST", description: "Update settings" },

  // Reports endpoints
  { path: "/api/reports/generate", method: "POST", description: "Generate report" },
  { path: "/api/reports/list", method: "GET", description: "List reports" },

  // Exports endpoints
  { path: "/api/exports/csv", method: "POST", description: "Export CSV" },
  { path: "/api/exports/json", method: "POST", description: "Export JSON" },
  { path: "/api/exports/pdf", method: "POST", description: "Export PDF" },

  // Errors endpoints
  { path: "/api/errors/health", method: "GET", description: "Errors health" },
  { path: "/api/errors/report", method: "POST", description: "Report error" },
  { path: "/api/errors/recent", method: "GET", description: "Recent errors" },
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${endpoint.path}`;
    const options = {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 5000,
    };

    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          endpoint: endpoint.path,
          method: endpoint.method,
          description: endpoint.description,
          status: res.statusCode,
          success: res.statusCode < 400,
          response: data.length > 200 ? data.substring(0, 200) + "..." : data,
        });
      });
    });

    req.on("error", (error) => {
      resolve({
        endpoint: endpoint.path,
        method: endpoint.method,
        description: endpoint.description,
        status: "ERROR",
        success: false,
        error: error.message,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        endpoint: endpoint.path,
        method: endpoint.method,
        description: endpoint.description,
        status: "TIMEOUT",
        success: false,
        error: "Request timeout",
      });
    });

    // Send request body for POST requests
    if (endpoint.method === "POST") {
      req.write(JSON.stringify({ test: true }));
    }

    req.end();
  });
}

async function testAllEndpoints() {
  console.log("🧪 Testing API Endpoints\n");
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.method} ${endpoint.path}...`);
    const result = await testEndpoint(endpoint);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${result.status} - ${result.description}`);
    } else {
      console.log(`❌ ${result.status} - ${result.description}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  console.log("\n📊 Test Results Summary:");
  console.log("========================");

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`Total endpoints tested: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log("\n❌ Failed Endpoints:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  ${r.method} ${r.endpoint} - ${r.description}`);
        if (r.error) {
          console.log(`    Error: ${r.error}`);
        }
      });
  }

  return results;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllEndpoints()
    .then(() => {
      console.log("\n🏁 Endpoint testing completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test script error:", error);
      process.exit(1);
    });
}

export { testAllEndpoints, testEndpoint, endpoints };
