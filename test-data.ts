/**
 * Test Data Fixtures
 * Provides realistic test data for various scenarios
 */

export const TestDataFixtures = {
  // File system data for testing
  fileSystem: {
    smallDirectory: {
      path: '/test/small-project',
      files: [
        { name: 'index.js', size: 1024, type: 'javascript' },
        { name: 'README.md', size: 512, type: 'markdown' },
        { name: 'package.json', size: 256, type: 'json' }
      ],
      totalSize: 1792,
      fileCount: 3
    },
    mediumDirectory: {
      path: '/test/medium-project',
      files: [
        { name: 'src/index.js', size: 2048, type: 'javascript' },
        { name: 'src/utils.js', size: 1536, type: 'javascript' },
        { name: 'src/components/Header.vue', size: 3072, type: 'vue' },
        { name: 'src/styles/main.css', size: 4096, type: 'css' },
        { name: 'package.json', size: 512, type: 'json' },
        { name: 'README.md', size: 1024, type: 'markdown' },
        { name: 'dist/bundle.js', size: 8192, type: 'javascript' },
        { name: 'node_modules/lodash/index.js', size: 16384, type: 'javascript' }
      ],
      totalSize: 36864,
      fileCount: 8
    },
    largeDirectory: {
      path: '/test/large-project',
      files: [
        { name: 'src/app.js', size: 5120, type: 'javascript' },
        { name: 'src/router.js', size: 2560, type: 'javascript' },
        { name: 'src/store.js', size: 3072, type: 'javascript' },
        { name: 'src/components/Dashboard.vue', size: 6144, type: 'vue' },
        { name: 'src/components/Chart.vue', size: 4096, type: 'vue' },
        { name: 'src/components/Table.vue', size: 5120, type: 'vue' },
        { name: 'src/styles/theme.css', size: 8192, type: 'css' },
        { name: 'src/styles/components.css', size: 4096, type: 'css' },
        { name: 'assets/logo.png', size: 32768, type: 'image' },
        { name: 'assets/background.jpg', size: 65536, type: 'image' },
        { name: 'docs/api.md', size: 2048, type: 'markdown' },
        { name: 'docs/guide.md', size: 1536, type: 'markdown' },
        { name: 'tests/unit/app.test.js', size: 1024, type: 'javascript' },
        { name: 'tests/e2e/cypress.spec.js', size: 2048, type: 'javascript' },
        { name: 'build/output.js', size: 16384, type: 'javascript' },
        { name: 'node_modules/vue/dist/vue.js', size: 32768, type: 'javascript' },
        { name: 'node_modules/vuex/dist/vuex.js', size: 16384, type: 'javascript' }
      ],
      totalSize: 194560,
      fileCount: 16
    }
  },

  // API response data
  apiResponses: {
    healthCheck: {
      success: true,
      status: 'healthy',
      timestamp: '2026-05-09T12:31:36.437096436',
      uptime: 202825.5,
      memory: {
        total: 34121437184,
        free: 13432115200,
        used: 20689330176
      },
      database: 'connected',
      version: '2.8.9',
      service: 'Space Analyzer Backend'
    },
    analysisResult: {
      id: 'test-analysis-123',
      directoryPath: '/test/project',
      totalFiles: 15,
      totalSize: 194560,
      categories: {
        'javascript': { count: 8, size: 98304 },
        'vue': { count: 3, size: 15360 },
        'css': { count: 2, size: 12288 },
        'image': { count: 2, size: 98304 },
        'markdown': { count: 2, size: 3584 },
        'test': { count: 2, size: 3072 }
      },
      largestFiles: [
        { name: 'assets/background.jpg', size: 65536 },
        { name: 'assets/logo.png', size: 32768 },
        { name: 'node_modules/vue/dist/vue.js', size: 32768 }
      ],
      timestamp: '2026-05-09T12:31:36.437096436'
    },
    aiModels: [
      {
        id: 'qwen3.5:4b',
        name: 'Qwen 3.5 4B',
        size: '4.7GB',
        modified: '2026-05-09T10:00:00Z'
      },
      {
        id: 'deepseek-coder:6.7b-instruct',
        name: 'DeepSeek Coder 6.7B Instruct',
        size: '7.8GB',
        modified: '2026-05-09T10:00:00Z'
      },
      {
        id: 'gemma4:e2b',
        name: 'Gemma 4 E2B',
        size: '2.4GB',
        modified: '2026-05-09T10:00:00Z'
      }
    ]
  },

  // User interface test data
  uiElements: {
    selectors: {
      mainContent: ['main', '.main-content', '#app', '.container'],
      navigation: ['nav', '.navbar', '.navigation', '[role="navigation"]'],
      inputFields: [
        'input[type="text"]',
        'input[placeholder*="directory"]',
        '[data-testid*="input"]',
        '.directory-input'
      ],
      buttons: [
        'button',
        '[role="button"]',
        '.btn',
        '[data-testid*="button"]'
      ],
      tables: ['table', '.data-table', '[role="table"]'],
      charts: ['canvas', '.chart', '[data-testid*="chart"]']
    },
    expectedTexts: {
      pageTitle: /space analyzer/i,
      mainHeading: /space analyzer|dashboard|overview/i,
      analyzeButton: /analyze|scan|start/i,
      loadingText: /loading|analyzing|scanning/i,
      resultsText: /results|analysis|complete/i
    }
  },

  // Performance test data
  performance: {
    timeouts: {
      short: 1000,
      medium: 5000,
      long: 15000,
      extended: 60000
    },
    thresholds: {
      pageLoad: 3000,
      apiResponse: 2000,
      elementVisible: 1000,
      interaction: 500
    }
  },

  // Error scenarios
  errorScenarios: {
    networkError: {
      message: 'net::ERR_CONNECTION_REFUSED',
      type: 'network'
    },
    timeoutError: {
      message: 'Timeout 15000ms exceeded',
      type: 'timeout'
    },
    notFoundError: {
      message: '404',
      type: 'http'
    },
    serverError: {
      message: '500',
      type: 'server'
    }
  }
};

export default TestDataFixtures;
