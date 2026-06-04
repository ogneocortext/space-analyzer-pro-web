/**
 * Simple Logger Utility
 * Provides basic logging functionality for the server
 */

class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.showTimestamps = options.showTimestamps !== false;
    this.useColors = options.useColors !== false;
  }

  formatMessage(level, message) {
    const timestamp = this.showTimestamps ? `[${new Date().toISOString()}] ` : '';
    const prefix = `[${level.toUpperCase()}] `;
    return `${timestamp}${prefix}${message}`;
  }

  info(message) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message));
    }
  }

  error(message) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
    }
  }

  warn(message) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
    }
  }

  debug(message) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message));
    }
  }

  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }
}

module.exports = Logger;