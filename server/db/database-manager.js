/**
 * Enhanced Database Manager
 * Provides robust database initialization with retry logic, health monitoring, and graceful degradation
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { EventEmitter } = require("events");

class DatabaseManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.dbPath = options.dbPath || path.join(__dirname, "..", "data", "space-analyzer.db");
    this.db = null;
    this.initialized = false;
    this.healthStatus = "unknown";
    this.retryCount = 0;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.healthTimer = null;
    this.connectionPool = [];
    this.maxConnections = options.maxConnections || 10;
    
    // Performance metrics
    this.metrics = {
      initTime: 0,
      connectionCount: 0,
      queryCount: 0,
      errorCount: 0,
      lastHealthCheck: null
    };
  }

  /**
   * Initialize database with retry logic and proper error handling
   */
  async initialize() {
    const startTime = Date.now();
    
    try {
      this.emit('initialization:start');
      console.log(`🗄️ Initializing database manager...`);
      
      // Ensure data directory exists
      await this.ensureDataDirectory();
      
      // Initialize database with retry logic
      await this.initializeWithRetry();
      
      // Configure database for optimal performance
      await this.configureDatabase();
      
      // Create tables and run migrations
      await this.setupSchema();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.initialized = true;
      this.healthStatus = "healthy";
      this.metrics.initTime = Date.now() - startTime;
      
      console.log(`✅ Database initialized successfully in ${this.metrics.initTime}ms`);
      this.emit('initialization:success', this.metrics);
      
      return true;
    } catch (error) {
      console.error(`❌ Database initialization failed:`, error.message);
      this.healthStatus = "failed";
      this.metrics.errorCount++;
      this.emit('initialization:error', error);
      throw error;
    }
  }

  /**
   * Ensure data directory exists with proper permissions
   */
  async ensureDataDirectory() {
    const dir = path.dirname(this.dbPath);
    
    try {
      if (!fs.existsSync(dir)) {
        console.log(`📁 Creating database directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Test directory permissions
      const testFile = path.join(dir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      console.log(`✅ Database directory is writable: ${dir}`);
    } catch (error) {
      throw new Error(`Database directory not accessible: ${dir} - ${error.message}`);
    }
  }

  /**
   * Initialize database with retry logic
   */
  async initializeWithRetry() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Database initialization attempt ${attempt}/${this.maxRetries}`);
        
        await this.openDatabase();
        console.log(`✅ Database connection established`);
        return true;
        
      } catch (error) {
        this.retryCount = attempt;
        console.warn(`⚠️ Database initialization attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Database initialization failed after ${this.maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
  }

  /**
   * Open database connection
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(
        this.dbPath,
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        (err) => {
          if (err) {
            console.error(`❌ Failed to open database: ${this.dbPath}`, err);
            reject(err);
          } else {
            this.db = db;
            this.metrics.connectionCount++;
            console.log(`📚 Database opened successfully: ${this.dbPath}`);
            resolve(db);
          }
        }
      );
    });
  }

  /**
   * Configure database for optimal performance
   */
  async configureDatabase() {
    if (!this.db) throw new Error('Database not initialized');
    
    const configurations = [
      'PRAGMA journal_mode = WAL',           // Write-Ahead Logging for better concurrency
      'PRAGMA synchronous = NORMAL',        // Balance between safety and performance
      'PRAGMA cache_size = -64000',         // 64MB cache
      'PRAGMA temp_store = MEMORY',         // Store temporary tables in memory
      'PRAGMA mmap_size = 268435456',       // 256MB memory-mapped I/O
      'PRAGMA optimize',                    // Optimize database
      'PRAGMA analysis_limit = 1000',       // Limit query planner analysis
      'PRAGMA threads = 4'                  // Use 4 threads for operations
    ];

    for (const pragma of configurations) {
      await this.runQuery(pragma);
    }
    
    console.log(`⚙️ Database configured for optimal performance`);
  }

  /**
   * Setup database schema
   */
  async setupSchema() {
    console.log(`🏗️ Setting up database schema...`);
    
    // Create essential tables
    await this.createEssentialTables();
    
    // Run migrations if needed
    await this.runMigrations();
    
    // Create indexes for performance
    await this.createIndexes();
    
    console.log(`✅ Database schema setup completed`);
  }

  /**
   * Create essential tables
   */
  async createEssentialTables() {
    const tables = [
      // Files table
      `CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        size INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_type TEXT,
        extension TEXT,
        directory TEXT,
        hash TEXT,
        metadata TEXT,
        indexed BOOLEAN DEFAULT FALSE
      )`,
      
      // Analysis results table
      `CREATE TABLE IF NOT EXISTS analysis_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        analysis_type TEXT NOT NULL,
        result TEXT NOT NULL,
        confidence REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )`,
      
      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT DEFAULT 'string',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // System health table
      `CREATE TABLE IF NOT EXISTS system_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        status TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const tableSql of tables) {
      await this.runQuery(tableSql);
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    // Create migrations table if it doesn't exist
    await this.runQuery(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check for pending migrations
    const appliedMigrations = await this.getAll(`
      SELECT version FROM migrations ORDER BY applied_at
    `);
    
    console.log(`📋 Database migrations checked`);
  }

  /**
   * Create performance indexes
   */
  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)',
      'CREATE INDEX IF NOT EXISTS idx_files_directory ON files(directory)',
      'CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension)',
      'CREATE INDEX IF NOT EXISTS idx_files_modified_at ON files(modified_at)',
      'CREATE INDEX IF NOT EXISTS idx_analysis_results_file_id ON analysis_results(file_id)',
      'CREATE INDEX IF NOT EXISTS idx_analysis_results_type ON analysis_results(analysis_type)',
      'CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health(timestamp)'
    ];

    for (const indexSql of indexes) {
      await this.runQuery(indexSql);
    }
    
    console.log(`🔍 Database indexes created`);
  }

  /**
   * Execute a database query with error handling
   */
  async runQuery(sql, params = []) {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.metrics.queryCount++;
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          this.metrics.errorCount++;
          console.error(`❌ Database query error:`, err.message);
          console.error(`SQL: ${sql}`);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Execute a database write operation
   */
  async runWrite(sql, params = []) {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.metrics.queryCount++;
      
      this.db.run(sql, params, function(err) {
        if (err) {
          this.metrics.errorCount++;
          console.error(`❌ Database write error:`, err.message);
          console.error(`SQL: ${sql}`);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get all results from a query
   */
  async getAll(sql, params = []) {
    return this.runQuery(sql, params);
  }

  /**
   * Get first result from a query
   */
  async get(sql, params = []) {
    const results = await this.runQuery(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthTimer) return;
    
    this.healthTimer = setInterval(async () => {
      await this.checkHealth();
    }, this.healthCheckInterval);
    
    console.log(`🏥 Database health monitoring started`);
  }

  /**
   * Check database health
   */
  async checkHealth() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      await this.runQuery('SELECT 1');
      
      // Check database size
      const stats = fs.statSync(this.dbPath);
      const sizeMB = stats.size / (1024 * 1024);
      
      // Check table counts
      const tableCount = await this.get(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      
      this.metrics.lastHealthCheck = Date.now() - startTime;
      
      // Determine health status
      if (sizeMB > 1000) {
        this.healthStatus = "warning"; // Large database
      } else if (this.metrics.errorCount > 10) {
        this.healthStatus = "degraded";
      } else {
        this.healthStatus = "healthy";
      }
      
      this.emit('health:check', {
        status: this.healthStatus,
        sizeMB: sizeMB.toFixed(2),
        tableCount: tableCount.count,
        metrics: this.metrics
      });
      
    } catch (error) {
      this.healthStatus = "unhealthy";
      this.metrics.errorCount++;
      this.emit('health:error', error);
      console.error(`❌ Database health check failed:`, error.message);
    }
  }

  /**
   * Get database status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      health: this.healthStatus,
      path: this.dbPath,
      metrics: this.metrics,
      retryCount: this.retryCount
    };
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            console.error(`❌ Error closing database:`, err.message);
            reject(err);
          } else {
            console.log(`🔒 Database connection closed`);
            this.db = null;
            this.initialized = false;
            resolve();
          }
        });
      });
    }
  }

  /**
   * Get database instance (for backward compatibility)
   */
  getDatabase() {
    return this.db;
  }
}

module.exports = DatabaseManager;