/**
 * Database Summaries Module
 * Handles AI-generated file summaries and caching
 */

class SummariesDatabase {
  constructor(core) {
    this.core = core;
    this.db = null;
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Store AI-generated file summary
   */
  storeFileSummary(
    filePath,
    fileHash,
    fileSize,
    fileType,
    summaryText,
    extractedPreview,
    modelUsed,
    tokensUsed
  ) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO file_summaries
        (file_path, file_hash, file_size, file_type, summary_text, extracted_text_preview, model_used, tokens_used, created_at, accessed_at, hit_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      `;

      this.db.run(
        sql,
        [
          filePath,
          fileHash,
          fileSize,
          fileType,
          summaryText,
          extractedPreview,
          modelUsed,
          tokensUsed,
        ],
        function (err) {
          if (err) {
            console.error("❌ Error storing file summary:", err);
            reject(err);
          } else {
            console.log(`📝 Stored summary for: ${filePath}`);
            resolve({ id: this.lastID, cached: false });
          }
        }
      );
    });
  }

  /**
   * Get cached file summary
   */
  getFileSummary(filePath, fileHash = null) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM file_summaries WHERE file_path = ?`;
      const params = [filePath];

      if (fileHash) {
        sql += ` AND file_hash = ?`;
        params.push(fileHash);
      }

      sql += ` ORDER BY created_at DESC LIMIT 1`;

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Update hit count and accessed time
          const updateSql = `
            UPDATE file_summaries
            SET hit_count = hit_count + 1, accessed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `;
          this.db.run(updateSql, [row.id]);
        }

        resolve(row);
      });
    });
  }

  /**
   * Get popular file summaries (for analytics)
   */
  getPopularSummaries(limit = 20) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT file_path, file_type, summary_text, hit_count, accessed_at
        FROM file_summaries
        ORDER BY hit_count DESC
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Clean up old summaries
   */
  cleanupOldSummaries(daysToKeep = 30) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const sql = `
        DELETE FROM file_summaries
        WHERE accessed_at < ?
        AND hit_count < 5
      `;

      this.db.run(sql, [cutoffDate.toISOString()], function (err) {
        if (err) {
          reject(err);
        } else {
          console.log(`🧹 Cleaned up ${this.changes} old summaries`);
          resolve(this.changes);
        }
      });
    });
  }
}

module.exports = SummariesDatabase;
