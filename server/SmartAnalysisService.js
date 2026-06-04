const SmartOrchestrator = require('../src/integration/smart-orchestrator.cjs');

class SmartAnalysisService {
    constructor() {
        this.orchestrator = new SmartOrchestrator();
        this.activeAnalyses = new Map();
        this.analysisHistory = [];
    }

    async analyzeDirectory(directory, options = {}) {
        const analysisId = this.generateAnalysisId(directory, options);
        
        // Check if analysis is already running
        if (this.activeAnalyses.has(analysisId)) {
            return this.activeAnalyses.get(analysisId);
        }

        // Create analysis promise
        const analysisPromise = this.performAnalysis(directory, options, analysisId);
        
        // Store active analysis
        this.activeAnalyses.set(analysisId, analysisPromise);
        
        try {
            const result = await analysisPromise;
            this.addToHistory(result);
            return result;
        } finally {
            // Clean up active analysis
            this.activeAnalyses.delete(analysisId);
        }
    }

    async performAnalysis(directory, options, analysisId) {
        console.log(`🎯 Starting smart analysis: ${analysisId}`);
        
        try {
            const result = await this.orchestrator.analyzeDirectory(directory, options);
            
            // Add service metadata
            result.serviceMetadata = {
                analysisId,
                serviceVersion: '1.0.0',
                timestamp: new Date().toISOString(),
                processingTime: result.summary.analysisTime
            };

            return result;
        } catch (error) {
            console.error(`❌ Analysis failed: ${analysisId}`, error);
            throw error;
        }
    }

    getAnalysisStatus(analysisId) {
        if (this.activeAnalyses.has(analysisId)) {
            return {
                status: 'running',
                analysisId,
                message: 'Analysis in progress...'
            };
        }

        // Check history
        const historyItem = this.analysisHistory.find(item => item.analysisId === analysisId);
        if (historyItem) {
            return {
                status: 'completed',
                analysisId,
                result: historyItem,
                completedAt: historyItem.timestamp
            };
        }

        return {
            status: 'not_found',
            analysisId,
            message: 'Analysis not found'
        };
    }

    getAvailableStrategies() {
        return {
            strategies: [
                {
                    name: 'ai-enhanced',
                    description: 'AI-powered analysis with insights',
                    options: ['--ai'],
                    bestFor: 'Projects requiring AI insights and recommendations'
                },
                {
                    name: 'media-focused',
                    description: 'Media and AI file categorization',
                    options: ['--media'],
                    bestFor: 'Media studios, AI projects with media files'
                },
                {
                    name: 'speed-optimized',
                    description: 'Fastest pure file analysis',
                    options: ['--fast'],
                    bestFor: 'Large directories, quick scans'
                },
                {
                    name: 'single-tool',
                    description: 'Optimized single-tool analysis',
                    options: [],
                    bestFor: 'General purpose analysis'
                }
            ],
            toolStatus: this.orchestrator.getToolStatus()
        };
    }

    getAnalysisHistory(limit = 10) {
        return this.analysisHistory
            .slice(-limit)
            .reverse()
            .map(item => ({
                analysisId: item.analysisId,
                directory: item.directory,
                strategy: item.strategy,
                files: item.summary.totalFiles,
                size: item.summary.totalSize,
                time: item.summary.analysisTime,
                timestamp: item.timestamp
            }));
    }

    cancelAnalysis(analysisId) {
        if (this.activeAnalyses.has(analysisId)) {
            this.activeAnalyses.delete(analysisId);
            return {
                status: 'cancelled',
                analysisId,
                message: 'Analysis cancelled successfully'
            };
        }
        return {
            status: 'not_found',
            analysisId,
            message: 'Analysis not found or already completed'
        };
    }

    generateAnalysisId(directory, options) {
        const optionsStr = JSON.stringify(options);
        const combined = `${directory}:${optionsStr}`;
        return require('crypto').createHash('md5').update(combined).digest('hex').substring(0, 8);
    }

    addToHistory(result) {
        // Add to history with metadata
        const historyItem = {
            ...result,
            timestamp: new Date().toISOString()
        };
        
        this.analysisHistory.push(historyItem);
        
        // Limit history to last 100 entries
        if (this.analysisHistory.length > 100) {
            this.analysisHistory = this.analysisHistory.slice(-100);
        }
    }

    getServiceStats() {
        return {
            activeAnalyses: this.activeAnalyses.size,
            historySize: this.analysisHistory.length,
            orchestratorStats: this.orchestrator.getToolStatus(),
            uptime: process.uptime()
        };
    }
}

module.exports = SmartAnalysisService;