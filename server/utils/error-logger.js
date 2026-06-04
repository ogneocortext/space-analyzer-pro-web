/**
 * Error Logger Utility
 * Provides specialized logging for errors and system issues
 */

class ErrorLogger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.showTimestamps = options.showTimestamps !== false;
    this.useColors = options.useColors !== false;
    this.errorLog = [];
    this.maxErrorLogSize = options.maxErrorLogSize || 1000;
  }

  formatMessage(level, message) {
    const timestamp = this.showTimestamps ? `[${new Date().toISOString()}] ` : '';
    const prefix = `[${level.toUpperCase()}] `;
    return `${timestamp}${prefix}${message}`;
  }

  error(message, error = null) {
    if (this.shouldLog('error')) {
      const formattedMessage = this.formatMessage('error', message);
      console.error(formattedMessage);
      
      if (error) {
        console.error('Error details:', error);
      }
      
      this.addToErrorLog('error', message, error);
    }
  }

  warn(message, error = null) {
    if (this.shouldLog('warn')) {
      const formattedMessage = this.formatMessage('warn', message);
      console.warn(formattedMessage);
      
      if (error) {
        console.warn('Warning details:', error);
      }
      
      this.addToErrorLog('warn', message, error);
    }
  }

  info(message) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message));
    }
  }

  debug(message) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message));
    }
  }

  addToErrorLog(level, message, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null
    };

    this.errorLog.push(logEntry);
    
    // Keep error log size manageable
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxErrorLogSize);
    }
  }

  getErrorLog() {
    return this.errorLog;
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  getRecentErrors(count = 10) {
    return this.errorLog.slice(-count);
  }

  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }
}

// Factory function for creating error logger instances
function getErrorLogger(options = {}) {
  return new ErrorLogger(options);
}

module.exports = {
  ErrorLogger,
  getErrorLogger
};