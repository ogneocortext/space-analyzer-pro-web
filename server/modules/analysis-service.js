const path = require("path");
const { promises: fsPromises, existsSync, statSync } = require("fs");

/**
 * Run analysis using native Rust scanner
 * @param {Object} nativeScanner - Native scanner instance
 * @param {string} analysisId - Analysis ID
 * @param {string} directoryPath - Directory path
 * @param {Object} options - Analysis options
 * @param {Function} broadcast - Broadcast function
 * @returns {Promise<Object>} Analysis result
 */
async function runNativeScannerAnalysis(
  nativeScanner,
  analysisId,
  directoryPath,
  options,
  broadcast
) {
  const startTime = Date.now();

  if (!nativeScanner) {
    throw new Error("Native scanner not available");
  }

  console.log(`🔍 Using Rust scanner for full analysis: ${directoryPath}`);

  // Use the full Rust scanner for speed and reliability
  const scanner = new nativeScanner.NativeScanner();
  const scanResult = scanner.scan(
    directoryPath,
    options.recursive !== false,
    options.includeHidden || false,
    options.maxDepth || 20
  );

  const result = JSON.parse(scanResult);

  // Broadcast progress updates
  broadcast({
    type: "progress",
    analysisId,
    files: result.total_files || 0,
    percentage: 100,
    currentFile: "Complete",
    status: "complete",
  });

  // Convert to expected format and preserve Windows API fields
  const files = result.files || [];
  const categories = result.categories || {};

  // Calculate Windows API summary stats
  let hardLinkCount = 0;
  let hardLinkSavings = 0;
  let adsCount = 0;
  let compressedCount = 0;
  let compressedSavings = 0;
  let sparseCount = 0;
  let reparsePointCount = 0;

  files.forEach((file) => {
    if (file.is_hard_link) hardLinkCount++;
    if (file.has_ads) adsCount++;
    if (file.is_compressed) {
      compressedCount++;
      if (file.compressed_size && file.size) {
        compressedSavings += file.size - file.compressed_size;
      }
    }
    if (file.is_sparse) sparseCount++;
    if (file.is_reparse_point) reparsePointCount++;
  });

  const windowsStats = {
    hardLinkCount,
    hardLinkSavings: result.hard_link_savings || 0,
    adsCount,
    compressedCount,
    compressedSavings,
    sparseCount,
    reparsePointCount,
  };

  // Broadcast individual file events for real-time display
  files.forEach((file, index) => {
    if (index < 50) {
      // Only broadcast first 50 to avoid overwhelming
      // Ensure file.name is not a hash - use path if name is a hash
      let displayName = file.name;
      if (!displayName || /^[a-f0-9]{40}$/.test(displayName)) {
        // Extract from path if available
        if (file.path) {
          const pathParts = file.path.split(/[/\\]/);
          for (let i = pathParts.length - 1; i >= 0; i--) {
            const part = pathParts[i];
            if (part && part.length > 0 && !/^[a-f0-9]{40}$/.test(part) && part !== displayName) {
              displayName = part;
              break;
            }
          }
        }
        // Fallback to a generic name
        if (!displayName || /^[a-f0-9]{40}$/.test(displayName)) {
          displayName = "file_" + (index + 1);
        }
      }

      broadcast({
        type: "file_scanned",
        analysisId,
        file: {
          name: displayName,
          path: file.path,
          size: file.size,
          extension: file.extension,
          category: file.category,
          // Windows API fields
          created: file.created,
          accessed: file.accessed,
          has_ads: file.has_ads,
          ads_count: file.ads_count,
          is_compressed: file.is_compressed,
          compressed_size: file.compressed_size,
          is_sparse: file.is_sparse,
          is_reparse_point: file.is_reparse_point,
          reparse_tag: file.reparse_tag,
          owner: file.owner,
          is_hard_link: file.is_hard_link,
          hard_link_count: file.hard_link_count,
        },
        fileCount: index + 1,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Sort files by size and get largest files
  const sortedFiles = [...files].sort((a, b) => b.size - a.size);
  const largestFiles = sortedFiles.slice(0, 5).map((f) => ({
    name: f.name,
    path: f.path,
    size: f.size,
    category: f.category,
  }));

  return {
    totalFiles: result.total_files || files.length,
    totalSize: result.total_size || 0,
    files,
    categories,
    extensionStats: result.extension_stats || {},
    path: directoryPath,
    largestFiles,
    duplicateCount: 0, // Will be calculated separately if needed
    duration: Date.now() - startTime,
    windowsStats,
  };
}

/**
 * Convert Rust output to web format
 * @param {Object} rustData - Rust scanner output
 * @param {string} analysisId - Analysis ID
 * @param {boolean} isMlSummary - Whether this is an ML summary
 * @param {string} directoryPath - Directory path
 * @returns {Promise<Object>} Converted data
 */
async function convertRustOutputToWebFormat(
  rustData,
  analysisId,
  isMlSummary = false,
  directoryPath
) {
  const duration = Date.now() - rustData.startTime;

  if (isMlSummary) {
    // ML summary format for large directories
    return {
      totalFiles: rustData.total_files || rustData.file_count || 0,
      totalSize: rustData.total_size || rustData.total_bytes || 0,
      path: directoryPath,
      categories: rustData.categories || rustData.category_stats || {},
      largestFiles: rustData.largest_files || rustData.large_files || [],
      duplicateCount: rustData.duplicate_count || 0,
      extensionStats: rustData.extension_stats || {},
      isMlSummary: true,
      duration,
    };
  }

  // Standard format with full file list
  const files = rustData.files || [];

  // Calculate Windows API summary stats
  let hardLinkCount = 0;
  let hardLinkSavings = 0;
  let adsCount = 0;
  let compressedCount = 0;
  let compressedSavings = 0;
  let sparseCount = 0;
  let reparsePointCount = 0;

  files.forEach((file) => {
    if (file.is_hard_link) hardLinkCount++;
    if (file.has_ads) adsCount++;
    if (file.is_compressed) {
      compressedCount++;
      if (file.compressed_size && file.size) {
        compressedSavings += file.size - file.compressed_size;
      }
    }
    if (file.is_sparse) sparseCount++;
    if (file.is_reparse_point) reparsePointCount++;
  });

  const windowsStats = {
    hardLinkCount,
    hardLinkSavings: rustData.hard_link_savings || 0,
    adsCount,
    compressedCount,
    compressedSavings,
    sparseCount,
    reparsePointCount,
  };

  // Sort files by size and get largest files
  const sortedFiles = [...files].sort((a, b) => b.size - a.size);
  const largestFiles = sortedFiles.slice(0, 5).map((f) => ({
    name: f.name,
    path: f.path,
    size: f.size,
    category: f.category,
  }));

  return {
    totalFiles: rustData.total_files || files.length,
    totalSize: rustData.total_size || 0,
    files,
    categories: rustData.categories || {},
    extensionStats: rustData.extension_stats || {},
    path: directoryPath,
    largestFiles,
    duplicateCount: rustData.duplicate_count || 0,
    duration,
    windowsStats,
  };
}

/**
 * Run JavaScript analysis
 * @param {string} analysisId - Analysis ID
 * @param {string} directoryPath - Directory path
 * @returns {Promise<Object>} Analysis result
 */
async function runJsAnalysis(analysisId, directoryPath) {
  const startTime = Date.now();
  const files = [];
  let totalSize = 0;
  const categories = {};
  const extensionStats = {};

  async function walk(dir) {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        try {
          const stats = await fsPromises.stat(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          const category = getCategory(ext);

          files.push({
            name: entry.name,
            path: fullPath,
            size: stats.size,
            extension: ext,
            category,
          });

          totalSize += stats.size;
          categories[category] = (categories[category] || 0) + 1;
          extensionStats[ext] = (extensionStats[ext] || 0) + 1;
        } catch (error) {
          // Skip files that can't be accessed
        }
      }
    }
  }

  await walk(directoryPath);
  const duration = Date.now() - startTime;

  // Sort files by size and get largest files
  const sortedFiles = [...files].sort((a, b) => b.size - a.size);
  const largestFiles = sortedFiles.slice(0, 5).map((f) => ({
    name: f.name,
    path: f.path,
    size: f.size,
    category: "Other",
  }));

  console.log(`✅ JS Analysis complete: ${files.length} files in ${duration}ms`);
  return {
    totalFiles: files.length,
    totalSize,
    files,
    path: directoryPath,
    largestFiles,
    duplicateCount: 0,
    extensionStats,
    categories,
    duration,
  };
}

/**
 * Get category based on file extension
 * @param {string} ext - File extension
 * @returns {string} Category name
 */
function getCategory(ext) {
  const categoryMap = {
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "React/TypeScript",
    ".jsx": "React",
    ".py": "Python",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".h": "C/C++ Header",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".cs": "C#",
    ".md": "Markdown",
    ".txt": "Documents",
    ".pdf": "Documents",
    ".doc": "Documents",
    ".docx": "Documents",
    ".xls": "Documents",
    ".xlsx": "Documents",
    ".ppt": "Documents",
    ".pptx": "Documents",
    ".jpg": "Images",
    ".jpeg": "Images",
    ".png": "Images",
    ".gif": "Images",
    ".svg": "Images",
    ".webp": "Images",
    ".mp3": "Audio",
    ".wav": "Audio",
    ".ogg": "Audio",
    ".mp4": "Videos",
    ".avi": "Videos",
    ".mkv": "Videos",
    ".mov": "Videos",
    ".zip": "Archives",
    ".rar": "Archives",
    ".7z": "Archives",
    ".tar": "Archives",
    ".gz": "Archives",
    ".exe": "Executables",
    ".dll": "System",
    ".so": "System",
    ".dylib": "System",
    ".sh": "Shell Script",
    ".bat": "Batch Script",
    ".ps1": "PowerShell",
    ".json": "Configuration/Data",
    ".xml": "Configuration/Data",
    ".yaml": "Configuration/Data",
    ".yml": "Configuration/Data",
    ".toml": "Configuration/Data",
    ".ini": "Configuration/Data",
  };

  return categoryMap[ext] || "Other";
}

module.exports = {
  runNativeScannerAnalysis,
  convertRustOutputToWebFormat,
  runJsAnalysis,
};
