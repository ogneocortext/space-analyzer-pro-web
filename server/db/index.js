/**
 * Modular Knowledge Database
 * Aggregates all database modules for the Space Analyzer
 */

const DatabaseCore = require("./core");
const AnalysisDatabase = require("./analysis");
const AIDatabase = require("./ai");
const TrendsDatabase = require("./trends");
const SummariesDatabase = require("./summaries");
const CleanupDatabase = require("./cleanup");
const ComplexityDatabase = require("./complexity");
const TemplatesDatabase = require("./templates");

class KnowledgeDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.core = null;
    this.analysis = null;
    this.ai = null;
    this.trends = null;
    this.summaries = null;
    this.cleanup = null;
    this.complexity = null;
    this.templates = null;
    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      // Initialize core database functionality
      this.core = new DatabaseCore(this.dbPath);
      await this.core.initialize();

      // Initialize all feature modules
      this.analysis = new AnalysisDatabase(this.core);
      this.ai = new AIDatabase(this.core);
      this.trends = new TrendsDatabase(this.core);
      this.summaries = new SummariesDatabase(this.core);
      this.cleanup = new CleanupDatabase(this.core);
      this.complexity = new ComplexityDatabase(this.core);
      this.templates = new TemplatesDatabase(this.core);

      // Set database reference once initialized
      this.db = this.core.getDatabase();
      this.setupModules();
      this.initialized = true;

      return true;
    } catch (error) {
      console.error("❌ KnowledgeDatabase initialization failed:", error);
      this.db = null;
      this.initialized = false;
      throw error;
    }
  }

  setupModules() {
    // Pass database reference to all modules
    this.analysis.setDatabase(this.db);
    this.ai.setDatabase(this.db);
    this.trends.setDatabase(this.db);
    this.summaries.setDatabase(this.db);
    this.cleanup.setDatabase(this.db);
    this.complexity.setDatabase(this.db);
    this.templates.setDatabase(this.db);
  }

  // ============================================================
  // Core Methods (delegated to core)
  // ============================================================

  compressData(data) {
    return this.core.compressData(data);
  }

  decompressData(compressed) {
    return this.core.decompressData(compressed);
  }

  generateHash(content) {
    return this.core.generateHash(content);
  }

  getStats() {
    return this.core.getStats();
  }

  checkDatabaseSize(thresholdMB) {
    return this.core.checkDatabaseSize(thresholdMB);
  }

  cleanup(daysToKeep) {
    return this.core.cleanup(daysToKeep);
  }

  close() {
    return this.core.close();
  }

  // ============================================================
  // Analysis Methods (delegated to analysis module)
  // ============================================================

  storeAnalysis(directoryPath, analysisData) {
    return this.analysis.storeAnalysis(directoryPath, analysisData);
  }

  storeAnalysisFiles(analysisId, files) {
    return this.analysis.storeAnalysisFiles(analysisId, files);
  }

  getAnalysis(directoryPath) {
    return this.analysis.getAnalysis(directoryPath);
  }

  getAnalysisFiles(analysisId, options) {
    return this.analysis.getAnalysisFiles(analysisId, options);
  }

  getAnalysisStats(analysisId) {
    return this.analysis.getAnalysisStats(analysisId);
  }

  getAnalysisHistory() {
    return this.analysis.getAnalysisHistory();
  }

  getCurrentAnalysis(directoryPath) {
    return this.analysis.getCurrentAnalysis(directoryPath);
  }

  storeFileMetadata(directoryPath, files) {
    return this.analysis.storeFileMetadata(directoryPath, files);
  }

  getChangedFiles(directoryPath, currentFiles) {
    return this.analysis.getChangedFiles(directoryPath, currentFiles);
  }

  // ============================================================
  // AI Methods (delegated to AI module)
  // ============================================================

  storeAIResponse(question, answer, contextHash, modelUsed, responseTime) {
    return this.ai.storeAIResponse(question, answer, contextHash, modelUsed, responseTime);
  }

  findSimilarResponse(question, contextHash) {
    return this.ai.findSimilarResponse(question, contextHash);
  }

  storeAIAnalysisContext(
    analysisId,
    directoryPath,
    contextType,
    contextPayload,
    modelUsed,
    promptTemplate
  ) {
    return this.ai.storeAIAnalysisContext(
      analysisId,
      directoryPath,
      contextType,
      contextPayload,
      modelUsed,
      promptTemplate
    );
  }

  getAIAnalysisContext(analysisId, contextType) {
    return this.ai.getAIAnalysisContext(analysisId, contextType);
  }

  // ============================================================
  // Trends Methods (delegated to trends module)
  // ============================================================

  storeAnalysisTrend(directoryPath, analysisData) {
    return this.trends.storeAnalysisTrend(directoryPath, analysisData);
  }

  getAnalysisTrends(directoryPath, limit) {
    return this.trends.getAnalysisTrends(directoryPath, limit);
  }

  getTrendSummary(directoryPath) {
    return this.trends.getTrendSummary(directoryPath);
  }

  // ============================================================
  // Summaries Methods (delegated to summaries module)
  // ============================================================

  storeFileSummary(
    filePath,
    fileHash,
    fileSize,
    fileType,
    summaryText,
    extractedPreview,
    modelUsed,
    tokensUsed
  ) {
    return this.summaries.storeFileSummary(
      filePath,
      fileHash,
      fileSize,
      fileType,
      summaryText,
      extractedPreview,
      modelUsed,
      tokensUsed
    );
  }

  getFileSummary(filePath, fileHash) {
    return this.summaries.getFileSummary(filePath, fileHash);
  }

  getPopularSummaries(limit) {
    return this.summaries.getPopularSummaries(limit);
  }

  cleanupOldSummaries(daysToKeep) {
    return this.summaries.cleanupOldSummaries(daysToKeep);
  }

  // ============================================================
  // Cleanup Methods (delegated to cleanup module)
  // ============================================================

  storeCleanupRecommendation(
    directoryPath,
    filePath,
    fileSize,
    recommendationType,
    confidenceScore,
    reasoning,
    potentialSavings,
    safeToDelete
  ) {
    return this.cleanup.storeCleanupRecommendation(
      directoryPath,
      filePath,
      fileSize,
      recommendationType,
      confidenceScore,
      reasoning,
      potentialSavings,
      safeToDelete
    );
  }

  getCleanupRecommendations(directoryPath, limit, type) {
    return this.cleanup.getCleanupRecommendations(directoryPath, limit, type);
  }

  updateCleanupAction(filePath, action) {
    return this.cleanup.updateCleanupAction(filePath, action);
  }

  getPotentialSavings(directoryPath) {
    return this.cleanup.getPotentialSavings(directoryPath);
  }

  getRecommendationsByStatus(directoryPath, status, limit) {
    return this.cleanup.getRecommendationsByStatus(directoryPath, status, limit);
  }

  cleanupCompletedRecommendations(daysToKeep) {
    return this.cleanup.cleanupCompletedRecommendations(daysToKeep);
  }

  // ============================================================
  // Complexity Methods (delegated to complexity module)
  // ============================================================

  storeComplexityMetrics(metrics) {
    return this.complexity.storeComplexityMetrics(metrics);
  }

  getComplexityMetrics(filePath) {
    return this.complexity.getComplexityMetrics(filePath);
  }

  getDirectoryComplexity(directoryPath, minPriority) {
    return this.complexity.getDirectoryComplexity(directoryPath, minPriority);
  }

  getComplexitySummary(directoryPath) {
    return this.complexity.getComplexitySummary(directoryPath);
  }

  getFilesNeedingRefactoring(directoryPath, limit) {
    return this.complexity.getFilesNeedingRefactoring(directoryPath, limit);
  }

  cleanupOrphanedMetrics(validFilePaths) {
    return this.complexity.cleanupOrphanedMetrics(validFilePaths);
  }

  getMostComplexFiles(limit) {
    return this.complexity.getMostComplexFiles(limit);
  }

  // ============================================================
  // Templates Methods (delegated to templates module)
  // ============================================================

  createTemplate(template) {
    return this.templates.createTemplate(template);
  }

  getTemplates(templateType, activeOnly) {
    return this.templates.getTemplates(templateType, activeOnly);
  }

  getTemplateById(templateId) {
    return this.templates.getTemplateById(templateId);
  }

  getDefaultTemplate(templateType) {
    return this.templates.getDefaultTemplate(templateType);
  }

  updateTemplate(templateId, updates) {
    return this.templates.updateTemplate(templateId, updates);
  }

  deleteTemplate(templateId) {
    return this.templates.deleteTemplate(templateId);
  }

  setDefaultTemplate(templateId, templateType) {
    return this.templates.setDefaultTemplate(templateId, templateType);
  }

  duplicateTemplate(templateId, newName) {
    return this.templates.duplicateTemplate(templateId, newName);
  }
}

module.exports = KnowledgeDatabase;
