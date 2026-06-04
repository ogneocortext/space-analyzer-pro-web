/**
 * Text extraction utilities for document summarization
 * Supports: PDF, DOC/DOCX, TXT, MD, code files
 */

const fs = require('fs').promises;
const path = require('path');

class TextExtractor {
  /**
   * Extract text from a file based on its extension
   */
  async extractText(filePath, maxChars = 5000) {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      switch (ext) {
        case '.txt':
        case '.md':
        case '.markdown':
        case '.json':
        case '.xml':
        case '.csv':
          return await this.extractPlainText(filePath, maxChars);
          
        case '.js':
        case '.ts':
        case '.jsx':
        case '.tsx':
        case '.py':
        case '.java':
        case '.cpp':
        case '.c':
        case '.h':
        case '.cs':
        case '.php':
        case '.rb':
        case '.go':
        case '.rs':
        case '.swift':
        case '.kt':
          return await this.extractCode(filePath, maxChars);
          
        case '.pdf':
          return await this.extractPDF(filePath, maxChars);
          
        case '.doc':
        case '.docx':
          return await this.extractWord(filePath, maxChars);
          
        case '.html':
        case '.htm':
          return await this.extractHTML(filePath, maxChars);
          
        default:
          // Try as binary/text detection
          return await this.extractGeneric(filePath, maxChars);
      }
    } catch (err) {
      console.error(`Text extraction failed for ${filePath}:`, err.message);
      return null;
    }
  }

  /**
   * Extract plain text files
   */
  async extractPlainText(filePath, maxChars) {
    const content = await fs.readFile(filePath, 'utf8');
    return this.truncate(content, maxChars);
  }

  /**
   * Extract and clean code files
   */
  async extractCode(filePath, maxChars) {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Remove excessive whitespace and comments for summary
    const cleaned = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '')         // Remove line comments
      .replace(/#.*$/gm, '')            // Remove Python comments
      .replace(/\n\s*\n+/g, '\n')        // Remove extra blank lines
      .trim();
    
    return this.truncate(cleaned, maxChars);
  }

  /**
   * Extract text from PDF using pdf-parse (if available)
   * Falls back to basic extraction
   */
  async extractPDF(filePath, maxChars) {
    try {
      // Try to use pdf-parse if available
      const pdfParse = require('pdf-parse');
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return this.truncate(data.text, maxChars);
    } catch (err) {
      // Fallback: PDF files often have text we can extract with regex
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString('utf8', 0, Math.min(buffer.length, 50000));
      
      // Extract text between PDF markers
      const textMatches = content.match(/\(([^)]{10,500})\)/g) || [];
      const extracted = textMatches
        .map(m => m.slice(1, -1)) // Remove parentheses
        .filter(t => /[a-zA-Z]{3,}/.test(t)) // Must have words
        .join(' ')
        .replace(/\\\n/g, '') // Remove escaped newlines
        .replace(/\\/g, '');  // Remove escape chars
      
      return extracted.length > 100 
        ? this.truncate(extracted, maxChars)
        : `[PDF file - install 'pdf-parse' package for better extraction]`;
    }
  }

  /**
   * Extract text from Word documents
   */
  async extractWord(filePath, maxChars) {
    try {
      // Try mammoth for docx
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return this.truncate(result.value, maxChars);
    } catch (err) {
      return `[Word document - install 'mammoth' package for text extraction]`;
    }
  }

  /**
   * Extract text from HTML
   */
  async extractHTML(filePath, maxChars) {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Simple HTML tag removal
    const text = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')  // Remove styles
      .replace(/<[^>]+>/g, ' ')                         // Remove tags
      .replace(/&nbsp;/g, ' ')                           // Replace &nbsp;
      .replace(/&amp;/g, '&')                            // Replace &amp;
      .replace(/&lt;/g, '<')                             // Replace &lt;
      .replace(/&gt;/g, '>')                             // Replace &gt;
      .replace(/\s+/g, ' ')                              // Collapse whitespace
      .trim();
    
    return this.truncate(text, maxChars);
  }

  /**
   * Generic extraction with binary detection
   */
  async extractGeneric(filePath, maxChars) {
    const buffer = await fs.readFile(filePath);
    
    // Check if binary
    const isBinary = this.isBinary(buffer);
    if (isBinary) {
      return `[Binary file - text extraction not available]`;
    }
    
    // Try UTF-8
    try {
      const text = buffer.toString('utf8');
      return this.truncate(text, maxChars);
    } catch (err) {
      return `[Unable to extract text from this file type]`;
    }
  }

  /**
   * Detect if buffer is binary
   */
  isBinary(buffer) {
    const sampleSize = Math.min(buffer.length, 1024);
    for (let i = 0; i < sampleSize; i++) {
      if (buffer[i] === 0) return true; // Null byte = binary
    }
    return false;
  }

  /**
   * Truncate text to max characters, trying to end at a sentence
   */
  truncate(text, maxChars) {
    if (!text || text.length <= maxChars) return text;
    
    // Try to find sentence end
    const truncated = text.substring(0, maxChars);
    const lastSentence = truncated.match(/.*[.!?]/);
    
    if (lastSentence) {
      return lastSentence[0] + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Get file type category for display
   */
  getFileTypeCategory(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    const categories = {
      document: ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'],
      code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'],
      data: ['.json', '.xml', '.csv', '.yaml', '.yml'],
      web: ['.html', '.htm', '.css', '.scss', '.sass']
    };
    
    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.includes(ext)) return category;
    }
    return 'other';
  }
}

module.exports = TextExtractor;
