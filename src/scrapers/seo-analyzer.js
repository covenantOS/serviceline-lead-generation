/**
 * SEO & Marketing Analyzer
 * Analyzes website SEO metrics and ad presence
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class SEOAnalyzer {
  constructor() {
    this.axiosInstance = axios.create({
      headers: {
        'User-Agent': process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000,
      maxRedirects: 5
    });
  }

  /**
   * Analyze website SEO and marketing presence
   */
  async analyze(website) {
    const url = this.normalizeUrl(website);
    
    if (!url) {
      logger.warn('Invalid website URL provided');
      return {};
    }

    logger.info(`Analyzing SEO for: ${url}`);

    try {
      const [basicSEO, adsPresence] = await Promise.allSettled([
        this.analyzeBasicSEO(url),
        this.checkAdsPresence(url)
      ]);

      const result = {
        url,
        analyzedAt: new Date().toISOString(),
        ...( basicSEO.status === 'fulfilled' ? basicSEO.value : {}),
        ...(adsPresence.status === 'fulfilled' ? adsPresence.value : {})
      };

      // Calculate overall SEO score
      result.seoScore = this.calculateSEOScore(result);

      return result;

    } catch (error) {
      logger.error(`SEO analysis error for ${url}:`, error.message);
      return { url, error: error.message };
    }
  }

  /**
   * Analyze basic on-page SEO
   */
  async analyzeBasicSEO(url) {
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const html = response.data;

      return {
        // Title tag
        hasTitle: $('title').length > 0,
        titleLength: $('title').text().length,
        
        // Meta description
        hasMetaDescription: $('meta[name="description"]').length > 0,
        metaDescriptionLength: $('meta[name="description"]').attr('content')?.length || 0,
        
        // Headings
        hasH1: $('h1').length > 0,
        h1Count: $('h1').length,
        
        // Schema markup
        hasSchema: html.includes('schema.org') || html.includes('application/ld+json'),
        
        // Mobile friendly
        hasMobileViewport: $('meta[name="viewport"]').length > 0,
        
        // Analytics
        hasGoogleAnalytics: html.includes('google-analytics.com') || html.includes('gtag'),
        hasFacebookPixel: html.includes('facebook.net/en_US/fbevents.js') || html.includes('fbq'),
        
        // SSL
        hasSSL: url.startsWith('https'),
        
        // Response time
        responseTime: response.headers['x-response-time'] || null,
        
        // Content length
        contentLength: html.length
      };

    } catch (error) {
      logger.warn(`Basic SEO analysis failed for ${url}:`, error.message);
      return {};
    }
  }

  /**
   * Check for Google Ads and Facebook Ads presence
   */
  async checkAdsPresence(url) {
    const domain = this.extractDomain(url);
    
    try {
      // Check if domain appears in Google Ads
      const hasGoogleAds = await this.checkGoogleAdsPresence(domain);
      
      // Check if domain has Facebook Business presence
      const hasFacebookAds = await this.checkFacebookPresence(domain);

      return {
        hasGoogleAds,
        hasFacebookAds,
        estimatedAdSpend: this.estimateAdSpend(hasGoogleAds, hasFacebookAds)
      };

    } catch (error) {
      logger.warn(`Ads presence check failed for ${domain}:`, error.message);
      return {
        hasGoogleAds: false,
        hasFacebookAds: false
      };
    }
  }

  /**
   * Check Google Ads presence (simplified)
   */
  async checkGoogleAdsPresence(domain) {
    try {
      // Search Google for the domain and check if ads appear
      // This is a simplified check - full implementation would need Google Ads API
      const searchQuery = domain.replace('www.', '');
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await this.axiosInstance.get(searchUrl, {
        headers: {
          'Accept': 'text/html',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const html = response.data;
      
      // Check for ad indicators
      const hasAds = html.includes('sponsored') || 
                     html.includes('data-text-ad') ||
                     html.includes('ads-ad');
      
      return hasAds;

    } catch (error) {
      logger.debug(`Google Ads check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check Facebook business presence
   */
  async checkFacebookPresence(domain) {
    try {
      // Check if Facebook Business page exists
      // Simplified implementation - would need Facebook Graph API for accuracy
      const response = await this.axiosInstance.get(
        `https://www.facebook.com/${domain.replace('www.', '').replace(/\..+/, '')}`,
        { validateStatus: () => true }
      );

      return response.status === 200;

    } catch (error) {
      logger.debug(`Facebook check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Estimate monthly ad spend (rough estimate)
   */
  estimateAdSpend(hasGoogleAds, hasFacebookAds) {
    let estimate = 'none';
    
    if (hasGoogleAds && hasFacebookAds) {
      estimate = 'high'; // $2000+/month
    } else if (hasGoogleAds || hasFacebookAds) {
      estimate = 'medium'; // $500-2000/month
    }

    return estimate;
  }

  /**
   * Calculate overall SEO score (0-100)
   */
  calculateSEOScore(data) {
    let score = 0;

    // Title tag (10 points)
    if (data.hasTitle && data.titleLength >= 30 && data.titleLength <= 60) {
      score += 10;
    } else if (data.hasTitle) {
      score += 5;
    }

    // Meta description (10 points)
    if (data.hasMetaDescription && data.metaDescriptionLength >= 120 && data.metaDescriptionLength <= 160) {
      score += 10;
    } else if (data.hasMetaDescription) {
      score += 5;
    }

    // H1 tag (10 points)
    if (data.hasH1 && data.h1Count === 1) {
      score += 10;
    } else if (data.hasH1) {
      score += 5;
    }

    // Schema markup (15 points)
    if (data.hasSchema) score += 15;

    // Mobile friendly (15 points)
    if (data.hasMobileViewport) score += 15;

    // SSL (10 points)
    if (data.hasSSL) score += 10;

    // Analytics (10 points)
    if (data.hasGoogleAnalytics) score += 5;
    if (data.hasFacebookPixel) score += 5;

    // Ads presence (20 points)
    if (data.hasGoogleAds) score += 10;
    if (data.hasFacebookAds) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Normalize website URL
   */
  normalizeUrl(url) {
    if (!url) return null;
    
    try {
      // Add protocol if missing
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      const urlObj = new URL(url);
      return urlObj.href;
    } catch {
      return null;
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Get organic keyword rankings (requires third-party API)
   */
  async getOrganicKeywords(domain) {
    // This would integrate with services like:
    // - SEMrush API
    // - Ahrefs API
    // - Moz API
    
    logger.info('Organic keyword tracking requires third-party API integration');
    return null;
  }

  /**
   * Get backlinks count (requires third-party API)
   */
  async getBacklinksCount(domain) {
    // Would integrate with Ahrefs, Moz, or similar
    logger.info('Backlink tracking requires third-party API integration');
    return null;
  }

  /**
   * Get domain authority (requires Moz API)
   */
  async getDomainAuthority(domain) {
    // Would integrate with Moz API
    logger.info('Domain authority requires Moz API integration');
    return null;
  }
}

module.exports = new SEOAnalyzer();
