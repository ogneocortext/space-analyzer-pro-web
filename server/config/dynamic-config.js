/**
 * Dynamic Configuration
 * Runtime configuration values used across the server
 */

module.exports = {
  // Worker pool configuration
  workerCount: 4,
  workerMemoryMB: 512,
  taskTimeout: 30000,
  circuitBreakerThreshold: 5,

  // AI configuration
  aiModel: "gemma3:latest",
  maxConcurrentAIRequests: 3,
  ollamaBatchSize: 512,
  ollamaContextSize: 2048,

  // Cache configuration
  cacheExpiry: 3600000, // 1 hour in ms
  cacheSize: 100 * 1024 * 1024, // 100MB

  // Server configuration
  enableCompression: true,
  bodyParserLimit: "50mb",
};