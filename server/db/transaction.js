/**
 * Database Transaction Support
 * Provides ACID-compliant transactions with rollback support
 */

const logger = require("../utils/logger");

class DatabaseTransaction {
  constructor(db) {
    this.db = db;
    this.isActive = false;
    this.operations = [];
    this.savepoints = [];
  }

  /**
   * Begin a new transaction
   */
  async begin(isolationLevel = 'DEFERRED') {
    if (this.isActive) {
      throw new Error('Transaction already in progress');
    }

    this.isActive = true;
    this.operations = [];
    
    try {
      await this.db.run('BEGIN IMMEDIATE TRANSACTION');
      
      // Create savepoint for nested transactions
      const savepointId = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.db.run(`SAVEPOINT ${savepointId}`);
      
      this.savepoints.push(savepointId);
      
      logger.debug('Transaction begun', {
        isolationLevel,
        savepointId
      });
      
      return {
        id: savepointId,
        rollback: () => this.rollback(savepointId),
        commit: () => this.commit(savepointId),
        execute: (sql, params = []) => this.execute(sql, params)
      };
    } catch (error) {
      this.isActive = false;
      logger.error('Failed to begin transaction', error);
      throw error;
    }
  }

  /**
   * Execute SQL within transaction
   */
  async execute(sql, params = []) {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    this.operations.push({ sql, params, timestamp: Date.now() });
    
    try {
      return new Promise((resolve, reject) => {
        const stmt = this.db.prepare(sql);
        
        if (params.length > 0) {
          stmt.bind(...params);
        }
        
        stmt.run((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
        
        stmt.finalize(() => {
          stmt = null;
        });
      });
    } catch (error) {
      logger.error('Transaction execute error', { sql, params, error });
      throw error;
    }
  }

  /**
   * Create a nested transaction savepoint
   */
  async savepoint(name) {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    const savepointId = `sp_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await this.db.run(`SAVEPOINT ${savepointId}`);
      this.savepoints.push(savepointId);
      
      logger.debug('Savepoint created', { savepointId });
      
      return {
        id: savepointId,
        rollback: () => this.rollback(savepointId),
        commit: () => this.commit(savepointId),
        execute: (sql, params = []) => this.execute(sql, params)
      };
    } catch (error) {
      logger.error('Failed to create savepoint', error);
      throw error;
    }
  }

  /**
   * Rollback to a savepoint
   */
  async rollback(savepointId) {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    const savepointIndex = this.savepoints.indexOf(savepointId);
    if (savepointIndex === -1) {
      throw new Error(`Savepoint ${savepointId} not found`);
    }

    try {
      // Rollback all savepoints created after this one
      const savepointsToRollback = this.savepoints.slice(savepointIndex + 1);
      
      for (const sp of savepointsToRollback) {
        await this.db.run(`ROLLBACK TO SAVEPOINT ${sp}`);
      }
      
      // Remove rolled back savepoints
      this.savepoints = this.savepoints.slice(0, savepointIndex + 1);
      
      logger.info('Rolled back to savepoint', { savepointId, rolledBackCount: savepointsToRollback.length });
    } catch (error) {
      logger.error('Failed to rollback savepoint', { savepointId, error });
      throw error;
    }
  }

  /**
   * Commit a savepoint
   */
  async commit(savepointId) {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    const savepointIndex = this.savepoints.indexOf(savepointId);
    if (savepointIndex === -1) {
      throw new Error(`Savepoint ${savepointId} not found`);
    }

    try {
      await this.db.run(`RELEASE SAVEPOINT ${savepointId}`);
      
      // Remove committed savepoint
      this.savepoints = this.savepoints.slice(0, savepointIndex);
      this.savepoints.splice(savepointIndex, 1);
      
      logger.info('Committed savepoint', { savepointId });
    } catch (error) {
      logger.error('Failed to commit savepoint', { savepointId, error });
      throw error;
    }
  }

  /**
   * Commit the entire transaction
   */
  async commit() {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    try {
      await this.db.run('COMMIT');
      this.isActive = false;
      this.operations = [];
      this.savepoints = [];
      
      logger.info('Transaction committed', {
        operationCount: this.operations.length,
        operations: this.operations
      });
    } catch (error) {
      this.isActive = false;
      logger.error('Failed to commit transaction', error);
      throw error;
    }
  }

  /**
   * Rollback the entire transaction
   */
  async rollback() {
    if (!this.isActive) {
      throw new Error('No active transaction');
    }

    try {
      await this.db.run('ROLLBACK');
      this.isActive = false;
      this.operations = [];
      this.savepoints = [];
      
      logger.info('Transaction rolled back', {
        operationCount: this.operations.length,
        operations: this.operations
      });
    } catch (error) {
      this.isActive = false;
      logger.error('Failed to rollback transaction', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      operationCount: this.operations.length,
      savepoints: [...this.savepoints],
      operations: [...this.operations]
    };
  }
}

module.exports = DatabaseTransaction;