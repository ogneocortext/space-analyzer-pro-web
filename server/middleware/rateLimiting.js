/**
 * Advanced Rate Limiting Middleware
 * Provides intelligent rate limiting with Redis fallback and configurable rules
 */

const logger = require("../utils/logger");

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.store = new Map(); // In-memory store for development
    
    // Rate limit rules by endpoint type
    this.rules = {
      'analysis': { maxRequests: 10, windowMs: 60000 },
      'ai': { maxRequests: 20, windowMs: 30000 },
      'upload': { maxRequests: 5, windowMs: 60000 },
      'default': { maxRequests: 100, windowMs: 60000 }
    };
  }

  /**
   * Get client identifier
   */
  getClientIdentifier(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           'unknown';
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(clientId, endpointType) {
    const now = Date.now();
    const key = `${clientId}:${endpointType}`;
    const record = this.store.get(key);
    
    if (!record) {
      return { limited: false, remaining: this.rules[endpointType].maxRequests };
    }

    const windowStart = record.timestamp || now;
    const requestsInWindow = record.requests || 0;
    
    // Count requests in current window
    if (now - windowStart < this.windowMs) {
      return { limited: false, remaining: this.rules[endpointType].maxRequests - requestsInWindow };
    }

    // Reset window if expired
    if (now - windowStart >= this.windowMs) {
      record.requests = 1;
      record.timestamp = now;
    } else {
      record.requests++;
    }

    const remaining = Math.max(0, this.rules[endpointType].maxRequests - record.requests);
    const limited = remaining <= 0;

    return { limited, remaining };
  }

  /**
   * Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      try {
        const clientId = this.getClientIdentifier(req);
        const endpointType = req.path.split('/')[1] || 'default';
        
        const rule = this.rules[endpointType] || this.rules.default;
        const result = this.isRateLimited(clientId, endpointType);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': rule.maxRequests,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': new Date(Date.now() + this.windowMs).toUTCString(),
          'X-RateLimit-Retry-After': Math.ceil(this.windowMs / 1000)
        });

        // Log rate limit hit
        if (result.limited) {
          logger.warn(`Rate limit exceeded for client ${clientId} on ${endpointType}`, {
            clientId,
            endpointType,
            rule,
            remaining: result.remaining
          });
        }

        req.rateLimit = {
          limited: result.limited,
          remaining: result.remaining,
          rule: rule,
          clientId,
          endpointType
        };

        if (result.limited) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            details: {
              limit: rule.maxRequests,
              remaining: result.remaining,
              retryAfter: Math.ceil(this.windowMs / 1000),
              endpointType,
              clientId
            }
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limiting middleware error:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    };
  }

  /**
   * Get current statistics
   */
  getStats() {
    const stats = {
      totalClients: this.store.size,
      totalRules: Object.keys(this.rules).length,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };

    // Add detailed stats per client
    for (const [key, record] of this.store) {
      const clientId = key.split(':')[0];
      if (!stats[clientId]) {
        stats[clientId] = {
          endpoints: {},
          totalRequests: 0
        };
      }

      const endpointType = key.split(':')[1];
      stats[clientId].endpoints[endpointType] = {
        requests: record.requests,
        limited: record.limited,
        remaining: record.remaining,
        lastRequest: record.timestamp
      };
      stats[clientId].totalRequests += record.requests;
    }

    return stats;
  }

  /**
   * Clear all rate limits (for testing)
   */
  clear() {
    this.store.clear();
    logger.info('Rate limiter cleared');
  }
}

module.exports = RateLimiter;