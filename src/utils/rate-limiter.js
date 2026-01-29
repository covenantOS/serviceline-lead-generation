/**
 * Rate Limiter Utility
 * Manages request rate limiting to avoid being blocked
 */

const logger = require('./logger');

class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 10;
    this.perMilliseconds = options.perMilliseconds || 60000; // 1 minute
    this.requests = [];
    this.delayBetweenRequests = options.delayBetweenRequests || 1000; // 1 second
  }

  /**
   * Wait until rate limit allows next request
   */
  async wait() {
    // Clean old requests
    const now = Date.now();
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.perMilliseconds
    );

    // Check if limit reached
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.perMilliseconds - (now - oldestRequest);
      
      if (waitTime > 0) {
        logger.debug(`Rate limit reached, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }

    // Add delay between requests
    if (this.requests.length > 0) {
      const timeSinceLastRequest = now - this.requests[this.requests.length - 1];
      if (timeSinceLastRequest < this.delayBetweenRequests) {
        const delay = this.delayBetweenRequests - timeSinceLastRequest;
        await this.sleep(delay);
      }
    }

    // Record this request
    this.requests.push(Date.now());
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset rate limiter
   */
  reset() {
    this.requests = [];
  }

  /**
   * Get current rate limit status
   */
  getStatus() {
    const now = Date.now();
    const recentRequests = this.requests.filter(
      timestamp => now - timestamp < this.perMilliseconds
    );

    return {
      requestsInWindow: recentRequests.length,
      maxRequests: this.maxRequests,
      windowMs: this.perMilliseconds,
      available: this.maxRequests - recentRequests.length
    };
  }
}

module.exports = RateLimiter;
