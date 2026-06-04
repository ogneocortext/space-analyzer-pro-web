/**
 * Advanced Metadata Extraction Service
 * Extracts comprehensive metadata from various file types including EXIF, document properties, and content analysis
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

class MetadataExtractor {
  constructor() {
    this.cache = new Map();
    this.supportedFormats = new Set([
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff',
      'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv',
      'mp3', 'wav', 'flac', 'aac', 'ogg',
      'pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md',
      'js', 'ts', 'py', 'java', 'cpp', 'c'
    ]);
    
    this.extractors = {
      image: this.extractImageMetadata.bind(this),
      video: this.extractVideoMetadata.bind(this),
      audio: this.extractAudioMetadata.bind(this),
      document: this.extractDocumentMetadata.bind(this),
      code: this.extractCodeMetadata.bind(this),
      text: this.extractTextMetadata.bind(this)
    };
  }

  async extractMetadata(filePath, stats = {}) {
    const cacheKey = this.generateCacheKey(filePath, stats);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const extension = path.extname(filePath).toLowerCase().slice(1);
      const fileType = this.categorizeFileType(extension);
      
      if (!this.supportedFormats.has(extension)) {
        return this.extractBasicMetadata(filePath, stats, fileType);
      }

      const extractor = this.extractors[fileType];
      if (extractor) {
        const metadata = await extractor(filePath, stats);
        const enhanced = this.enhanceWithBasicMetadata(metadata, filePath, stats, fileType);
        
        // Cache result
        if (this.cache.size > 1000) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        this.cache.set(cacheKey, enhanced);
        
        return enhanced;
      }

      return this.extractBasicMetadata(filePath, stats, fileType);
    } catch (error) {
      console.error(`Metadata extraction failed for ${filePath}:`, error);
      return this.extractBasicMetadata(filePath, stats, 'unknown');
    }
  }

  categorizeFileType(extension) {
    const imageTypes = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'svg']);
    const videoTypes = new Set(['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm']);
    const audioTypes = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']);
    const documentTypes = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf']);
    const codeTypes = new Set(['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'html', 'css', 'scss', 'less', 'xml', 'json']);

    if (imageTypes.has(extension)) return 'image';
    if (videoTypes.has(extension)) return 'video';
    if (audioTypes.has(extension)) return 'audio';
    if (documentTypes.has(extension)) return 'document';
    if (codeTypes.has(extension)) return 'code';
    return 'other';
  }

  extractBasicMetadata(filePath, stats, fileType) {
    return {
      filePath,
      fileName: path.basename(filePath),
      extension: path.extname(filePath),
      fileType,
      size: stats.size || 0,
      created: stats.birthtime || new Date(),
      modified: stats.mtime || new Date(),
      accessed: stats.atime || new Date(),
      isDirectory: stats.isDirectory || false,
      permissions: this.extractPermissions(stats.mode),
      encoding: 'binary' // Default assumption
    };
  }

  enhanceWithBasicMetadata(metadata, filePath, stats, fileType) {
    return {
      ...metadata,
      basic: {
        size: stats.size || 0,
        created: stats.birthtime || new Date(),
        modified: stats.mtime || new Date(),
        accessed: stats.atime || new Date(),
        isDirectory: stats.isDirectory || false,
        permissions: this.extractPermissions(stats.mode)
      }
    };
  }

  extractPermissions(mode) {
    if (!mode) return null;
    
    return {
      owner: {
        read: !!(mode & 0o400),
        write: !!(mode & 0o200),
        execute: !!(mode & 0o100)
      },
      group: {
        read: !!(mode & 0o040),
        write: !!(mode & 0o020),
        execute: !!(mode & 0o010)
      },
      others: {
        read: !!(mode & 0o004),
        write: !!(mode & 0o002),
        execute: !!(mode & 0o001)
      },
      octal: mode.toString(8),
      symbolic: !!(mode & 0o120000)
    };
  }

  async extractImageMetadata(filePath, stats) {
    try {
      const buffer = await fs.readFile(filePath);
      const metadata = this.parseImageBuffer(buffer);
      
      return {
        type: 'image',
        format: metadata.format,
        dimensions: metadata.dimensions,
        color: metadata.color,
        compression: metadata.compression,
        exif: metadata.exif,
        technical: metadata.technical,
        analysis: this.analyzeImageCharacteristics(metadata)
      };
    } catch (error) {
      return { type: 'image', error: error.message };
    }
  }

  parseImageBuffer(buffer) {
    const metadata = {
      format: 'unknown',
      dimensions: null,
      color: null,
      compression: null,
      exif: null,
      technical: {}
    };

    // JPEG detection
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      metadata.format = 'JPEG';
      metadata.compression = 'JPEG';
      metadata.exif = this.extractJPEGExif(buffer);
    }

    // PNG detection
    if (buffer.toString('ascii', 0, 8) === '\x89PNG\r\n\x1a\n') {
      metadata.format = 'PNG';
      metadata.compression = 'DEFLATE';
      metadata.color = this.extractPNGColorInfo(buffer);
    }

    // Basic dimension detection (simplified)
    metadata.dimensions = this.detectImageDimensions(buffer, metadata.format);
    metadata.technical = {
      fileSize: buffer.length,
      estimatedQuality: this.estimateImageQuality(buffer, metadata.format),
      hasTransparency: this.detectTransparency(buffer, metadata.format)
    };

    return metadata;
  }

  extractJPEGExif(buffer) {
    const exif = {};
    
    try {
      // Find EXIF marker (0xFFE1)
      let offset = 2;
      while (offset < buffer.length - 4) {
        if (buffer[offset] === 0xFF && buffer[offset + 1] === 0xE1) {
          const segmentLength = (buffer[offset + 2] << 8) | buffer[offset + 3];
          const segmentData = buffer.slice(offset + 4, offset + 4 + segmentLength);
          
          // Parse EXIF data (simplified)
          this.parseExifData(segmentData, exif);
          break;
        }
        offset += 2 + ((buffer[offset + 2] << 8) | buffer[offset + 3]) + 2;
      }
    } catch (error) {
      // EXIF parsing failed
    }
    
    return exif;
  }

  parseExifData(data, exif) {
    const dataStr = data.toString('ascii');
    
    // Extract common EXIF tags
    const patterns = {
      dateTime: /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
      make: /Make=(.+)/,
      model: /Model=(.+)/,
      software: /Software=(.+)/,
      exposureTime: /Exposure Time=(.+)/,
      fNumber: /F-Number=(.+)/,
      iso: /ISO=(.+)/,
      flash: /Flash=(.+)/
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = dataStr.match(pattern);
      if (match) {
        exif[key] = match[1] || match[0];
      }
    }

    // GPS coordinates (simplified)
    const gpsMatch = dataStr.match(/GPS.*?(\d+\.\d+),.*?(\d+\.\d+)/);
    if (gpsMatch) {
      exif.gps = {
        latitude: parseFloat(gpsMatch[1]),
        longitude: parseFloat(gpsMatch[2])
      };
    }
  }

  extractPNGColorInfo(buffer) {
    const colorInfo = {};
    
    // Find IHDR chunk
    let offset = 8; // After PNG signature
    while (offset < buffer.length - 8) {
      const chunkLength = (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
                        (buffer[offset + 2] << 8) | buffer[offset + 3];
      const chunkType = buffer.toString('ascii', offset + 4, 4);
      
      if (chunkType === 'IHDR') {
        const bitDepth = buffer[offset + 8];
        const colorType = buffer[offset + 9];
        
        colorInfo.bitDepth = bitDepth;
        colorInfo.colorType = this.getPNGColorType(colorType);
        colorInfo.hasAlpha = colorType === 4 || colorType === 6;
        break;
      }
      
      offset += 8 + chunkLength + 4; // Chunk header + data + CRC
    }
    
    return colorInfo;
  }

  getPNGColorType(colorType) {
    const types = {
      0: 'Grayscale',
      2: 'RGB',
      3: 'Indexed',
      4: 'Grayscale + Alpha',
      6: 'RGB + Alpha'
    };
    return types[colorType] || 'Unknown';
  }

  detectImageDimensions(buffer, format) {
    // Simplified dimension detection - would need proper image parsing in production
    if (format === 'JPEG') {
      return this.extractJPEGDimensions(buffer);
    } else if (format === 'PNG') {
      return this.extractPNGDimensions(buffer);
    }
    return null;
  }

  extractJPEGDimensions(buffer) {
    // Find SOF (Start of Frame) marker
    let offset = 2;
    while (offset < buffer.length - 4) {
      if (buffer[offset] === 0xFF) {
        const marker = buffer[offset + 1];
        if (marker >= 0xC0 && marker <= 0xCF) {
          // SOF marker found
          const height = (buffer[offset + 5] << 8) | buffer[offset + 6];
          const width = (buffer[offset + 7] << 8) | buffer[offset + 8];
          return { width, height };
        }
      }
      offset += 2;
    }
    return null;
  }

  extractPNGDimensions(buffer) {
    // Find IHDR chunk
    let offset = 8; // After PNG signature
    while (offset < buffer.length - 8) {
      const chunkLength = (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
                        (buffer[offset + 2] << 8) | buffer[offset + 3];
      const chunkType = buffer.toString('ascii', offset + 4, 4);
      
      if (chunkType === 'IHDR') {
        const width = (buffer[offset + 8] << 24) | (buffer[offset + 9] << 16) | 
                     (buffer[offset + 10] << 8) | buffer[offset + 11];
        const height = (buffer[offset + 12] << 24) | (buffer[offset + 13] << 16) | 
                      (buffer[offset + 14] << 8) | buffer[offset + 15];
        return { width, height };
      }
      
      offset += 8 + chunkLength + 4;
    }
    return null;
  }

  estimateImageQuality(buffer, format) {
    // Simple quality estimation based on file size and compression
    const sizeKB = buffer.length / 1024;
    
    if (format === 'JPEG') {
      if (sizeKB < 100) return 'high';
      if (sizeKB < 500) return 'medium';
      return 'low';
    } else if (format === 'PNG') {
      if (sizeKB < 200) return 'high';
      if (sizeKB < 1000) return 'medium';
      return 'low';
    }
    
    return 'unknown';
  }

  detectTransparency(buffer, format) {
    if (format === 'PNG') {
      // Check color type in IHDR
      let offset = 8;
      while (offset < buffer.length - 8) {
        const chunkType = buffer.toString('ascii', offset + 4, 4);
        if (chunkType === 'IHDR') {
          const colorType = buffer[offset + 9];
          return colorType === 4 || colorType === 6; // Grayscale+Alpha or RGB+Alpha
        }
        offset += 8 + ((buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
                       (buffer[offset + 2] << 8) | buffer[offset + 3]) + 4;
      }
    }
    return false;
  }

  analyzeImageCharacteristics(metadata) {
    const analysis = {
      complexity: 'medium',
      estimatedUseCase: 'general',
      recommendations: []
    };

    if (metadata.dimensions) {
      const { width, height } = metadata.dimensions;
      const megapixels = (width * height) / 1000000;
      
      if (megapixels > 5) {
        analysis.complexity = 'high';
        analysis.estimatedUseCase = 'professional';
        analysis.recommendations.push('Consider resizing for web use');
      } else if (megapixels < 0.1) {
        analysis.complexity = 'low';
        analysis.estimatedUseCase = 'thumbnail';
      }
    }

    if (metadata.exif && metadata.exif.gps) {
      analysis.hasLocation = true;
      analysis.recommendations.push('Contains location data - consider privacy');
    }

    return analysis;
  }

  async extractVideoMetadata(filePath, stats) {
    try {
      const buffer = await fs.readFile(filePath);
      const metadata = this.parseVideoBuffer(buffer);
      
      return {
        type: 'video',
        format: metadata.format,
        duration: metadata.duration,
        dimensions: metadata.dimensions,
        bitrate: metadata.bitrate,
        codec: metadata.codec,
        frameRate: metadata.frameRate,
        technical: metadata.technical,
        analysis: this.analyzeVideoCharacteristics(metadata)
      };
    } catch (error) {
      return { type: 'video', error: error.message };
    }
  }

  parseVideoBuffer(buffer) {
    // Simplified video metadata parsing
    const metadata = {
      format: 'unknown',
      duration: null,
      dimensions: null,
      bitrate: null,
      codec: 'unknown',
      frameRate: null,
      technical: {}
    };

    // MP4 detection (simplified)
    if (buffer.toString('ascii', 4, 4) === 'ftyp') {
      metadata.format = 'MP4';
      metadata.codec = 'H.264'; // Common assumption
      
      // Extract basic info from file size
      metadata.technical = {
        fileSize: buffer.length,
        estimatedBitrate: this.estimateVideoBitrate(buffer.length)
      };
    }

    return metadata;
  }

  estimateVideoBitrate(fileSize) {
    // Rough estimation based on file size
    const sizeMB = fileSize / (1024 * 1024);
    
    if (sizeMB < 10) return 'low';
    if (sizeMB < 100) return 'medium';
    return 'high';
  }

  analyzeVideoCharacteristics(metadata) {
    const analysis = {
      quality: 'medium',
      estimatedUseCase: 'general',
      recommendations: []
    };

    if (metadata.dimensions) {
      const { width, height } = metadata.dimensions;
      const totalPixels = width * height;
      
      if (totalPixels > 1920 * 1080) {
        analysis.quality = 'high';
        analysis.estimatedUseCase = 'professional';
        analysis.recommendations.push('High resolution video');
      } else if (totalPixels < 640 * 480) {
        analysis.quality = 'low';
        analysis.estimatedUseCase = 'mobile';
      }
    }

    if (metadata.duration && metadata.duration > 300) {
      analysis.recommendations.push('Long video - consider compression');
    }

    return analysis;
  }

  async extractAudioMetadata(filePath, stats) {
    try {
      const buffer = await fs.readFile(filePath);
      const metadata = this.parseAudioBuffer(buffer);
      
      return {
        type: 'audio',
        format: metadata.format,
        duration: metadata.duration,
        bitrate: metadata.bitrate,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,
        codec: metadata.codec,
        technical: metadata.technical,
        analysis: this.analyzeAudioCharacteristics(metadata)
      };
    } catch (error) {
      return { type: 'audio', error: error.message };
    }
  }

  parseAudioBuffer(buffer) {
    const metadata = {
      format: 'unknown',
      duration: null,
      bitrate: null,
      sampleRate: null,
      channels: null,
      codec: 'unknown',
      technical: {}
    };

    // MP3 detection (simplified)
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      metadata.format = 'MP3';
      metadata.codec = 'MP3';
      metadata.technical = {
        fileSize: buffer.length,
        hasID3: true
      };
    }

    return metadata;
  }

  analyzeAudioCharacteristics(metadata) {
    const analysis = {
      quality: 'medium',
      estimatedUseCase: 'general',
      recommendations: []
    };

    if (metadata.bitrate) {
      if (metadata.bitrate > 320) {
        analysis.quality = 'high';
        analysis.estimatedUseCase = 'professional';
      } else if (metadata.bitrate < 128) {
        analysis.quality = 'low';
        analysis.estimatedUseCase = 'compression';
      }
    }

    return analysis;
  }

  async extractDocumentMetadata(filePath, stats) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const extension = path.extname(filePath).toLowerCase();
      
      const metadata = {
        type: 'document',
        format: extension.slice(1),
        content: this.analyzeDocumentContent(content, extension),
        structure: this.analyzeDocumentStructure(content, extension),
        technical: {
          encoding: 'utf8',
          lineCount: content.split('\n').length,
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          characterCount: content.length
        }
      };

      return metadata;
    } catch (error) {
      return { type: 'document', error: error.message };
    }
  }

  analyzeDocumentContent(content, extension) {
    const analysis = {
      language: 'unknown',
      complexity: 'medium',
      readability: 'medium',
      keywords: [],
      sentiment: 'neutral'
    };

    // Language detection (simplified)
    const patterns = {
      javascript: /function\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+/g,
      python: /def\s+\w+|import\s+\w+|class\s+\w+/g,
      java: /public\s+class|private\s+\w+|import\s+java\./g,
      markdown: /^#+\s|^\s*[-*+]\s|\[.*\]\(.*\)/gm
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        analysis.language = lang;
        break;
      }
    }

    // Complexity analysis
    const lines = content.split('\n');
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    
    if (avgLineLength > 100) {
      analysis.complexity = 'high';
    } else if (avgLineLength < 50) {
      analysis.complexity = 'low';
    }

    // Extract keywords (simplified)
    const words = content.toLowerCase().split(/\s+/);
    const commonWords = ['function', 'class', 'import', 'export', 'const', 'let', 'var', 'if', 'for', 'while'];
    analysis.keywords = commonWords.filter(word => words.includes(word)).slice(0, 10);

    return analysis;
  }

  analyzeDocumentStructure(content, extension) {
    const structure = {
      hasHeaders: false,
      hasLists: false,
      hasCodeBlocks: false,
      hasTables: false,
      sections: []
    };

    if (extension === '.md') {
      structure.hasHeaders = /^#+\s/m.test(content);
      structure.hasLists = /^\s*[-*+]\s/m.test(content);
      structure.hasCodeBlocks = /```[\s\S]*?[\s\S]*?```/.test(content);
      
      // Extract sections
      const headerMatches = content.match(/^#+\s+.+$/gm);
      if (headerMatches) {
        structure.sections = headerMatches.map(h => h.replace(/^#+\s+/, ''));
      }
    }

    return structure;
  }

  async extractCodeMetadata(filePath, stats) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const extension = path.extname(filePath).toLowerCase();
      
      const metadata = {
        type: 'code',
        language: this.detectCodeLanguage(content, extension),
        structure: this.analyzeCodeStructure(content),
        complexity: this.analyzeCodeComplexity(content),
        dependencies: this.extractDependencies(content),
        technical: {
          encoding: 'utf8',
          lineCount: content.split('\n').length,
          characterCount: content.length,
          avgLineLength: content.length / content.split('\n').length
        }
      };

      return metadata;
    } catch (error) {
      return { type: 'code', error: error.message };
    }
  }

  detectCodeLanguage(content, extension) {
    const languageMap = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'React JSX',
      '.tsx': 'React TSX',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.h': 'C Header',
      '.hpp': 'C++ Header',
      '.cs': 'C#',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.less': 'LESS',
      '.xml': 'XML',
      '.json': 'JSON'
    };

    return languageMap[extension] || 'Unknown';
  }

  analyzeCodeStructure(content) {
    const structure = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      comments: 0
    };

    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Function detection
      const functionMatch = trimmed.match(/(?:function|def|func)\s+(\w+)/);
      if (functionMatch) {
        structure.functions.push({
          name: functionMatch[1],
          line: index + 1
        });
      }

      // Class detection
      const classMatch = trimmed.match(/(?:class|struct)\s+(\w+)/);
      if (classMatch) {
        structure.classes.push({
          name: classMatch[1],
          line: index + 1
        });
      }

      // Import detection
      const importMatch = trimmed.match(/(?:import|require|include)\s+['"]?([^'"]+)['"]?/);
      if (importMatch) {
        structure.imports.push({
          module: importMatch[1],
          line: index + 1
        });
      }

      // Export detection
      const exportMatch = trimmed.match(/(?:export|module\.exports)\s+(\w+)/);
      if (exportMatch) {
        structure.exports.push({
          name: exportMatch[1],
          line: index + 1
        });
      }

      // Comment detection
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
        structure.comments++;
      }
    });

    return structure;
  }

  analyzeCodeComplexity(content) {
    const complexity = {
      cyclomaticComplexity: 'medium',
      cognitiveComplexity: 'medium',
      maintainabilityIndex: 'medium',
      lines: content.split('\n').length,
      recommendations: []
    };

    // Simplified complexity metrics
    const controlStructures = (content.match(/\b(if|else|for|while|switch|try|catch)\b/g) || []).length;
    const nestingLevel = Math.max(...content.split('\n').map(line => {
      let level = 0;
      for (const char of line) {
        if (char === '{') level++;
        if (char === '}') level--;
      }
      return Math.max(0, level);
    }));

    if (controlStructures > 20) {
      complexity.cyclomaticComplexity = 'high';
      complexity.recommendations.push('High cyclomatic complexity detected');
    }

    if (nestingLevel > 4) {
      complexity.cognitiveComplexity = 'high';
      complexity.recommendations.push('Deep nesting detected');
    }

    return complexity;
  }

  extractDependencies(content) {
    const dependencies = {
      external: [],
      internal: [],
      packageFiles: []
    };

    // Extract import statements
    const importRegex = /(?:import|require|from)\s+['"]?([^'"]+)['"]?/g;
    const imports = content.match(importRegex) || [];
    
    dependencies.external = [...new Set(imports.map(match => match[1]))];

    // Check for package files
    const packageJsonMatch = content.match(/package\.json|requirements\.txt|Gemfile|composer\.json/g);
    if (packageJsonMatch) {
      dependencies.packageFiles = packageJsonMatch;
    }

    return dependencies;
  }

  async extractTextMetadata(filePath, stats) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      const metadata = {
        type: 'text',
        encoding: 'utf8',
        analysis: this.analyzeTextContent(content),
        technical: {
          lineCount: content.split('\n').length,
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          characterCount: content.length,
          avgWordLength: content.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / content.split(/\s+/).length
        }
      };

      return metadata;
    } catch (error) {
      return { type: 'text', error: error.message };
    }
  }

  analyzeTextContent(content) {
    const analysis = {
      language: 'unknown',
      readability: 'medium',
      sentiment: 'neutral',
      topics: [],
      statistics: {}
    };

    // Basic text statistics
    const words = content.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    analysis.statistics = {
      avgWordsPerSentence: words.length / sentences.length,
      avgSentenceLength: sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length,
      uniqueWords: new Set(words).size
    };

    // Readability estimation
    const avgWordsPerSentence = analysis.statistics.avgWordsPerSentence;
    if (avgWordsPerSentence > 20) {
      analysis.readability = 'complex';
    } else if (avgWordsPerSentence < 10) {
      analysis.readability = 'simple';
    }

    return analysis;
  }

  generateCacheKey(filePath, stats) {
    const keyData = `${filePath}:${stats.size || 0}:${stats.mtime || 0}`;
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  // Batch processing for multiple files
  async extractBatchMetadata(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const metadata = await this.extractMetadata(file.path, file.stats);
        results.push({
          ...file,
          metadata
        });
      } catch (error) {
        results.push({
          ...file,
          metadata: {
            error: error.message,
            type: 'error'
          }
        });
      }
    }
    
    return results;
  }

  // Get supported formats
  getSupportedFormats() {
    return {
      images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'],
      videos: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'],
      audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'],
      documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf'],
      code: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'html', 'css', 'scss', 'less', 'xml', 'json']
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 1000,
      usage: (this.cache.size / 1000) * 100
    };
  }
}

module.exports = MetadataExtractor;
