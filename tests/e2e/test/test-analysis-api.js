#!/usr/bin/env node

/**
 * Test script for Code Quality Analysis API
 * Tests all Phase 1-3 endpoints
 */

const BASE_URL = "http://localhost:8080/api";

// Security: Validate URL
function validateUrl(url) {
  try {
    new URL(url);
    return url.startsWith("http://localhost:") || url.startsWith("http://127.0.0.1:");
  } catch {
    return false;
  }
}

if (!validateUrl(BASE_URL)) {
  console.error("❌ Security: Invalid BASE_URL");
  process.exit(1);
}

async function testEndpoint(name, method, path, body = null) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   ${method} ${path}`);

  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`   ✅ Success: ${data.message || "OK"}`);
      return { success: true, data };
    } else {
      console.log(`   ❌ Failed: ${data.error || response.statusText}`);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("Code Quality Analysis API Tests");
  console.log("=".repeat(60));

  const results = {
    passed: 0,
    failed: 0,
  };

  // Test 1: Tools Status
  const toolsTest = await testEndpoint("Tools Status", "GET", "/analysis/tools-status");
  if (toolsTest.success) {
    results.passed++;
    console.log(`   ESLint available: ${toolsTest.data.tools.eslint ? "Yes" : "No"}`);
  } else {
    results.failed++;
  }

  // Test 2: Install Commands
  const installTest = await testEndpoint("Install Commands", "POST", "/analysis/install-tools");
  if (installTest.success) {
    results.passed++;
    console.log(`   Commands available: ${installTest.data.commands?.length || 0}`);
  } else {
    results.failed++;
  }

  // Test 3: Code Quality Analysis (may fail if ESLint not installed)
  const testPath = process.cwd();
  const analysisTest = await testEndpoint(
    "Code Quality Analysis",
    "POST",
    "/analysis/code-quality",
    { projectPath: testPath }
  );
  if (analysisTest.success) {
    results.passed++;
    console.log(`   Tools used: ${analysisTest.data.toolsUsed?.join(", ") || "None"}`);
    console.log(`   Score: ${analysisTest.data.summary?.score || "N/A"}`);
    console.log(`   Issues: ${analysisTest.data.summary?.totalIssues || 0}`);
    console.log(`   Duration: ${analysisTest.data.duration}ms`);
  } else {
    results.failed++;
    console.log(`   Note: This is expected if ESLint is not installed`);
  }

  // Test 4: Single File Analysis
  const fileTest = await testEndpoint(
    "Single File Analysis",
    "GET",
    `/analysis/file?path=${encodeURIComponent(__filename)}`
  );
  if (fileTest.success) {
    results.passed++;
    console.log(`   Has ESLint data: ${fileTest.data.eslint ? "Yes" : "No"}`);
  } else {
    results.failed++;
  }

  // Test 5: Store Patterns (for ML training)
  const patternsTest = await testEndpoint("Store Patterns", "POST", "/learning/patterns", {
    patterns: [
      {
        id: "test-pattern-1",
        type: "code-smell",
        name: "no-unused-vars",
        description: "Variable is declared but never used",
        frequency: 5,
        files: ["/test/file.js"],
        confidence: 0.85,
        severity: "medium",
      },
    ],
  });
  if (patternsTest.success) {
    results.passed++;
    console.log(`   Patterns stored: ${patternsTest.data.patterns?.length || 0}`);
  } else {
    results.failed++;
  }

  // Test 6: Get Patterns
  const getPatternsTest = await testEndpoint("Get Patterns", "GET", "/learning/patterns?limit=10");
  if (getPatternsTest.success) {
    results.passed++;
    console.log(`   Patterns retrieved: ${getPatternsTest.data.count || 0}`);
  } else {
    results.failed++;
  }

  // Test 7: Learning Stats
  const statsTest = await testEndpoint("Learning Stats", "GET", "/learning/stats");
  if (statsTest.success) {
    results.passed++;
    console.log(`   Total analyses: ${statsTest.data.totalAnalyses || 0}`);
    console.log(`   Model accuracy: ${statsTest.data.modelAccuracy || "N/A"}`);
  } else {
    results.failed++;
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(
    `📊 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`
  );

  if (results.failed > 0) {
    console.log("\n⚠️ Some tests failed. This may be expected if:");
    console.log("   - ESLint is not installed");
    console.log("   - Server is not running on port 8080");
    console.log("   - No analysis results exist yet");
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
    process.exit(0);
  }
}

runTests();
