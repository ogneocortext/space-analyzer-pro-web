/**
 * Database Connection Pool
 * Provides efficient connection management with pooling, health monitoring, and automatic cleanup
 */

const sqlite3 = require("sqlite3").verbose();
const logger = require("../utils/logger");

class DatabaseConnectionPool {
  constructor(options = {}) {
    this.options = {
      maxConnections: options.maxConnections || 10,
      minConnections: options.minConnections || 2,
      acquireTimeout: options.acquireTimeout || 30000,
      idleTimeout: options.idleTimeout || 300000, // 5 minutes
      maxIdleTime: options.maxIdleTime || 600000, // 10 minutes
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      enableLogging: options.enableLogging !== false,
      ...options
    };
    
    this.pool = [];
    this.activeConnections = new Map();
    this.waitingQueue = [];
    this.dbPath = options.dbPath;
    this.stats = {
      created: 0,
      acquired: 0,
      released: 0,
      destroyed: 0,
      peak: 0,
      current: 0,
      totalRequests: 0,
      averageWaitTime: 0,
      errors: 0
    };
    
    this.isInitialized = false;
    this.healthCheckTimer = null;
  }

  /**
   * Initialize the connection pool
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      logger.info('Initializing database connection pool', {
        maxConnections: this.options.maxConnections,
        minConnections: this.options.minConnections
      });

      // Create initial connections
      const initialConnections = Math.min(this.options.minConnections, this.options.maxConnections);
      for (let i = 0; i < initialConnections; i++) {
        await this.createConnection();
      }

      this.isInitialized = true;
      this.startHealthChecks();
      
      logger.info('Database connection pool initialized', {
        totalConnections: this.pool.length,
        availableConnections: this.getAvailableConnections()
      });
    } catch (error) {
      logger.error('Failed to initialize connection pool', { error });
      throw error;
    }
  }

  /**
   * Create a new database connection
   */
  async createConnection() {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      try {
        const db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            reject(err);
            return;
          }
        });

        // Configure connection for performance
        db.configure("busyTimeout", 30000);
        db.configure("journal_mode", "WAL");
        
        // Enable foreign key constraints for better data integrity
        db.run("PRAGMA foreign_keys = ON");
        
        // Optimize for Space Analyzer workloads
        db.run("PRAGMA synchronous = OFF");
        db.run("PRAGMA cache_size = 10000");
        db.run("PRAGMA temp_store = MEMORY");
        
        // Prepare connection
        await new Promise((resolvePrepare) => {
          db.serialize(() => {
            db.run("PRAGMA journal_mode = WAL");
            resolvePrepare();
          });
        });

        const connection = {
          id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          db,
          created: Date.now(),
          lastUsed: Date.now(),
          inUse: false,
          queryCount: 0,
          isHealthy: true,
          acquireTime: Date.now() - startTime
        };

        this.pool.push(connection);
        this.stats.created++;
        this.stats.current++;
        
        logger.debug('Created new database connection', {
          connectionId: connection.id,
          totalConnections: this.pool.length,
          waitTime: connection.acquireTime
        });

        resolve(connection);
      } catch (error) {
        this.stats.errors++;
        logger.error('Failed to create database connection', { error });
        reject(error);
      }
    });
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(connectionId = null) {
    const startTime = Date.now();
    
    // Check if specific connection is requested and available
    if (connectionId) {
      const connection = this.pool.find(conn => conn.id === connectionId && !conn.inUse);
      if (connection) {
        connection.inUse = true;
        connection.lastUsed = Date.now();
        connection.acquireTime = Date.now() - startTime;
        this.stats.acquired++;
        this.stats.totalRequests++;
        
        // Update average wait time
        this.updateAverageWaitTime();
        
        logger.debug('Acquired specific connection', {
          connectionId,
          acquireTime: connection.acquireTime,
          waitTime: Date.now() - startTime
        });
        
        return connection;
      }
    }

    // Find available connection
    const availableConnection = this.pool.find(conn => !conn.inUse && conn.isHealthy);
    
    if (availableConnection) {
      availableConnection.inUse = true;
      availableConnection.lastUsed = Date.now();
      availableConnection.acquireTime = Date.now() - startTime;
      this.stats.acquired++;
      this.stats.totalRequests++;
      
      // Update average wait time
      this.updateAverageWaitTime();
      
      logger.debug('Acquired available connection', {
        connectionId: availableConnection.id,
        acquireTime: availableConnection.acquireTime,
        waitTime: Date.now() - startTime
      });
      
      return availableConnection;
    }

    // No connections available
    if (this.pool.length < this.options.maxConnections) {
      logger.debug('Creating new connection (pool at capacity)', {
        currentSize: this.pool.length,
        maxSize: this.options.maxConnections,
        waitingQueue: this.waitingQueue.length
      });
      
      // Add to waiting queue
      return new Promise((resolve, reject) => {
        this.waitingQueue.push({ resolve, reject, startTime, connectionId: null });
      });
    }

    // Pool is at capacity and no connections available
    const waitTime = Date.now() - startTime;
    this.stats.errors++;
    
    logger.error('Connection pool exhausted', {
      poolSize: this.pool.length,
      maxSize: this.options.maxConnections,
      waitingQueue: this.waitingQueue.length,
      waitTime
    });
    
    throw new Error(`Connection pool exhausted. Max: ${this.options.maxConnections}, Current: ${this.pool.length}, Waiting: ${this.waitingQueue.length}`);
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection) {
    if (!connection || !connection.id) {
      logger.warn('Attempted to release invalid connection');
      return;
    }

    const releaseStartTime = Date.now();
    
    // Mark connection as available
    connection.inUse = false;
    connection.lastUsed = Date.now();
    this.stats.released++;
    this.stats.current--;
    
    // Update peak connections
    this.stats.peak = Math.max(this.stats.peak, this.stats.current);
    
    // Process waiting queue
    this.processWaitingQueue();
    
    logger.debug('Released connection', {
      connectionId: connection.id,
      totalConnections: this.pool.length,
      availableConnections: this.getAvailableConnections(),
      releaseTime: Date.now() - releaseStartTime
    });

    // Check connection health
    await this.checkConnectionHealth(connection);
  }

  /**
   * Process waiting queue (FIFO)
   */
  processWaitingQueue() {
    if (this.waitingQueue.length === 0) return;
    
    const { resolve, reject, startTime, connectionId } = this.waitingQueue.shift();
    const waitTime = Date.now() - startTime;
    
    // Try to create new connection for waiting request
    try {
      const newConnection = await this.createConnection();
      newConnection.id = connectionId || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.stats.totalRequests++;
      this.updateAverageWaitTime();
      
      logger.debug('Processed waiting queue request', {
        connectionId: newConnection.id,
        waitTime,
        queueLength: this.waitingQueue.length
      });
      
      resolve(newConnection);
    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to create connection for waiting queue', { error });
      reject(error);
    }
  }

  /**
   * Update average wait time calculation
   */
  updateAverageWaitTime() {
    if (this.stats.acquired > 0) {
      this.stats.averageWaitTime = 
        (this.stats.averageWaitTime * (this.stats.acquired - 1) + (Date.now() - Date.now())) / 
        this.stats.acquired;
    }
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth(connection) {
    try {
      // Simple health check - execute a simple query
      const startTime = Date.now();
      await new Promise((resolve, reject) => {
        connection.db.get("SELECT 1", (err, row) => {
          if (err) {
            connection.isHealthy = false;
            reject(err);
          } else {
            connection.isHealthy = true;
            resolve(row);
          }
        });
      });
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 5000) { // 5 seconds
        connection.isHealthy = false;
        logger.warn('Connection health check failed', {
          connectionId: connection.id,
          responseTime
        });
      } else {
        logger.debug('Connection health check passed', {
          connectionId: connection.id,
          responseTime
        });
      }
    } catch (error) {
      connection.isHealthy = false;
      logger.error('Connection health check error', {
        connectionId: connection.id,
        error
      });
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    if (this.healthCheckTimer) return;
    
    this.healthCheckTimer = setInterval(async () => {
      const unhealthyConnections = this.pool.filter(conn => !conn.isHealthy);
      
      if (unhealthyConnections.length > 0) {
        logger.warn(`Found ${unhealthyConnections.length} unhealthy connections, performing health checks`);
        
        for (const connection of unhealthyConnections) {
          await this.checkConnectionHealth(connection);
        }
      }
    }, this.options.healthCheckInterval);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get available connections count
   */
  getAvailableConnections() {
    return this.pool.filter(conn => !conn.inUse && conn.isHealthy).length;
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      availableConnections: this.getAvailableConnections(),
      utilizationRate: (this.stats.current / this.pool.length) * 100,
      averageWaitTime: this.stats.averageWaitTime,
      queueLength: this.waitingQueue.length
    };
  }

  /**
   * Gracefully shutdown all connections
   */
  async shutdown() {
    logger.info('Shutting down database connection pool');
    
    // Stop health checks
    this.stopHealthChecks();
    
    // Close all connections
    const closePromises = this.pool.map(async (connection) => {
      try {
        connection.isHealthy = false;
        
        return new Promise((resolve) => {
          connection.db.close((err) => {
            if (err) {
              logger.error('Error closing connection', {
                connectionId: connection.id,
                error: err
              });
            } else {
              logger.debug('Closed connection', {
                connectionId: connection.id,
                totalQueries: connection.queryCount,
                lifespan: Date.now() - connection.created
              });
            }
            
            // Remove from pool
            const index = this.pool.indexOf(connection);
            if (index > -1) {
              this.pool.splice(index, 1);
            }
            
            this.stats.destroyed++;
            this.stats.current--;
            resolve();
          });
        });
      } catch (error) {
        logger.error('Error during connection shutdown', { error });
      }
    });
    
    // Wait for all connections to close
    await Promise.all(closePromises);
    
    // Clear pool
    this.pool = [];
    this.stats.current = 0;
    
    logger.info('Database connection pool shutdown complete', {
      finalStats: this.getStats()
    });
  }

  /**
   * Force cleanup of idle connections
   */
  async cleanupIdleConnections() {
    const now = Date.now();
    const idleThreshold = now - this.options.maxIdleTime;
    
    const idleConnections = this.pool.filter(conn => 
      !conn.inUse && 
      conn.isHealthy && 
      (now - conn.lastUsed) > idleThreshold
    );
    
    if (idleConnections.length > 0) {
      logger.info(`Cleaning up ${idleConnections.length} idle connections`);
      
      for (const connection of idleConnections) {
        await this.release(connection);
      }
    }
  }
}

module.exports = DatabaseConnectionPool;