/**
 * Allure Configuration for Test Reporting
 * Configures Allure test reporting with custom settings
 */

module.exports = {
  // Output directory for Allure results
  resultsDir: "allure-results",
  
  // Report directory for Allure HTML reports
  reportDir: "allure-report",
  
  // Clean results directory before running tests
  cleanResultsDir: true,
  
  // Custom configuration
  allureCli: {
    // Generate HTML report after tests
    generateReport: true,
    
    // Open report in browser after generation
    openReport: false,
    
    // Custom report title
    reportTitle: "Space Analyzer Test Report",
    
    // Custom report logo
    reportLogo: "public/logo.png",
  },
  
  // Test categories
  categories: [
    {
      name: "Ignored tests",
      matchedStatuses: ["skipped"],
      messageRegex: ".*ignore.*",
    },
    {
      name: "Infrastructure problems",
      matchedStatuses: ["broken", "failed"],
      messageRegex: ".*timeout.*|.*network.*|.*connection.*",
    },
    {
      name: "Outdated tests",
      matchedStatuses: ["broken", "failed"],
      traceRegex: ".*FileNotFound.*|.*NoSuchElement.*",
    },
    {
      name: "Product defects",
      matchedStatuses: ["broken", "failed"],
      messageRegex: ".*assertion.*|.*expect.*",
    },
  ],
  
  // Environment information
  environmentInfo: {
    "Framework": "Vue 3",
    "Testing Library": "Playwright",
    "Node Version": process.version,
    "Platform": process.platform,
    "Architecture": process.arch,
  },
  
  // Custom metadata
  metadata: {
    "Project": "Space Analyzer Pro",
    "Version": "2.8.9",
    "Environment": process.env.NODE_ENV || "test",
    "Browser": "Chromium",
    "Test Type": "E2E",
  },
};