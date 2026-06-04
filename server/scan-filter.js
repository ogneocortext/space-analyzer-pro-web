const path = require('path');
const fs = require('fs').promises;

class ScanFilter {
  constructor() {
    this.defaultFilters = {
      // File size filters
      minSize: 0,
      maxSize: null,
      
      // File type filters
      includeExtensions: [],
      excludeExtensions: [],
      
      // File name filters
      includePatterns: [],
      excludePatterns: [],
      
      // Directory filters
      includeDirectories: [],
      excludeDirectories: [],
      
      // Attribute filters
      includeHidden: false,
      includeSystem: false,
      includeReadOnly: true,
      
      // Date filters
      modifiedAfter: null,
      modifiedBefore: null,
      createdAfter: null,
      createdBefore: null,
      
      // Content filters
      includeEmpty: true,
      excludeDuplicates: false,
      
      // Custom filters
      customFilters: []
    };
  }

  createFilter(filterOptions = {}) {
    const filter = { ...this.defaultFilters, ...filterOptions };
    
    // Validate filter options
    this.validateFilter(filter);
    
    return filter;
  }

  validateFilter(filter) {
    const errors = [];

    // Validate size filters
    if (filter.minSize < 0) {
      errors.push('minSize must be non-negative');
    }
    if (filter.maxSize !== null && filter.maxSize <= 0) {
      errors.push('maxSize must be positive or null');
    }
    if (filter.minSize > 0 && filter.maxSize !== null && filter.minSize > filter.maxSize) {
      errors.push('minSize cannot be greater than maxSize');
    }

    // Validate date filters
    if (filter.modifiedAfter && filter.modifiedBefore && filter.modifiedAfter >= filter.modifiedBefore) {
      errors.push('modifiedAfter must be before modifiedBefore');
    }
    if (filter.createdAfter && filter.createdBefore && filter.createdAfter >= filter.createdBefore) {
      errors.push('createdAfter must be before createdBefore');
    }

    // Validate extension filters
    if (filter.includeExtensions.length > 0 && filter.excludeExtensions.length > 0) {
      const overlap = filter.includeExtensions.filter(ext => 
        filter.excludeExtensions.includes(ext)
      );
      if (overlap.length > 0) {
        errors.push(`Extensions cannot be both included and excluded: ${overlap.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid filter configuration: ${errors.join(', ')}`);
    }
  }

  async shouldIncludeFile(filePath, stats, filter) {
    // Apply file size filters
    if (!this.checkSizeFilter(stats.size, filter)) {
      return false;
    }

    // Apply extension filters
    if (!this.checkExtensionFilter(filePath, filter)) {
      return false;
    }

    // Apply pattern filters
    if (!this.checkPatternFilter(filePath, filter)) {
      return false;
    }

    // Apply attribute filters
    if (!this.checkAttributeFilter(filePath, stats, filter)) {
      return false;
    }

    // Apply date filters
    if (!this.checkDateFilter(stats, filter)) {
      return false;
    }

    // Apply content filters
    if (!this.checkContentFilter(filePath, stats, filter)) {
      return false;
    }

    // Apply custom filters
    if (!this.checkCustomFilters(filePath, stats, filter)) {
      return false;
    }

    return true;
  }

  checkSizeFilter(size, filter) {
    if (filter.minSize > 0 && size < filter.minSize) {
      return false;
    }
    if (filter.maxSize !== null && size > filter.maxSize) {
      return false;
    }
    return true;
  }

  checkExtensionFilter(filePath, filter) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (filter.includeExtensions.length > 0) {
      return filter.includeExtensions.includes(ext);
    }
    
    if (filter.excludeExtensions.length > 0) {
      return !filter.excludeExtensions.includes(ext);
    }
    
    return true;
  }

  checkPatternFilter(filePath, filter) {
    const fileName = path.basename(filePath);
    
    if (filter.includePatterns.length > 0) {
      return filter.includePatterns.some(pattern => 
        this.matchesPattern(fileName, pattern)
      );
    }
    
    if (filter.excludePatterns.length > 0) {
      return !filter.excludePatterns.some(pattern => 
        this.matchesPattern(fileName, pattern)
      );
    }
    
    return true;
  }

