/**
 * API Input Validation Middleware
 * Provides standardized validation for all API endpoints
 */

// Simple logger replacement
const logger = {
  info: (message) => console.log(`[VALIDATION] ${message}`),
  error: (message) => console.error(`[VALIDATION] ${message}`),
  warn: (message) => console.warn(`[VALIDATION] ${message}`),
  debug: (message) => console.debug(`[VALIDATION] ${message}`),
};

class ValidationMiddleware {
  /**
   * Validate required fields in request body
   */
  static requiredFields(fields = []) {
    return (req, res, next) => {
      const missing = [];

      for (const field of fields) {
        if (
          req.body[field] === undefined ||
          req.body[field] === null ||
          req.body[field] === ""
        ) {
          missing.push(field);
        }
      }

      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(", ")}`,
          missingFields: missing,
          timestamp: Date.now(),
        });
      }

      next();
    };
  }

  /**
   * Validate field types
   */
  static fieldTypes(fieldTypes = {}) {
    return (req, res, next) => {
      const errors = [];

      for (const [field, expectedType] of Object.entries(fieldTypes)) {
        const value = req.body[field];

        if (value !== undefined && value !== null) {
          let actualType = typeof value;

          // Special handling for arrays
          if (Array.isArray(value)) {
            actualType = "array";
          }

          if (actualType !== expectedType) {
            errors.push({
              field,
              expectedType,
              actualType,
              message: `Field '${field}' must be of type ${expectedType}, got ${actualType}`,
            });
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Invalid field types",
          typeErrors: errors,
          timestamp: Date.now(),
        });
      }

      next();
    };
  }

  /**
   * Validate string fields with additional constraints
   */
  static stringValidation(fieldConstraints = {}) {
    return (req, res, next) => {
      const errors = [];

      for (const [field, constraints] of Object.entries(fieldConstraints)) {
        const value = req.body[field];

        if (typeof value === "string") {
          // Length validation
          if (constraints.minLength && value.length < constraints.minLength) {
            errors.push({
              field,
              constraint: "minLength",
              expected: constraints.minLength,
              actual: value.length,
              message: `Field '${field}' must be at least ${constraints.minLength} characters long`,
            });
          }

          if (constraints.maxLength && value.length > constraints.maxLength) {
            errors.push({
              field,
              constraint: "maxLength",
              expected: constraints.maxLength,
              actual: value.length,
              message: `Field '${field}' must be no more than ${constraints.maxLength} characters long`,
            });
          }

          // Pattern validation
          if (constraints.pattern && !constraints.pattern.test(value)) {
            errors.push({
              field,
              constraint: "pattern",
              message: `Field '${field}' does not match required pattern`,
            });
          }

          // Sanitization
          if (constraints.sanitize) {
            req.body[field] = this.sanitizeString(value);
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "String validation failed",
          validationErrors: errors,
          timestamp: Date.now(),
        });
      }

      next();
    };
  }

  /**
   * Validate numeric fields with ranges
   */
  static numericValidation(fieldConstraints = {}) {
    return (req, res, next) => {
      const errors = [];

      for (const [field, constraints] of Object.entries(fieldConstraints)) {
        const value = req.body[field];

        if (typeof value === "number") {
          if (constraints.min !== undefined && value < constraints.min) {
            errors.push({
              field,
              constraint: "min",
              expected: constraints.min,
              actual: value,
              message: `Field '${field}' must be at least ${constraints.min}`,
            });
          }

          if (constraints.max !== undefined && value > constraints.max) {
            errors.push({
              field,
              constraint: "max",
              expected: constraints.max,
              actual: value,
              message: `Field '${field}' must be no more than ${constraints.max}`,
            });
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Numeric validation failed",
          validationErrors: errors,
          timestamp: Date.now(),
        });
      }

      next();
    };
  }

  /**
   * Validate file paths for security
   */
  static pathValidation(field = "path") {
    return (req, res, next) => {
      const path = req.body[field] || req.query[field] || req.params[field];

      if (!path) {
        return res.status(400).json({
          success: false,
          error: "Path parameter is required",
          field,
          timestamp: Date.now(),
        });
      }

      if (typeof path !== "string") {
        return res.status(400).json({
          success: false,
          error: "Path must be a string",
          field,
          receivedType: typeof path,
          timestamp: Date.now(),
        });
      }

      // Security checks
      const securityErrors = [];

      // Check for path traversal attempts
      if (path.includes("..") || path.includes("~")) {
        securityErrors.push(
          "Path contains potentially dangerous traversal characters",
        );
      }

      // Check for null bytes
      if (path.includes("\0")) {
        securityErrors.push("Path contains null bytes");
      }

      // Check length
      if (path.length > 4096) {
        securityErrors.push("Path exceeds maximum length");
      }

      if (securityErrors.length > 0) {
        logger.warn("Path validation security issues detected", {
          path,
          errors: securityErrors,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });

        return res.status(400).json({
          success: false,
          error: "Invalid path format",
          securityErrors,
          timestamp: Date.now(),
        });
      }

      // Normalize path
      const normalizedPath = this.normalizePath(path);

      // Update request with normalized path
      if (req.body[field]) req.body[field] = normalizedPath;
      if (req.query[field]) req.query[field] = normalizedPath;
      if (req.params[field]) req.params[field] = normalizedPath;

      next();
    };
  }

  /**
   * Validate analysis ID format
   */
  static analysisIdValidation(field = "analysisId") {
    return (req, res, next) => {
      const analysisId =
        req.body[field] || req.query[field] || req.params[field];

      if (!analysisId) {
        return res.status(400).json({
          success: false,
          error: "Analysis ID is required",
          field,
          timestamp: Date.now(),
        });
      }

      if (typeof analysisId !== "string") {
        return res.status(400).json({
          success: false,
          error: "Analysis ID must be a string",
          field,
          receivedType: typeof analysisId,
          timestamp: Date.now(),
        });
      }

      // Check format (should match pattern: analysis-YYYY-MM-DDTHH-MM-SS-random)
      const analysisIdPattern =
        /^analysis-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-z0-9]{4}$/;
      if (!analysisIdPattern.test(analysisId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid analysis ID format",
          field,
          expectedPattern: "analysis-YYYY-MM-DDTHH-MM-SS-random",
          timestamp: Date.now(),
        });
      }

      next();
    };
  }

  /**
   * Rate limiting middleware
   */
  static rateLimit(options = {}) {
    const {
      windowMs = 60000, // 1 minute
      maxRequests = 100,
      message = "Too many requests",
    } = options;

    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip || "unknown";
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old requests
      if (requests.has(key)) {
        const userRequests = requests
          .get(key)
          .filter((time) => time > windowStart);
        requests.set(key, userRequests);
      } else {
        requests.set(key, []);
      }

      const userRequests = requests.get(key);

      if (userRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: Math.ceil(windowMs / 1000),
          timestamp: Date.now(),
        });
      }

      userRequests.push(now);
      next();
    };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(str) {
    return str
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .replace(/javascript:/gi, "") // Remove javascript protocol
      .replace(/on\w+\s*=/gi, "") // Remove event handlers
      .replace(/['"]/g, "") // Remove quotes to prevent injection
      .replace(/[;&]/g, ""); // Remove command separators
  }

  /**
   * Validate against SQL injection patterns
   */
  static sqlInjectionValidation(fieldConstraints = {}) {
    return (req, res, next) => {
      const errors = [];
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(--|\*|\/|\*|;|'|")/g,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
        /(\b(OR|AND)\s+['"]?[^'"]*['"]?\s*=\s*['"]?[^'"]*['"]?)/gi,
      ];

      for (const [field, constraints] of Object.entries(fieldConstraints)) {
        const value = req.body[field] || req.query[field] || req.params[field];

        if (typeof value === "string") {
          for (const pattern of sqlPatterns) {
            if (pattern.test(value)) {
              errors.push({
                field,
                constraint: "sql-injection",
                message: `Field '${field}' contains potentially malicious SQL patterns`,
              });
              break;
            }
          }
        }
      }

      if (errors.length > 0) {
        logger.warn("SQL injection attempt detected", {
          errors,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          body: req.body,
          query: req.query,
          params: req.params,
        });

        return res.status(400).json({
          success: false,
          error: "Invalid input detected",
          securityErrors: errors,
          timestamp: Date.now(),
        });
      }

      next();
    };
  }

  /**
   * Normalize file path
   */
  static normalizePath(path) {
    if (typeof path !== "string") return path;

    return path
      .replace(/\\/g, "/") // Convert backslashes to forward slashes
      .replace(/\/+/g, "/") // Convert multiple slashes to single
      .replace(/\/$/, "") // Remove trailing slash
      .trim();
  }

  /**
   * Validation for progress endpoints
   */
  static progressValidation() {
    return [this.analysisIdValidation("analysisId")];
  }

  /**
   * Validation for results endpoints
   */
  static resultsValidation() {
    return [this.analysisIdValidation("id")];
  }

  /**
   * Validation for analysis endpoints
   */
  static validateAnalysis(req, res, next) {
    const { directoryPath } = req.body;
    if (!directoryPath) {
      return res.status(400).json({
        success: false,
        error: "directoryPath is required",
      });
    }
    if (typeof directoryPath !== "string") {
      return res.status(400).json({
        success: false,
        error: "directoryPath must be a string",
      });
    }
    next();
  }
}

module.exports = ValidationMiddleware;
