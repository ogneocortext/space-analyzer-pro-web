const crypto = require('crypto');
const path = require('path');
const { promises: fsPromises, existsSync } = require('fs');

/**
 * Select the optimal AI model for a given query
 * @param {Object} enhancedOllama - Enhanced Ollama service instance
 * @param {boolean} ollamaAvailable - Whether Ollama is available
 * @param {Array} ollamaModels - Available Ollama models
 * @param {string} query - The query to process
 * @returns {string} The selected model name
 */
function selectOptimalModel(enhancedOllama, ollamaAvailable, ollamaModels, query) {
    if (!ollamaAvailable) {
        console.log('⚠️ Enhanced Ollama not available, using fallback model');
        return 'gemma3:latest';
    }

    // Use Enhanced Ollama Service for intelligent model selection
    try {
        const selectedModel = enhancedOllama.selectModelForContent(query);
        console.log(`🎯 Enhanced model selection: ${selectedModel} for query: "${query.substring(0, 50)}..."`);
        return selectedModel;
    } catch (error) {
        console.log('⚠️ Enhanced model selection failed, using fallback:', error.message);
        return ollamaModels.length > 0 ? ollamaModels[0] : 'gemma3:latest';
    }
}

/**
 * Classify query to determine intent
 * @param {string} query - The query to classify
 * @returns {string} The query classification
 */
function classifyQuery(query) {
    const lowerQuery = query.toLowerCase();

    // Code/Technical Analysis
    const codeTerms = ['function', 'class', 'method', 'code', 'import', 'dependency', 'dependencies', 
                      'refactor', 'algorithm', 'complexity', 'performance', 'optimize'];
    if (codeTerms.some(term => lowerQuery.includes(term))) {
        return 'code_analysis';
    }

    // File Search
    const searchTerms = ['find', 'search', 'locate', 'where', 'which files', 'show me'];
    if (searchTerms.some(term => lowerQuery.includes(term))) {
        return 'file_search';
    }

    // Optimization
    const optimizeTerms = ['reduce', 'save', 'free up', 'delete', 'remove', 'clean', 'optimize'];
    if (optimizeTerms.some(term => lowerQuery.includes(term))) {
        return 'optimization';
    }

    // Technical questions
    const techTerms = ['why', 'how', 'explain', 'what is', 'memory', 'storage', 'disk'];
    if (techTerms.some(term => lowerQuery.includes(term))) {
        return 'technical';
    }

    return 'general';
}

/**
 * Calculate query complexity score
 * @param {string} query - The query to analyze
 * @param {Object} analysisData - The analysis data
 * @returns {number} Complexity score between 0 and 1
 */
function calculateQueryComplexity(query, analysisData) {
    let complexity = 0;

    // Query length and technical terms
    const technicalTerms = ['optimize', 'refactor', 'performance', 'memory', 'storage', 'dependencies', 'complexity', 'algorithm'];
    const words = query.toLowerCase().split(' ');
    complexity += words.length * 0.1;
    complexity += technicalTerms.filter(term => query.toLowerCase().includes(term)).length * 0.2;

    // Analysis data complexity
    if (analysisData) {
        const fileCount = analysisData.totalFiles || 0;
        const sizeGB = (analysisData.totalSize || 0) / (1024 * 1024 * 1024);

        if (fileCount > 10000) complexity += 0.3;
        else if (fileCount > 1000) complexity += 0.2;
        else if (fileCount > 100) complexity += 0.1;

        if (sizeGB > 10) complexity += 0.3;
        else if (sizeGB > 1) complexity += 0.2;
        else if (sizeGB > 0.1) complexity += 0.1;

        // File type diversity
        const categories = Object.keys(analysisData.categories || {});
        complexity += Math.min(categories.length * 0.05, 0.3);
    }

    return Math.min(complexity, 1.0); // Cap at 1.0
}

/**
 * Initialize self-learning system directories
 * @param {string} baseDir - Base directory for learning data
 */
function initializeSelfLearning(baseDir) {
    const learningDir = path.join(baseDir, 'learning');
    const cacheDir = path.join(learningDir, 'cache');
    const historyDir = path.join(learningDir, 'history');

    if (!existsSync(learningDir)) fsPromises.mkdir(learningDir, { recursive: true });
    if (!existsSync(cacheDir)) fsPromises.mkdir(cacheDir, { recursive: true });
    if (!existsSync(historyDir)) fsPromises.mkdir(historyDir, { recursive: true });
}

/**
 * Load self-learning data from disk
 * @param {string} baseDir - Base directory for learning data
 * @returns {Promise<{selfLearningData: Map, interactionHistory: Array}>}
 */
async function loadSelfLearningData(baseDir) {
    const selfLearningData = new Map();
    const interactionHistory = [];

    try {
        const learningDir = path.join(baseDir, 'learning');
        const cacheFile = path.join(learningDir, 'cache.json');
        const historyFile = path.join(learningDir, 'history.json');

        if (existsSync(cacheFile)) {
            const cacheData = JSON.parse(await fsPromises.readFile(cacheFile, 'utf8'));
            Object.entries(cacheData).forEach(([key, value]) => {
                selfLearningData.set(key, value);
            });
            console.log(`🧠 Loaded ${selfLearningData.size} cached responses`);
        }

        if (existsSync(historyFile)) {
            interactionHistory.push(...JSON.parse(await fsPromises.readFile(historyFile, 'utf8')));
            console.log(`📚 Loaded ${interactionHistory.length} interaction records`);
        }
    } catch (error) {
        console.log('⚠️ Could not load learning data:', error.message);
    }

    return { selfLearningData, interactionHistory };
}

