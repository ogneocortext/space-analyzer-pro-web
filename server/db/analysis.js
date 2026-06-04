/**
 * Database Analysis Module
 * Handles analysis storage, retrieval, and file operations
 */

class AnalysisDatabase {
  constructor(core) {
    this.core = core;
    this.db = null;
  }

  setDatabase(db) {
    this.db = db;

    // Create indexes for better query performance
    this.createIndexes();
  }

  /**
   * Create database indexes for performance optimization
   */
  createIndexes() {
    if (!this.db) return;

    const indexes = [
      // Index for directory path lookups
      `CREATE INDEX IF NOT EXISTS idx_analyses_directory_path ON analyses(directory_path)`,

      // Index for analysis ID lookups
      `CREATE INDEX IF NOT EXISTS idx_analyses_id ON analyses(id)`,

      // Index for analysis files lookup
      `CREATE INDEX IF NOT EXISTS idx_analysis_files_analysis_id ON analysis_files(analysis_id)`,

      // Index for file path lookups
      `CREATE INDEX IF NOT EXISTS idx_analysis_files_file_path ON analysis_files(file_path)`,

      // Index for file category filtering
      `CREATE INDEX IF NOT EXISTS idx_analysis_files_category ON analysis_files(file_category)`,

      // Index for file extension filtering
      `CREATE INDEX IF NOT EXISTS idx_analysis_files_extension ON analysis_files(file_extension)`,

      // Composite index for sorting by size
      `CREATE INDEX IF NOT EXISTS idx_analysis_files_size ON analysis_files(file_size DESC)`,

      // Index for last_analyzed sorting
      `CREATE INDEX IF NOT EXISTS idx_analyses_last_analyzed ON analyses(last_analyzed DESC)`,
    ];

    indexes.forEach((sql) => {
      this.db.run(sql, (err) => {
        if (err) {
          console.warn("Failed to create index:", err.message);
        }
      });
    });
  }

  /**
   * Store analysis results for a directory with separate file storage
   */
  storeAnalysis(directoryPath, analysisData) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    const normalizedPath = this.core.normalizePath(directoryPath);
    const totalFiles = analysisData.totalFiles ?? analysisData.total_files ?? 0;
    const totalSize = analysisData.totalSize ?? analysisData.total_size ?? 0;
    const metadataHash =
      analysisData.directory_fingerprint ||
      analysisData.metadataHash ||
      analysisData.metadata_hash ||
      this.core.generateHash(
        JSON.stringify({
          totalFiles,
          totalSize,
        })
      );

