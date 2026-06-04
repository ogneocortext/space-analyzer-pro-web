/**
 * Dynamic Server Manager for Testing
 * Automatically detects and manages server ports to avoid conflicts
 */

import { exec } from "child_process";
import { promisify } from "util";
import { Page } from "@playwright/test";

const execAsync = promisify(exec);

export interface ServerInfo {
  port: number;
  url: string;
  process: any;
  isRunning: boolean;
}

export class ServerManager {
  private static instance: ServerManager;
  private servers: Map<string, ServerInfo> = new Map();
  private portRange = {
    start: 5173,
    end: 8200,
  };

  static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  /**
   * Find an available port in the specified range
   */
  async findAvailablePort(startPort = this.portRange.start): Promise<number> {
    for (let port = startPort; port <= this.portRange.end; port++) {
      try {
        const { stdout } = await execAsync(`netstat -an | findstr :${port}`);
        if (!stdout.includes(`:${port}`)) {
          return port;
        }
      } catch {
        // Port is available
        return port;
      }
    }
    throw new Error(
      `No available ports found in range ${this.portRange.start}-${this.portRange.end}`,
    );
  }

  /**
   * Start the development server with dynamic port detection
   */
  async startDevelopmentServer(): Promise<ServerInfo> {
    const serverKey = "development";

    // Check if server is already running
    if (this.servers.has(serverKey)) {
      const existingServer = this.servers.get(serverKey)!;
      if (await this.isServerRunning(existingServer.port)) {
        return existingServer;
      }
    }

    console.log(
      "🚀 Starting development server with dynamic port detection...",
    );

    // Find available port
    const port = await this.findAvailablePort();
    console.log(`📡 Found available port: ${port}`);

    // Start server
    const serverProcess = exec(`npm run dev -- --port ${port}`, {
      cwd: process.cwd(),
      windowsHide: true,
    });

    const serverInfo: ServerInfo = {
      port,
      url: `http://localhost:${port}`,
      process: serverProcess,
      isRunning: false,
    };

    this.servers.set(serverKey, serverInfo);

    // Wait for server to be ready
    await this.waitForServer(port);
    serverInfo.isRunning = true;

    console.log(`✅ Development server started on port ${port}`);
    console.log(`🌐 URL: ${serverInfo.url}`);

    return serverInfo;
  }

  /**
   * Start the backend server with dynamic port detection
   */
  async startBackendServer(): Promise<ServerInfo> {
    const serverKey = "backend";

    // Check if server is already running
    if (this.servers.has(serverKey)) {
      const existingServer = this.servers.get(serverKey)!;
      if (await this.isServerRunning(existingServer.port)) {
        return existingServer;
      }
    }

    console.log("🔧 Starting backend server with dynamic port detection...");

    // Find available port (backend typically uses higher ports)
    const port = await this.findAvailablePort(8080);
    console.log(`📡 Found available backend port: ${port}`);

    // Start backend server
    const serverProcess = exec(`cd server && node server-improved.js`, {
      cwd: process.cwd(),
      windowsHide: true,
      env: {
        ...process.env,
        PORT: port.toString(),
      },
    });

    const serverInfo: ServerInfo = {
      port,
      url: `http://localhost:${port}`,
      process: serverProcess,
      isRunning: false,
    };

    this.servers.set(serverKey, serverInfo);

    // Wait for server to be ready
    await this.waitForServer(port, "/api/health");
    serverInfo.isRunning = true;

    console.log(`✅ Backend server started on port ${port}`);
    console.log(`🌐 URL: ${serverInfo.url}`);

    return serverInfo;
  }

  /**
   * Wait for server to be ready
   */
  private async waitForServer(
    port: number,
    path = "/",
    timeout = 45000,
  ): Promise<void> {
    const startTime = Date.now();
    const url = `http://localhost:${port}${path}`;

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          console.log(`✅ Server ready at ${url}`);
          return;
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Server failed to start within ${timeout}ms at ${url}`);
  }

  /**
   * Check if a server is running on a specific port
   */
  private async isServerRunning(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${port}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the development server URL
   */
  getDevelopmentServerUrl(): string {
    const server = this.servers.get("development");
    return server?.url || `http://localhost:5173`;
  }

  /**
   * Get the backend server URL
   */
  getBackendServerUrl(): string {
    const server = this.servers.get("backend");
    return server?.url || `http://localhost:8080`;
  }

  /**
   * Stop all servers
   */
  async stopAllServers(): Promise<void> {
    console.log("🛑 Stopping all servers...");

    for (const [key, server] of this.servers) {
      if (server.process) {
        server.process.kill();
        console.log(`✅ Stopped ${key} server`);
      }
    }

    this.servers.clear();
  }

  /**
   * Setup page to use dynamic server URLs
   */
  setupPageForTesting(page: Page): void {
    const devUrl = this.getDevelopmentServerUrl();
    const backendUrl = this.getBackendServerUrl();

    // Override page.goto to use dynamic URLs
    const originalGoto = page.goto.bind(page);
    page.goto = async (url: string, options?: any) => {
      if (url.startsWith("http://localhost:5173")) {
        url = url.replace("http://localhost:5173", devUrl);
      }
      if (url.startsWith("http://localhost:8080")) {
        url = url.replace("http://localhost:8080", backendUrl);
      }
      return originalGoto(url, options);
    };

    // Override page.request for dynamic URLs
    const originalRequest = page.request.bind(page);
    page.request = {
      get: async (url: string, options?: any) => {
        if (url.startsWith("http://localhost:5173")) {
          url = url.replace("http://localhost:5173", devUrl);
        }
        if (url.startsWith("http://localhost:8080")) {
          url = url.replace("http://localhost:8080", backendUrl);
        }
        return originalRequest.get(url, options);
      },
    } as any;
  }
}

/**
 * Test setup helper function
 */
export async function setupTestEnvironment(page: Page): Promise<{
  devServer: ServerInfo;
  backendServer: ServerInfo;
}> {
  const serverManager = ServerManager.getInstance();

  // Start servers if not already running
  const devServer = await serverManager.startDevelopmentServer();
  const backendServer = await serverManager.startBackendServer();

  // Setup page for dynamic URLs
  serverManager.setupPageForTesting(page);

  return {
    devServer,
    backendServer,
  };
}
