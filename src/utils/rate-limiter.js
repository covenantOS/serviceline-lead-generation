/**
 * Rate Limiter Utility
 * Prevents overwhelming external services with requests
 */

const logger = require('./logger');

class RateLimiter {
  constructor() {
    this.limits = {
      google: { requests: 0, limit: 10, window: 60000, resetTime: Date.now() },
      yelp: { requests: 0, limit: 15, window: 60000, resetTime: Date.now() },
      yellowpages: { requests: 0, limit: 20, window: 60000, resetTime: Date.now() },
      enrichment: { requests: 0, limit: 30, window: 60000, resetTime: Date.now() },
      default: { requests: 0, limit: 50, window: 60000, resetTime: Date.now() }
    };
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(service = 'default') {
    const limiter = this.limits[service] || this.limits.default;
    const now = Date.now();

    // Reset counter if window has passed
    if (now - limiter.resetTime >= limiter.window) {
      limiter.requests = 0;
      limiter.resetTime = now;
    }

    // Check if limit exceeded
    if (limiter.requests >= limiter.limit) {
      const waitTime = limiter.window - (now - limiter.resetTime);
      logger.warn(`Rate limit reached for ${service}. Waiting ${waitTime}ms...`);
      await this.sleep(waitTime);
      
      // Reset after waiting
      limiter.requests = 0;
      limiter.resetTime = Date.now();
    }

    // Increment counter
    limiter.requests++;
    
    // Add small delay between requests
    await this.sleep(Math.random() * 1000 + 500);
    
    return true;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset all limits
   */
  resetAll() {
    Object.keys(this.limits).forEach(service => {
      this.limits[service].requests = 0;
      this.limits[service].resetTime = Date.now();
    });
    logger.info('All rate limits reset');
  }

  /**
   * Get current status
   */
  getStatus() {
    const status = {};
    Object.keys(this.limits).forEach(service => {
      const limiter = this.limits[service];
      status[service] = {
        requests: limiter.requests,
        limit: limiter.limit,
        remaining: limiter.limit - limiter.requests,
        resetIn: Math.max(0, limiter.window - (Date.now() - limiter.resetTime))
      };
    });
    return status;
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

module.exports = rateLimiter;
