/**
 * Security and Compliance Service
 * Provides security scanning, compliance checking, and audit capabilities
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

class SecurityComplianceService {
  constructor() {
    this.securityRules = new Map();
    this.complianceFrameworks = new Map();
    this.auditLog = [];
    this.threatDatabase = new Map();
    
    // Security configuration
    this.config = {
      enableMalwareScanning: true,
      enablePermissionAnalysis: true,
      enableDataClassification: true,
      enableComplianceChecking: true,
      threatDatabasePath: path.join(__dirname, 'data', 'threats.json'),
      auditLogPath: path.join(__dirname, 'data', 'audit.log'),
      maxAuditLogSize: 10000
    };
    
    // Initialize security frameworks
    this.initializeFrameworks();
  }

  async initialize() {
    console.warn('🔒 Initializing Security and Compliance Service...');
    
    // Load threat database
    await this.loadThreatDatabase();
    
    // Load security rules
    await this.loadSecurityRules();
    
    // Initialize compliance frameworks
    await this.initializeComplianceFrameworks();
    
    console.warn('✅ Security and Compliance Service initialized');
  }

  // Security Scanning
  async performSecurityScan(filePath, options = {}) {
    const scanResult = {
      filePath,
      scanId: this.generateScanId(),
      timestamp: new Date(),
      scanner: 'Space Analyzer Security Engine v1.0',
      threats: [],
      vulnerabilities: [],
      permissions: {},
      compliance: {},
      riskScore: 0,
      recommendations: []
    };

    try {
      // Get file stats
      const stats = await fs.stat(filePath);
      
      // Permission analysis
      if (this.config.enablePermissionAnalysis) {
        scanResult.permissions = await this.analyzePermissions(filePath, stats);
      }
      
      // Malware scanning
      if (this.config.enableMalwareScanning) {
        scanResult.threats = await this.scanForMalware(filePath);
      }
      
      // Vulnerability scanning
      scanResult.vulnerabilities = await this.scanForVulnerabilities(filePath);
      
      // Data classification
      if (this.config.enableDataClassification) {
        scanResult.dataClassification = await this.classifyData(filePath);
      }
      
      // Compliance checking
      if (this.config.enableComplianceChecking) {
        scanResult.compliance = await this.checkCompliance(filePath, options.frameworks);
      }
      
      // Calculate risk score
      scanResult.riskScore = this.calculateRiskScore(scanResult);
      
      // Generate recommendations
      scanResult.recommendations = this.generateRecommendations(scanResult);
      
      // Log audit entry
      await this.logSecurityEvent('scan_completed', {
        filePath,
        scanId: scanResult.scanId,
        riskScore: scanResult.riskScore,
        threatsFound: scanResult.threats.length,
        vulnerabilitiesFound: scanResult.vulnerabilities.length
      });
      
      return scanResult;
    } catch (error) {
      console.error(`Security scan failed for ${filePath}:`, error);
      await this.logSecurityEvent('scan_failed', { filePath, error: error.message });
      throw error;
    }
  }

  async analyzePermissions(filePath, stats) {
    const permissions = {
      owner: {},
      group: {},
      others: {},
      symbolic: false,
      setuid: false,
      setgid: false,
      sticky: false,
      riskLevel: 'low'
    };

    try {
      // Get file permissions
      const mode = stats.mode;
      
      if (mode) {
        // Parse permission bits
        permissions.owner = {
          read: !!(mode & 0o400),
          write: !!(mode & 0o200),
          execute: !!(mode & 0o100)
        };
        
        permissions.group = {
          read: !!(mode & 0o040),
          write: !!(mode & 0o020),
          execute: !!(mode & 0o010)
        };
        
        permissions.others = {
          read: !!(mode & 0o004),
          write: !!(mode & 0o002),
          execute: !!(mode & 0o001)
        };
        
        // Special permissions
        permissions.symbolic = !!(mode & 0o120000);
        permissions.setuid = !!(mode & 0o4000);
        permissions.setgid = !!(mode & 0o2000);
        permissions.sticky = !!(mode & 0o1000);
        
        // Assess risk level
        permissions.riskLevel = this.assessPermissionRisk(permissions);
      }
      
      return permissions;
    } catch (error) {
      console.error(`Permission analysis failed for ${filePath}:`, error);
      return { error: error.message, riskLevel: 'unknown' };
    }
  }

  assessPermissionRisk(permissions) {
    let riskScore = 0;
    
    // World-writable files are high risk
    if (permissions.others.write) {
      riskScore += 40;
    }
    
    // World-executable files are medium risk
    if (permissions.others.execute) {
      riskScore += 20;
    }
    
    // Group-writable files are medium risk
    if (permissions.group.write) {
      riskScore += 15;
    }
    
    // Special permissions add risk
    if (permissions.setuid) riskScore += 25;
    if (permissions.setgid) riskScore += 25;
    
    // Determine risk level
    if (riskScore >= 50) return 'critical';
    if (riskScore >= 30) return 'high';
    if (riskScore >= 15) return 'medium';
    return 'low';
  }

  async scanForMalware(filePath) {
    const threats = [];
    
    try {
      // Read file content (safely)
      const buffer = await fs.readFile(filePath);
      const content = buffer.slice(0, 1024 * 1024); // First 1MB for scanning
      
      // Check against threat database
      for (const [signature, threat] of this.threatDatabase) {
        if (this.matchesThreatSignature(content, signature)) {
          threats.push({
            type: threat.type,
            severity: threat.severity,
            description: threat.description,
            signature: signature,
            confidence: this.calculateThreatConfidence(content, signature)
          });
        }
      }
      
      // Heuristic analysis
      const heuristicThreats = this.performHeuristicAnalysis(content);
      threats.push(...heuristicThreats);
      
      return threats;
    } catch (error) {
      console.error(`Malware scan failed for ${filePath}:`, error);
      return [{ error: error.message, type: 'scan_error' }];
    }
  }

  matchesThreatSignature(content, signature) {
    // Simple pattern matching - would use more sophisticated methods in production
    if (typeof signature === 'string') {
      return content.includes(signature);
    } else if (signature instanceof RegExp) {
      return signature.test(content);
    } else if (Array.isArray(signature)) {
      return signature.every(sig => content.includes(sig));
    }
    
    return false;
  }

  performHeuristicAnalysis(content) {
    const threats = [];
    const contentStr = content.toString('utf8', 0, Math.min(content.length, 1024));
    
    // Suspicious patterns
    const suspiciousPatterns = [
      { pattern: /eval\s*\(/gi, type: 'code_execution', severity: 'high' },
      { pattern: /document\.write/gi, type: 'dom_manipulation', severity: 'medium' },
      { pattern: /powershell/i, type: 'powershell', severity: 'high' },
      { pattern: /cmd\.exe/i, type: 'command_execution', severity: 'high' },
      { pattern: /base64_decode/gi, type: 'obfuscation', severity: 'medium' },
      { pattern: /javascript:.*eval/gi, type: 'javascript_eval', severity: 'high' }
    ];
    
    for (const { pattern, type, severity } of suspiciousPatterns) {
      if (pattern.test(contentStr)) {
        threats.push({
          type,
          severity,
          description: `Suspicious ${type} pattern detected`,
          source: 'heuristic',
          confidence: 0.7
        });
      }
    }
    
    return threats;
  }

  calculateThreatConfidence(content, signature) {
    // Simple confidence calculation
    const contentStr = content.toString('utf8', 0, Math.min(content.length, 1024));
    const matches = (contentStr.match(new RegExp(signature, 'gi')) || []).length;
    
    if (matches === 0) return 0;
    if (matches === 1) return 0.6;
    if (matches >= 5) return 0.9;
    return Math.min(0.8, 0.3 + (matches * 0.1));
  }

  async scanForVulnerabilities(filePath) {
    const vulnerabilities = [];
    
    try {
      const extension = path.extname(filePath).toLowerCase();
      
      // File type specific vulnerability scanning
      switch (extension) {
        case '.js':
        case '.jsx':
          vulnerabilities.push(...await this.scanJavaScriptVulnerabilities(filePath));
          break;
        case '.php':
          vulnerabilities.push(...await this.scanPHPVulnerabilities(filePath));
          break;
        case '.py':
          vulnerabilities.push(...await this.scanPythonVulnerabilities(filePath));
          break;
        case '.html':
        case '.htm':
          vulnerabilities.push(...await this.scanHTMLVulnerabilities(filePath));
          break;
        case '.json':
          vulnerabilities.push(...await this.scanJSONVulnerabilities(filePath));
          break;
        case '.xml':
          vulnerabilities.push(...await this.scanXMLVulnerabilities(filePath));
          break;
      }
      
      // General vulnerabilities
      vulnerabilities.push(...await this.scanGeneralVulnerabilities(filePath));
      
      return vulnerabilities;
    } catch (error) {
      console.error(`Vulnerability scan failed for ${filePath}:`, error);
      return [{ error: error.message, type: 'scan_error' }];
    }
  }

  async scanJavaScriptVulnerabilities(filePath) {
    const vulnerabilities = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Common JavaScript vulnerabilities
      const vulnPatterns = [
        { pattern: /eval\s*\(/gi, type: 'code_injection', severity: 'high', cve: 'CVE-2021-XXXX' },
        { pattern: /innerHTML\s*=/gi, type: 'xss', severity: 'high', cve: 'CVE-2020-XXXX' },
        { pattern: /document\.write\s*\(/gi, type: 'dom_injection', severity: 'medium', cve: 'CVE-2019-XXXX' },
        { pattern: /setTimeout\s*\(\s*["'].*["']/gi, type: 'timing_attack', severity: 'medium', cve: 'CVE-2018-XXXX' },
        { pattern: /Function\s*\(\s*["'].*["']/gi, type: 'function_injection', severity: 'high', cve: 'CVE-2017-XXXX' }
      ];
      
      for (const { pattern, type, severity, cve } of vulnPatterns) {
        if (pattern.test(content)) {
          vulnerabilities.push({
            type,
            severity,
            description: `JavaScript ${type} vulnerability detected`,
            cve,
            line: this.getLineNumber(content, pattern),
            recommendation: this.getVulnerabilityRecommendation(type)
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      return [{ error: error.message, type: 'scan_error' }];
    }
  }

  async scanPHPVulnerabilities(filePath) {
    const vulnerabilities = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Common PHP vulnerabilities
      const vulnPatterns = [
        { pattern: /eval\s*\(/gi, type: 'code_injection', severity: 'critical', cve: 'CVE-2021-XXXX' },
        { pattern: /system\s*\(/gi, type: 'command_injection', severity: 'critical', cve: 'CVE-2020-XXXX' },
        { pattern: /exec\s*\(/gi, type: 'command_injection', severity: 'critical', cve: 'CVE-2019-XXXX' },
        { pattern: /\$_GET\[.*\]/gi, type: 'sql_injection', severity: 'high', cve: 'CVE-2018-XXXX' },
        { pattern: /\$_POST\[.*\]/gi, type: 'sql_injection', severity: 'high', cve: 'CVE-2018-XXXX' },
        { pattern: /include\s*\(/gi, type: 'file_inclusion', severity: 'high', cve: 'CVE-2017-XXXX' }
      ];
      
      for (const { pattern, type, severity, cve } of vulnPatterns) {
        if (pattern.test(content)) {
          vulnerabilities.push({
            type,
            severity,
            description: `PHP ${type} vulnerability detected`,
            cve,
            line: this.getLineNumber(content, pattern),
            recommendation: this.getVulnerabilityRecommendation(type)
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      return [{ error: error.message, type: 'scan_error' }];
    }
  }

  async scanPythonVulnerabilities(filePath) {
    const vulnerabilities = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Common Python vulnerabilities
      const vulnPatterns = [
        { pattern: /eval\s*\(/gi, type: 'code_injection', severity: 'high', cve: 'CVE-2021-XXXX' },
        { pattern: /exec\s*\(/gi, type: 'command_injection', severity: 'high', cve: 'CVE-2020-XXXX' },
        { pattern: /subprocess\.call\s*\(/gi, type: 'command_injection', severity: 'high', cve: 'CVE-2019-XXXX' },
        { pattern: /pickle\.loads\s*\(/gi, type: 'deserialization', severity: 'high', cve: 'CVE-2018-XXXX' },
        { pattern: /input\s*\(/gi, type: 'injection', severity: 'medium', cve: 'CVE-2017-XXXX' }
      ];
      
      for (const { pattern, type, severity, cve } of vulnPatterns) {
        if (pattern.test(content)) {
          vulnerabilities.push({
            type,
            severity,
            description: `Python ${type} vulnerability detected`,
            cve,
            line: this.getLineNumber(content, pattern),
            recommendation: this.getVulnerabilityRecommendation(type)
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      return [{ error: error.message, type: 'scan_error' }];
    }
  }

  async scanHTMLVulnerabilities(filePath) {
    const vulnerabilities = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Common HTML vulnerabilities
      const vulnPatterns = [
        { pattern: /<script[^>]*>/gi, type: 'xss', severity: 'high', cve: 'CVE-2020-XXXX' },
        { pattern: /javascript:/gi, type: 'xss', severity: 'high', cve: 'CVE-2020-XXXX' },
        { pattern: /onload\s*=/gi, type: 'xss', severity: 'medium', cve: 'CVE-2019-XXXX' },
        { pattern: /<iframe[^>]*>/gi, type: 'clickjacking', severity: 'medium', cve: 'CVE-2018-XXXX' },
        { pattern: /<object[^>]*>/gi, type: 'object_injection', severity: 'medium', cve: 'CVE-2017-XXXX' }
      ];
      
      for (const { pattern, type, severity, cve } of vulnPatterns) {
        if (pattern.test(content)) {
          vulnerabilities.push({
            type,
            severity,
            description: `HTML ${type} vulnerability detected`,
            cve,
            line: this.getLineNumber(content, pattern),
            recommendation: this.getVulnerabilityRecommendation(type)
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      return [{ error: error.message, type: 'scan_error' }];
    }
  }

  async scanJSONVulnerabilities(filePath) {
    const vulnerabilities = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Parse JSON safely
      let jsonData;
      try {
        jsonData = JSON.parse(content);
      } catch (parseError) {
        vulnerabilities.push({
          type: 'json_parsing',
          severity: 'medium',
          description: 'Invalid JSON syntax',
          line: this.getLineNumber(content, parseError.message),
          recommendation: 'Fix JSON syntax errors'
        });
        return vulnerabilities;
      }
      
      // Check for JSON vulnerabilities
      if (typeof jsonData === 'object') {
        // Check for prototype pollution
        if (jsonData.hasOwnProperty('__proto__') || jsonData.hasOwnProperty('constructor') || jsonData.hasOwnProperty('prototype')) {
          vulnerabilities.push({
            type: 'prototype_pollution',
            severity: 'high',
            description: 'Prototype pollution vulnerability',
            recommendation: 'Validate and sanitize JSON input'
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      return [{ error: error.message, type: 'scan_error' }];
    }
  }

  async scanXMLVulnerabilities(filePath) {
    const vulnerabilities = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Common XML vulnerabilities
      const vulnPatterns = [
        { pattern: /<!ENTITY.*>/gi, type: 'xxe', severity: 'critical', cve: 'CVE-2020-XXXX' },
        { pattern: /<\?xml-stylesheet.*>/gi, type: 'xslt_injection', severity: 'high', cve: 'CVE-2019-XXXX' },
        { pattern: /<xsl:*/gi, type: 'xslt_injection', severity: 'high', cve: 'CVE-2019-XXXX' },
        { pattern: /<!DOCTYPE.*\[.*\]>/gi, type: 'dtd_injection', severity: 'high', cve: 'CVE-2018-XXXX' }
      ];
      
      for (const { pattern, type, severity, cve } of vulnPatterns) {
        if (pattern.test(content)) {
          vulnerabilities.push({
            type,
            severity,
            description: `XML ${type} vulnerability detected`,
            cve,
            line: this.getLineNumber(content, pattern),
            recommendation: this.getVulnerabilityRecommendation(type)
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      return [{ error: error.message, type: 'scan_error' }];
    }
  }

  async scanGeneralVulnerabilities(filePath) {
    const vulnerabilities = [];
    
    try {
      const stats = await fs.stat(filePath);
      
      // Check for world-writable files
      if (stats.mode && (stats.mode & 0o002)) {
        vulnerabilities.push({
          type: 'world_writable',
          severity: 'high',
          description: 'File is world-writable',
          recommendation: 'Remove world-write permissions'
        });
      }
      
      // Check for setuid/setgid files
      if (stats.mode && (stats.mode & 0o4000 || stats.mode & 0o2000)) {
        vulnerabilities.push({
          type: 'special_permissions',
          severity: 'medium',
          description: 'File has special permissions (setuid/setgid)',
          recommendation: 'Review necessity of special permissions'
        });
      }
      
      // Check for files with suspicious names
      const fileName = path.basename(filePath);
      const suspiciousNames = ['backdoor', 'rootkit', 'keylogger', 'trojan', 'malware', 'virus'];
      
      for (const suspiciousName of suspiciousNames) {
        if (fileName.toLowerCase().includes(suspiciousName)) {
          vulnerabilities.push({
            type: 'suspicious_name',
            severity: 'medium',
            description: `File has suspicious name: ${fileName}`,
            recommendation: 'Investigate file purpose and origin'
          });
        }
      }
      
      return vulnerabilities;
    } catch (error) {
      return [{ error: error.message, type: 'scan_error' }];
    }
  }

  getLineNumber(content, pattern) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return i + 1;
      }
    }
    return 0;
  }

  getVulnerabilityRecommendation(type) {
    const recommendations = {
      code_injection: 'Use parameterized queries and input validation',
      command_injection: 'Use allowlists and proper escaping',
      sql_injection: 'Use parameterized queries and input validation',
      xss: 'Use proper output encoding and CSP headers',
      dom_injection: 'Use safe DOM manipulation methods',
      file_inclusion: 'Validate file paths and use allowlists',
      deserialization: 'Use safe deserialization methods',
      prototype_pollution: 'Validate and sanitize object properties',
      json_parsing: 'Validate JSON structure before parsing',
      xxe: 'Disable external entities in XML parser',
      xslt_injection: 'Validate XSLT input and use secure processing',
      dtd_injection: 'Disable DTD processing in XML parser',
      world_writable: 'Remove world-write permissions',
      special_permissions: 'Review necessity of special permissions',
      suspicious_name: 'Investigate file purpose and origin',
      timing_attack: 'Use safe timing mechanisms and validation',
      function_injection: 'Use safe function creation methods'
    };
    
    return recommendations[type] || 'Review and implement proper security measures';
  }

  async classifyData(filePath) {
    const classification = {
      sensitivity: 'public',
      category: 'general',
      tags: [],
      regulations: [],
      retentionPolicy: 'standard',
      encryptionRequired: false
    };
    
    try {
      const fileName = path.basename(filePath).toLowerCase();
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check for sensitive data patterns
      const sensitivePatterns = [
        { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, type: 'credit_card', sensitivity: 'confidential' },
        { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, type: 'ssn', sensitivity: 'confidential' },
        { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, type: 'email', sensitivity: 'personal' },
        { pattern: /\b(?:19|20)\d{2}[-\s]?\d{2}[-\s]?\d{2}\b/g, type: 'dob', sensitivity: 'personal' },
        { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, type: 'ip_address', sensitivity: 'internal' },
        { pattern: /password|passwd|secret|key|token/gi, type: 'credentials', sensitivity: 'confidential' },
        { pattern: /api[_-]?key|secret[_-]?key|access[_-]?token/gi, type: 'api_keys', sensitivity: 'confidential' }
      ];
      
      for (const { pattern, type, sensitivity } of sensitivePatterns) {
        if (pattern.test(content)) {
          classification.sensitivity = sensitivity;
          classification.tags.push(type);
        }
      }
      
      // Check file name for sensitive indicators
      const sensitiveFilePatterns = [
        /password|secret|private|confidential|sensitive/gi,
        /key|cert|credential|token/gi,
        /backup|archive|log|temp/gi
      ];
      
      for (const pattern of sensitiveFilePatterns) {
        if (pattern.test(fileName)) {
          classification.sensitivity = 'confidential';
          classification.tags.push('sensitive_filename');
        }
      }
      
      // Determine category
      if (classification.tags.includes('credit_card') || classification.tags.includes('ssn')) {
        classification.category = 'financial';
        classification.regulations = ['PCI-DSS', 'GLBA'];
        classification.encryptionRequired = true;
      } else if (classification.tags.includes('personal') || classification.tags.includes('email')) {
        classification.category = 'personal';
        classification.regulations = ['GDPR', 'CCPA'];
        classification.encryptionRequired = true;
      } else if (classification.tags.includes('medical') || classification.tags.includes('health')) {
        classification.category = 'health';
        classification.regulations = ['HIPAA'];
        classification.encryptionRequired = true;
      }
      
      // Determine retention policy
      if (classification.sensitivity === 'confidential') {
        classification.retentionPolicy = 'secure_delete';
      } else if (classification.sensitivity === 'personal') {
        classification.retentionPolicy = 'limited_retention';
      }
      
      return classification;
    } catch (error) {
      console.error(`Data classification failed for ${filePath}:`, error);
      return { error: error.message, sensitivity: 'unknown' };
    }
  }

  async checkCompliance(filePath, frameworks = ['GDPR']) {
    const compliance = {};
    
    for (const framework of frameworks) {
      const frameworkConfig = this.complianceFrameworks.get(framework);
      if (frameworkConfig) {
        compliance[framework] = await this.checkFrameworkCompliance(filePath, framework, frameworkConfig);
      }
    }
    
    return compliance;
  }

  async checkFrameworkCompliance(filePath, framework, config) {
    const compliance = {
      framework,
      status: 'compliant',
      score: 100,
      violations: [],
      recommendations: []
    };
    
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      
      for (const rule of config.rules) {
        const violation = await this.checkComplianceRule(filePath, stats, fileName, rule);
        if (violation) {
          compliance.violations.push(violation);
          compliance.score -= rule.penalty;
        }
      }
      
      // Determine overall status
      if (compliance.score < 70) {
        compliance.status = 'non_compliant';
      } else if (compliance.score < 90) {
        compliance.status = 'partially_compliant';
      }
      
      return compliance;
    } catch (error) {
      console.error(`Compliance check failed for ${framework}:`, error);
      return { error: error.message, status: 'error' };
    }
  }

  async checkComplianceRule(filePath, stats, fileName, rule) {
    try {
      switch (rule.type) {
        case 'file_permissions':
          return this.checkPermissionCompliance(stats.mode, rule);
        case 'file_naming':
          return this.checkNamingCompliance(fileName, rule);
        case 'file_age':
          return this.checkAgeCompliance(stats.mtime, rule);
        case 'file_size':
          return this.checkSizeCompliance(stats.size, rule);
        case 'encryption_required':
          return await this.checkEncryptionCompliance(filePath, rule);
        default:
          return null;
      }
    } catch (error) {
      return { error: error.message, rule: rule.type };
    }
  }

  checkPermissionCompliance(mode, rule) {
    if (!mode) return null;
    
    const required = rule.required || [];
    const forbidden = rule.forbidden || [];
    
    // Check required permissions
    for (const perm of required) {
      if (!(mode & perm)) {
        return {
          type: 'missing_permission',
          severity: rule.severity || 'medium',
          description: `Missing required permission: ${perm}`,
          recommendation: `Add ${perm} permission`
        };
      }
    }
    
    // Check forbidden permissions
    for (const perm of forbidden) {
      if (mode & perm) {
        return {
          type: 'forbidden_permission',
          severity: rule.severity || 'high',
          description: `Forbidden permission found: ${perm}`,
          recommendation: `Remove ${perm} permission`
        };
      }
    }
    
    return null;
  }

  checkNamingCompliance(fileName, rule) {
    const patterns = rule.patterns || [];
    const forbidden = rule.forbidden || [];
    
    // Check forbidden patterns
    for (const pattern of forbidden) {
      if (new RegExp(pattern, 'i').test(fileName)) {
        return {
          type: 'forbidden_name',
          severity: rule.severity || 'medium',
          description: `Forbidden name pattern: ${pattern}`,
          recommendation: 'Rename file to comply with naming policy'
        };
      }
    }
    
    // Check required patterns
    if (patterns.length > 0) {
      let matches = false;
      for (const pattern of patterns) {
        if (new RegExp(pattern, 'i').test(fileName)) {
          matches = true;
          break;
        }
      }
      
      if (!matches) {
        return {
          type: 'invalid_name',
          severity: rule.severity || 'low',
          description: 'File name does not match required patterns',
          recommendation: 'Rename file to match naming policy'
        };
      }
    }
    
    return null;
  }

  checkAgeCompliance(mtime, rule) {
    const now = new Date();
    const fileAge = now - mtime;
    const maxAge = rule.maxAge || (365 * 24 * 60 * 60 * 1000); // 1 year default
    
    if (fileAge > maxAge) {
      return {
        type: 'file_too_old',
        severity: rule.severity || 'medium',
        description: `File age (${Math.round(fileAge / (24 * 60 * 60 * 1000)} days) exceeds maximum`,
        recommendation: 'Archive or delete old files'
      };
    }
    
    return null;
  }

  checkSizeCompliance(size, rule) {
    const maxSize = rule.maxSize || (100 * 1024 * 1024); // 100MB default
    
    if (size > maxSize) {
      return {
        type: 'file_too_large',
        severity: rule.severity || 'low',
        description: `File size (${Math.round(size / (1024 * 1024)}MB) exceeds maximum`,
        recommendation: 'Compress or split large files'
      };
    }
    
    return null;
  }

  async checkEncryptionCompliance(filePath, rule) {
    // Simplified encryption check - would use proper encryption detection
    const fileName = path.basename(filePath);
    const encryptedExtensions = ['.gpg', '.pgp', '.enc', '.aes'];
    
    const isEncrypted = encryptedExtensions.some(ext => fileName.endsWith(ext));
    
    if (rule.required && !isEncrypted) {
      return {
        type: 'encryption_required',
        severity: rule.severity || 'high',
        description: 'File should be encrypted but is not',
        recommendation: 'Encrypt file using approved encryption method'
      };
    }
    
    return null;
  }

  calculateRiskScore(scanResult) {
    let score = 0;
    
    // Threats contribute to risk score
    for (const threat of scanResult.threats) {
      switch (threat.severity) {
        case 'critical': score += 40; break;
        case 'high': score += 30; break;
        case 'medium': score += 20; break;
        case 'low': score += 10; break;
      }
    }
    
    // Vulnerabilities contribute to risk score
    for (const vuln of scanResult.vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': score += 35; break;
        case 'high': score += 25; break;
        case 'medium': score += 15; break;
        case 'low': score += 5; break;
      }
    }
    
    // Permission risk contributes to risk score
    if (scanResult.permissions.riskLevel) {
      switch (scanResult.permissions.riskLevel) {
        case 'critical': score += 30; break;
        case 'high': score += 20; break;
        case 'medium': score += 10; break;
        case 'low': score += 5; break;
      }
    }
    
    // Data sensitivity contributes to risk score
    if (scanResult.dataClassification.sensitivity) {
      switch (scanResult.dataClassification.sensitivity) {
        case 'confidential': score += 25; break;
        case 'personal': score += 15; break;
        case 'internal': score += 10; break;
        case 'public': score += 0; break;
      }
    }
    
    return Math.min(100, score);
  }

  generateRecommendations(scanResult) {
    const recommendations = [];
    
    // Security recommendations
    if (scanResult.threats.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        title: 'Malware threats detected',
        description: `${scanResult.threats.length} potential malware threats found`,
        action: 'Quarantine and scan with antivirus software'
      });
    }
    
    // Vulnerability recommendations
    if (scanResult.vulnerabilities.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        title: 'Security vulnerabilities detected',
        description: `${scanResult.vulnerabilities.length} security vulnerabilities found`,
        action: 'Update software and apply security patches'
      });
    }
    
    // Permission recommendations
    if (scanResult.permissions.riskLevel === 'high' || scanResult.permissions.riskLevel === 'critical') {
      recommendations.push({
        type: 'permissions',
        priority: 'medium',
        title: 'Risky file permissions',
        description: `File has ${scanResult.permissions.riskLevel} risk permissions`,
        action: 'Review and restrict file permissions'
      });
    }
    
    // Data protection recommendations
    if (scanResult.dataClassification.encryptionRequired) {
      recommendations.push({
        type: 'data_protection',
        priority: 'high',
        title: 'Encryption required',
        description: 'File contains sensitive data that should be encrypted',
        action: 'Apply approved encryption to sensitive files'
      });
    }
    
    // Compliance recommendations
    for (const [framework, compliance] of Object.entries(scanResult.compliance)) {
      if (compliance.status !== 'compliant') {
        recommendations.push({
          type: 'compliance',
          priority: 'medium',
          title: `${framework} compliance issues`,
          description: `${compliance.violations.length} compliance violations found`,
          action: 'Address compliance violations to meet regulatory requirements'
        });
      }
    }
    
    return recommendations;
  }

  // Framework Management
  initializeFrameworks() {
    // GDPR Framework
    this.complianceFrameworks.set('GDPR', {
      name: 'General Data Protection Regulation',
      description: 'EU data protection regulation',
      rules: [
        {
          type: 'data_classification',
          severity: 'high',
          description: 'Personal data must be classified and protected'
        },
        {
          type: 'encryption_required',
          required: true,
          severity: 'high',
          description: 'Personal data must be encrypted'
        },
        {
          type: 'retention_policy',
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
          severity: 'medium',
          description: 'Personal data retention limits'
        }
      ]
    });
    
    // PCI-DSS Framework
    this.complianceFrameworks.set('PCI-DSS', {
      name: 'Payment Card Industry Data Security Standard',
      description: 'Payment card security requirements',
      rules: [
        {
          type: 'encryption_required',
          required: true,
          severity: 'critical',
          description: 'Cardholder data must be encrypted'
        },
        {
          type: 'access_control',
          severity: 'high',
          description: 'Access to cardholder data must be restricted'
        },
        {
          type: 'file_permissions',
          forbidden: [0o002], // No world-write
          severity: 'high',
          description: 'Cardholder data files must not be world-writable'
        }
      ]
    });
    
    // HIPAA Framework
    this.complianceFrameworks.set('HIPAA', {
      name: 'Health Insurance Portability and Accountability Act',
      description: 'US healthcare data protection',
      rules: [
        {
          type: 'encryption_required',
          required: true,
          severity: 'high',
          description: 'PHI must be encrypted'
        },
        {
          type: 'access_control',
          severity: 'high',
          description: 'Access to PHI must be logged and controlled'
        },
        {
          type: 'audit_logging',
          severity: 'medium',
          description: 'Access to PHI must be audited'
        }
      ]
    });
  }

  // Utility Methods
  generateScanId() {
    return `scan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  async loadThreatDatabase() {
    try {
      const data = await fs.readFile(this.config.threatDatabasePath, 'utf8');
      const threats = JSON.parse(data);
      
      for (const [signature, threat] of Object.entries(threats)) {
        this.threatDatabase.set(signature, threat);
      }
      
      console.warn(`🔍 Loaded ${this.threatDatabase.size} threat signatures`);
    } catch (error) {
      console.warn('No threat database found, using empty database');
    }
  }

  async loadSecurityRules() {
    // Load custom security rules
    try {
      const rulesPath = path.join(__dirname, 'data', 'security-rules.json');
      const data = await fs.readFile(rulesPath, 'utf8');
      const rules = JSON.parse(data);
      
      for (const rule of rules) {
        this.securityRules.set(rule.id, rule);
      }
      
      console.warn(`📋 Loaded ${this.securityRules.size} security rules`);
    } catch (error) {
      console.warn('No custom security rules found');
    }
  }

  async initializeComplianceFrameworks() {
    // Frameworks are already initialized in constructor
    console.warn(`📊 Initialized ${this.complianceFrameworks.size} compliance frameworks`);
  }

  async logSecurityEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date(),
      type: eventType,
      data,
      id: crypto.randomBytes(8).toString('hex')
    };
    
    this.auditLog.push(logEntry);
    
    // Keep log size manageable
    if (this.auditLog.length > this.config.maxAuditLogSize) {
      this.auditLog = this.auditLog.slice(-this.config.maxAuditLogSize);
    }
    
    // Write to file
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.config.auditLogPath, logLine);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  // API Methods
  async performBatchSecurityScan(filePaths, options = {}) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await this.performSecurityScan(filePath, options);
        results.push(result);
      } catch (error) {
        results.push({
          filePath,
          error: error.message,
          scanId: this.generateScanId()
        });
      }
    }
    
    return results;
  }

  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit);
  }

  getSecurityStats() {
    const totalScans = this.auditLog.filter(entry => entry.type === 'scan_completed').length;
    const threatsFound = this.auditLog.filter(entry => entry.type === 'scan_completed' && entry.data.threatsFound > 0).length;
    const vulnerabilitiesFound = this.auditLog.filter(entry => entry.type === 'scan_completed' && entry.data.vulnerabilitiesFound > 0).length;
    
    return {
      totalScans,
      threatsFound,
      vulnerabilitiesFound,
      threatDatabaseSize: this.threatDatabase.size,
      securityRulesCount: this.securityRules.size,
      complianceFrameworksCount: this.complianceFrameworks.size,
      auditLogSize: this.auditLog.length
    };
  }

  async updateThreatDatabase(newThreats) {
    for (const threat of newThreats) {
      if (threat.signature && threat.type) {
        this.threatDatabase.set(threat.signature, threat);
      }
    }
    
    // Save updated database
    try {
      const threats = Object.fromEntries(this.threatDatabase);
      await fs.writeFile(this.config.threatDatabasePath, JSON.stringify(threats, null, 2));
      console.warn(`🔍 Updated threat database with ${newThreats.length} new threats`);
    } catch (error) {
      console.error('Failed to update threat database:', error);
    }
  }
}

module.exports = SecurityComplianceService;
