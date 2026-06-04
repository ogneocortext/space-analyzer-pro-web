/**
 * PATH Environment Variable Diagnostic Tool
 * 
 * Run this script with: node scripts/diagnose-path.cjs
 */

const fs = require("fs");

console.log("=".repeat(70));
console.log("🔍 SYSTEM PATH DIAGNOSTIC TOOL");
console.log("=".repeat(70));
console.log();

// 1. Current PATH
console.log("📋 CURRENT PATH ENTRIES:");
console.log("-".repeat(50));
const pathEntries = (process.env.PATH || "").split(";").filter(Boolean);
pathEntries.forEach((entry, i) => {
  console.log(`  ${i + 1}. ${entry}`);
});
console.log(`\n  Total entries: ${pathEntries.length}`);
console.log();

// 2. Critical directories that MUST exist in PATH
console.log("🔴 CHECKING CRITICAL DIRECTORIES:");
console.log("-".repeat(50));

const criticalDirs = [
  { path: "C:\\Windows\\System32", purpose: "Core Windows executables (cmd.exe, powershell.exe)" },
  { path: "C:\\Windows", purpose: "Windows system files" },
  { path: "C:\\Windows\\System32\\Wbem", purpose: "WMI management tools" },
  { path: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\", purpose: "PowerShell" },
  { path: "C:\\Program Files\\nodejs", purpose: "Node.js runtime" },
];

const missingCritical = [];

for (const dir of criticalDirs) {
  const existsInPath = pathEntries.some(
    (entry) => entry.toLowerCase().replace(/\\+$/, "") === dir.path.toLowerCase().replace(/\\+$/, "")
  );
  const existsOnDisk = fs.existsSync(dir.path);

  if (!existsInPath) {
    missingCritical.push(dir);
    console.log(`  ❌ NOT IN PATH: ${dir.path}`);
    console.log(`     Purpose: ${dir.purpose}`);
    if (existsOnDisk) {
      console.log(`     ✅ Does exist on disk though`);
    } else {
      console.log(`     ❌ Does NOT exist on disk either!`);
    }
  } else {
    console.log(`  ✅ ${dir.path}`);
  }
  console.log();
}

// 3. Check for specific executable files
console.log("🔴 CHECKING CRITICAL EXECUTABLES:");
console.log("-".repeat(50));
console.log("  (Checking if they actually exist on disk)");
console.log();

const criticalExes = [
  { name: "cmd.exe", paths: ["C:\\Windows\\System32\\cmd.exe", "C:\\Windows\\sysnative\\cmd.exe"] },
  { name: "powershell.exe", paths: ["C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"] },
  { name: "node.exe", paths: ["C:\\Program Files\\nodejs\\node.exe", "C:\\Program Files (x86)\\nodejs\\node.exe"] },
];

for (const exe of criticalExes) {
  let found = false;
  for (const p of exe.paths) {
    if (fs.existsSync(p)) {
      console.log(`  ✅ ${exe.name} found at: ${p}`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.log(`  ❌ ${exe.name} NOT FOUND on disk!`);
    // Search for node on other drives
    if (exe.name === "node.exe") {
      for (const driveLetter of "DEFGH".split("")) {
        const searchPath = `${driveLetter}:\\Program Files\\nodejs\\node.exe`;
        if (fs.existsSync(searchPath)) {
          console.log(`     Found at: ${searchPath}`);
          found = true;
          break;
        }
      }
    }
    if (!found) {
      console.log(`     ${exe.name} could not be found anywhere on disk`);
    }
  }
}
console.log();

// 4. Check if System32 is in the path
console.log("🔴 SYSTEM PATH ANALYSIS:");
console.log("-".repeat(50));

const hasSystem32 = pathEntries.some((e) =>
  e.toLowerCase().includes("system32")
);
if (!hasSystem32) {
  console.log("  ❌ C:\\Windows\\System32 is COMPLETELY MISSING from PATH");
  console.log("     This is the ROOT CAUSE of 'cmd.exe not recognized' errors");
  console.log("     Fix: setx PATH \"C:\\Windows\\System32;%PATH%\" /M  (run as admin)");
} else {
  const exactSystem32 = pathEntries.find((e) =>
    e.toLowerCase().replace(/\\+$/, "") === "c:\\windows\\system32"
  );
  if (exactSystem32) {
    console.log(`  ✅ C:\\Windows\\System32 is in PATH at position ${pathEntries.indexOf(exactSystem32) + 1}`);
  } else {
    console.log("  ⚠️  Some System32-like path is in PATH but not the exact C:\\Windows\\System32");
    pathEntries.filter((e) => e.toLowerCase().includes("system32")).forEach((e) => {
      console.log(`     Found: ${e}`);
    });
  }
}
console.log();

// 5. Check for duplicate entries
console.log("🔴 DUPLICATE PATH ENTRIES:");
console.log("-".repeat(50));
const lowerEntries = pathEntries.map((e) => e.toLowerCase().replace(/\\+$/, ""));
const seen = new Map();
for (const entry of lowerEntries) {
  seen.set(entry, (seen.get(entry) || 0) + 1);
}
let hasDuplicates = false;
for (const [entry, count] of seen) {
  if (count > 1) {
    console.log(`  ⚠️  Duplicate (${count}x): ${entry}`);
    hasDuplicates = true;
  }
}
if (!hasDuplicates) {
  console.log("  ✅ No duplicate entries found");
}
console.log();

// 6. Check NODE_PATH
console.log("🔴 NODE.JS-SPECIFIC CHECKS:");
console.log("-".repeat(50));
console.log(`  Node version : ${process.version}`);
console.log(`  Node path    : ${process.execPath}`);
console.log(`  NODE_PATH    : ${process.env.NODE_PATH || "(not set)"}`);
console.log(`  Platform     : ${process.platform}`);
console.log(`  Arch         : ${process.arch}`);
console.log();

// 7. Summary and fix
console.log("=".repeat(70));
console.log("📋 SUMMARY");
console.log("=".repeat(70));
console.log();

if (missingCritical.length === 0) {
  console.log("✅ All critical directories are in your PATH.");
  console.log("   If commands still fail, the issue may be:");
  console.log("   - PATH corruption with non-ASCII characters");
  console.log("   - A GPO (Group Policy) restricting executables");
  console.log("   - Antivirus blocking command execution");
} else {
  console.log(`❌ ${missingCritical.length} critical director${missingCritical.length > 1 ? "ies are" : "y is"} missing from PATH:\n`);
  for (const dir of missingCritical) {
    console.log(`   - ${dir.path}`);
    console.log(`     ${dir.purpose}`);
  }
  console.log();
  console.log("🔧 RECOMMENDED FIXES (run PowerShell as Administrator):");
  console.log();
  console.log("  Option A - Automated:");
  console.log('    setx PATH "C:\\Windows\\System32;C:\\Windows;%PATH%" /M');
  console.log("    Then restart VS Code");
  console.log();
  console.log("  Option B - Manual via System Properties:");
  console.log("    1. Press Win + R, type 'sysdm.cpl'");
  console.log("    2. Go to Advanced → Environment Variables");
  console.log("    3. Under 'System variables', edit 'Path'");
  console.log("    4. Add: C:\\Windows\\System32");
  console.log("    5. Add: C:\\Windows");
  console.log("    6. Click OK");
  console.log("    7. Restart VS Code");
}

console.log();
console.log("=".repeat(70));
console.log("✅ Diagnostic complete");
console.log("=".repeat(70));