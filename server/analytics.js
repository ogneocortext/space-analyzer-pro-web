const fs = require('fs').promises;
const path = require('path');

class AnalyticsManager {
  constructor(analyticsPath = path.join(__dirname, '..', '.analytics')) {
    this.analyticsPath = analyticsPath;
    this.metrics = new Map();
    this.scanHistory = [];
    this.performanceMetrics = new Map();
    this.errorMetrics = new Map();
    this.realTimeMetrics = {
      activeScans: 0,
      totalScansToday: 0,
      totalScansThisWeek: 0,
      totalScansThisMonth: 0,
      averageScanTime: 0,
      successRate: 0,
      errorRate: 0,
      cacheHitRate: 0,
      systemLoad: {
        memory: 0,
        cpu: 0,
        disk: 0
      }
    };
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.analyticsPath, { recursive: true });
      await this.loadAnalyticsData();
      this.startPeriodicCleanup();
    } catch (error) {
      console.error('Failed to initialize analytics manager:', error);
    }
  }

  async loadAnalyticsData() {
    try {
      // Load scan history
      const historyFile = path.join(this.analyticsPath, 'scan-history.json');
      const historyExists = await fs.access(historyFile).then(() => true).catch(() => false);
      if (historyExists) {
        const historyData = await fs.readFile(historyFile, 'utf8');
        this.scanHistory = JSON.parse(historyData);
      }

      // Load performance metrics
      const perfFile = path.join(this.analyticsPath, 'performance-metrics.json');
      const perfExists = await fs.access(perfFile).then(() => true).catch(() => false);
      if (perfExists) {
        const perfData = await fs.readFile(perfFile, 'utf8');
        const perfMetrics = JSON.parse(perfData);
        for (const [key, value] of Object.entries(perfMetrics)) {
          this.performanceMetrics.set(key, value);
        }
      }

      // Load error metrics
      const errorFile = path.join(this.analyticsPath, 'error-metrics.json');
      const errorExists = await fs.access(errorFile).then(() => true).catch(() => false);
      if (errorExists) {
        const errorData = await fs.readFile(errorFile, 'utf8');
        const errorMetrics = JSON.parse(errorData);
        for (const [key, value] of Object.entries(errorMetrics)) {
          this.errorMetrics.set(key, value);
        }
      }

      this.updateRealTimeMetrics();
      console.log('📊 Analytics data loaded successfully');
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  }

  recordScanStart(scanData) {
    const scanRecord = {
      scanId: scanData.scanId,
      analysisId: scanData.analysisId,
      directoryPath: scanData.directoryPath,
      profile: scanData.profile || 'standard',
      startTime: Date.now(),
      status: 'started',
      options: scanData.options || {},
      systemInfo: this.getSystemInfo()
    };

    this.scanHistory.push(scanRecord);
    this.updateRealTimeMetrics();
    this.saveAnalyticsData();
  }

  recordScanComplete(scanData, result) {
    const scanIndex = this.scanHistory.findIndex(s => s.scanId === scanData.scanId);
    if (scanIndex === -1) return;

    const scan = this.scanHistory[scanIndex];
    const endTime = Date.now();
    const duration = endTime - scan.startTime;

    // Update scan record
    scan.endTime = endTime;
    scan.duration = duration;
    scan.status = 'completed';
    scan.result = {
      totalFiles: result.total_files || 0,
      totalSize: result.total_size || 0,
      cacheHit: result.cached || false,
      filesProcessed: result.files_processed || 0
    };

    // Record performance metrics
    this.recordPerformanceMetrics(scan, result);
    
    this.updateRealTimeMetrics();
    this.saveAnalyticsData();
  }

  recordScanError(scanData, error) {
    const scanIndex = this.scanHistory.findIndex(s => s.scanId === scanData.scanId);
    if (scanIndex === -1) return;

    const scan = this.scanHistory[scanIndex];
    const endTime = Date.now();
    const duration = endTime - scan.startTime;

    // Update scan record
    scan.endTime = endTime;
    scan.duration = duration;
    scan.status = 'error';
    scan.error = {
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack
    };

    // Record error metrics
    this.recordErrorMetrics(scan, error);
    
    this.updateRealTimeMetrics();
    this.saveAnalyticsData();
  }

  recordPerformanceMetrics(scan, result) {
    const profile = scan.profile;
    const duration = scan.duration;
    const fileSize = result.total_size || 0;
    const fileCount = result.total_files || 0;

    // Update profile-specific metrics
    const profileKey = `profile_${profile}`;
    const profileMetrics = this.performanceMetrics.get(profileKey) || {
      totalScans: 0,
      totalDuration: 0,
      averageDuration: 0,
      totalFiles: 0,
      totalSize: 0,
      successRate: 0,
      lastUpdated: Date.now()
    };

    profileMetrics.totalScans++;
    profileMetrics.totalDuration += duration;
    profileMetrics.averageDuration = profileMetrics.totalDuration / profileMetrics.totalScans;
    profileMetrics.totalFiles += fileCount;
    profileMetrics.totalSize += fileSize;
    profileMetrics.successRate = this.calculateSuccessRate(profile);
    profileMetrics.lastUpdated = Date.now();

    this.performanceMetrics.set(profileKey, profileMetrics);

    // Update general performance metrics
    const generalMetrics = this.performanceMetrics.get('general') || {
      totalScans: 0,
      totalDuration: 0,
      averageDuration: 0,
      totalFiles: 0,
      totalSize: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastUpdated: Date.now()
    };

    generalMetrics.totalScans++;
    generalMetrics.totalDuration += duration;
    generalMetrics.averageDuration = generalMetrics.totalDuration / generalMetrics.totalScans;
    generalMetrics.totalFiles += fileCount;
    generalMetrics.totalSize += fileSize;
    
    if (result.cached) {
      generalMetrics.cacheHits++;
    } else {
      generalMetrics.cacheMisses++;
    }
    
    generalMetrics.lastUpdated = Date.now();
    this.performanceMetrics.set('general', generalMetrics);
  }

  recordErrorMetrics(scan, error) {
    const errorType = error.code || 'UNKNOWN';
    const profile = scan.profile;

    // Update error type metrics
    const errorKey = `error_${errorType}`;
    const errorMetrics = this.errorMetrics.get(errorKey) || {
      count: 0,
      profiles: {},
      lastOccurrence: Date.now()
    };

    errorMetrics.count++;
    errorMetrics.profiles[profile] = (errorMetrics.profiles[profile] || 0) + 1;
    errorMetrics.lastOccurrence = Date.now();

    this.errorMetrics.set(errorKey, errorMetrics);

    // Update profile error metrics
    const profileErrorKey = `profile_errors_${profile}`;
    const profileErrorMetrics = this.errorMetrics.get(profileErrorKey) || {
      totalErrors: 0,
      errorTypes: {},
      lastError: Date.now()
    };

    profileErrorMetrics.totalErrors++;
    profileErrorMetrics.errorTypes[errorType] = (profileErrorMetrics.errorTypes[errorType] || 0) + 1;
    profileErrorMetrics.lastError = Date.now();

    this.errorMetrics.set(profileErrorKey, profileErrorMetrics);
  }

  updateRealTimeMetrics() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Count scans in different time periods
    const recentScans = this.scanHistory.filter(scan => scan.startTime >= oneDayAgo);
    const weeklyScans = this.scanHistory.filter(scan => scan.startTime >= oneWeekAgo);
    const monthlyScans = this.scanHistory.filter(scan => scan.startTime >= oneMonthAgo);

    // Count active scans
    const activeScans = this.scanHistory.filter(scan => scan.status === 'started');

    // Calculate success rate
    const completedScans = this.scanHistory.filter(scan => scan.status === 'completed');
    const failedScans = this.scanHistory.filter(scan => scan.status === 'error');
    const totalFinishedScans = completedScans.length + failedScans.length;
    const successRate = totalFinishedScans > 0 ? (completedScans.length / totalFinishedScans) * 100 : 0;
    const errorRate = totalFinishedScans > 0 ? (failedScans.length / totalFinishedScans) * 100 : 0;

    // Calculate average scan time
    const finishedScans = this.scanHistory.filter(scan => scan.duration);
    const averageScanTime = finishedScans.length > 0 
      ? finishedScans.reduce((sum, scan) => sum + scan.duration, 0) / finishedScans.length 
      : 0;

    // Calculate cache hit rate
    const generalMetrics = this.performanceMetrics.get('general');
    const cacheHitRate = generalMetrics 
      ? (generalMetrics.cacheHits / (generalMetrics.cacheHits + generalMetrics.cacheMisses)) * 100 
      : 0;

    // Update real-time metrics
    this.realTimeMetrics = {
      activeScans: activeScans.length,
      totalScansToday: recentScans.length,
      totalScansThisWeek: weeklyScans.length,
      totalScansThisMonth: monthlyScans.length,
      averageScanTime: Math.round(averageScanTime),
      successRate: Math.round(successRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      systemLoad: this.getSystemLoad()
    };
  }

  getSystemInfo() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime()
    };
  }

  getSystemLoad() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    
    return {
      memory: Math.round((memUsage.heapUsed / totalMemory) * 100),
      cpu: Math.round((process.cpuUsage().user / 1000000) * 100), // Rough estimate
      disk: 0 // Would need to implement disk usage monitoring
    };
  }

  calculateSuccessRate(profile) {
    const profileScans = this.scanHistory.filter(scan => scan.profile === profile);
    const completedScans = profileScans.filter(scan => scan.status === 'completed');
    const failedScans = profileScans.filter(scan => scan.status === 'error');
    const totalScans = completedScans.length + failedScans.length;
    
    return totalScans > 0 ? (completedScans.length / totalScans) * 100 : 0;
  }

  getAnalyticsSummary(timeRange = '24h') {
    const now = Date.now();
    let timeFilter;
    
    switch (timeRange) {
      case '1h':
        timeFilter = now - (60 * 60 * 1000);
        break;
      case '24h':
        timeFilter = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeFilter = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        timeFilter = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeFilter = now - (24 * 60 * 60 * 1000);
    }

    const filteredScans = this.scanHistory.filter(scan => scan.startTime >= timeFilter);
    
    return {
      timeRange,
      totalScans: filteredScans.length,
      completedScans: filteredScans.filter(s => s.status === 'completed').length,
      failedScans: filteredScans.filter(s => s.status === 'error').length,
      activeScans: filteredScans.filter(s => s.status === 'started').length,
      averageDuration: this.calculateAverageDuration(filteredScans),
      totalFilesProcessed: this.calculateTotalFiles(filteredScans),
      totalSizeProcessed: this.calculateTotalSize(filteredScans),
      profileBreakdown: this.getProfileBreakdown(filteredScans),
      errorBreakdown: this.getErrorBreakdown(filteredScans),
      performanceTrends: this.getPerformanceTrends(filteredScans)
    };
  }

  calculateAverageDuration(scans) {
    const completedScans = scans.filter(scan => scan.duration);
    if (completedScans.length === 0) return 0;
    
    const totalDuration = completedScans.reduce((sum, scan) => sum + scan.duration, 0);
    return Math.round(totalDuration / completedScans.length);
  }

  calculateTotalFiles(scans) {
    return scans.reduce((total, scan) => {
      return total + (scan.result?.totalFiles || 0);
    }, 0);
  }

  calculateTotalSize(scans) {
    return scans.reduce((total, scan) => {
      return total + (scan.result?.totalSize || 0);
    }, 0);
  }

  getProfileBreakdown(scans) {
    const breakdown = {};
    
    for (const scan of scans) {
      const profile = scan.profile || 'unknown';
      if (!breakdown[profile]) {
        breakdown[profile] = { count: 0, completed: 0, failed: 0 };
      }
      breakdown[profile].count++;
      if (scan.status === 'completed') breakdown[profile].completed++;
      if (scan.status === 'error') breakdown[profile].failed++;
    }
    
    return breakdown;
  }

  getErrorBreakdown(scans) {
    const breakdown = {};
    
    for (const scan of scans) {
      if (scan.error) {
        const errorType = scan.error.code || 'UNKNOWN';
        if (!breakdown[errorType]) {
          breakdown[errorType] = { count: 0, message: scan.error.message };
        }
        breakdown[errorType].count++;
      }
    }
    
    return breakdown;
  }

  getPerformanceTrends(scans) {
    const trends = {
      scanTimes: [],
      successRates: [],
      cacheHitRates: []
    };

    // Group scans by hour for trend analysis
    const hourlyData = {};
    
    for (const scan of scans) {
      const hour = new Date(scan.startTime).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { scans: [], completed: 0, cached: 0 };
      }
      hourlyData[hour].scans.push(scan);
      if (scan.status === 'completed') hourlyData[hour].completed++;
      if (scan.result?.cached) hourlyData[hour].cached++;
    }

    // Calculate trends for each hour
    for (let hour = 0; hour < 24; hour++) {
      const data = hourlyData[hour];
      if (data && data.scans.length > 0) {
        const avgDuration = this.calculateAverageDuration(data.scans);
        const successRate = (data.completed / data.scans.length) * 100;
        const cacheHitRate = (data.cached / data.scans.length) * 100;
        
        trends.scanTimes.push({ hour, value: avgDuration });
        trends.successRates.push({ hour, value: successRate });
        trends.cacheHitRates.push({ hour, value: cacheHitRate });
      }
    }

    return trends;
  }

  getDetailedMetrics() {
    return {
      realTime: this.realTimeMetrics,
      performance: Object.fromEntries(this.performanceMetrics),
      errors: Object.fromEntries(this.errorMetrics),
      recentScans: this.scanHistory.slice(-10).reverse(),
      systemInfo: this.getSystemInfo()
    };
  }

  async saveAnalyticsData() {
    try {
      // Save scan history
      const historyFile = path.join(this.analyticsPath, 'scan-history.json');
      await fs.writeFile(historyFile, JSON.stringify(this.scanHistory, null, 2));

      // Save performance metrics
      const perfFile = path.join(this.analyticsPath, 'performance-metrics.json');
      const perfData = Object.fromEntries(this.performanceMetrics);
      await fs.writeFile(perfFile, JSON.stringify(perfData, null, 2));

      // Save error metrics
      const errorFile = path.join(this.analyticsPath, 'error-metrics.json');
      const errorData = Object.fromEntries(this.errorMetrics);
      await fs.writeFile(errorFile, JSON.stringify(errorData, null, 2));

    } catch (error) {
      console.error('Failed to save analytics data:', error);
    }
  }

  startPeriodicCleanup() {
    // Clean up old data every hour
    setInterval(async () => {
      await this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  async cleanupOldData() {
    try {
      const now = Date.now();
      const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      // Clean up old scan history
      const originalLength = this.scanHistory.length;
      this.scanHistory = this.scanHistory.filter(scan => 
        (now - scan.startTime) < retentionPeriod
      );
      
      if (this.scanHistory.length < originalLength) {
        console.log(`🧹 Cleaned up ${originalLength - this.scanHistory.length} old scan records`);
        await this.saveAnalyticsData();
      }

    } catch (error) {
      console.error('Failed to cleanup old analytics data:', error);
    }
  }

  async exportAnalytics(format = 'json') {
    const data = this.getDetailedMetrics();
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  convertToCSV(data) {
    // Simple CSV conversion for scan history
    const headers = ['scanId', 'analysisId', 'directoryPath', 'profile', 'startTime', 'endTime', 'duration', 'status', 'totalFiles', 'totalSize', 'cached'];
    const rows = this.scanHistory.map(scan => [
      scan.scanId,
      scan.analysisId,
      scan.directoryPath,
      scan.profile,
      new Date(scan.startTime).toISOString(),
      scan.endTime ? new Date(scan.endTime).toISOString() : '',
      scan.duration || '',
      scan.status,
      scan.result?.totalFiles || '',
      scan.result?.totalSize || '',
      scan.result?.cached || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  async clearAnalytics() {
    try {
      this.scanHistory = [];
      this.performanceMetrics.clear();
      this.errorMetrics.clear();
      this.realTimeMetrics = {
        activeScans: 0,
        totalScansToday: 0,
        totalScansThisWeek: 0,
        totalScansThisMonth: 0,
        averageScanTime: 0,
        successRate: 0,
        errorRate: 0,
        cacheHitRate: 0,
        systemLoad: { memory: 0, cpu: 0, disk: 0 }
      };
      
      await this.saveAnalyticsData();
      console.log('🗑️ Analytics data cleared');
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
    }
  }
}

module.exports = AnalyticsManager;
