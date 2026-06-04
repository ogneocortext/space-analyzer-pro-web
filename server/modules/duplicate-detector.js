/**
 * Duplicate File Detection Module
 * Analyzes scan results to find duplicate files
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DuplicateDetector {
  constructor() {
    this.hashCache = new Map(); // path -> hash
  }

  /**
   * Find duplicates from existing analysis results
   * @param {Array} files - Array of file objects from analysis
   * @returns {Object} Duplicate groups and statistics
   */
  async findDuplicates(files) {
    console.log(`🔍 Analyzing ${files.length} files for duplicates...`);
    
    const sizeGroups = new Map(); // size -> [files]
    const hashGroups = new Map(); // hash -> [files]
    
    // Group by size first (fast pre-filtering)
    for (const file of files) {
      if (!file.size) continue;
      
      const size = file.size;
      if (!sizeGroups.has(size)) {
        sizeGroups.set(size, []);
      }
      sizeGroups.get(size).push(file);
    }
    
    // Only hash files that have same size
    for (const [size, sizeFiles] of sizeGroups) {
      if (sizeFiles.length < 2) continue; // Can't be duplicates if only 1 file
      
      // Hash files with same size
      for (const file of sizeFiles) {
        if (!this.hashCache.has(file.path)) {
          try {
            const hash = await this.calculateFileHash(file.path);
            this.hashCache.set(file.path, hash);
          } catch (err) {
            console.warn(`⚠️ Failed to hash ${file.path}:`, err.message);
            continue;
          }
        }
        
        const hash = this.hashCache.get(file.path);
        if (!hashGroups.has(hash)) {
          hashGroups.set(hash, []);
        }
        hashGroups.get(hash).push(file);
      }
    }
    
    // Build duplicate groups
    const duplicateGroups = [];
    let duplicateCount = 0;
    let wastedSpace = 0;
    
    for (const [hash, hashFiles] of hashGroups) {
      if (hashFiles.length > 1) {
        const size = hashFiles[0].size || 0;
        const groupWasted = size * (hashFiles.length - 1);
        
        duplicateGroups.push({
          hash: hash.substring(0, 16) + '...', // Truncate for display
          size,
          fileCount: hashFiles.length,
          files: hashFiles.map(f => ({
            path: f.path,
            name: f.name,
            modified: f.modified,
            size: f.size
          })),
          wastedSpace: groupWasted
        });
        
        duplicateCount += hashFiles.length;
        wastedSpace += groupWasted;
      }
    }
    
    // Sort by wasted space (largest savings first)
    duplicateGroups.sort((a, b) => b.wastedSpace - a.wastedSpace);
    
    console.log(`✅ Found ${duplicateCount} duplicates in ${duplicateGroups.length} groups, wasting ${this.formatBytes(wastedSpace)}`);
    
    return {
      duplicateGroups,
      duplicateCount,
      wastedSpace,
      totalFiles: files.length,
      scannedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate MD5 hash of a file
   * @param {string} filePath - Path to file
   * @returns {string} MD5 hash
   */
  async calculateFileHash(filePath) {
    const hash = crypto.createHash('md5');
    const fileHandle = await fs.open(filePath, 'r');
    
    try {
      const buffer = Buffer.alloc(8192);
      let bytesRead;
      
      while ((bytesRead = (await fileHandle.read(buffer, 0, 8192, null)).bytesRead) > 0) {
        hash.update(buffer.slice(0, bytesRead));
      }
      
      return hash.digest('hex');
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * Find similar images using perceptual hashing (simplified)
   * @param {Array} imageFiles - Array of image file objects
   * @returns {Array} Groups of similar images
   */
  async findSimilarImages(imageFiles) {
    // Placeholder for perceptual hashing
    // Would require additional library like sharp + phash
    console.log(`🖼️ Image similarity detection not yet implemented (${imageFiles.length} images found)`);
    return [];
  }

  /**
   * Generate cleanup recommendations from duplicate analysis
   * @param {Object} duplicateData - Results from findDuplicates
   * @returns {Array} Actionable recommendations
   */
  generateRecommendations(duplicateData) {
    const recommendations = [];
    
    if (duplicateData.duplicateCount === 0) {
      return [{
        type: 'info',
        title: 'No Duplicates Found',
        description: 'Your storage is well-organized with no duplicate files detected.',
        potentialSavings: 0,
        action: 'none'
      }];
    }
    
    // Top duplicate groups by wasted space
    const topGroups = duplicateData.duplicateGroups.slice(0, 5);
    
    for (const group of topGroups) {
      const files = group.files;
      const oldestFile = files.reduce((oldest, f) => {
        const fDate = new Date(f.modified);
        const oDate = new Date(oldest.modified);
        return fDate < oDate ? f : oldest;
      });
      
      const newestFile = files.reduce((newest, f) => {
        const fDate = new Date(f.modified);
        const nDate = new Date(newest.modified);
        return fDate > nDate ? f : newest;
      });
      
      recommendations.push({
        type: 'duplicate',
        title: `Delete ${group.fileCount - 1} duplicate(s) of "${files[0].name}"`,
        description: `Keep the newest version (${newestFile.path}) and delete ${group.fileCount - 1} older copies`,
        potentialSavings: group.wastedSpace,
        action: 'delete_duplicates',
        data: {
          keep: newestFile,
          delete: files.filter(f => f.path !== newestFile.path)
        }
      });
    }
    
    // Add summary recommendation
    recommendations.unshift({
      type: 'summary',
      title: `Clean Up All Duplicates`,
      description: `Delete all ${duplicateData.duplicateCount} duplicate files to free up ${this.formatBytes(duplicateData.wastedSpace)}`,
      potentialSavings: duplicateData.wastedSpace,
      action: 'delete_all_duplicates',
      data: {
        totalGroups: duplicateData.duplicateGroups.length,
        totalFiles: duplicateData.duplicateCount
      }
    });
    
    return recommendations;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clear the hash cache to free memory
   */
  clearCache() {
    this.hashCache.clear();
  }
}

module.exports = DuplicateDetector;
