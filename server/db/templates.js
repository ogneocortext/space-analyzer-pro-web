/**
 * Database Templates Module
 * Handles report template CRUD operations
 */

class TemplatesDatabase {
  constructor(core) {
    this.core = core;
    this.db = null;
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Create a new report template
   */
  createTemplate(template) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO report_templates
        (template_name, template_type, description, header_html, footer_html, css_styles,
         color_scheme, logo_url, include_sections, file_limit, is_default, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          template.templateName,
          template.templateType,
          template.description || null,
          template.headerHtml || null,
          template.footerHtml || null,
          template.cssStyles || null,
          template.colorScheme ? JSON.stringify(template.colorScheme) : null,
          template.logoUrl || null,
          template.includeSections ? JSON.stringify(template.includeSections) : null,
          template.fileLimit || 100,
          template.isDefault ? 1 : 0,
          template.isActive !== false ? 1 : 0,
        ],
        function (err) {
          if (err) {
            console.error("Error creating template:", err);
            reject(err);
          } else {
            resolve({ id: this.lastID, ...template });
          }
        }
      );
    });
  }

  /**
   * Get all templates (optionally filtered by type)
   */
  getTemplates(templateType = null, activeOnly = true) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM report_templates WHERE 1=1`;
      const params = [];

      if (templateType) {
        sql += ` AND template_type = ?`;
        params.push(templateType);
      }

      if (activeOnly) {
        sql += ` AND is_active = 1`;
      }

      sql += ` ORDER BY is_default DESC, created_at DESC`;

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        // Parse JSON fields with proper error handling
        rows.forEach((row) => {
          try {
            if (row.color_scheme) row.color_scheme = JSON.parse(row.color_scheme);
          } catch (e) {
            console.error(`Failed to parse color_scheme for template ${row.id}:`, e.message);
            row.color_scheme = null; // Reset to null instead of keeping invalid string
          }
          try {
            if (row.include_sections) row.include_sections = JSON.parse(row.include_sections);
          } catch (e) {
            console.error(`Failed to parse include_sections for template ${row.id}:`, e.message);
            row.include_sections = null; // Reset to null instead of keeping invalid string
          }
        });

        resolve(rows);
      });
    });
  }

  /**
   * Get a single template by ID
   */
  getTemplateById(templateId) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM report_templates WHERE id = ?`;

      this.db.get(sql, [templateId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          try {
            if (row.color_scheme) row.color_scheme = JSON.parse(row.color_scheme);
          } catch (e) {
            console.error(`Failed to parse color_scheme for template ${row.id}:`, e.message);
            row.color_scheme = null;
          }
          try {
            if (row.include_sections) row.include_sections = JSON.parse(row.include_sections);
          } catch (e) {
            console.error(`Failed to parse include_sections for template ${row.id}:`, e.message);
            row.include_sections = null;
          }
        }

        resolve(row);
      });
    });
  }

  /**
   * Get default template for a type
   */
  getDefaultTemplate(templateType) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM report_templates
        WHERE template_type = ? AND is_default = 1 AND is_active = 1
        LIMIT 1
      `;

      this.db.get(sql, [templateType], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          try {
            if (row.color_scheme) row.color_scheme = JSON.parse(row.color_scheme);
            if (row.include_sections) row.include_sections = JSON.parse(row.include_sections);
          } catch (e) {
            // Keep as strings if parsing fails
          }
        }

        resolve(row);
      });
    });
  }

  /**
   * Update a template
   */
  updateTemplate(templateId, updates) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      if (updates.templateName !== undefined) {
        fields.push("template_name = ?");
        values.push(updates.templateName);
      }
      if (updates.description !== undefined) {
        fields.push("description = ?");
        values.push(updates.description);
      }
      if (updates.headerHtml !== undefined) {
        fields.push("header_html = ?");
        values.push(updates.headerHtml);
      }
      if (updates.footerHtml !== undefined) {
        fields.push("footer_html = ?");
        values.push(updates.footerHtml);
      }
      if (updates.cssStyles !== undefined) {
        fields.push("css_styles = ?");
        values.push(updates.cssStyles);
      }
      if (updates.colorScheme !== undefined) {
        fields.push("color_scheme = ?");
        values.push(JSON.stringify(updates.colorScheme));
      }
      if (updates.logoUrl !== undefined) {
        fields.push("logo_url = ?");
        values.push(updates.logoUrl);
      }
      if (updates.includeSections !== undefined) {
        fields.push("include_sections = ?");
        values.push(JSON.stringify(updates.includeSections));
      }
      if (updates.fileLimit !== undefined) {
        fields.push("file_limit = ?");
        values.push(updates.fileLimit);
      }
      if (updates.isDefault !== undefined) {
        fields.push("is_default = ?");
        values.push(updates.isDefault ? 1 : 0);
      }
      if (updates.isActive !== undefined) {
        fields.push("is_active = ?");
        values.push(updates.isActive ? 1 : 0);
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");

      const sql = `UPDATE report_templates SET ${fields.join(", ")} WHERE id = ?`;
      values.push(templateId);

      this.db.run(sql, values, function (err) {
        if (err) {
          console.error("Error updating template:", err);
          reject(err);
        } else {
          resolve({ updated: this.changes > 0, changes: this.changes });
        }
      });
    });
  }

  /**
   * Delete a template
   */
  deleteTemplate(templateId) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM report_templates WHERE id = ?`;

      this.db.run(sql, [templateId], function (err) {
        if (err) {
          console.error("Error deleting template:", err);
          reject(err);
        } else {
          resolve({ deleted: this.changes > 0, changes: this.changes });
        }
      });
    });
  }

  /**
   * Set a template as default for its type
   */
  setDefaultTemplate(templateId, templateType) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      // First, unset any existing default for this type
      const unsetSql = `UPDATE report_templates SET is_default = 0 WHERE template_type = ?`;

      this.db.run(unsetSql, [templateType], (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Then set the new default
        const setSql = `UPDATE report_templates SET is_default = 1 WHERE id = ?`;

        this.db.run(setSql, [templateId], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ updated: this.changes > 0 });
          }
        });
      });
    });
  }

  /**
   * Duplicate a template
   */
  duplicateTemplate(templateId, newName) {
    if (!this.db) {
      return Promise.reject(new Error("Database not initialized"));
    }

    return new Promise((resolve, reject) => {
      this.getTemplateById(templateId)
        .then((template) => {
          if (!template) {
            reject(new Error("Template not found"));
            return;
          }

          // Create new template based on existing
          const newTemplate = {
            templateName: newName || `${template.template_name} (Copy)`,
            templateType: template.template_type,
            description: template.description,
            headerHtml: template.header_html,
            footerHtml: template.footer_html,
            cssStyles: template.css_styles,
            colorScheme: template.color_scheme,
            logoUrl: template.logo_url,
            includeSections: template.include_sections,
            fileLimit: template.file_limit,
            isDefault: false,
            isActive: true,
          };

          return this.createTemplate(newTemplate);
        })
        .then(resolve)
        .catch(reject);
    });
  }
}

module.exports = TemplatesDatabase;
