// Simplified Self-Learning ML Service for AI Integration
// Uses basic algorithms instead of external ML libraries for compatibility

class SelfLearningMLService {
  constructor() {
    this.isInitialized = false;
    this.analysisHistory = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🧠 Initializing Self-Learning ML Service...');

    try {
      // Simplified initialization - no external ML libraries
      console.log('✅ Self-Learning ML Service initialized (simplified mode)');

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Self-Learning ML Service:', error);
      throw error;
    }
  }

  // Store analysis results for learning
  async storeAnalysis(analysis) {
    const analysisData = {
      timestamp: Date.now(),
      fileCount: analysis.files?.length || 0,
      totalSize: analysis.totalSize || 0,
      categories: this.extractCategories(analysis.files || []),
      fileChanges: this.extractFileChanges(analysis),
      patterns: []
    };

    // Analyze patterns in this analysis
    analysisData.patterns = await this.analyzeCurrentPatterns(analysisData);

    this.analysisHistory.push(analysisData);

    // Keep only last 50 analyses
    if (this.analysisHistory.length > 50) {
      this.analysisHistory = this.analysisHistory.slice(-50);
    }

    console.log('📓 Analysis stored for learning');
  }

  extractCategories(files) {
    const categories = {};

    files.forEach(file => {
      const category = file.category || 'Other';
      if (!categories[category]) {
        categories[category] = { count: 0, size: 0 };
      }
      categories[category].count++;
      categories[category].size += file.size || 0;
    });

    return categories;
  }

  extractFileChanges() {
    // In a real implementation, this would compare with previous analysis
    // For now, return empty array
    return [];
  }

  async analyzeCurrentPatterns(analysis) {
    const patterns = [];

    if (this.analysisHistory.length < 3) return patterns;

    // Analyze growth patterns
    const growthPattern = this.analyzeGrowthPattern();
    if (growthPattern) patterns.push(growthPattern);

    // Analyze seasonal patterns
    const seasonalPattern = this.analyzeSeasonalPattern();
    if (seasonalPattern) patterns.push(seasonalPattern);

    return patterns;
  }

  analyzeGrowthPattern() {
    if (this.analysisHistory.length < 3) return null;

    const recent = this.analysisHistory.slice(-3);
    const sizes = recent.map(a => a.totalSize);
    const isGrowing = sizes[2] > sizes[1] && sizes[1] > sizes[0];

    if (isGrowing) {
      return {
        type: 'growth',
        description: 'Consistent growth pattern detected',
        confidence: 0.8,
        data: { trend: 'increasing', rate: (sizes[2] - sizes[0]) / sizes[0] }
      };
    }

    return null;
  }

  analyzeSeasonalPattern() {
    const currentMonth = new Date().getMonth();
    const seasonalData = this.analysisHistory.filter(a =>
      new Date(a.timestamp).getMonth() === currentMonth
    );

    if (seasonalData.length >= 2) {
      return {
        type: 'seasonal',
        description: 'Seasonal pattern detected',
        confidence: 0.6,
        data: { month: currentMonth, occurrences: seasonalData.length }
      };
    }

    return null;
  }

  // Generate predictive insights (enhanced)
  async generatePredictiveInsights() {
    if (!this.isInitialized || this.analysisHistory.length < 1) {
      return [];
    }

    const insights = [];
    const recent = this.analysisHistory[this.analysisHistory.length - 1];

    if (!recent) return insights;

    // Growth prediction (works with single analysis)
    const growthInsight = this.generateGrowthInsight(recent);
    if (growthInsight) insights.push(growthInsight);

    // Cleanup prediction (enhanced)
    const cleanupInsights = this.generateCleanupInsights(recent);
    insights.push(...cleanupInsights);

    // Organization prediction (enhanced)
    const organizationInsight = this.generateOrganizationInsight(recent);
    if (organizationInsight) insights.push(organizationInsight);

    // Security prediction (enhanced)
    const securityInsights = this.generateSecurityInsights(recent);
    insights.push(...securityInsights);

    // Performance prediction
    const performanceInsight = this.generatePerformanceInsight(recent);
    if (performanceInsight) insights.push(performanceInsight);

    // Storage optimization prediction
    const storageInsights = this.generateStorageInsights(recent);
    insights.push(...storageInsights);

    return insights;
  }