  matchesPattern(text, pattern) {
    // Support glob patterns and regex
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      // Regex pattern
      const regex = new RegExp(pattern.slice(1, -1));
      return regex.test(text);
    } else {
      // Glob pattern (simple implementation)
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(text);
    }
  }

  checkAttributeFilter(filePath, stats, filter) {
    const fileName = path.basename(filePath);
    
    // Hidden files
    if (!filter.includeHidden && fileName.startsWith('.')) {
      return false;
    }
    
    // System files (Windows-specific)
    if (!filter.includeSystem && this.isSystemFile(filePath, stats)) {
      return false;
    }
    
    // Read-only files
    if (!filter.includeReadOnly && this.isReadOnly(stats)) {
      return false;
    }
    
    return true;
  }

  isSystemFile(filePath, stats) {
    // Basic system file detection
    const systemFiles = [
      'pagefile.sys', 'hiberfil.sys', 'swapfile.sys',
      'ntuser.dat', 'ntuser.dat.log', 'ntuser.ini',
      'thumbs.db', 'desktop.ini'
    ];
    
    const fileName = path.basename(filePath).toLowerCase();
    return systemFiles.includes(fileName);
  }

  isReadOnly(stats) {
    // Check read-only attribute (platform-specific)
    if (process.platform === 'win32') {
      return !(stats.mode & 0o200); // Write permission
    }
    return !(stats.mode & 0o222); // Write permissions for user, group, others
  }

  checkDateFilter(stats, filter) {
    // Modified date filters
    if (filter.modifiedAfter && stats.mtime < filter.modifiedAfter) {
      return false;
    }
    if (filter.modifiedBefore && stats.mtime > filter.modifiedBefore) {
      return false;
    }
    
    // Created date filters
    if (filter.createdAfter) {
      const createdTime = stats.birthtime || stats.ctime;
      if (createdTime < filter.createdAfter) {
        return false;
      }
    }
    if (filter.createdBefore) {
      const createdTime = stats.birthtime || stats.ctime;
      if (createdTime > filter.createdBefore) {
        return false;
      }
    }
    
    return true;
  }

  checkContentFilter(filePath, stats, filter) {
    // Empty files
    if (!filter.includeEmpty && stats.size === 0) {
      return false;
    }
    
    // Duplicate files (would need hash comparison)
    // This is a placeholder - actual implementation would need file hashing
    if (filter.excludeDuplicates) {
      // Would need to maintain a hash map of seen files
      // For now, just return true
    }
    
    return true;
  }

  checkCustomFilters(filePath, stats, filter) {
    if (filter.customFilters.length === 0) {
      return true;
    }
    
    // Apply all custom filters
    return filter.customFilters.every(customFilter => {
      try {
        return customFilter(filePath, stats);
      } catch (error) {
        console.warn(`Custom filter error for ${filePath}:`, error.message);
        return true; // Include file if custom filter fails
      }
    });
  }

  async shouldIncludeDirectory(dirPath, stats, filter) {
    const dirName = path.basename(dirPath);
    
    // Check directory inclusion/exclusion
    if (filter.includeDirectories.length > 0) {
      return filter.includeDirectories.includes(dirName);
    }
    
    if (filter.excludeDirectories.length > 0) {
      return !filter.excludeDirectories.includes(dirName);
    }
    
    // Apply attribute filters to directories
    if (!filter.includeHidden && dirName.startsWith('.')) {
      return false;
    }
    
    if (!filter.includeSystem && this.isSystemFile(dirPath, stats)) {
      return false;
    }
    
    return true;
  }

  buildRustArgs(filter) {
    const args = [];
    
    // Size filters
    if (filter.minSize > 0) {
      args.push('--min-size', filter.minSize.toString());
    }
    if (filter.maxSize !== null) {
      args.push('--max-size', filter.maxSize.toString());
    }
    
    // Extension filters
    if (filter.includeExtensions.length > 0) {
      args.push('--include-ext', filter.includeExtensions.join(','));
    }
    if (filter.excludeExtensions.length > 0) {
      args.push('--exclude-ext', filter.excludeExtensions.join(','));
    }
    
    // Pattern filters
    if (filter.includePatterns.length > 0) {
      args.push('--include-pattern', filter.includePatterns.join(','));
    }
    if (filter.excludePatterns.length > 0) {
      args.push('--exclude-pattern', filter.excludePatterns.join(','));
    }
    
    // Directory filters
    if (filter.includeDirectories.length > 0) {
      args.push('--include-dir', filter.includeDirectories.join(','));
    }
    if (filter.excludeDirectories.length > 0) {
      args.push('--exclude-dir', filter.excludeDirectories.join(','));
    }
    
    // Attribute filters
    if (filter.includeHidden) {
      args.push('--include-hidden');
    }
    if (filter.includeSystem) {
      args.push('--include-system');
    }
    
    // Date filters (if supported by Rust CLI)
    if (filter.modifiedAfter) {
      args.push('--modified-after', filter.modifiedAfter.toISOString());
    }
    if (filter.modifiedBefore) {
      args.push('--modified-before', filter.modifiedBefore.toISOString());
    }
    
    return args;
  }

  getFilterSummary(filter) {
    const summary = {
      activeFilters: [],
      description: 'All files'
    };
    
    if (filter.minSize > 0 || filter.maxSize !== null) {
      summary.activeFilters.push('Size');
    }
    
    if (filter.includeExtensions.length > 0 || filter.excludeExtensions.length > 0) {
      summary.activeFilters.push('File Type');
    }
    
    if (filter.includePatterns.length > 0 || filter.excludePatterns.length > 0) {
      summary.activeFilters.push('Name Pattern');
    }
    
    if (filter.includeDirectories.length > 0 || filter.excludeDirectories.length > 0) {
      summary.activeFilters.push('Directory');
    }
    
    if (!filter.includeHidden || !filter.includeSystem || !filter.includeReadOnly) {
      summary.activeFilters.push('Attributes');
    }
    
    if (filter.modifiedAfter || filter.modifiedBefore || filter.createdAfter || filter.createdBefore) {
      summary.activeFilters.push('Date');
    }
    
    if (!filter.includeEmpty || filter.excludeDuplicates) {
      summary.activeFilters.push('Content');
    }
    
    if (filter.customFilters.length > 0) {
      summary.activeFilters.push('Custom');
    }
    
    // Build description
    if (summary.activeFilters.length > 0) {
      summary.description = `Filtered by: ${summary.activeFilters.join(', ')}`;
    }
    
    return summary;
  }

  // Predefined filter presets
  getPresetFilters() {
    return {
      documents: {
        name: 'Documents Only',
        description: 'Include only document files',
        filter: this.createFilter({
          includeExtensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.md']
        })
      },
      
      images: {
        name: 'Images Only',
        description: 'Include only image files',
        filter: this.createFilter({
          includeExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico']
        })
      },
      
      code: {
        name: 'Code Files',
        description: 'Include only source code files',
        filter: this.createFilter({
          includeExtensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt']
        })
      },
      
      largeFiles: {
        name: 'Large Files (> 100MB)',
        description: 'Include only files larger than 100MB',
        filter: this.createFilter({
          minSize: 100 * 1024 * 1024
        })
      },
      
      recentFiles: {
        name: 'Recent Files (Last 30 Days)',
        description: 'Include only files modified in the last 30 days',
        filter: this.createFilter({
          modifiedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        })
      },
      
      excludeHidden: {
        name: 'Exclude Hidden Files',
        description: 'Exclude hidden and system files',
        filter: this.createFilter({
          includeHidden: false,
          includeSystem: false
        })
      }
    };
  }

  applyFilterToResults(results, filter) {
    if (!filter || Object.keys(filter).length === 0) {
      return results;
    }
    
    // Filter files based on the criteria
    const filteredFiles = results.files.filter(file => {
      // Create a mock stats object for filtering
      const stats = {
        size: file.size,
        mtime: new Date(file.modified || file.last_modified),
        birthtime: new Date(file.created || file.creation_time),
        mode: file.permissions || 0o644
      };
      
      return this.shouldIncludeFile(file.path || file.name, stats, filter);
    });
    
    // Update summary statistics
    const totalSize = filteredFiles.reduce((sum, file) => sum + file.size, 0);
    
    return {
      ...results,
      files: filteredFiles,
      total_files: filteredFiles.length,
      total_size: totalSize,
      filter: this.getFilterSummary(filter)
    };
  }
}

module.exports = ScanFilter;
