/**
 * Database Cleanup Module
 * Handles cleanup recommendations and actions
 */

class CleanupDatabase {
  constructor(core) {
    this.core = core;
    this.db = null;
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Store AI cleanup recommendation
   */
  storeCleanupRecommendation(
    directoryPath,
    filePath,
    fileSize,
    recommendationType,
    confidenceScore,
    reasoning,
    potentialSavings,
    safeToDelete
  ) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO cleanup_recommendations
        (directory_path, file_path, file_size, recommendation_type, confidence_score, reasoning, potential_savings, safe_to_delete, user_action, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      `;

      this.db.run(
        sql,
        [
          directoryPath,
          filePath,
          fileSize,
          recommendationType,
          confidenceScore,
          reasoning,
          potentialSavings,
          safeToDelete ? 1 : 0,
        ],
        function (err) {
          if (err) {
            console.error("❌ Error storing cleanup recommendation:", err);
            reject(err);
          } else {
            resolve({ id: this.lastID, updated: this.changes > 0 });
          }
        }
      );
    });
  }

  /**
   * Get cleanup recommendations for a directory
   */
  getCleanupRecommendations(directoryPath, limit = 50, type = null) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM cleanup_recommendations WHERE directory_path = ?`;
      const params = [directoryPath];

      if (type) {
        sql += ` AND recommendation_type = ?`;
        params.push(type);
      }

      sql += ` ORDER BY confidence_score DESC, potential_savings DESC LIMIT ?`;
      params.push(limit);

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Update user action on recommendation
   */
  updateCleanupAction(filePath, action) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `UPDATE cleanup_recommendations SET user_action = ? WHERE file_path = ?`;
      this.db.run(sql, [action, filePath], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ updated: this.changes > 0, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get total potential savings from pending recommendations
   */
  getPotentialSavings(directoryPath) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          COUNT(*) as recommendation_count,
          SUM(potential_savings) as total_savings,
          SUM(CASE WHEN safe_to_delete = 1 THEN potential_savings ELSE 0 END) as safe_savings
        FROM cleanup_recommendations
        WHERE directory_path = ? AND user_action = 'pending'
      `;

      this.db.get(sql, [directoryPath], (err, row) => {
        if (err) reject(err);
        else resolve(row || { recommendation_count: 0, total_savings: 0, safe_savings: 0 });
      });
    });
  }

  /**
   * Get recommendations by action status
   */
  getRecommendationsByStatus(directoryPath, status, limit = 50) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM cleanup_recommendations
        WHERE directory_path = ? AND user_action = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;

      this.db.all(sql, [directoryPath, status, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Delete old completed recommendations
   */
  cleanupCompletedRecommendations(daysToKeep = 7) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const sql = `
        DELETE FROM cleanup_recommendations
        WHERE user_action IN ('completed', 'rejected')
        AND created_at < ?
      `;

      this.db.run(sql, [cutoffDate.toISOString()], function (err) {
        if (err) {
          reject(err);
        } else {
          console.log(`🧹 Cleaned up ${this.changes} old recommendations`);
          resolve(this.changes);
        }
      });
    });
  }
}

module.exports = CleanupDatabase;
