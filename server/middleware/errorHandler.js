/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses and logging for all API endpoints
 */

const logger = require("../utils/logger");

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      VALIDATION_ERROR: 'validation_error',
      AUTHENTICATION_ERROR: 'authentication_error',
      AUTHORIZATION_ERROR: 'authorization_error',
      NOT_FOUND_ERROR: 'not_found_error',
      PERMISSION_ERROR: 'permission_error',
      DATABASE_ERROR: 'database_error',
      RATE_LIMIT_ERROR: 'rate_limit_error',
      INTERNAL_ERROR: 'internal_error',
      EXTERNAL_SERVICE_ERROR: 'external_service_error'
    };
  }

  /**
   * Create standardized error response
   */
  createErrorResponse(type, message, details = null, statusCode = 500) {
    const errorResponse = {
      success: false,
      error: {
        type,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      }
    };

    logger.error(`[${type.toUpperCase()}] ${message}`, {
      errorType: type,
      details,
      statusCode
    });

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Type': type
      },
      body: errorResponse
    };
  }

  /**
   * Generate unique request ID for error tracking
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle validation errors
   */
  handleValidationError(error, req) {
    return this.createErrorResponse(
      this.errorTypes.VALIDATION_ERROR,
      error.message,
      {
        field: error.field,
        value: error.value,
        constraint: error.constraint
      },
      400
    );
  }

  /**
   * Handle database errors
   */
  handleDatabaseError(error, operation = 'unknown') {
    return this.createErrorResponse(
      this.errorTypes.DATABASE_ERROR,
      `Database operation failed: ${operation}`,
      {
        operation,
        originalError: error.message,
        stack: error.stack
      },
      500
    );
  }

  /**
   * Handle rate limiting errors
   */
  handleRateLimitError(clientInfo, limit) {
    return this.createErrorResponse(
      this.errorTypes.RATE_LIMIT_ERROR,
      `Rate limit exceeded. Limit: ${limit} requests per minute`,
      {
        clientInfo,
        limit,
        retryAfter: new Date(Date.now() + 60000).toISOString() // 1 minute from now
      },
      429
    );
  }

  /**
   * Handle external service errors (AI services, file system, etc.)
   */
  handleExternalServiceError(service, error, operation = 'unknown') {
    return this.createErrorResponse(
      this.errorTypes.EXTERNAL_SERVICE_ERROR,
      `External service ${service} failed during ${operation}`,
      {
        service,
        operation,
        originalError: error.message,
        stack: error.stack
      },
      502
    );
  }

  /**
   * Handle not found errors
   */
  handleNotFoundError(resource, id = null) {
    const message = id ? 
      `${resource} with ID ${id} not found` : 
      `${resource} not found`;
    
    return this.createErrorResponse(
      this.errorTypes.NOT_FOUND_ERROR,
      message,
      { resource, id },
      404
    );
  }

  /**
   * Handle permission errors
   */
  handlePermissionError(permission, resource) {
    return this.createErrorResponse(
      this.errorTypes.PERMISSION_ERROR,
      `Permission denied: ${permission} required for ${resource}`,
      { permission, resource },
      403
    );
  }

  /**
   * Handle internal server errors
   */
  handleInternalError(error, context = 'unknown') {
    return this.createErrorResponse(
      this.errorTypes.INTERNAL_ERROR,
      'Internal server error occurred',
      {
        context,
        originalError: error.message,
        stack: error.stack
      },
      500
    );
  }

  /**
   * Express middleware function
   */
  middleware() {
    return (error, req, res, next) => {
      // Skip if no error
      if (!error) {
        return next();
      }

      // Log the error
      logger.error('Unhandled error in middleware:', error);

      // Don't send error response if headers already sent
      if (res.headersSent) {
        return next();
      }

      // Handle different error types
      let errorResponse;

      if (error.name === 'ValidationError') {
        errorResponse = this.handleValidationError(error, req);
      } else if (error.name === 'DatabaseError') {
        errorResponse = this.handleDatabaseError(error, error.operation);
      } else if (error.name === 'RateLimitError') {
        errorResponse = this.handleRateLimitError(error.clientInfo, error.limit);
      } else if (error.name === 'ExternalServiceError') {
        errorResponse = this.handleExternalServiceError(error.service, error, error.operation);
      } else if (error.code === 'ENOENT') {
        errorResponse = this.handleNotFoundError('File or directory', error.path);
      } else if (error.code === 'EACCES') {
        errorResponse = this.handlePermissionError('read/write access', error.path);
      } else {
        errorResponse = this.handleInternalError(error, 'middleware_execution');
      }

      // Send error response
      res.status(errorResponse.statusCode)
         .set(errorResponse.headers)
         .json(errorResponse.body);

      // Don't proceed to other middleware
      return;
    };
  }
}

module.exports = ErrorHandler;