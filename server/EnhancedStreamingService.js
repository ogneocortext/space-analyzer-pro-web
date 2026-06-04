/**
 * Enhanced Streaming Implementation with Retry Logic
 * Uses Node.js stream.Readable instead of Web ReadableStream API
 */

const { EventEmitter } = require('events');
const { Readable } = require('stream');

class EnhancedStreamingService extends EventEmitter {
    constructor() {
        super();
        this.activeStreams = new Map();
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2
        };
    }

    async createStream(streamId, request, options = {}) {
        const streamConfig = {
            id: streamId,
            request,
            options,
            retryCount: 0,
            lastError: null,
            startTime: Date.now(),
            provider: options.provider || 'ollama',
            destroyed: false
        };

        this.activeStreams.set(streamId, streamConfig);
        
        try {
            return await this.executeStream(streamConfig);
        } catch (error) {
            return await this.handleStreamError(streamConfig, error);
        }
    }

    async executeStream(streamConfig) {
        const { request, options, id } = streamConfig;
        
        // Create Node.js Readable stream
        const stream = new Readable({
            objectMode: false,
            read() {
                // Push will be called from processStreamingRequest
                // This is a passive readable stream
            },
            destroy(err, callback) {
                this.cleanupStream(id);
                callback(err);
            }
        });

        // Start the streaming process
        this.processStreamingRequest(stream, request, options, streamConfig)
            .then(() => {
                if (!stream.destroyed) {
                    stream.push(null);
                    this.emit('streamCompleted', id);
                }
            })
            .catch((error) => {
                if (!stream.destroyed) {
                    stream.destroy(error);
                    this.emit('streamError', id, error);
                }
            });

        return stream;
    }

    async processStreamingRequest(stream, request, options, streamConfig) {
        const { messages, context } = request;
        const aiManager = require('./OpenSourceAIManager');
        
        try {
            // Process with current provider
            const response = await aiManager.processRequest('chat', { messages, context }, {
                ...options,
                stream: true
            });

            // Handle streaming response
            if (response.body) {
                // If response is a Node.js Readable stream
                if (response.body instanceof Readable || response.body.readable) {
                    for await (const chunk of response.body) {
                        if (streamConfig.destroyed) break;
                        const decoded = chunk.toString();
                        const lines = decoded.split('\n');
                        
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                try {
                                    const parsed = JSON.parse(data);
                                    stream.push(JSON.stringify(parsed) + '\n');
                                } catch {
                                    stream.push(data + '\n');
                                }
                            }
                        }
                    }
                } else if (typeof response.body.getReader === 'function') {
                    // Web API ReadableStream format
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    
                    while (true) {
                        if (streamConfig.destroyed) break;
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');
                        
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                try {
                                    const parsed = JSON.parse(data);
                                    stream.push(JSON.stringify(parsed) + '\n');
                                } catch {
                                    stream.push(data + '\n');
                                }
                            }
                        }
                    }
                }
            } else if (response.data) {
                // Handle non-streaming response format
                stream.push(JSON.stringify(response.data) + '\n');
            }
        } catch (error) {
            streamConfig.lastError = error;
            throw error;
        }
    }

    async handleStreamError(streamConfig, error) {
        const { id, retryCount, options } = streamConfig;
        
        if (retryCount < this.retryConfig.maxRetries && !streamConfig.destroyed) {
            streamConfig.retryCount++;
            
            // Calculate delay with exponential backoff
            const delay = Math.min(
                this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, retryCount),
                this.retryConfig.maxDelay
            );
            
            this.emit('streamRetry', id, retryCount + 1, delay);
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Retry the stream
            return this.executeStream(streamConfig);
        }
        
        // Max retries exceeded or stream destroyed
        this.cleanupStream(id);
        this.emit('streamFailed', id, error);
        throw error;
    }

    cleanupStream(streamId) {
        const streamConfig = this.activeStreams.get(streamId);
        if (streamConfig) {
            streamConfig.destroyed = true;
            this.activeStreams.delete(streamId);
            this.emit('streamCleaned', streamId);
        }
    }

    /**
     * Destroy a stream by ID
     */
    destroyStream(streamId) {
        const streamConfig = this.activeStreams.get(streamId);
        if (streamConfig) {
            streamConfig.destroyed = true;
            this.activeStreams.delete(streamId);
            this.emit('streamDestroyed', streamId);
        }
    }

    /**
     * Destroy all active streams
     */
    destroyAllStreams() {
        for (const [id] of this.activeStreams) {
            this.destroyStream(id);
        }
        this.removeAllListeners();
    }

    /**
     * Get stream status
     */
    getStreamStatus(streamId) {
        const config = this.activeStreams.get(streamId);
        if (!config) return null;
        
        return {
            id: config.id,
            active: !config.destroyed,
            retryCount: config.retryCount,
            startTime: config.startTime,
            provider: config.provider,
            lastError: config.lastError?.message || null
        };
    }

    /**
     * Get all active stream statuses
     */
    getAllStreamStatuses() {
        const statuses = [];
        for (const [id] of this.activeStreams) {
            statuses.push(this.getStreamStatus(id));
        }
        return statuses;
    }
}

module.exports = EnhancedStreamingService;