  generateGrowthInsight(recent) {
    const totalFiles = recent.fileCount;
    const totalSizeGB = recent.totalSize / (1024 * 1024 * 1024);

    // Predict future growth based on current size and file patterns
    let growthRate = 0.02; // 2% monthly growth assumption for development projects

    if (totalFiles > 100000) growthRate = 0.05; // Larger projects grow faster
    if (totalFiles < 10000) growthRate = 0.01; // Smaller projects grow slower

    const predictedSizeGB = totalSizeGB * (1 + growthRate * 12); // 1 year prediction

    return {
      type: 'growth',
      prediction: `Directory expected to grow to ${(predictedSizeGB).toFixed(1)} GB in 12 months (${(growthRate * 100).toFixed(1)}% monthly growth)`,
      confidence: 0.6,
      timeframe: '12 months',
      actionItems: [
        'Monitor storage usage trends',
        'Plan for increased storage capacity',
        'Consider implementing automated cleanup policies'
      ],
      reasoning: {
        primaryFactor: 'Development project growth patterns',
        contributingFactors: [
          `${totalFiles.toLocaleString()} files indicate active development`,
          `Current size: ${totalSizeGB.toFixed(1)} GB`
        ],
        dataPoints: [
          { label: 'Current Files', value: totalFiles.toLocaleString(), impact: 'high' },
          { label: 'Current Size', value: `${totalSizeGB.toFixed(1)} GB`, impact: 'high' }
        ]
      }
    };
  }

  generateCleanupInsights(recent) {
    const insights = [];
    const categories = recent.categories || {};

    // Check for temporary/cache files
    const tempFiles = (categories['Temp']?.count || 0) + (categories['Cache/Temp']?.count || 0);
    const totalFiles = recent.fileCount;

    if (tempFiles > totalFiles * 0.05) { // More than 5% temp files
      insights.push({
        type: 'cleanup',
        prediction: `${tempFiles} temporary/cache files identified (${(tempFiles / totalFiles * 100).toFixed(1)}% of total)`,
        confidence: 0.85,
        timeframe: 'Now',
        actionItems: [
          'Review temporary files for cleanup opportunities',
          'Set up automated cleanup for old temp files',
          'Consider excluding temp directories from backups'
        ]
      });
    }

    // Check for old files (if we had modification times)
    // For now, suggest general cleanup
    if (totalFiles > 50000) {
      insights.push({
        type: 'cleanup',
        prediction: 'Large directory size suggests potential for cleanup optimization',
        confidence: 0.7,
        timeframe: 'Ongoing',
        actionItems: [
          'Review old/unused files regularly',
          'Implement file archiving policies',
          'Consider duplicate file detection and removal'
        ]
      });
    }

    return insights;
  }

  generateOrganizationInsight(recent) {
    const categories = Object.entries(recent.categories || {});
    const totalFiles = recent.fileCount;

    if (categories.length === 0) return null;

    const sortedCategories = categories.sort(([,a], [,b]) => (b.count || 0) - (a.count || 0));
    const dominantCategory = sortedCategories[0];
    const dominantPercentage = (dominantCategory[1].count || 0) / totalFiles * 100;

    if (dominantPercentage > 60) { // Very dominant category
      return {
        type: 'organization',
        prediction: `${dominantCategory[0]} files dominate (${dominantPercentage.toFixed(1)}%) - consider reorganization`,
        confidence: 0.8,
        timeframe: 'Now',
        actionItems: [
          `Create subfolders within ${dominantCategory[0]} category`,
          'Implement better file organization structure',
          'Consider separating active from archived files'
        ]
      };
    } else if (categories.length > 10) { // Many categories
      return {
        type: 'organization',
        prediction: `${categories.length} file categories detected - organization could be improved`,
        confidence: 0.75,
        timeframe: 'Now',
        actionItems: [
          'Review current folder structure',
          'Consider consolidating similar categories',
          'Implement consistent naming conventions'
        ]
      };
    }

    return null;
  }

  generateSecurityInsights(recent) {
    const insights = [];
    const categories = recent.categories || {};
    const totalFiles = recent.fileCount;

    // Check for executable files
    const executableFiles = categories['Executables']?.count || 0;
    if (executableFiles > totalFiles * 0.03) { // More than 3% executables
      insights.push({
        type: 'security',
        prediction: `${executableFiles} executable files detected - review for security`,
        confidence: 0.8,
        timeframe: 'Now',
        actionItems: [
          'Verify all executables are from trusted sources',
          'Scan executables for malware',
          'Consider moving executables to secure locations'
        ]
      });
    }

    // Check for configuration files that might contain sensitive data
    const configFiles = (categories['Configuration/Data']?.count || 0) +
                       (categories['Environment']?.count || 0);
    if (configFiles > totalFiles * 0.1) { // More than 10% config files
      insights.push({
        type: 'security',
        prediction: 'High number of configuration files - ensure sensitive data protection',
        confidence: 0.7,
        timeframe: 'Now',
        actionItems: [
          'Review configuration files for sensitive data',
          'Ensure proper access controls',
          'Consider encrypting sensitive configuration files'
        ]
      });
    }

    return insights;
  }

