/**
 * Query Optimization System
 * Provides prepared statements, query optimization, and performance tracking
 */

const logger = require("../utils/logger");

class QueryOptimizer {
  constructor(db) {
    this.db = db;
    this.statements = new Map();
    this.queryMetrics = {
      totalQueries: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      slowQueries: [],
      preparedStatements: new Map(),
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Create or get a prepared statement
   */
  async prepare(sql, params = []) {
    const statementId = this.generateStatementId(sql);
    
    if (this.statements.has(statementId)) {
      return this.statements.get(statementId);
    }

    try {
      const stmt = await new Promise((resolve, reject) => {
        this.db.prepare(sql, (err, stmt) => {
          if (err) {
            reject(err);
          } else {
            resolve(stmt);
          }
        });
      });

      // Bind parameters if provided
      if (params.length > 0) {
        const bindPromises = params.map((param, index) => 
          new Promise((resolveBind, rejectBind) => {
            stmt.bind(param, index, (err) => {
              if (err) {
                rejectBind(err);
              } else {
                resolveBind();
              }
            });
          });
        );

        await Promise.all(bindPromises);
      }

      this.statements.set(statementId, {
        statement,
        sql,
        params,
        createdAt: Date.now(),
        executionCount: 0,
        lastUsed: Date.now()
      });

      logger.debug('Prepared statement', { statementId, sql, params });
      return stmt;
    } catch (error) {
      logger.error('Failed to prepare statement', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute a query with optimization
   */
  async execute(sql, params = []) {
    const startTime = Date.now();
    this.queryMetrics.totalQueries++;
    
    try {
      let stmt;
      
      // Try to use prepared statement first
      const statementId = this.generateStatementId(sql);
      if (this.statements.has(statementId)) {
        stmt = this.statements.get(statementId);
        stmt.executionCount++;
        stmt.lastUsed = Date.now();
        
        logger.debug('Using prepared statement', { statementId, executionCount: stmt.executionCount });
      } else {
        // Create new statement
        stmt = await this.prepare(sql, params);
      }

      // Execute the query
      const result = await new Promise((resolve, reject) => {
        stmt.all((err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });

      const executionTime = Date.now() - startTime;
      this.updateQueryMetrics(sql, executionTime, rows?.length || 0);
      
      // Check if this was a slow query
      if (executionTime > 1000) { // 1 second threshold
        this.queryMetrics.slowQueries.push({
          sql,
          params,
          executionTime,
          timestamp: new Date(),
          rowCount: rows?.length || 0
        });
        
        logger.warn('Slow query detected', {
          sql,
          params,
          executionTime,
          rowCount: rows?.length || 0
        });
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.queryMetrics.totalQueries++;
      this.updateQueryMetrics(sql, executionTime, 0);
      
      logger.error('Query execution failed', { sql, params, error, executionTime });
      throw error;
    }
  }

  /**
   * Generate statement ID from SQL
   */
  generateStatementId(sql) {
    // Create a hash of the SQL for identification
    const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    return `stmt_${normalizedSql.replace(/[^a-zA-Z0-9]/g, '_')}_${normalizedSql.length}`;
  }

  /**
   * Update query performance metrics
   */
  updateQueryMetrics(sql, executionTime, rowCount) {
    this.queryMetrics.totalExecutionTime += executionTime;
    
    // Update average
    this.queryMetrics.averageExecutionTime = 
      this.queryMetrics.totalExecutionTime / this.queryMetrics.totalQueries;
    
    // Update slow queries list (keep last 50)
    if (this.queryMetrics.slowQueries.length >= 50) {
      this.queryMetrics.slowQueries = this.queryMetrics.slowQueries.slice(-50);
    }
    
    logger.debug('Query metrics updated', {
      sql,
      executionTime,
      rowCount,
      averageTime: this.queryMetrics.averageExecutionTime,
      totalQueries: this.queryMetrics.totalQueries
    });
  }

  /**
   * Get query statistics
   */
  getStats() {
    return {
      ...this.queryMetrics,
      preparedStatements: this.statements.size,
      cacheHitRate: this.queryMetrics.cacheHits / (this.queryMetrics.cacheHits + this.queryMetrics.cacheMisses) * 100,
      slowQueries: this.queryMetrics.slowQueries.slice(-10) // Last 10 slow queries
    };
  }

  /**
   * Clear all prepared statements
   */
  clear() {
    for (const [statementId, stmt] of this.statements) {
      try {
        stmt.finalize();
        logger.debug('Finalized statement', { statementId });
      } catch (error) {
        logger.error('Error finalizing statement', { statementId, error });
      }
    }
    
    this.statements.clear();
    this.queryMetrics.preparedStatements = 0;
    logger.info('All prepared statements cleared');
  }

  /**
   * Optimize database settings
   */
  async optimizeDatabase() {
    logger.info('Optimizing database settings');
    
    try {
      // Enable WAL mode for better concurrency
      await new Promise((resolve, reject) => {
        this.db.run('PRAGMA journal_mode = WAL', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Optimize for Space Analyzer workload
      await new Promise((resolve, reject) => {
        this.db.run('PRAGMA synchronous = OFF', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set cache size
      await new Promise((resolve, reject) => {
        this.db.run('PRAGMA cache_size = 10000', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Enable foreign key constraints
      await new Promise((resolve, reject) => {
        this.db.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Analyze table statistics
      const tableStats = await new Promise((resolve, reject) => {
        this.db.all('SELECT name, sql FROM sqlite_master WHERE type="table"', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Create indexes for large tables
      if (tableStats) {
        for (const table of tableStats) {
          if (table.name === 'files' && table.sql.includes('CREATE TABLE files')) {
            logger.info(`Analyzing table: ${table.name}`);
            
            // Get row count
            const countResult = await new Promise((resolveCount, rejectCount) => {
              this.db.get('SELECT COUNT(*) FROM files', (err, count) => {
                if (err) rejectCount(err);
                else resolveCount(count);
              });
            });

            if (countResult) {
              const rowCount = countResult['COUNT(*)'];
              
              // Recommend index if table is large
              if (rowCount > 10000) {
                logger.info(`Table ${table.name} has ${rowCount} rows, recommending indexes`);
              }
            }
          }
        }
      }

      // Run VACUUM to optimize database
      await new Promise((resolve, reject) => {
        this.db.run('VACUUM', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.info('Database optimization completed');
    } catch (error) {
      logger.error('Database optimization failed', error);
    }
  }

  /**
   * Create query execution plan
   */
  async explainQuery(sql, params = []) {
    try {
      const explainSql = `EXPLAIN QUERY PLAN ${sql}`;
      const result = await this.execute(explainSql, params);
      
      logger.debug('Query execution plan', { sql, params, plan: result });
      return result;
    } catch (error) {
      logger.error('Failed to explain query', { sql, params, error });
      throw error;
    }
  }
}

module.exports = QueryOptimizer;