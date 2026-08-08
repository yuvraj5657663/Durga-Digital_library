import logger from '../config/logger.js';

class ErrorMonitor {
  constructor() {
    this.errorCounts = new Map();
    this.alertThreshold = 5; // Alert after 5 similar errors in 5 minutes
    this.alertWindow = 5 * 60 * 1000; // 5 minutes
  }

  logError(error, context = {}) {
    const errorKey = this.getErrorKey(error);
    const now = Date.now();
    
    // Track error counts
    if (!this.errorCounts.has(errorKey)) {
      this.errorCounts.set(errorKey, []);
    }
    
    const errorTimestamps = this.errorCounts.get(errorKey);
    errorTimestamps.push(now);
    
    // Remove old timestamps outside the alert window
    const recentTimestamps = errorTimestamps.filter(
      timestamp => now - timestamp < this.alertWindow
    );
    this.errorCounts.set(errorKey, recentTimestamps);
    
    // Check if we should alert
    if (recentTimestamps.length >= this.alertThreshold) {
      this.sendAlert(error, context, recentTimestamps.length);
    }
    
    // Log the error
    logger.error({
      error: error.message,
      stack: error.stack,
      name: error.name,
      context,
      count: recentTimestamps.length,
    });
  }

  getErrorKey(error) {
    return `${error.name}:${error.message}`;
  }

  sendAlert(error, context, count) {
    const alertMessage = `
🚨 ERROR ALERT 🚨
-----------------
Error: ${error.name}
Message: ${error.message}
Occurrences: ${count} in last 5 minutes
Context: ${JSON.stringify(context, null, 2)}
Timestamp: ${new Date().toISOString()}
    `.trim();
    
    logger.error('ALERT:', alertMessage);
    
    // In production, you would send this to:
    // - Slack webhook
    // - Email notification
    // - Sentry/DataDog
    // - PagerDuty
    console.error(alertMessage);
  }

  logInfo(message, data = {}) {
    logger.info({ message, ...data });
  }

  logWarning(message, data = {}) {
    logger.warn({ message, ...data });
  }

  getErrorStats() {
    const stats = {};
    this.errorCounts.forEach((timestamps, key) => {
      stats[key] = {
        count: timestamps.length,
        lastSeen: new Date(timestamps[timestamps.length - 1]).toISOString(),
      };
    });
    return stats;
  }

  clearErrorStats() {
    this.errorCounts.clear();
  }
}

export default new ErrorMonitor();
