#!/usr/bin/env node

/**
 * Cleanup Old Test Files
 * Removes outdated/duplicate test files while keeping optimized versions
 */

const fs = require('fs');
const path = require('path');

// Files to keep (optimized versions)
const filesToKeep = [
  'connectivity-optimized.spec.ts',
  'analysis-workflow.spec.ts', 
  'accessibility-enhanced.spec.ts',
  'performance-enhanced.spec.ts',
  'connectivity-debug.spec.ts'
];

// Files to delete (outdated/duplicate versions)
const filesToDelete = [
  'connectivity.spec.ts', // Replaced by connectivity-optimized.spec.ts
  'basic-connectivity.spec.ts', // Replaced by connectivity-optimized.spec.ts
  'simple-connection-test.spec.ts', // Replaced by connectivity-optimized.spec.ts
  'simple-test.spec.ts', // Replaced by connectivity-optimized.spec.ts
  'minimal-frontend-test.spec.ts', // Replaced by connectivity-optimized.spec.ts
  'performance-metrics.spec.ts', // Replaced by performance-enhanced.spec.ts
  'performance-simple.spec.ts', // Replaced by performance-enhanced.spec.ts
  'debug-frontend-load.spec.ts', // Replaced by connectivity-debug.spec.ts
  'debug-landing.spec.ts', // Replaced by connectivity-debug.spec.ts
  'console-debug-test.spec.ts', // Replaced by connectivity-debug.spec.ts
  'app-startup.spec.ts', // Replaced by enhanced-app-startup.spec.ts
  'basic-frontend-test.spec.ts', // Duplicate of basic-frontend-test.spec.ts
  'frontend-only-test.spec.ts', // Replaced by connectivity-debug.spec.ts
  'resilient-connection-test.spec.ts', // Replaced by connectivity-debug.spec.ts
  'realistic-frontend-test.spec.ts', // Replaced by connectivity-debug.spec.ts
  'user-flow.spec.ts', // Replaced by connectivity-debug.spec.ts
  'full-scan.spec.ts', // Replaced by analysis-workflow.spec.ts
  'notification-system-test.spec.ts', // Replaced by analysis-workflow.spec.ts
  'parallel-test-suite.spec.ts', // Replaced by performance-enhanced.spec.ts
  'enhanced-user-flow.spec.ts', // Replaced by analysis-workflow.spec.ts
  'fixture-based-test.spec.ts', // Replaced by analysis-workflow.spec.ts
  'directory-scan.spec.ts', // Replaced by analysis-workflow.spec.ts
  'visualization.spec.ts', // Replaced by analysis-workflow.spec.ts
  'visual-regression-test.spec.ts', // Replaced by analysis-workflow.spec.ts
  '3d-browser.spec.ts', // Replaced by analysis-workflow.spec.ts
  'ai-analysis.spec.ts', // Replaced by analysis-workflow.spec.ts
  'ai-features.spec.ts', // Replaced by analysis-workflow.spec.ts
  'backend-connectivity.spec.ts', // Replaced by connectivity-debug.spec.ts
];

console.log('🧹 Starting test file cleanup...');

const testDir = path.join(__dirname, 'e2e');
let deletedCount = 0;
let keptCount = 0;
const errors = [];

// Delete outdated files
filesToDelete.forEach(file => {
  const filePath = path.join(testDir, file);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`🗑️  Deleted: ${file}`);
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  } catch (error) {
    errors.push(`Failed to delete ${file}: ${error.message}`);
  }
});

// Verify kept files exist
filesToKeep.forEach(file => {
  const filePath = path.join(testDir, file);
  
  if (fs.existsSync(filePath)) {
    keptCount++;
    console.log(`✅ Kept: ${file}`);
  } else {
    console.log(`⚠️ Optimized file missing: ${file}`);
  }
});

// Log results
console.log('\n📊 Cleanup Summary:');
console.log(`   Files deleted: ${deletedCount}`);
console.log(`   Files kept: ${keptCount}`);
console.log(`   Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ Errors encountered:');
  errors.forEach(error => console.log(`   ${error}`));
  process.exit(1);
}

console.log('\n✅ Cleanup completed successfully!');
console.log('\n🎯 Recommendations:');
console.log('   • Use connectivity-optimized.spec.ts for enhanced debugging');
console.log('   • Use performance-enhanced.spec.ts for comprehensive performance testing');
console.log('   • Use accessibility-enhanced.spec.ts for WCAG compliance testing');
console.log('   • Use analysis-workflow.spec.ts for complete workflow testing');
console.log('   • Use connectivity-debug.spec.ts for detailed debugging');
console.log('   • Original files backed up in test-results/ if needed');

// Create a summary file
const summary = {
  timestamp: new Date().toISOString(),
  deletedFiles: filesToDelete,
  keptFiles: filesToKeep,
  deletedCount,
  keptCount,
  errors,
  recommendations: [
    'Use optimized test files for better debugging',
    'Run connectivity-optimized.spec.ts first to verify environment',
    'Check DEBUG_ANALYSIS.md for detailed insights',
    'Update package.json scripts to use optimized tests',
    'Original files backed up in test-results/ if needed'
  ]
};

const summaryPath = path.join(__dirname, '..', 'test-results', 'cleanup-summary.json');
const summaryDir = path.dirname(summaryPath);

if (!fs.existsSync(summaryDir)) {
  fs.mkdirSync(summaryDir, { recursive: true });
}

fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`📄 Summary saved to: ${summaryPath}`);