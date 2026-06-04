/**
 * Database Complexity Module
 * Handles code complexity metrics storage and retrieval
 */

class ComplexityDatabase {
  constructor(core) {
    this.core = core;
    this.db = null;
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Store code complexity metrics
   */
  storeComplexityMetrics(metrics) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO complexity_metrics
        (file_path, directory_path, language, lines_of_code, logical_lines, comment_lines, blank_lines,
         cyclomatic_complexity, cognitive_complexity, function_count, max_function_length, avg_function_length,
         nesting_depth, maintainability_index, complexity_grade, refactoring_priority, analyzed_at, file_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `;

      this.db.run(
        sql,
        [
          metrics.filePath,
          metrics.directoryPath,
          metrics.language,
          metrics.linesOfCode,
          metrics.logicalLines,
          metrics.commentLines,
          metrics.blankLines,
          metrics.cyclomaticComplexity,
          metrics.cognitiveComplexity,
          metrics.functionCount,
          metrics.maxFunctionLength,
          metrics.averageFunctionLength,
          metrics.nestingDepth,
          metrics.maintainabilityIndex,
          metrics.complexityGrade,
          metrics.refactoringPriority,
          metrics.fileHash,
        ],
        function (err) {
          if (err) {
            console.error("❌ Error storing complexity metrics:", err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Get complexity metrics for a file
   */
  getComplexityMetrics(filePath) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM complexity_metrics WHERE file_path = ?`;
      this.db.get(sql, [filePath], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get complexity metrics for a directory
   */
  getDirectoryComplexity(directoryPath, minPriority = null) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM complexity_metrics WHERE directory_path = ?`;
      const params = [directoryPath];

      if (minPriority) {
        const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
        sql += ` AND CASE refactoring_priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END <= ?`;
        params.push(priorityOrder[minPriority] || 4);
      }

      sql += ` ORDER BY cyclomatic_complexity DESC`;

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Get complexity summary statistics for a directory
   */
  getComplexitySummary(directoryPath) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          COUNT(*) as total_files,
          AVG(lines_of_code) as avg_lines,
          AVG(cyclomatic_complexity) as avg_complexity,
          AVG(maintainability_index) as avg_maintainability,
          MAX(cyclomatic_complexity) as max_complexity,
          MIN(maintainability_index) as min_maintainability,
          SUM(CASE WHEN complexity_grade = 'A' THEN 1 ELSE 0 END) as grade_a,
          SUM(CASE WHEN complexity_grade = 'B' THEN 1 ELSE 0 END) as grade_b,
          SUM(CASE WHEN complexity_grade = 'C' THEN 1 ELSE 0 END) as grade_c,
          SUM(CASE WHEN complexity_grade = 'D' THEN 1 ELSE 0 END) as grade_d,
          SUM(CASE WHEN complexity_grade = 'F' THEN 1 ELSE 0 END) as grade_f,
          SUM(CASE WHEN refactoring_priority = 'critical' THEN 1 ELSE 0 END) as critical_count,
          SUM(CASE WHEN refactoring_priority = 'high' THEN 1 ELSE 0 END) as high_count,
          SUM(CASE WHEN refactoring_priority = 'medium' THEN 1 ELSE 0 END) as medium_count
        FROM complexity_metrics
        WHERE directory_path = ?
      `;

      this.db.get(sql, [directoryPath], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get files needing refactoring by priority
   */
  getFilesNeedingRefactoring(directoryPath, limit = 20) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM complexity_metrics
        WHERE directory_path = ?
          AND refactoring_priority IN ('critical', 'high')
        ORDER BY
          CASE refactoring_priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
          END,
          cyclomatic_complexity DESC
        LIMIT ?
      `;

      this.db.all(sql, [directoryPath, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Delete complexity metrics for files that no longer exist
   */
  cleanupOrphanedMetrics(validFilePaths) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const placeholders = validFilePaths.map(() => "?").join(",");
      const sql = `
        DELETE FROM complexity_metrics
        WHERE file_path NOT IN (${placeholders})
      `;

      this.db.run(sql, validFilePaths, function (err) {
        if (err) {
          reject(err);
        } else {
          console.log(`🧹 Cleaned up ${this.changes} orphaned complexity metrics`);
          resolve(this.changes);
        }
      });
    });
  }

  /**
   * Get most complex files across all directories
   */
  getMostComplexFiles(limit = 20) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM complexity_metrics
        ORDER BY cyclomatic_complexity DESC
        LIMIT ?
      `;

      this.db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = ComplexityDatabase;
