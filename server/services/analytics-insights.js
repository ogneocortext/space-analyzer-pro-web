/**
 * Analytics and Insights Service
 * Provides comprehensive analytics, business intelligence, and insights for the Space Analyzer
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

class AnalyticsInsightsService {
  constructor() {
    this.metrics = new Map();
    this.insights = new Map();
    this.reports = new Map();
    this.trends = new Map();
    
    // Analytics configuration
    this.config = {
      retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
      aggregationInterval: 60 * 60 * 1000, // 1 hour
      insightsRefreshInterval: 24 * 60 * 60 * 1000, // 24 hours
      enablePredictiveAnalytics: true,
      enableRealTimeUpdates: true,
      dataPath: path.join(__dirname, 'data', 'analytics')
    };
    
    // Initialize analytics engines
    this.metricsCollector = new MetricsCollector();
    this.insightsEngine = new InsightsEngine();
    this.trendsAnalyzer = new TrendsAnalyzer();
    this.reportGenerator = new ReportGenerator();
  }

  async initialize() {
    console.warn('📊 Initializing Analytics and Insights Service...');
    
    // Create data directory
    await fs.mkdir(this.config.dataPath, { recursive: true });
    
    // Load existing analytics data
    await this.loadAnalyticsData();
    
    // Start metrics collection
    await this.metricsCollector.start();
    
    // Start insights generation
    await this.insightsEngine.start();
    
    // Start trends analysis
    await this.trendsAnalyzer.start();
    
    // Start real-time updates
    if (this.config.enableRealTimeUpdates) {
      this.startRealTimeUpdates();
    }
    
    console.warn('✅ Analytics and Insights Service initialized');
  }

  // Metrics Collection
  async recordScanMetrics(scanData) {
    const metrics = {
      id: this.generateMetricId(),
      type: 'scan',
      timestamp: new Date(),
      data: {
        duration: scanData.duration,
        filesScanned: scanData.filesScanned,
        directoriesScanned: scanData.directoriesScanned,
        totalSize: scanData.totalSize,
        errors: scanData.errors || 0,
        scanSpeed: scanData.scanSpeed,
        memoryUsage: scanData.memoryUsage,
        cpuUsage: scanData.cpuUsage
      }
    };
    
    await this.metricsCollector.record(metrics);
    return metrics;
  }

  async recordUserMetrics(userAction) {
    const metrics = {
      id: this.generateMetricId(),
      type: 'user',
      timestamp: new Date(),
      data: {
        action: userAction.action,
        userId: userAction.userId || 'anonymous',
        sessionId: userAction.sessionId,
        features: userAction.features || [],
        duration: userAction.duration,
        context: userAction.context || {}
      }
    };
    
    await this.metricsCollector.record(metrics);
    return metrics;
  }

  async recordSystemMetrics(systemData) {
    const metrics = {
      id: this.generateMetricId(),
      type: 'system',
      timestamp: new Date(),
      data: {
        memoryUsage: systemData.memoryUsage,
        cpuUsage: systemData.cpuUsage,
        diskUsage: systemData.diskUsage,
        networkActivity: systemData.networkActivity,
        uptime: systemData.uptime,
        activeConnections: systemData.activeConnections,
        errorRate: systemData.errorRate
      }
    };
    
    await this.metricsCollector.record(metrics);
    return metrics;
  }

  async recordPerformanceMetrics(performanceData) {
    const metrics = {
      id: this.generateMetricId(),
      type: 'performance',
      timestamp: new Date(),
      data: {
        operation: performanceData.operation,
        duration: performanceData.duration,
        throughput: performanceData.throughput,
        latency: performanceData.latency,
        successRate: performanceData.successRate,
        resourceUtilization: performanceData.resourceUtilization,
        bottlenecks: performanceData.bottlenecks || []
      }
    };
    
    await this.metricsCollector.record(metrics);
    return metrics;
  }

  // Insights Generation
  async generateInsights(timeRange = '24h') {
    const insights = {
      id: this.generateInsightId(),
      timestamp: new Date(),
      timeRange,
      categories: {
        performance: await this.generatePerformanceInsights(timeRange),
        usage: await this.generateUsageInsights(timeRange),
        storage: await this.generateStorageInsights(timeRange),
        security: await this.generateSecurityInsights(timeRange),
        efficiency: await this.generateEfficiencyInsights(timeRange),
        predictive: await this.generatePredictiveInsights(timeRange)
      },
      recommendations: [],
      confidence: 0.8
    };
    
    // Generate recommendations based on insights
    insights.recommendations = await this.generateRecommendations(insights);
    
    // Calculate overall confidence
    insights.confidence = this.calculateInsightsConfidence(insights);
    
    this.insights.set(insights.id, insights);
    await this.saveInsights(insights);
    
    return insights;
  }

  async generatePerformanceInsights(timeRange) {
    const metrics = await this.metricsCollector.getMetricsByType('performance', timeRange);
    
    const insights = {
      overallPerformance: this.calculateOverallPerformance(metrics),
      bottlenecks: this.identifyBottlenecks(metrics),
      trends: this.analyzePerformanceTrends(metrics),
      benchmarks: this.generatePerformanceBenchmarks(metrics),
      optimizationOpportunities: this.identifyOptimizationOpportunities(metrics)
    };
    
    return insights;
  }

  async generateUsageInsights(timeRange) {
    const metrics = await this.metricsCollector.getMetricsByType('user', timeRange);
    
    const insights = {
      userEngagement: this.calculateUserEngagement(metrics),
      featureUsage: this.analyzeFeatureUsage(metrics),
      sessionPatterns: this.analyzeSessionPatterns(metrics),
      userBehavior: this.analyzeUserBehavior(metrics),
      peakUsageTimes: this.identifyPeakUsageTimes(metrics)
    };
    
    return insights;
  }

  async generateStorageInsights(timeRange) {
    const metrics = await this.metricsCollector.getMetricsByType('scan', timeRange);
    
    const insights = {
      storageGrowth: this.calculateStorageGrowth(metrics),
      fileDistribution: this.analyzeFileDistribution(metrics),
      sizeDistribution: this.analyzeSizeDistribution(metrics),
      categoryTrends: this.analyzeCategoryTrends(metrics),
      cleanupOpportunities: this.identifyCleanupOpportunities(metrics),
      compressionOpportunities: this.identifyCompressionOpportunities(metrics)
    };
    
    return insights;
  }

  async generateSecurityInsights(timeRange) {
    const securityMetrics = await this.metricsCollector.getSecurityMetrics(timeRange);
    
    const insights = {
      threatLandscape: this.analyzeThreatLandscape(securityMetrics),
      vulnerabilityTrends: this.analyzeVulnerabilityTrends(securityMetrics),
      complianceStatus: this.analyzeComplianceStatus(securityMetrics),
      riskAssessment: this.performRiskAssessment(securityMetrics),
      securityPosture: this.evaluateSecurityPosture(securityMetrics)
    };
    
    return insights;
  }

  async generateEfficiencyInsights(timeRange) {
    const metrics = await this.metricsCollector.getMetricsByType(['performance', 'scan'], timeRange);
    
    const insights = {
      scanEfficiency: this.calculateScanEfficiency(metrics),
      resourceUtilization: this.analyzeResourceUtilization(metrics),
      processOptimization: this.identifyProcessOptimization(metrics),
      workflowEfficiency: this.analyzeWorkflowEfficiency(metrics),
      costOptimization: this.identifyCostOptimization(metrics)
    };
    
    return insights;
  }

  async generatePredictiveInsights(timeRange) {
    if (!this.config.enablePredictiveAnalytics) {
      return { message: 'Predictive analytics disabled' };
    }
    
    const historicalData = await this.metricsCollector.getHistoricalData(timeRange);
    
    const insights = {
      storageForecast: this.predictStorageNeeds(historicalData),
      performanceForecast: this.predictPerformanceTrends(historicalData),
      capacityPlanning: this.generateCapacityPlanning(historicalData),
      maintenancePredictions: this.predictMaintenanceNeeds(historicalData),
      growthProjections: this.projectGrowthTrends(historicalData)
    };
    
    return insights;
  }

  // Trend Analysis
  async analyzeTrends(timeRange = '7d') {
    const trends = {
      id: this.generateTrendId(),
      timestamp: new Date(),
      timeRange,
      metrics: {
        scanTrends: await this.analyzeScanTrends(timeRange),
        usageTrends: await this.analyzeUsageTrends(timeRange),
        performanceTrends: await this.analyzePerformanceTrends(timeRange),
        securityTrends: await this.analyzeSecurityTrends(timeRange)
      },
      patterns: {
        seasonal: this.identifySeasonalPatterns(timeRange),
        cyclical: this.identifyCyclicalPatterns(timeRange),
        anomalies: this.identifyAnomalies(timeRange),
        correlations: this.identifyCorrelations(timeRange)
      }
    };
    
    this.trends.set(trends.id, trends);
    await this.saveTrends(trends);
    
    return trends;
  }

  // Report Generation
  async generateReport(reportType, timeRange, options = {}) {
    const report = {
      id: this.generateReportId(),
      type: reportType,
      timestamp: new Date(),
      timeRange,
      format: options.format || 'json',
      data: {}
    };
    
    switch (reportType) {
      case 'executive_summary':
        report.data = await this.generateExecutiveSummary(timeRange, options);
        break;
      case 'performance_analysis':
        report.data = await this.generatePerformanceReport(timeRange, options);
        break;
      case 'usage_analytics':
        report.data = await this.generateUsageReport(timeRange, options);
        break;
      case 'security_audit':
        report.data = await this.generateSecurityReport(timeRange, options);
        break;
      case 'storage_optimization':
        report.data = await this.generateStorageReport(timeRange, options);
        break;
      case 'compliance_assessment':
        report.data = await this.generateComplianceReport(timeRange, options);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
    
    this.reports.set(report.id, report);
    await this.saveReport(report);
    
    return report;
  }

  // Business Intelligence
  async generateBusinessInsights(timeRange = '30d') {
    const insights = {
      id: this.generateInsightId(),
      timestamp: new Date(),
      timeRange,
      kpis: await this.calculateKPIs(timeRange),
      costAnalysis: await this.performCostAnalysis(timeRange),
      roiAnalysis: await this.performROIAnalysis(timeRange),
      efficiencyMetrics: await this.calculateEfficiencyMetrics(timeRange),
      strategicRecommendations: await this.generateStrategicRecommendations(timeRange)
    };
    
    return insights;
  }

  // Utility Methods
  generateMetricId() {
    return `metric_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateInsightId() {
    return `insight_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateTrendId() {
    return `trend_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateReportId() {
    return `report_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // Analytics Calculations
  calculateOverallPerformance(metrics) {
    if (metrics.length === 0) return { score: 0, status: 'no_data' };
    
    const avgDuration = metrics.reduce((sum, m) => sum + m.data.duration, 0) / metrics.length;
    const avgThroughput = metrics.reduce((sum, m) => sum + m.data.throughput, 0) / metrics.length;
    const avgSuccessRate = metrics.reduce((sum, m) => sum + m.data.successRate, 0) / metrics.length;
    
    let score = 0;
    if (avgDuration < 5000) score += 25; // Fast scans
    if (avgThroughput > 1000) score += 25; // High throughput
    if (avgSuccessRate > 0.95) score += 25; // High success rate
    if (metrics.every(m => m.data.latency < 1000)) score += 25; // Low latency
    
    return {
      score,
      status: score >= 75 ? 'excellent' : score >= 50 ? 'good' : score >= 25 ? 'fair' : 'poor',
      metrics: { avgDuration, avgThroughput, avgSuccessRate }
    };
  }

  identifyBottlenecks(metrics) {
    const bottlenecks = [];
    
    // Analyze common bottleneck patterns
    const highLatencyOps = metrics.filter(m => m.data.latency > 5000);
    const lowThroughputOps = metrics.filter(m => m.data.throughput < 100);
    const highErrorRateOps = metrics.filter(m => m.data.successRate < 0.9);
    const highResourceOps = metrics.filter(m => m.data.resourceUtilization > 0.8);
    
    if (highLatencyOps.length > 0) {
      bottlenecks.push({
        type: 'latency',
        severity: 'high',
        description: `${highLatencyOps.length} operations with high latency detected`,
        affectedOperations: highLatencyOps.map(m => m.data.operation),
        recommendation: 'Optimize I/O operations and consider caching'
      });
    }
    
    if (lowThroughputOps.length > 0) {
      bottlenecks.push({
        type: 'throughput',
        severity: 'medium',
        description: `${lowThroughputOps.length} operations with low throughput detected`,
        affectedOperations: lowThroughputOps.map(m => m.data.operation),
        recommendation: 'Increase parallelism and optimize algorithms'
      });
    }
    
    if (highErrorRateOps.length > 0) {
      bottlenecks.push({
        type: 'error_rate',
        severity: 'high',
        description: `${highErrorRateOps.length} operations with high error rate detected`,
        affectedOperations: highErrorRateOps.map(m => m.data.operation),
        recommendation: 'Improve error handling and input validation'
      });
    }
    
    if (highResourceOps.length > 0) {
      bottlenecks.push({
        type: 'resource_utilization',
        severity: 'medium',
        description: `${highResourceOps.length} operations with high resource utilization detected`,
        affectedOperations: highResourceOps.map(m => m.data.operation),
        recommendation: 'Optimize resource usage and implement resource pooling'
      });
    }
    
    return bottlenecks;
  }

  analyzePerformanceTrends(metrics) {
    const trends = {
      direction: 'stable',
      changeRate: 0,
      forecast: null
    };
    
    if (metrics.length < 2) return trends;
    
    // Calculate trend direction
    const recent = metrics.slice(-5);
    const older = metrics.slice(-10, -5);
    
    if (recent.length > 0 && older.length > 0) {
      const recentAvg = recent.reduce((sum, m) => sum + m.data.throughput, 0) / recent.length;
      const olderAvg = older.reduce((sum, m) => sum + m.data.throughput, 0) / older.length;
      
      trends.changeRate = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      if (trends.changeRate > 10) {
        trends.direction = 'improving';
      } else if (trends.changeRate < -10) {
        trends.direction = 'degrading';
      }
      
      // Simple forecast
      trends.forecast = {
        nextPeriod: recentAvg + (recentAvg - olderAvg),
        confidence: Math.max(0.5, Math.min(0.9, 1 - Math.abs(trends.changeRate) / 100))
      };
    }
    
    return trends;
  }

  generatePerformanceBenchmarks(metrics) {
    const benchmarks = {
      scanSpeed: this.calculateBenchmark(metrics, 'throughput'),
      resourceEfficiency: this.calculateBenchmark(metrics, 'resourceUtilization'),
      errorRate: this.calculateBenchmark(metrics, 'successRate'),
      latency: this.calculateBenchmark(metrics, 'latency')
    };
    
    return benchmarks;
  }

  calculateBenchmark(metrics, field) {
    if (metrics.length === 0) return { current: 0, benchmark: 0, percentile: 0 };
    
    const values = metrics.map(m => m.data[field]);
    const current = values[values.length - 1];
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const percentile = sorted.indexOf(current) / sorted.length;
    
    return {
      current,
      benchmark: average,
      percentile: Math.round(percentile * 100),
      status: percentile >= 0.8 ? 'excellent' : percentile >= 0.6 ? 'good' : percentile >= 0.4 ? 'fair' : 'poor'
    };
  }

  identifyOptimizationOpportunities(metrics) {
    const opportunities = [];
    
    // Scan optimization
    const slowScans = metrics.filter(m => m.data.duration > 10000);
    if (slowScans.length > 0) {
      opportunities.push({
        type: 'scan_optimization',
        priority: 'high',
        description: `${slowScans.length} slow scans detected`,
        potentialImprovement: '30-50% faster scans',
        actions: ['Implement parallel processing', 'Optimize file system access', 'Add caching']
      });
    }
    
    // Resource optimization
    const highResourceUsage = metrics.filter(m => m.data.resourceUtilization > 0.8);
    if (highResourceUsage.length > 0) {
      opportunities.push({
        type: 'resource_optimization',
        priority: 'medium',
        description: `${highResourceUsage.length} operations with high resource usage`,
        potentialImprovement: '20-30% resource efficiency',
        actions: ['Implement resource pooling', 'Optimize memory usage', 'Add resource monitoring']
      });
    }
    
    return opportunities;
  }

  // Storage Analysis
  calculateStorageGrowth(metrics) {
    if (metrics.length < 2) return { rate: 0, trend: 'stable' };
    
    const sorted = metrics.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    const timeDiff = new Date(last.timestamp) - new Date(first.timestamp);
    const sizeDiff = last.data.totalSize - first.data.totalSize;
    const growthRate = (sizeDiff / timeDiff) * (24 * 60 * 60 * 1000); // bytes per day
    
    return {
      rate: growthRate,
      trend: growthRate > 1000 * 1024 ? 'growing' : growthRate < -1000 * 1024 ? 'shrinking' : 'stable',
      dailyAverage: growthRate,
      monthlyProjection: growthRate * 30,
      yearlyProjection: growthRate * 365
    };
  }

  analyzeFileDistribution(metrics) {
    const distribution = {
      byType: {},
      bySize: {},
      byAge: {},
      byCategory: {}
    };
    
    for (const metric of metrics) {
      if (metric.data.fileDistribution) {
        // Aggregate file distribution data
        for (const [type, count] of Object.entries(metric.data.fileDistribution)) {
          distribution.byType[type] = (distribution.byType[type] || 0) + count;
        }
      }
    }
    
    return distribution;
  }

  analyzeSizeDistribution(metrics) {
    const sizes = metrics.map(m => m.data.totalSize || 0);
    
    const distribution = {
      min: Math.min(...sizes),
      max: Math.max(...sizes),
      avg: sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
      median: this.calculateMedian(sizes),
      percentiles: {
        p25: this.calculatePercentile(sizes, 0.25),
        p50: this.calculatePercentile(sizes, 0.5),
        p75: this.calculatePercentile(sizes, 0.75),
        p90: this.calculatePercentile(sizes, 0.9),
        p95: this.calculatePercentile(sizes, 0.95),
        p99: this.calculatePercentile(sizes, 0.99)
      }
    };
    
    return distribution;
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  // Predictive Analytics
  predictStorageNeeds(historicalData) {
    const predictions = {
      nextMonth: 0,
      nextQuarter: 0,
      nextYear: 0,
      confidence: 0.7,
      methodology: 'linear_regression'
    };
    
    if (historicalData.length < 7) return predictions;
    
    // Simple linear regression for prediction
    const sizes = historicalData.map(d => d.data.totalSize || 0);
    const trend = this.calculateTrend(sizes);
    
    predictions.nextMonth = sizes[sizes.length - 1] + (trend * 30);
    predictions.nextQuarter = sizes[sizes.length - 1] + (trend * 90);
    predictions.nextYear = sizes[sizes.length - 1] + (trend * 365);
    
    return predictions;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }

  // Recommendations Engine
  async generateRecommendations(insights) {
    const recommendations = [];
    
    // Performance recommendations
    if (insights.categories.performance.overallPerformance.score < 50) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Performance Optimization Required',
        description: 'System performance is below optimal levels',
        actions: insights.categories.performance.optimizationOpportunities.map(opp => opp.actions).flat()
      });
    }
    
    // Storage recommendations
    if (insights.categories.storage.cleanupOpportunities.length > 0) {
      recommendations.push({
        category: 'storage',
        priority: 'medium',
        title: 'Storage Cleanup Recommended',
        description: 'Storage optimization opportunities identified',
        actions: insights.categories.storage.cleanupOpportunities.map(opp => opp.actions).flat()
      });
    }
    
    // Security recommendations
    if (insights.categories.security.riskAssessment.overallRisk > 0.7) {
      recommendations.push({
        category: 'security',
        priority: 'high',
        title: 'Security Improvements Needed',
        description: 'Security posture requires attention',
        actions: ['Update security patches', 'Review access controls', 'Implement monitoring']
      });
    }
    
    return recommendations;
  }

  calculateInsightsConfidence(insights) {
    let confidence = 0.8; // Base confidence
    
    // Adjust based on data quality
    const dataPoints = Object.values(insights.categories).reduce((sum, cat) => {
      return sum + (cat.data ? Object.keys(cat.data).length : 0);
    }, 0);
    
    if (dataPoints > 100) confidence += 0.1;
    if (dataPoints > 1000) confidence += 0.1;
    
    return Math.min(0.95, confidence);
  }

  // Data Persistence
  async saveMetrics(metrics) {
    try {
      const filePath = path.join(this.config.dataPath, 'metrics.json');
      const existing = await this.loadExistingData(filePath);
      existing.push(metrics);
      await fs.writeFile(filePath, JSON.stringify(existing, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  async saveInsights(insights) {
    try {
      const filePath = path.join(this.config.dataPath, 'insights.json');
      const existing = await this.loadExistingData(filePath);
      existing.push(insights);
      await fs.writeFile(filePath, JSON.stringify(existing, null, 2));
    } catch (error) {
      console.error('Failed to save insights:', error);
    }
  }

  async saveTrends(trends) {
    try {
      const filePath = path.join(this.config.dataPath, 'trends.json');
      const existing = await this.loadExistingData(filePath);
      existing.push(trends);
      await fs.writeFile(filePath, JSON.stringify(existing, null, 2));
    } catch (error) {
      console.error('Failed to save trends:', error);
    }
  }

  async saveReport(report) {
    try {
      const filePath = path.join(this.config.dataPath, 'reports', `${report.id}.${report.format}`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      if (report.format === 'json') {
        await fs.writeFile(filePath, JSON.stringify(report.data, null, 2));
      } else if (report.format === 'csv') {
        await fs.writeFile(filePath, this.convertToCSV(report.data));
      } else if (report.format === 'html') {
        await fs.writeFile(filePath, this.convertToHTML(report.data));
      }
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  }

  async loadExistingData(filePath) {
    try {
      if (await fs.access(filePath).then(() => true).catch(() => false)) {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      return [];
    }
    return [];
  }

  async loadAnalyticsData() {
    try {
      // Load metrics
      const metricsPath = path.join(this.config.dataPath, 'metrics.json');
      if (await fs.access(metricsPath).then(() => true).catch(() => false)) {
        const metricsData = await fs.readFile(metricsPath, 'utf8');
        const metrics = JSON.parse(metricsData);
        metrics.forEach(m => this.metrics.set(m.id, m));
      }
      
      // Load insights
      const insightsPath = path.join(this.config.dataPath, 'insights.json');
      if (await fs.access(insightsPath).then(() => true).catch(() => false)) {
        const insightsData = await fs.readFile(insightsPath, 'utf8');
        const insights = JSON.parse(insightsData);
        insights.forEach(i => this.insights.set(i.id, i));
      }
      
      // Load trends
      const trendsPath = path.join(this.config.dataPath, 'trends.json');
      if (await fs.access(trendsPath).then(() => true).catch(() => false)) {
        const trendsData = await fs.readFile(trendsPath, 'utf8');
        const trends = JSON.parse(trendsData);
        trends.forEach(t => this.trends.set(t.id, t));
      }
      
      console.warn('📊 Analytics data loaded successfully');
    } catch (error) {
      console.warn('No existing analytics data found, starting fresh');
    }
  }

  // Real-time Updates
  startRealTimeUpdates() {
    setInterval(async () => {
      await this.generateInsights('1h');
    }, this.config.insightsRefreshInterval);
  }

  // API Methods
  async getMetrics(timeRange, type = null) {
    if (type) {
      return await this.metricsCollector.getMetricsByType(type, timeRange);
    }
    return Array.from(this.metrics.values());
  }

  async getInsights(timeRange) {
    return Array.from(this.insights.values()).filter(i => 
      this.isWithinTimeRange(i.timestamp, timeRange)
    );
  }

  async getTrends(timeRange) {
    return Array.from(this.trends.values()).filter(t => 
      this.isWithinTimeRange(t.timestamp, timeRange)
    );
  }

  async getReports(timeRange) {
    return Array.from(this.reports.values()).filter(r => 
      this.isWithinTimeRange(r.timestamp, timeRange)
    );
  }

  isWithinTimeRange(timestamp, timeRange) {
    const now = new Date();
    const targetTime = new Date(timestamp);
    
    switch (timeRange) {
      case '1h':
        return (now - targetTime) <= (60 * 60 * 1000);
      case '24h':
        return (now - targetTime) <= (24 * 60 * 60 * 1000);
      case '7d':
        return (now - targetTime) <= (7 * 24 * 60 * 60 * 1000);
      case '30d':
        return (now - targetTime) <= (30 * 24 * 60 * 60 * 1000);
      default:
        return true;
    }
  }

  // Utility methods for report generation
  convertToCSV(data) {
    // Simple CSV conversion - would use proper CSV library in production
    if (Array.isArray(data)) {
      return data.map(row => Object.values(row).join(',')).join('\n');
    }
    return JSON.stringify(data);
  }

  convertToHTML(data) {
    // Simple HTML conversion - would use proper templating in production
    return `
      <html>
        <head><title>Analytics Report</title></head>
        <body>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </body>
      </html>
    `;
  }
}

// Supporting Classes
class MetricsCollector {
  constructor() {
    this.metrics = [];
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    console.warn('📈 Metrics Collector started');
  }

  async record(metric) {
    this.metrics.push(metric);
    
    // Keep metrics size manageable
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
    }
  }

  async getMetricsByType(type, timeRange) {
    const now = new Date();
    const timeLimit = this.getTimeLimit(timeRange);
    
    return this.metrics.filter(m => 
      m.type === type && 
      new Date(m.timestamp) >= timeLimit
    );
  }

  getTimeLimit(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h': return new Date(now - (60 * 60 * 1000));
      case '24h': return new Date(now - (24 * 60 * 60 * 1000));
      case '7d': return new Date(now - (7 * 24 * 60 * 60 * 1000));
      case '30d': return new Date(now - (30 * 24 * 60 * 60 * 1000));
      default: return new Date(0);
    }
  }
}

class InsightsEngine {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    console.warn('🧠 Insights Engine started');
  }
}

class TrendsAnalyzer {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    console.warn('📈 Trends Analyzer started');
  }
}

class ReportGenerator {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    console.warn('📄 Report Generator started');
  }
}

module.exports = AnalyticsInsightsService;