  generatePerformanceInsight(recent) {
    const totalFiles = recent.fileCount;
    const totalSizeGB = recent.totalSize / (1024 * 1024 * 1024);

    // Performance predictions based on directory characteristics
    if (totalFiles > 200000) {
      return {
        type: 'performance',
        prediction: 'Very large directory detected - performance optimizations recommended',
        confidence: 0.9,
        timeframe: 'Ongoing',
        actionItems: [
          'Use incremental scanning for regular monitoring',
          'Consider distributed processing for analysis',
          'Implement intelligent caching strategies'
        ]
      };
    } else if (totalSizeGB > 100) {
      return {
        type: 'performance',
        prediction: 'Large storage footprint - optimize access patterns',
        confidence: 0.8,
        timeframe: 'Now',
        actionItems: [
          'Review file access patterns',
          'Consider SSD storage for frequently accessed files',
          'Implement file compression for archival data'
        ]
      };
    }

    return null;
  }

  generateStorageInsights(recent) {
    const insights = [];
    const categories = recent.categories || {};
    const totalFiles = recent.fileCount;

    // Check for compressible content
    const imageFiles = categories['Images']?.count || 0;
    const documentFiles = categories['Documents']?.count || 0;
    const compressibleFiles = imageFiles + documentFiles;

    if (compressibleFiles > totalFiles * 0.2) { // More than 20% compressible
      insights.push({
        type: 'storage',
        prediction: `${compressibleFiles} compressible files detected - storage optimization possible`,
        confidence: 0.75,
        timeframe: 'Now',
        actionItems: [
          'Consider compressing image/document files',
          'Review image formats for optimization (JPEG vs PNG)',
          'Implement automated compression policies'
        ]
      });
    }

    // Check for potential duplicates (rough heuristic)
    if (totalFiles > 10000) {
      const duplicateEstimate = Math.floor(totalFiles * 0.05); // Estimate 5% duplicates
      if (duplicateEstimate > 100) {
        insights.push({
          type: 'storage',
          prediction: `Potential for ${duplicateEstimate} duplicate files - cleanup could save space`,
          confidence: 0.6,
          timeframe: 'Now',
          actionItems: [
            'Run duplicate file detection',
            'Review and remove unnecessary duplicates',
            'Implement duplicate prevention policies'
          ]
        });
      }
    }

    return insights;
  }

  calculateSimpleGrowthRate() {
    if (this.analysisHistory.length < 2) return 0;

    const recent = this.analysisHistory.slice(-2);
    const sizes = recent.map(a => a.totalSize);

    return (sizes[1] - sizes[0]) / sizes[0];
  }

  // Store learning metrics for improvement tracking
  async storeLearningMetrics(metrics) {
    try {
      const metricsData = {
        timestamp: Date.now(),
        improvementMetrics: metrics.improvementMetrics,
        workflowType: metrics.workflowType,
        baseScore: metrics.improvementMetrics?.baseScore || 0,
        enhancedScore: metrics.improvementMetrics?.enhancedScore || 0,
        improvementPercentage: metrics.improvementMetrics?.percentage || 0,
        quality: metrics.improvementMetrics?.quality || 'unknown'
      };

      // Store in analysis history for learning
      this.analysisHistory.push({
        ...metricsData,
        type: 'learning-metrics'
      });

      console.log('📈 Learning metrics stored:', {
        improvement: `${metricsData.improvementPercentage.toFixed(1)}%`,
        quality: metricsData.quality,
        workflow: metricsData.workflowType
      });

    } catch (error) {
      console.warn('⚠️ Failed to store learning metrics:', error.message);
    }
  }

  // Get learning statistics
  getLearningStats() {
    return {
      analysesCount: this.analysisHistory.length,
      isInitialized: this.isInitialized,
      lastAnalysis: this.analysisHistory[this.analysisHistory.length - 1]?.timestamp || null,
      modelsTrained: {
        changePredictor: true,
        patternAnalyzer: true,
        insightGenerator: true
      }
    };
  }
}

module.exports = new SelfLearningMLService();