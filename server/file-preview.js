const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FilePreviewManager {
  constructor() {
    this.previewCache = new Map();
    this.maxCacheSize = 100;
    this.previewQueue = [];
    this.isProcessing = false;
  }

  async getFilePreview(filePath, options = {}) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(filePath, options);
      const cached = this.previewCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < 60000)) { // 1 minute cache
        return cached.preview;
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Build preview object
      const preview = {
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath).toLowerCase(),
        size: stats.size,
        sizeHuman: this.formatBytes(stats.size),
        modified: stats.mtime,
        created: stats.birthtime || stats.ctime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        isHidden: path.basename(filePath).startsWith('.'),
        permissions: this.formatPermissions(stats.mode),
        type: this.getFileType(filePath, stats),
        icon: this.getFileIcon(filePath, stats),
        metadata: {}
      };

      // Add additional metadata for files
      if (stats.isFile()) {
        preview.metadata = await this.getFileMetadata(filePath, options);
      }

      // Cache the preview
      this.previewCache.set(cacheKey, {
        preview,
        timestamp: Date.now()
      });

      // Maintain cache size
      if (this.previewCache.size > this.maxCacheSize) {
        this.evictOldestCache();
      }

      return preview;
    } catch (error) {
      return {
        path: filePath,
        name: path.basename(filePath),
        error: error.message,
        accessible: false
      };
    }
  }

  async getFileMetadata(filePath, options) {
    const metadata = {};
    
    try {
      // File hash (if requested and file is not too large)
      if (options.includeHash && await this.getFileSize(filePath) < 10 * 1024 * 1024) { // < 10MB
        metadata.hash = await this.calculateFileHash(filePath);
      }

      // MIME type detection
      metadata.mimeType = await this.getMimeType(filePath);

      // Text preview (if requested and file is text)
      if (options.includeTextPreview && await this.isTextFile(filePath)) {
        metadata.textPreview = await this.getTextPreview(filePath, options.previewLines || 5);
      }

      // Image metadata (if it's an image)
      if (await this.isImageFile(filePath)) {
        metadata.imageInfo = await this.getImageMetadata(filePath);
      }

      // Executable info (if applicable)
      if (await this.isExecutableFile(filePath)) {
        metadata.executableInfo = await this.getExecutableMetadata(filePath);
      }

    } catch (error) {
      // Don't let metadata errors break the preview
      console.warn(`Metadata error for ${filePath}:`, error.message);
    }

    return metadata;
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  async calculateFileHash(filePath, algorithm = 'md5') {
    try {
      const hash = crypto.createHash(algorithm);
      const stream = require('fs').createReadStream(filePath);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
      });
    } catch (error) {
      return null;
    }
  }

  async getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    // Common MIME types mapping
    const mimeTypes = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.exe': 'application/x-msdownload',
      '.dll': 'application/x-msdownload',
      '.sys': 'application/x-msdownload'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  async isTextFile(filePath) {
    const textExtensions = [
      '.txt', '.md', '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts',
      '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs',
      '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.sql',
      '.sh', '.bat', '.cmd', '.ps1', '.yml', '.yaml', '.toml', '.ini',
      '.cfg', '.conf', '.log', '.csv', '.tsv', '.dockerfile', '.gitignore'
    ];

    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext);
  }

  async getTextPreview(filePath, lines = 5) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const contentLines = content.split('\n');
      const previewLines = contentLines.slice(0, lines);
      
      return {
        lines: previewLines,
        totalLines: contentLines.length,
        truncated: contentLines.length > lines,
        encoding: 'utf8'
      };
    } catch (error) {
      return {
        error: error.message,
        lines: []
      };
    }
  }

  async isImageFile(filePath) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico', '.webp', '.tiff'];
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }

  async getImageMetadata(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        dimensions: 'Unknown', // Would need image processing library
        colorSpace: 'Unknown',
        hasTransparency: null,
        animated: path.extname(filePath).toLowerCase() === '.gif'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async isExecutableFile(filePath) {
    const execExtensions = ['.exe', '.dll', '.sys', '.msi', '.bat', '.cmd', '.ps1', '.sh'];
    const ext = path.extname(filePath).toLowerCase();
    return execExtensions.includes(ext);
  }

  async getExecutableMetadata(filePath) {
    try {
      // Basic executable info - would need more sophisticated analysis for full metadata
      const stats = await fs.stat(filePath);
      return {
        architecture: 'Unknown',
        compiled: null,
        signed: null,
        version: 'Unknown'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  getFileType(filePath, stats) {
    if (stats.isDirectory()) return 'Directory';
    if (stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      
      // File type categories
      const typeMap = {
        // Documents
        '.pdf': 'PDF Document',
        '.doc': 'Word Document',
        '.docx': 'Word Document',
        '.xls': 'Excel Spreadsheet',
        '.xlsx': 'Excel Spreadsheet',
        '.ppt': 'PowerPoint Presentation',
        '.pptx': 'PowerPoint Presentation',
        '.txt': 'Text File',
        '.md': 'Markdown Document',
        '.rtf': 'Rich Text Document',
        
        // Code
        '.js': 'JavaScript File',
        '.ts': 'TypeScript File',
        '.jsx': 'React Component',
        '.tsx': 'React Component',
        '.py': 'Python File',
        '.java': 'Java File',
        '.c': 'C Source File',
        '.cpp': 'C++ Source File',
        '.h': 'C Header File',
        '.hpp': 'C++ Header File',
        '.cs': 'C# File',
        '.php': 'PHP File',
        '.rb': 'Ruby File',
        '.go': 'Go File',
        '.rs': 'Rust File',
        '.swift': 'Swift File',
        '.kt': 'Kotlin File',
        '.scala': 'Scala File',
        '.r': 'R Script',
        '.sql': 'SQL File',
        '.sh': 'Shell Script',
        '.bat': 'Batch File',
        '.ps1': 'PowerShell Script',
        
        // Config
        '.json': 'JSON File',
        '.xml': 'XML File',
        '.yml': 'YAML File',
        '.yaml': 'YAML File',
        '.toml': 'TOML File',
        '.ini': 'INI File',
        '.cfg': 'Configuration File',
        '.conf': 'Configuration File',
        '.env': 'Environment File',
        
        // Images
        '.jpg': 'JPEG Image',
        '.jpeg': 'JPEG Image',
        '.png': 'PNG Image',
        '.gif': 'GIF Image',
        '.bmp': 'Bitmap Image',
        '.svg': 'SVG Image',
        '.ico': 'Icon File',
        '.webp': 'WebP Image',
        '.tiff': 'TIFF Image',
        
        // Audio/Video
        '.mp3': 'MP3 Audio',
        '.wav': 'WAV Audio',
        '.mp4': 'MP4 Video',
        '.avi': 'AVI Video',
        '.mov': 'QuickTime Video',
        '.flv': 'Flash Video',
        '.wmv': 'Windows Media Video',
        
        // Archives
        '.zip': 'ZIP Archive',
        '.rar': 'RAR Archive',
        '.7z': '7-Zip Archive',
        '.tar': 'TAR Archive',
        '.gz': 'GZIP Archive',
        
        // System
        '.exe': 'Executable File',
        '.dll': 'Dynamic Link Library',
        '.sys': 'System File',
        '.msi': 'Windows Installer',
        
        // Web
        '.html': 'HTML File',
        '.htm': 'HTML File',
        '.css': 'CSS Stylesheet',
        '.scss': 'SCSS Stylesheet',
        '.less': 'LESS Stylesheet'
      };
      
      return typeMap[ext] || 'File';
    }
    
    return 'Unknown';
  }

  getFileIcon(filePath, stats) {
    if (stats.isDirectory()) return 'folder';
    
    const ext = path.extname(filePath).toLowerCase();
    
    // Icon mapping
    const iconMap = {
      // Documents
      '.pdf': 'file-pdf',
      '.doc': 'file-word',
      '.docx': 'file-word',
      '.xls': 'file-excel',
      '.xlsx': 'file-excel',
      '.ppt': 'file-powerpoint',
      '.pptx': 'file-powerpoint',
      '.txt': 'file-text',
      '.md': 'file-text',
      
      // Code
      '.js': 'file-code',
      '.ts': 'file-code',
      '.jsx': 'file-code',
      '.tsx': 'file-code',
      '.py': 'file-code',
      '.java': 'file-code',
      '.c': 'file-code',
      '.cpp': 'file-code',
      '.h': 'file-code',
      '.hpp': 'file-code',
      '.cs': 'file-code',
      '.php': 'file-code',
      '.rb': 'file-code',
      '.go': 'file-code',
      '.rs': 'file-code',
      '.swift': 'file-code',
      '.kt': 'file-code',
      '.scala': 'file-code',
      '.r': 'file-code',
      '.sql': 'file-code',
      '.sh': 'file-code',
      '.bat': 'file-code',
      '.ps1': 'file-code',
      
      // Config
      '.json': 'file-code',
      '.xml': 'file-code',
      '.yml': 'file-code',
      '.yaml': 'file-code',
      '.toml': 'file-code',
      '.ini': 'file-code',
      '.cfg': 'file-code',
      '.conf': 'file-code',
      '.env': 'file-code',
      
      // Images
      '.jpg': 'file-image',
      '.jpeg': 'file-image',
      '.png': 'file-image',
      '.gif': 'file-image',
      '.bmp': 'file-image',
      '.svg': 'file-image',
      '.ico': 'file-image',
      '.webp': 'file-image',
      '.tiff': 'file-image',
      
      // Audio/Video
      '.mp3': 'file-audio',
      '.wav': 'file-audio',
      '.mp4': 'file-video',
      '.avi': 'file-video',
      '.mov': 'file-video',
      '.flv': 'file-video',
      '.wmv': 'file-video',
      
      // Archives
      '.zip': 'file-archive',
      '.rar': 'file-archive',
      '.7z': 'file-archive',
      '.tar': 'file-archive',
      '.gz': 'file-archive',
      
      // System
      '.exe': 'file-executable',
      '.dll': 'file-executable',
      '.sys': 'file-executable',
      '.msi': 'file-executable',
      
      // Web
      '.html': 'file-code',
      '.htm': 'file-code',
      '.css': 'file-code',
      '.scss': 'file-code',
      '.less': 'file-code'
    };
    
    return iconMap[ext] || 'file';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatPermissions(mode) {
    const permissions = [];
    
    if (mode & 0o400) permissions.push('read');
    if (mode & 0o200) permissions.push('write');
    if (mode & 0o100) permissions.push('execute');
    
    return permissions.join(', ') || 'none';
  }

  generateCacheKey(filePath, options) {
    const keyData = {
      path: filePath,
      options: options
    };
    
    return crypto.createHash('md5')
                .update(JSON.stringify(keyData))
                .digest('hex');
  }

  evictOldestCache() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.previewCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.previewCache.delete(oldestKey);
    }
  }

  clearCache() {
    this.previewCache.clear();
  }

  getCacheMetrics() {
    return {
      size: this.previewCache.size,
      maxSize: this.maxCacheSize,
      utilization: (this.previewCache.size / this.maxCacheSize * 100).toFixed(1) + '%'
    };
  }
}

module.exports = FilePreviewManager;