    return new Promise((resolve, reject) => {
      // Compress the full analysis data
      const compressedData = this.core.compressData(analysisData);

      const sql = `
        INSERT OR REPLACE INTO analyses
        (directory_path, total_files, total_size, metadata_hash, analysis_data_compressed, last_analyzed)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const self = this;
      this.db.run(
        sql,
        [normalizedPath, totalFiles, totalSize, metadataHash, compressedData],
        function (err) {
          if (err) {
            reject(err);
            return;
          }

          const analysisId = this.lastID;
          console.log(`💾 Stored analysis for: ${directoryPath} (ID: ${analysisId})`);

          // Store files separately if they exist
          if (analysisData.files && analysisData.files.length > 0) {
            self
              .storeAnalysisFiles(analysisId, analysisData.files)
              .then(() => resolve(analysisId))
              .catch(reject);
          } else {
            resolve(analysisId);
          }
        }
      );
    });
  }

  /**
   * Store individual files for an analysis with batching
   */
  storeAnalysisFiles(analysisId, files) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO analysis_files
        (analysis_id, file_path, file_name, file_size, file_category, file_extension)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const batchSize = 1000;
      let processed = 0;
      let errors = 0;

      const insertBatch = (start) => {
        const batch = files.slice(start, start + batchSize);
        if (batch.length === 0) {
          stmt.finalize();
          console.log(`✅ Stored ${processed} files (${errors} errors)`);
          resolve({ processed, errors });
          return;
        }

        let pending = batch.length;
        batch.forEach((file) => {
          stmt.run(
            [analysisId, file.path, file.name, file.size, file.category, file.extension],
            (err) => {
              if (err) errors++;
              else processed++;
              pending--;
              if (pending === 0) {
                insertBatch(start + batchSize);
              }
            }
          );
        });
      };

      insertBatch(0);
    });
  }

  /**
   * Get previous analysis for a directory
   */
  getAnalysis(directoryPath) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    const normalizedPath = this.core.normalizePath(directoryPath);
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM analyses WHERE directory_path = ?";

      this.db.get(sql, [normalizedPath], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row && row.analysis_data_compressed) {
          row.analysis_data = this.core.decompressData(row.analysis_data_compressed);
        }

        resolve(row);
      });
    });
  }

  /**
   * Get analysis by ID
   */
  getAnalysisById(analysisId) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM analyses WHERE id = ?";

      this.db.get(sql, [analysisId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row && row.analysis_data_compressed) {
          row.analysis_data = this.core.decompressData(row.analysis_data_compressed);
        }

        resolve(row);
      });
    });
  }

  /**
   * Get the most recent analysis
   */
  getLatestAnalysis() {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM analyses ORDER BY created_at DESC LIMIT 1";

      this.db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row && row.analysis_data_compressed) {
          row.analysis_data = this.core.decompressData(row.analysis_data_compressed);
        }

        resolve(row);
      });
    });
  }

  /**
   * Get paginated files for an analysis with optional filtering
   */
  getAnalysisFiles(analysisId, options = {}) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const {
        page = 1,
        limit = 100,
        sortBy = "file_size",
        sortOrder = "desc",
        category = null,
        extension = null,
        minSize = null,
        maxSize = null,
        search = null,
      } = options;

      let sql = `SELECT * FROM analysis_files WHERE analysis_id = ?`;
      const params = [analysisId];

      // Apply filters
      if (category) {
        sql += ` AND file_category = ?`;
        params.push(category);
      }

      if (extension) {
        sql += ` AND file_extension = ?`;
        params.push(extension);
      }

      if (minSize !== null) {
        sql += ` AND file_size >= ?`;
        params.push(minSize);
      }

      if (maxSize !== null) {
        sql += ` AND file_size <= ?`;
        params.push(maxSize);
      }

      if (search) {
        sql += ` AND (file_name LIKE ? OR file_path LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }

      // Get total count before pagination
      const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as count");

      this.db.get(countSql, params, (err, countRow) => {
        if (err) {
          reject(err);
          return;
        }

        const total = countRow.count;

        // Apply sorting with strict validation to prevent SQL injection
        const validSortColumns = ["file_name", "file_size", "file_category", "file_extension"];
        const validDirections = ["ASC", "DESC"];

        // Validate sort column against whitelist
        const orderColumn = validSortColumns.includes(sortBy) ? sortBy : "file_size";

        // Validate sort direction strictly
        const normalizedDirection = sortOrder?.toUpperCase();
        const orderDirection = validDirections.includes(normalizedDirection)
          ? normalizedDirection
          : "DESC";

        sql += ` ORDER BY ${orderColumn} ${orderDirection}`;

        // Apply pagination
        const offset = (page - 1) * limit;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            files: rows,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
            },
          });
        });
      });
    });
  }

  /**
   * Get file statistics for an analysis
   */
  getAnalysisStats(analysisId) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const statsSql = `
        SELECT
          COUNT(*) as total_files,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size,
          MAX(file_size) as max_size,
          MIN(file_size) as min_size
        FROM analysis_files
        WHERE analysis_id = ?
      `;

      const categoriesSql = `
        SELECT file_category, COUNT(*) as count, SUM(file_size) as total_size
        FROM analysis_files
        WHERE analysis_id = ?
        GROUP BY file_category
      `;

      const extensionsSql = `
        SELECT file_extension, COUNT(*) as count, SUM(file_size) as total_size
        FROM analysis_files
        WHERE analysis_id = ?
        GROUP BY file_extension
      `;

      Promise.all([
        new Promise((res, rej) => {
          this.db.get(statsSql, [analysisId], (err, row) => {
            if (err) rej(err);
            else res(row);
          });
        }),
        new Promise((res, rej) => {
          this.db.all(categoriesSql, [analysisId], (err, rows) => {
            if (err) rej(err);
            else res(rows);
          });
        }),
        new Promise((res, rej) => {
          this.db.all(extensionsSql, [analysisId], (err, rows) => {
            if (err) rej(err);
            else res(rows);
          });
        }),
      ])
        .then(([stats, categories, extensions]) => {
          resolve({
            ...stats,
            categories: categories.reduce((acc, cat) => {
              acc[cat.file_category] = {
                count: cat.count,
                size: cat.total_size,
              };
              return acc;
            }, {}),
            extensions: extensions.reduce((acc, ext) => {
              acc[ext.file_extension] = {
                count: ext.count,
                size: ext.total_size,
              };
              return acc;
            }, {}),
          });
        })
        .catch(reject);
    });
  }

  /**
   * Get analysis history for all directories
   */
  getAnalysisHistory() {
    return new Promise((resolve, reject) => {
      console.log("📊 Fetching analysis history from database...");

      if (!this.db) {
        console.error("❌ Database connection not available");
        reject(new Error("Database connection not available"));
        return;
      }

      const sql = `
        SELECT
          a.*,
          (SELECT COUNT(*) FROM analysis_files WHERE analysis_id = a.id) as file_count
        FROM analyses a
        ORDER BY a.last_analyzed DESC
        LIMIT 50
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error("❌ Database error fetching analysis history:", err);
          reject(err);
          return;
        }

        console.log(`📋 Found ${rows.length} analyses in database`);

        // Decompress analysis data for each row and format for frontend
        const formattedRows = rows.map((row) => {
          let analysisData = {};

          if (row.analysis_data_compressed) {
            try {
              analysisData = this.core.decompressData(row.analysis_data_compressed);
            } catch (decompressErr) {
              console.error("❌ Failed to decompress analysis data:", decompressErr);
            }
          }

          // Format data for frontend consumption
          return {
            id: row.id,
            analysisId: row.id.toString(), // Frontend expects string
            directory: row.directory_path,
            directoryPath: row.directory_path,
            totalFiles: row.total_files || analysisData.total_files || row.file_count || 0,
            totalSize: row.total_size || analysisData.total_size || 0,
            lastAnalyzed: row.last_analyzed,
            created_at: row.created_at || row.last_analyzed,
            startTime: row.created_at || row.last_analyzed,
            endTime: row.last_analyzed,
            status: "completed",
            file_count: row.file_count,
            // Include full analysis data for detailed views
            files: analysisData.files || [],
            categories: analysisData.categories || {},
            extensions: analysisData.extensions || {},
            largestFiles: analysisData.largest_files || [],
            // Raw data for debugging
            _raw: row,
          };
        });

        console.log(`✅ Formatted ${formattedRows.length} analyses for frontend`);
        resolve(formattedRows);
      });
    });
  }

  /**
   * Simple fallback method to get basic analysis history
   */
  getBasicAnalysisHistory() {
    return new Promise((resolve, reject) => {
      console.log("📊 Fetching basic analysis history (fallback)...");

      if (!this.db) {
        console.error("❌ Database connection not available for basic query");
        resolve([]);
        return;
      }

      // Simple query without joins or decompression
      const sql = `
        SELECT
          id,
          directory_path as directory,
          total_files as totalFiles,
          total_size as totalSize,
          last_analyzed as lastAnalyzed,
          created_at
        FROM analyses
        ORDER BY last_analyzed DESC
        LIMIT 10
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error("❌ Basic query failed:", err);
          resolve([]);
          return;
        }

        console.log(`📋 Basic query found ${rows.length} analyses`);

        const basicRows = rows.map((row) => ({
          ...row,
          analysisId: row.id.toString(),
          status: "completed",
        }));

        resolve(basicRows);
      });
    });
  }

  /**
   * Get current analysis for a directory (most recent)
   */
  getCurrentAnalysis(directoryPath) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    const normalizedPath = this.core.normalizePath(directoryPath);
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM analyses
        WHERE directory_path = ?
        ORDER BY last_analyzed DESC
        LIMIT 1
      `;

      this.db.get(sql, [normalizedPath], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row && row.analysis_data_compressed) {
          row.analysis_data = this.core.decompressData(row.analysis_data_compressed);
        }

        resolve(row);
      });
    });
  }

  /**
   * Store file metadata for incremental analysis
   */
  storeFileMetadata(directoryPath, files) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO file_metadata
        (directory_path, file_path, file_size, file_hash, last_modified)
        VALUES (?, ?, ?, ?, ?)
      `);

      let processed = 0;
      let errors = 0;
      let pending = files.length;

      if (pending === 0) {
        stmt.finalize();
        resolve({ processed: 0, errors: 0 });
        return;
      }

      files.forEach((file) => {
        const hash = this.core.generateHash(`${file.path}:${file.size}:${file.modified}`);
        stmt.run([directoryPath, file.path, file.size, hash, file.modified], (err) => {
          if (err) errors++;
          else processed++;
          pending--;
          if (pending === 0) {
            stmt.finalize();
            console.log(`💾 Stored metadata for ${processed} files (${errors} errors)`);
            resolve({ processed, errors });
          }
        });
      });
    });
  }

  /**
   * Get changed files since last analysis
   */
  getChangedFiles(directoryPath, currentFiles) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM file_metadata WHERE directory_path = ?";

      this.db.all(sql, [directoryPath], (err, storedFiles) => {
        if (err) {
          reject(err);
          return;
        }

        const storedMap = new Map(storedFiles.map((f) => [f.file_path, f]));

        const changed = [];
        const unchanged = [];
        const removed = [];

        currentFiles.forEach((file) => {
          const stored = storedMap.get(file.path);
          const currentHash = this.core.generateHash(`${file.path}:${file.size}:${file.modified}`);

          if (!stored) {
            changed.push({ ...file, status: "new" });
          } else if (stored.file_hash !== currentHash) {
            changed.push({ ...file, status: "modified" });
          } else {
            unchanged.push(file);
          }
        });

        // Find removed files
        const currentPaths = new Set(currentFiles.map((f) => f.path));
        storedFiles.forEach((stored) => {
          if (!currentPaths.has(stored.file_path)) {
            removed.push(stored);
          }
        });

        resolve({ changed, unchanged, removed, total: currentFiles.length });
      });
    });
  }

  /**
   * Get analysis history (all completed analyses) with pagination
   */
  getAnalysisHistory(limit = 50, offset = 0) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          id as analysisId,
          directory_path as directory,
          total_files as totalFiles,
          total_size as totalSize,
          metadata_hash as metadataHash,
          last_analyzed as lastAnalyzed,
          created_at as createdAt
        FROM analyses
        ORDER BY last_analyzed DESC
        LIMIT ? OFFSET ?
      `;

      this.db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Get total count
        this.db.get("SELECT COUNT(*) as total FROM analyses", [], (countErr, countRow) => {
          if (countErr) {
            reject(countErr);
            return;
          }

          resolve({
            analyses: rows.map((row) => ({
              ...row,
              status: "complete",
              analysisId: row.analysisId.toString(),
            })),
            total: countRow.total,
          });
        });
      });
    });
  }
}

module.exports = AnalysisDatabase;
