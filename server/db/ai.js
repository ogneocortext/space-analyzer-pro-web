/**
 * Database AI Module
 * Handles AI responses, context storage, and caching
 */

class AIDatabase {
  constructor(core) {
    this.core = core;
    this.db = null;
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Store AI response for future retrieval
   */
  storeAIResponse(question, answer, contextHash, modelUsed, responseTime) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO ai_responses
        (question, answer, context_hash, model_used, response_time)
        VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [question, answer, contextHash, modelUsed, responseTime], function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  /**
   * Find similar cached response
   */
  findSimilarResponse(question, contextHash) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM ai_responses
        WHERE context_hash = ?
        ORDER BY hit_count DESC, last_accessed DESC
        LIMIT 1
      `;

      this.db.get(sql, [contextHash], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Update hit count and last accessed
          const updateSql = `
            UPDATE ai_responses
            SET hit_count = hit_count + 1, last_accessed = CURRENT_TIMESTAMP
            WHERE id = ?
          `;
          this.db.run(updateSql, [row.id]);
        }

        resolve(row);
      });
    });
  }

  /**
   * Store AI analysis context for Ollama prompts
   */
  storeAIAnalysisContext(
    analysisId,
    directoryPath,
    contextType,
    contextPayload,
    modelUsed,
    promptTemplate
  ) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO ai_analysis_context
        (analysis_id, directory_path, context_type, context_payload, model_used, prompt_template)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          analysisId,
          directoryPath,
          contextType,
          JSON.stringify(contextPayload),
          modelUsed,
          promptTemplate,
        ],
        function (err) {
          if (err) {
            console.error("Error storing AI context:", err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Get AI analysis context for a directory
   */
  getAIAnalysisContext(analysisId, contextType = null) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      let sql = `
        SELECT * FROM ai_analysis_context
        WHERE analysis_id = ?
      `;
      const params = [analysisId];

      if (contextType) {
        sql += ` AND context_type = ?`;
        params.push(contextType);
      }

      sql += ` ORDER BY created_at DESC LIMIT 1`;

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row && row.context_payload) {
          try {
            row.context_payload = JSON.parse(row.context_payload);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }

        resolve(row);
      });
    });
  }
}

module.exports = AIDatabase;
