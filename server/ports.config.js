/**
 * Centralized Port Configuration
 *
 * This file defines all port numbers used across the project to prevent
 * port conflicts and ensure consistency between development, testing, and
 * production environments.
 *
 * IMPORTANT: Keep this in sync with .env and .env.example files!
 *
 * Port Ranges:
 * - 5173: Vite development server (default)
 * - 4173: Vite preview server (production build)
 * - 8080: Backend API server (Express)
 * - 5000: Python AI service
 * - 11434: Ollama AI service (default)
 * - 5432: PostgreSQL (default)
 * - 6379: Redis (default)
 */

const ports = {
  // Frontend Development
  // IMPORTANT: Must match VITE_DEV_PORT in .env and .env.example
  VITE_DEV_PORT: 5173, // Vite development server (default Vite port)
  VITE_PREVIEW_PORT: 4173, // Vite preview server (production build)

  // Backend API
  // IMPORTANT: Must match PORT in .env and .env.example
  API_SERVER_PORT: 8080, // Express backend server
  PYTHON_AI_PORT: 5000, // Python AI service (commonly used port)

  // AI/ML Services
  OLLAMA_PORT: 11434, // Ollama AI service

  // External Services (defaults)
  POSTGRES_PORT: 5432, // PostgreSQL database
  REDIS_PORT: 6379, // Redis cache

  // Testing
  // IMPORTANT: Must match VITE_DEV_PORT
  PLAYWRIGHT_BASE_URL: `http://localhost:5173`,

  // Production
  PRODUCTION_HTTP_PORT: 80, // HTTP
  PRODUCTION_HTTPS_PORT: 443, // HTTPS

  // Utility function to get port by name
  getPort(name) {
    return this[name];
  },

  // Validate no port conflicts
  validate() {
    const portNumbers = Object.values(this).filter((v) => typeof v === "number");
    const uniquePorts = new Set(portNumbers);
    if (portNumbers.length !== uniquePorts.size) {
      throw new Error("Port conflict detected: Duplicate port numbers in configuration");
    }
    return true;
  },
};

// Validate on load
try {
  ports.validate();
} catch (error) {
  console.error("Port configuration error:", error.message);
}

export default ports;
