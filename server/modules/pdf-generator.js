/**
 * PDF Report Generator Module
 * Generates professional PDF reports from analysis data using Playwright
 */

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");

class PDFGenerator {
  constructor(options = {}) {
    this.reportsDir = options.reportsDir || path.join(__dirname, "..", "reports");
    this.templatesDir = options.templatesDir || path.join(__dirname, "..", "templates", "reports");
    this.browser = null;
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      await fs.mkdir(this.templatesDir, { recursive: true });
    } catch (err) {
      console.error("Error creating directories:", err);
    }
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Generate a unique report ID based on analysis data
   */
  generateReportId(analysisId, type = "analysis") {
    const timestamp = Date.now();
    const hash = crypto
      .createHash("md5")
      .update(`${analysisId}-${type}-${timestamp}`)
      .digest("hex")
      .substring(0, 8);
    return `${type}_${hash}_${timestamp}`;
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Generate HTML template for analysis report
   */
  generateAnalysisHTML(data, options = {}) {
    const {
      title = "Space Analysis Report",
      subtitle = "Detailed directory analysis",
      includeFiles = true,
      includeCharts = true,
      fileLimit = 100,
    } = options;

    const analysisDate = new Date().toLocaleString();
    const totalFiles = data.files?.length || data.totalFiles || 0;
    const totalSize = this.formatBytes(data.totalSize || 0);

    // Get top categories
    const categories = data.categories || {};
    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Get top extensions
    const extensions = data.extensions || {};
    const sortedExtensions = Object.entries(extensions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Get largest files
    const largestFiles = (data.files || []).sort((a, b) => b.size - a.size).slice(0, fileLimit);

    const categoryRows = sortedCategories
      .map(
        ([cat, count], i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${cat}</td>
          <td>${count.toLocaleString()}</td>
          <td>${((count / totalFiles) * 100).toFixed(1)}%</td>
        </tr>
      `
      )
      .join("");

    const extensionRows = sortedExtensions
      .map(
        ([ext, count], i) => `
        <tr>
          <td>${i + 1}</td>
          <td>.${ext}</td>
          <td>${count.toLocaleString()}</td>
          <td>${((count / totalFiles) * 100).toFixed(1)}%</td>
        </tr>
      `
      )
      .join("");

    const fileRows = largestFiles
      .map(
        (file, i) => `
        <tr>
          <td>${i + 1}</td>
          <td class="filename">${file.name}</td>
          <td>${file.category || "Unknown"}</td>
          <td class="size">${this.formatBytes(file.size)}</td>
          <td class="path">${file.path}</td>
        </tr>
      `
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        .header {
            text-align: center;
            padding-bottom: 30px;
            border-bottom: 3px solid #4a90d9;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 32px;
            color: #2c3e50;
            margin-bottom: 10px;
        }

        .header .subtitle {
            font-size: 16px;
            color: #7f8c8d;
            margin-bottom: 20px;
        }

        .meta-info {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
            font-size: 14px;
            color: #666;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
        }

        .card.secondary {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .card.tertiary {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .card.quaternary {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }

        .card-value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .card-label {
            font-size: 14px;
            opacity: 0.9;
        }

        .section {
            margin-bottom: 40px;
        }

        .section h2 {
            font-size: 24px;
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #ecf0f1;
        }

        .section h3 {
            font-size: 18px;
            color: #34495e;
            margin-bottom: 15px;
            margin-top: 25px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 14px;
        }

        th {
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
        }

        tr:nth-child(even) {
            background: #f8f9fa;
        }

        tr:hover {
            background: #e3f2fd;
        }

        .filename {
            font-weight: 500;
            color: #2c3e50;
        }

        .size {
            font-family: 'Courier New', monospace;
            color: #27ae60;
            font-weight: 600;
        }

        .path {
            font-size: 12px;
            color: #7f8c8d;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .footer {
            text-align: center;
            padding-top: 30px;
            border-top: 2px solid #ecf0f1;
            color: #95a5a6;
            font-size: 12px;
        }

        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }

        .badge-primary {
            background: #3498db;
            color: white;
        }

        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }

        @media (max-width: 768px) {
            .two-column {
                grid-template-columns: 1fr;
            }
        }

        .chart-placeholder {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 ${title}</h1>
            <p class="subtitle">${subtitle}</p>
            <div class="meta-info">
                <span><strong>Generated:</strong> ${analysisDate}</span>
                <span><strong>Directory:</strong> ${data.directory || "Unknown"}</span>
                <span><strong>Report ID:</strong> ${data.analysisId || "N/A"}</span>
            </div>
        </div>

        <div class="summary-cards">
            <div class="card">
                <div class="card-value">${totalFiles.toLocaleString()}</div>
                <div class="card-label">Total Files</div>
            </div>
            <div class="card secondary">
                <div class="card-value">${totalSize}</div>
                <div class="card-label">Total Size</div>
            </div>
            <div class="card tertiary">
                <div class="card-value">${Object.keys(categories).length}</div>
                <div class="card-label">Categories</div>
            </div>
            <div class="card quaternary">
                <div class="card-value">${Object.keys(extensions).length}</div>
                <div class="card-label">File Types</div>
            </div>
        </div>

        <div class="section">
            <h2>📁 Category Distribution</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Category</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoryRows || '<tr><td colspan="4" style="text-align: center; color: #95a5a6;">No category data available</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📎 File Extension Distribution</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Extension</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${extensionRows || '<tr><td colspan="4" style="text-align: center; color: #95a5a6;">No extension data available</td></tr>'}
                </tbody>
            </table>
        </div>

        ${
          includeFiles
            ? `
        <div class="section">
            <h2>📄 Largest Files (${largestFiles.length} of ${totalFiles})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Filename</th>
                        <th>Category</th>
                        <th>Size</th>
                        <th>Path</th>
                    </tr>
                </thead>
                <tbody>
                    ${fileRows || '<tr><td colspan="5" style="text-align: center; color: #95a5a6;">No file data available</td></tr>'}
                </tbody>
            </table>
        </div>
        `
            : ""
        }

        <div class="footer">
            <p>Generated by Space Analyzer | ${analysisDate}</p>
            <p>This report provides a comprehensive analysis of your directory structure and file distribution.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate PDF from analysis data
   */
  async generateAnalysisReport(analysisData, options = {}) {
    const reportId = this.generateReportId(analysisData.analysisId || "unknown", "analysis");
    const pdfPath = path.join(this.reportsDir, `${reportId}.pdf`);

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Generate HTML content
      const htmlContent = this.generateAnalysisHTML(analysisData, options);

      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: "networkidle" });

      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666; padding: 10px;">
            Space Analyzer Report
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666; padding: 10px;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
      });

      await page.close();

      // Get file stats
      const stats = await fs.stat(pdfPath);

      return {
        success: true,
        reportId,
        pdfPath,
        filename: `${reportId}.pdf`,
        size: stats.size,
        createdAt: stats.birthtime,
        downloadUrl: `/api/reports/download/${reportId}.pdf`,
        viewUrl: `/api/reports/view/${reportId}.pdf`,
      };
    } catch (error) {
      console.error("PDF Generation Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate complexity analysis PDF report
   */
  async generateComplexityReport(complexityData, options = {}) {
    const reportId = this.generateReportId(complexityData.directory || "unknown", "complexity");
    const pdfPath = path.join(this.reportsDir, `${reportId}.pdf`);

    // Implementation similar to analysis report with complexity-specific template
    // This is a simplified version
    const { directory, files, summary } = complexityData;

    const htmlContent = this.generateComplexityHTML(complexityData, options);

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      await page.setContent(htmlContent, { waitUntil: "networkidle" });

      await page.pdf({
        path: pdfPath,
        format: "A4",
        printBackground: true,
        margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
      });

      await page.close();

      const stats = await fs.stat(pdfPath);

      return {
        success: true,
        reportId,
        pdfPath,
        filename: `${reportId}.pdf`,
        size: stats.size,
        downloadUrl: `/api/reports/download/${reportId}.pdf`,
        viewUrl: `/api/reports/view/${reportId}.pdf`,
      };
    } catch (error) {
      console.error("Complexity Report Generation Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate HTML for complexity report
   */
  generateComplexityHTML(data, options = {}) {
    const { directory, files = [], summary = {} } = data;
    const title = options.title || "Code Complexity Analysis Report";

    const fileRows = files
      .slice(0, options.fileLimit || 50)
      .map(
        (file, i) => `
        <tr>
          <td>${i + 1}</td>
          <td class="filename">${path.basename(file.file_path)}</td>
          <td>${file.language || "Unknown"}</td>
          <td>${file.cyclomatic_complexity}</td>
          <td>${file.complexity_grade}</td>
          <td>${file.refactoring_priority}</td>
        </tr>
      `
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            margin: 0;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 30px;
            border-bottom: 3px solid #e74c3c;
            margin-bottom: 30px;
        }
        h1 { color: #2c3e50; font-size: 32px; margin-bottom: 10px; }
        .subtitle { color: #7f8c8d; font-size: 16px; }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .card {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
        }
        .card-value { font-size: 36px; font-weight: bold; margin-bottom: 5px; }
        .card-label { font-size: 14px; opacity: 0.9; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 14px;
        }
        th {
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
        }
        tr:nth-child(even) { background: #f8f9fa; }
        .grade-a { color: #27ae60; font-weight: bold; }
        .grade-b { color: #3498db; font-weight: bold; }
        .grade-c { color: #f39c12; font-weight: bold; }
        .grade-d { color: #e67e22; font-weight: bold; }
        .grade-f { color: #e74c3c; font-weight: bold; }
        .priority-critical { color: #e74c3c; font-weight: bold; }
        .priority-high { color: #e67e22; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 ${title}</h1>
            <p class="subtitle">Directory: ${directory || "Unknown"}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-cards">
            <div class="card">
                <div class="card-value">${summary.total_files || files.length}</div>
                <div class="card-label">Files Analyzed</div>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);">
                <div class="card-value">${summary.avg_complexity?.toFixed(1) || "N/A"}</div>
                <div class="card-label">Avg Complexity</div>
            </div>
            <div class="card" style="background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);">
                <div class="card-value">${summary.critical_count || 0}</div>
                <div class="card-label">Critical Files</div>
            </div>
        </div>

        <h2>Files by Complexity</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Filename</th>
                    <th>Language</th>
                    <th>Complexity</th>
                    <th>Grade</th>
                    <th>Priority</th>
                </tr>
            </thead>
            <tbody>
                ${fileRows}
            </tbody>
        </table>
    </div>
</body>
</html>`;
  }

  /**
   * Get list of generated reports with pagination
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Items per page
   * @returns {Object} - { reports, total, page, limit, totalPages }
   */
  async getReportsList(options = {}) {
    const { page = 1, limit = 50 } = options;

    try {
      const files = await fs.readdir(this.reportsDir);
      const reports = [];

      for (const file of files) {
        if (file.endsWith(".pdf")) {
          const stats = await fs.stat(path.join(this.reportsDir, file));
          const reportId = file.replace(".pdf", "");
          reports.push({
            reportId,
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            downloadUrl: `/api/reports/download/${file}`,
            viewUrl: `/api/reports/view/${file}`,
          });
        }
      }

      // Sort by creation date (newest first)
      reports.sort((a, b) => b.createdAt - a.createdAt);

      const total = reports.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedReports = reports.slice(startIndex, startIndex + limit);

      return {
        reports: paginatedReports,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error("Error listing reports:", error);
      return { reports: [], total: 0, page, limit, totalPages: 0 };
    }
  }

  /**
   * Delete old reports
   */
  async cleanupOldReports(maxAgeDays = 7) {
    try {
      const files = await fs.readdir(this.reportsDir);
      const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
      let deleted = 0;

      for (const file of files) {
        if (file.endsWith(".pdf")) {
          const filePath = path.join(this.reportsDir, file);
          const stats = await fs.stat(filePath);

          if (stats.birthtime.getTime() < cutoff) {
            await fs.unlink(filePath);
            deleted++;
          }
        }
      }

      return { deleted, maxAgeDays };
    } catch (error) {
      console.error("Error cleaning up reports:", error);
      return { deleted: 0, error: error.message };
    }
  }
}

module.exports = PDFGenerator;
