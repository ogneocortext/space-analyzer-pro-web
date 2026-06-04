/**
 * Database Trends Module
 * Handles trend tracking and analysis over time
 */

class TrendsDatabase {
  constructor(core) {
    this.core = core;
    this.db = null;
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Store analysis trend data
   */
  storeAnalysisTrend(directoryPath, analysisData) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      // Get previous analysis to calculate changes
      const prevSql = `
        SELECT * FROM analysis_trends
        WHERE directory_path = ?
        ORDER BY analysis_date DESC
        LIMIT 1
      `;

      this.db.get(prevSql, [directoryPath], (err, previous) => {
        if (err) {
          reject(err);
          return;
        }

        let fileCountChange = 0;
        let sizeChange = 0;
        let growthRate = 0;

        if (previous) {
          fileCountChange = (analysisData.totalFiles || 0) - previous.total_files;
          sizeChange = (analysisData.totalSize || 0) - previous.total_size;
          if (previous.total_size > 0) {
            growthRate = (sizeChange / previous.total_size) * 100;
          }
        }

        // Prepare top categories and largest files as JSON
        const topCategories = JSON.stringify(
          Object.entries(analysisData.categories || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
        );

        const largestFiles = JSON.stringify(
          (analysisData.files || [])
            .sort((a, b) => b.size - a.size)
            .slice(0, 5)
            .map((f) => ({ name: f.name, size: f.size }))
        );

        const sql = `
          INSERT INTO analysis_trends
          (directory_path, total_files, total_size, file_count_change, size_change, top_categories, largest_files, growth_rate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        this.db.run(
          sql,
          [
            directoryPath,
            analysisData.totalFiles || 0,
            analysisData.totalSize || 0,
            fileCountChange,
            sizeChange,
            topCategories,
            largestFiles,
            growthRate,
          ],
          function (err) {
            if (err) reject(err);
            else {
              console.log(
                `📈 Stored trend for ${directoryPath}: ${fileCountChange > 0 ? "+" : ""}${fileCountChange} files, ${growthRate.toFixed(2)}% growth`
              );
              resolve({
                id: this.lastID,
                fileCountChange,
                sizeChange,
                growthRate,
              });
            }
          }
        );
      });
    });
  }

  /**
   * Get analysis trends for a directory
   */
  getAnalysisTrends(directoryPath, limit = 10) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM analysis_trends
        WHERE directory_path = ?
        ORDER BY analysis_date DESC
        LIMIT ?
      `;

      this.db.all(sql, [directoryPath, limit], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Parse JSON fields
        rows.forEach((row) => {
          try {
            if (row.top_categories) row.top_categories = JSON.parse(row.top_categories);
            if (row.largest_files) row.largest_files = JSON.parse(row.largest_files);
          } catch (e) {
            // Keep as strings if parsing fails
          }
        });

        resolve(rows);
      });
    });
  }

  /**
   * Get trend summary (growth over time)
   */
  getTrendSummary(directoryPath) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          COUNT(*) as data_points,
          MIN(analysis_date) as first_analysis,
          MAX(analysis_date) as last_analysis,
          (SELECT total_files FROM analysis_trends WHERE directory_path = ? ORDER BY analysis_date ASC LIMIT 1) as initial_files,
          (SELECT total_files FROM analysis_trends WHERE directory_path = ? ORDER BY analysis_date DESC LIMIT 1) as current_files,
          (SELECT total_size FROM analysis_trends WHERE directory_path = ? ORDER BY analysis_date ASC LIMIT 1) as initial_size,
          (SELECT total_size FROM analysis_trends WHERE directory_path = ? ORDER BY analysis_date DESC LIMIT 1) as current_size,
          AVG(growth_rate) as avg_growth_rate,
          SUM(file_count_change) as total_file_change,
          SUM(size_change) as total_size_change
        FROM analysis_trends
        WHERE directory_path = ?
      `;

      this.db.get(
        sql,
        [directoryPath, directoryPath, directoryPath, directoryPath, directoryPath],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          const totalGrowth =
            row.initial_size > 0
              ? ((row.current_size - row.initial_size) / row.initial_size) * 100
              : 0;

          resolve({
            ...row,
            total_growth_percent: totalGrowth,
            analysis_count: row.data_points,
            days_tracked:
              row.first_analysis && row.last_analysis
                ? Math.ceil(
                    (new Date(row.last_analysis) - new Date(row.first_analysis)) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0,
          });
        }
      );
    });
  }
}

module.exports = TrendsDatabase;
