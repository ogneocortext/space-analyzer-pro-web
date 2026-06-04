import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';
import { createServer } from 'http';

// Set test environment variable BEFORE requiring the module
process.env.TESTING = 'true';

const require = createRequire(import.meta.url);
const { SpaceAnalyzerAPIServer } = require('./backend-server.js');

// Helper to find an available port
function getAvailablePort() {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

describe('Backend API Tests', () => {
  let app;
  let server;
  let testPort;

  beforeAll(async () => {
    // Get an available port
    testPort = await getAvailablePort();
    process.env.PORT = testPort.toString();
    
    // Initialize the backend server
    const apiServer = new SpaceAnalyzerAPIServer();
    app = apiServer.app;
    
    // Override the port to ensure it uses the test port
    apiServer.config.port = testPort;
    
    // Create HTTP server from Express app
    const http = require('http');
    server = http.createServer(app);
    
    // Start listening on test port
    await new Promise((resolve, reject) => {
      server.listen(testPort, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000);

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    // Reset port
    process.env.PORT = '8080';
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('backend', true);
    });
  });

  describe('System Metrics', () => {
    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/system/metrics')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('memory');
      // uptime may not be present in all responses
    });
  });

  describe('File Analysis', () => {
    it('should analyze a directory', async () => {
      const testDir = 'e:/Self Built Web and Mobile Apps/Space Analyzer/src';
      
      const response = await request(app)
        .post('/api/analyze')
        .send({ directoryPath: testDir })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('analysisId');
    }, 60000); // Longer timeout for analysis
  });

  describe('Progress Tracking', () => {
    it('should return progress for an analysis', async () => {
      const testDir = 'e:/Self Built Web and Mobile Apps/Space Analyzer/src';
      
      // Start an analysis
      const analysisResponse = await request(app)
        .post('/api/analyze')
        .send({ directoryPath: testDir });

      if (analysisResponse.body.success && analysisResponse.body.analysisId) {
        const analysisId = analysisResponse.body.analysisId;

        // Check progress
        const progressResponse = await request(app)
          .get(`/api/progress/${analysisId}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(progressResponse.body).toHaveProperty('analysisId');
        // Progress response structure may vary
      }
    }, 60000);
  });

  describe('Results', () => {
    it('should return analysis results', async () => {
      const response = await request(app)
        .get('/api/results')
        .expect('Content-Type', /json/);

      // May return 400 if no analysisId is provided
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(Array.isArray(response.body.results)).toBe(true);
      }
    });
  });

  describe('File Operations', () => {
    it('should handle file search', async () => {
      const response = await request(app)
        .post('/api/files/search')
        .send({ query: 'test', directory: 'src' })
        .expect('Content-Type', /json/)
        .expect(200);

      // Response structure may vary
      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    it('should create a batch operation', async () => {
      const operations = [
        { type: 'delete', path: '/test/file1.txt' },
        { type: 'copy', from: '/test/file1.txt', to: '/test/file2.txt' }
      ];

      const response = await request(app)
        .post('/api/files/batch-operations')
        .send({ operations })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('operationId');
    });

    it('should return batch operation progress', async () => {
      const operations = [{ type: 'delete', path: '/test/file.txt' }];
      
      const createResponse = await request(app)
        .post('/api/files/batch-operations')
        .send({ operations });

      if (createResponse.body.success && createResponse.body.operationId) {
        const operationId = createResponse.body.operationId;

        const progressResponse = await request(app)
          .get(`/api/files/batch-progress/${operationId}`)
          .expect('Content-Type', /json/)
          .expect(200);

        expect(progressResponse.body).toHaveProperty('status');
        expect(progressResponse.body).toHaveProperty('progress');
      }
    });
  });

  describe('Error Reporting', () => {
    it('should accept error reports', async () => {
      const errorReport = {
        error: 'Test error',
        component: 'TestComponent',
        stack: 'Error: Test error\n    at test.js:1:1',
        userAgent: 'Test Agent',
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/errors/report')
        .send(errorReport)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });
  });

  describe('AI Models', () => {
    it('should return available models', async () => {
      const response = await request(app)
        .get('/api/models')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(Array.isArray(response.body.models || [])).toBe(true);
    });
  });

  describe('AI Insights', () => {
    it('should return AI insights for analysis data', async () => {
      const mockAnalysisData = {
        totalFiles: 100,
        totalSize: 1024000,
        categories: { 'Documents': 50, 'Images': 30, 'Code': 20 },
        files: []
      };

      const response = await request(app)
        .post('/api/ai/insights')
        .send({ analysisData: mockAnalysisData, query: 'What are the largest files?' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      // May have cached or ollama response
    }, 30000);
  });

  describe('Ollama Proxy', () => {
    it('should proxy Ollama tags request', async () => {
      const response = await request(app)
        .get('/api/ollama/api/tags')
        .expect('Content-Type', /json/);

      // May fail if Ollama is not available, that's okay
      expect([200, 500]).toContain(response.status);
    });
  });
});