/**
 * Save self-learning data to disk
 * @param {string} baseDir - Base directory for learning data
 * @param {Map} selfLearningData - Cached responses
 * @param {Array} interactionHistory - Interaction records
 */
async function saveSelfLearningData(baseDir, selfLearningData, interactionHistory) {
    try {
        const learningDir = path.join(baseDir, 'learning');
        const cacheFile = path.join(learningDir, 'cache.json');
        const historyFile = path.join(learningDir, 'history.json');

        // Save cache (convert Map to object)
        const cacheObject = Object.fromEntries(selfLearningData);
        await fsPromises.writeFile(cacheFile, JSON.stringify(cacheObject, null, 2));

        // Save history
        await fsPromises.writeFile(historyFile, JSON.stringify(interactionHistory, null, 2));

        console.log('💾 Learning data saved');
    } catch (error) {
        console.log('⚠️ Could not save learning data:', error.message);
    }
}

/**
 * Generate cache key for queries
 * @param {string} query - The query
 * @param {Object} analysisData - The analysis data
 * @param {string} model - The model name
 * @returns {string} Cache key
 */
function generateCacheKey(query, analysisData, model) {
    const dataHash = crypto.createHash('md5')
        .update(JSON.stringify({
            query,
            totalFiles: analysisData.totalFiles,
            totalSize: analysisData.totalSize,
            categories: Object.keys(analysisData.categories || {}),
            model
        }))
        .digest('hex');
    return dataHash;
}

/**
 * Check self-learning cache for cached response
 * @param {Map} selfLearningData - Cached responses
 * @param {boolean} hardwareWearReduction - Whether hardware wear reduction is enabled
 * @param {string} query - The query
 * @param {Object} analysisData - The analysis data
 * @param {string} model - The model name
 * @returns {string|null} Cached response or null
 */
async function checkSelfLearningCache(selfLearningData, hardwareWearReduction, query, analysisData, model) {
    if (!hardwareWearReduction) return null;

    const cacheKey = generateCacheKey(query, analysisData, model);
    const cached = selfLearningData.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
        console.log('🎯 Using cached response (hardware protection)');
        return cached.response;
    }

    return null;
}

/**
 * Store response in self-learning cache
 * @param {Map} selfLearningData - Cached responses
 * @param {string} baseDir - Base directory for learning data
 * @param {string} query - The query
 * @param {Object} analysisData - The analysis data
 * @param {string} model - The model name
 * @param {string} response - The response to cache
 */
async function storeSelfLearningResponse(selfLearningData, baseDir, query, analysisData, model, response) {
    const cacheKey = generateCacheKey(query, analysisData, model);
    const learningEntry = {
        timestamp: Date.now(),
        query,
        model,
        response,
        analysisFingerprint: {
            totalFiles: analysisData.totalFiles,
            totalSize: analysisData.totalSize,
            categories: Object.keys(analysisData.categories || {})
        }
    };

    selfLearningData.set(cacheKey, learningEntry);

    // Limit cache size to prevent memory issues
    if (selfLearningData.size > 1000) {
        const oldestKey = Array.from(selfLearningData.keys())[0];
        selfLearningData.delete(oldestKey);
    }

    // Save periodically
    if (Math.random() < 0.1) { // 10% chance to save
        await saveSelfLearningData(baseDir, selfLearningData, []);
    }
}

/**
 * Record interaction for learning
 * @param {Array} interactionHistory - Interaction history
 * @param {Map} modelPerformance - Model performance tracking
 * @param {string} query - The query
 * @param {Object} analysisData - The analysis data
 * @param {string} model - The model name
 * @param {number} responseTime - Response time in ms
 * @param {boolean} success - Whether the request was successful
 * @param {string} response - The response
 * @param {Function} calculateQueryComplexity - Function to calculate complexity
 */
function recordInteraction(interactionHistory, modelPerformance, query, analysisData, model, responseTime, success, response, calculateQueryComplexity) {
    const interaction = {
        timestamp: Date.now(),
        query,
        model,
        responseTime,
        success,
        analysisFingerprint: {
            totalFiles: analysisData.totalFiles,
            totalSize: analysisData.totalSize,
            categories: Object.keys(analysisData.categories || {})
        },
        responseLength: response ? response.length : 0
    };

    interactionHistory.push(interaction);

    // Update model performance
    const perf = modelPerformance.get(model) || {
        totalQueries: 0,
        successfulQueries: 0,
        averageResponseTime: 0,
        lastUsed: null,
        complexityScores: []
    };

    perf.totalQueries++;
    if (success) perf.successfulQueries++;
    perf.lastUsed = Date.now();

    // Update average response time
    const alpha = 0.1; // Learning rate
    perf.averageResponseTime = perf.averageResponseTime * (1 - alpha) + responseTime * alpha;

    // Store complexity score
    const complexity = calculateQueryComplexity(query, analysisData);
    perf.complexityScores.push(complexity);
    if (perf.complexityScores.length > 100) {
        perf.complexityScores = perf.complexityScores.slice(-100);
    }

    modelPerformance.set(model, perf);
}

module.exports = {
    selectOptimalModel,
    classifyQuery,
    calculateQueryComplexity,
    initializeSelfLearning,
    loadSelfLearningData,
    saveSelfLearningData,
    generateCacheKey,
    checkSelfLearningCache,
    storeSelfLearningResponse,
    recordInteraction
};
