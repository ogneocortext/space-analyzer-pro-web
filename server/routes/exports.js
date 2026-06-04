/**
 * Export Routes Module
 * Handles CSV, JSON, TXT exports and report generation
 */

const express = require("express");
const path = require("path");
const fs = require("fs");

class ExportRoutes {
  constructor(server) {
    this.server = server;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Export endpoint (CSV, JSON, TXT)
    this.router.post("/export", async (req, res) => {
      try {
        const { data, format = "json", filename = "analysis" } = req.body;

        if (!data) {
          return res.status(400).json({ error: "Data is required" });
        }

        // Whitelist validation for export formats
        const allowedFormats = ["csv", "json", "txt"];
        const normalizedFormat = format.toLowerCase().trim();

        if (!allowedFormats.includes(normalizedFormat)) {
          return res.status(400).json({
            error: "Invalid format",
            message: `Format must be one of: ${allowedFormats.join(", ")}`,
          });
        }

        let content;
        let mimeType;
        let extension;

        switch (normalizedFormat) {
          case "csv":
            content = this.convertToCSV(data);
            mimeType = "text/csv";
            extension = "csv";
            break;
          case "txt":
            content = this.convertToTXT(data);
            mimeType = "text/plain";
            extension = "txt";
            break;
          case "json":
          default:
            content = JSON.stringify(data, null, 2);
            mimeType = "application/json";
            extension = "json";
            break;
        }

        // Generate temp file path
        const tempDir = path.join(__dirname, "..", "temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFile = path.join(tempDir, `${filename}_${Date.now()}.${extension}`);
        fs.writeFileSync(tempFile, content);

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.${extension}"`);
        res.send(content);

        // Clean up temp file after sending
        setTimeout(() => {
          try {
            fs.unlinkSync(tempFile);
          } catch (err) {
            // Ignore cleanup errors
          }
        }, 60000);
      } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Generate PDF report
    this.router.post("/reports/pdf", async (req, res) => {
      try {
        const { analysisId, title = "Analysis Report" } = req.body;

        const analysis = this.server.analysisResults.get(analysisId);
        if (!analysis) {
          return res.status(404).json({ error: "Analysis not found" });
        }

        // For now, generate HTML report as PDF generation requires additional libraries
        const htmlReport = this.generateHTMLReport(analysis, title);

        res.setHeader("Content-Type", "text/html");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${title.replace(/\s+/g, "_")}.html"`
        );
        res.send(htmlReport);
      } catch (error) {
        console.error("Report generation error:", error);
        res.status(500).json({ error: error.message });
      }
    });

    // Download analysis data
    this.router.get("/download/:analysisId", async (req, res) => {
      try {
        const { analysisId } = req.params;
        const { format = "json" } = req.query;

        const analysis = this.server.analysisResults.get(analysisId);
        if (!analysis) {
          return res.status(404).json({ error: "Analysis not found" });
        }

        const sanitizedId = analysisId.replace(/[^a-zA-Z0-9_-]/g, "");
        const filename = `analysis_${sanitizedId}`;

        let content;
        let mimeType;
        let extension;

        switch (format.toLowerCase()) {
          case "csv":
            content = this.convertToCSV(analysis.files || []);
            mimeType = "text/csv";
            extension = "csv";
            break;
          case "txt":
            content = this.convertToTXT(analysis);
            mimeType = "text/plain";
            extension = "txt";
            break;
          case "json":
          default:
            content = JSON.stringify(analysis, null, 2);
            mimeType = "application/json";
            extension = "json";
            break;
        }

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.${extension}"`);
        res.send(content);
      } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return "";
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  }

  convertToTXT(data) {
    if (typeof data === "object") {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  }

  generateHTMLReport(analysis, title) {
    const date = new Date().toLocaleString();
    const totalFiles = analysis.files?.length || analysis.totalFiles || 0;
    const totalSize = this.formatBytes(analysis.totalSize || 0);

    const topFiles = (analysis.files || [])
      .slice(0, 20)
      .map(
        (f) => `
      <tr>
        <td>${f.name}</td>
        <td>${f.path}</td>
        <td>${this.formatBytes(f.size)}</td>
        <td>${f.category || "Unknown"}</td>
      </tr>
    `
      )
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .summary { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated: ${date}</p>

  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Files:</strong> ${totalFiles.toLocaleString()}</p>
    <p><strong>Total Size:</strong> ${totalSize}</p>
    <p><strong>Directory:</strong> ${analysis.directory || "Unknown"}</p>
  </div>

  <h2>Top 20 Largest Files</h2>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Path</th>
        <th>Size</th>
        <th>Category</th>
      </tr>
    </thead>
    <tbody>
      ${topFiles}
    </tbody>
  </table>
</body>
</html>`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  getRouter() {
    return this.router;
  }
}

module.exports = ExportRoutes;
