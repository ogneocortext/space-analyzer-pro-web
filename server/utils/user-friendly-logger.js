/**
 * User-Friendly Logger Utility
 * Provides enhanced logging with better formatting and user experience
 */

class UserFriendlyLogger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.showProgress = options.showProgress !== false;
    this.showTimestamps = options.showTimestamps !== false;
    this.useColors = options.useColors !== false;
    this.prefix = options.prefix || 'SYSTEM';
  }

  formatMessage(level, message, showProgress = false) {
    const timestamp = this.showTimestamps ? `[${new Date().toLocaleTimeString()}] ` : '';
    const prefix = `[${this.prefix}] `;
    const levelIcon = this.getLevelIcon(level);
    const progressIndicator = showProgress && this.showProgress ? '⏳ ' : '';
    return `${timestamp}${prefix}${levelIcon}${progressIndicator}${message}`;
  }

  getLevelIcon(level) {
    const icons = {
      info: '📋',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
      success: '✅',
      progress: '⏳'
    };
    return icons[level] || icons.info;
  }

  info(message, showProgress = false) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, showProgress));
    }
  }

  error(message, error = null, showProgress = false) {
    if (this.shouldLog('error')) {
      const formattedMessage = this.formatMessage('error', message, showProgress);
      console.error(formattedMessage);
      
      if (error) {
        console.error('Error details:', error);
      }
    }
  }

  warn(message, error = null, showProgress = false) {
    if (this.shouldLog('warn')) {
      const formattedMessage = this.formatMessage('warn', message, showProgress);
      console.warn(formattedMessage);
      
      if (error) {
        console.warn('Warning details:', error);
      }
    }
  }

  debug(message, showProgress = false) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, showProgress));
    }
  }

  success(message, showProgress = false) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('success', message, showProgress));
    }
  }

  progress(message) {
    if (this.showProgress) {
      console.log(this.formatMessage('progress', message, true));
    }
  }

  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }
}

module.exports = UserFriendlyLogger;