/**
 * ServiceLine Lead Scoring Algorithm
 * Scores leads on a 0-100 scale based on multiple criteria
 */

const logger = require('../utils/logger');

class LeadScorer {
  constructor() {
    // Scoring weights (total = 100)
    this.weights = {
      websiteQuality: 25,
      seoRanking: 20,
      adPresence: 15,
      reviewScore: 15,
      socialPresence: 10,
      companySize: 10,
      marketCompetitiveness: 5
    };

    // Industry-specific keywords for SEO analysis
    this.industryKeywords = {
      HVAC: ['hvac repair', 'air conditioning', 'heating service', 'ac repair'],
      PLUMBING: ['plumber', 'plumbing service', 'emergency plumber', 'drain cleaning'],
      ROOFING: ['roofing contractor', 'roof repair', 'roof replacement'],
      ELECTRICAL: ['electrician', 'electrical service', 'electrical repair']
    };
  }

  /**
   * Calculate overall lead score
   */
  calculateScore(lead) {
    logger.info(`Calculating score for lead: ${lead.company_name}`);

    const scores = {
      websiteQuality: this.scoreWebsiteQuality(lead),
      seoRanking: this.scoreSEORanking(lead),
      adPresence: this.scoreAdPresence(lead),
      reviewScore: this.scoreReviews(lead),
      socialPresence: this.scoreSocialPresence(lead),
      companySize: this.scoreCompanySize(lead),
      marketCompetitiveness: this.scoreMarketCompetitiveness(lead)
    };

    // Calculate weighted total
    const totalScore = Object.keys(scores).reduce((total, key) => {
      const weightedScore = (scores[key] / 100) * this.weights[key];
      return total + weightedScore;
    }, 0);

    const finalScore = Math.round(totalScore);

    // Determine lead quality tier
    const tier = this.determineLeadTier(finalScore);

    logger.info(`Lead ${lead.company_name} scored ${finalScore}/100 (${tier})`);

    return {
      totalScore: finalScore,
      tier,
      componentScores: scores,
      recommendations: this.generateRecommendations(scores, lead),
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Score website quality (0-100)
   */
  scoreWebsiteQuality(lead) {
    const websiteQuality = lead.website_quality || lead.websiteQuality || {};
    let score = 0;

    // No website = 0 points (major opportunity)
    if (!websiteQuality.hasWebsite && !lead.website) {
      return 100; // Perfect prospect - they NEED a website!
    }

    // Poor website quality = high score (they need improvement)
    const qualityIndicators = [
      { check: !websiteQuality.hasMobileViewport, points: 20, issue: 'No mobile optimization' },
      { check: !websiteQuality.hasSSL, points: 15, issue: 'No SSL certificate' },
      { check: websiteQuality.loadTime > 3000, points: 15, issue: 'Slow page load' },
      { check: !websiteQuality.hasMetaDescription, points: 10, issue: 'Missing meta description' },
      { check: websiteQuality.titleLength < 30, points: 10, issue: 'Poor title tag' },
      { check: !websiteQuality.hasGoogleAnalytics, points: 10, issue: 'No analytics tracking' },
      { check: !websiteQuality.hasLiveChat, points: 10, issue: 'No live chat' },
      { check: !websiteQuality.hasFacebookPixel, points: 10, issue: 'No Facebook pixel' }
    ];

    const issues = [];
    qualityIndicators.forEach(indicator => {
      if (indicator.check) {
        score += indicator.points;
        issues.push(indicator.issue);
      }
    });

    // Cap at 100
    score = Math.min(score, 100);

    logger.debug(`Website quality score: ${score}/100. Issues: ${issues.join(', ')}`);
    return score;
  }

  /**
   * Score SEO ranking position (0-100)
   */
  scoreSEORanking(lead) {
    const seoData = lead.seo_data || lead.seoData || {};
    let score = 0;

    // Not indexed = maximum opportunity
    if (!seoData.indexed) {
      return 100;
    }

    // Poor rankings = high opportunity score
    const ranking = seoData.estimatedRanking || 50;
    const organicKeywords = seoData.organicKeywords || 0;

    // Inverse scoring: worse ranking = higher score (more opportunity)
    if (ranking > 50) {
      score += 40; // Poor ranking position
    } else if (ranking > 20) {
      score += 25;
    } else {
      score += 10; // Already ranking well
    }

    // Few organic keywords = opportunity
    if (organicKeywords < 50) {
      score += 30;
    } else if (organicKeywords < 200) {
      score += 20;
    } else {
      score += 10;
    }

    // Check for industry-specific keyword rankings
    const industryKeywordScore = this.analyzeIndustryKeywords(lead, seoData);
    score += industryKeywordScore;

    return Math.min(score, 100);
  }

  /**
   * Analyze industry-specific keyword performance
   */
  analyzeIndustryKeywords(lead, seoData) {
    const industry = lead.industry?.toUpperCase();
    const keywords = this.industryKeywords[industry] || [];

    // If they're not ranking for their own industry keywords, high opportunity
    if (keywords.length > 0 && (!seoData.industryKeywords || seoData.industryKeywords.length === 0)) {
      return 30;
    }

    return 15;
  }

  /**
   * Score Google Ads presence (0-100)
   */
  scoreAdPresence(lead) {
    const adPresence = lead.ad_presence || lead.adPresence || {};
    let score = 0;

    // No ads = high opportunity
    if (!adPresence.hasGoogleAds || adPresence.estimatedAdSpend === 'None') {
      score = 80; // Major opportunity for PPC services
    } else if (adPresence.estimatedAdSpend === 'Low' || adPresence.estimatedAdSpend === 'Active') {
      score = 40; // Some ad presence but could improve
    } else {
      score = 20; // Already spending heavily
    }

    // Check for other ad platforms
    if (!adPresence.hasFacebookAds) score += 10;
    if (!adPresence.hasYelpAds) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Score online reviews (0-100)
   */
  scoreReviews(lead) {
    const rating = lead.rating || 0;
    const reviewCount = lead.review_count || lead.reviewCount || 0;
    let score = 0;

    // Review count analysis
    if (reviewCount < 10) {
      score += 40; // Very few reviews - needs reputation management
    } else if (reviewCount < 50) {
      score += 25; // Low review count
    } else if (reviewCount < 100) {
      score += 15;
    } else {
      score += 5; // High review count
    }

    // Rating analysis
    if (rating < 3.0) {
      score += 40; // Poor rating - needs reputation repair
    } else if (rating < 4.0) {
      score += 30; // Below average
    } else if (rating < 4.5) {
      score += 20; // Good but could improve
    } else {
      score += 10; // Excellent rating
    }

    // Response rate (if available)
    const responseRate = lead.review_response_rate || 0;
    if (responseRate < 30) {
      score += 20; // Not responding to reviews
    } else if (responseRate < 60) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Score social media presence (0-100)
   */
  scoreSocialPresence(lead) {
    const socialPresence = lead.social_presence || lead.socialPresence || {};
    let score = 0;

    // Check each platform
    const platforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube'];
    let missingPlatforms = 0;
    let lowEngagementPlatforms = 0;

    platforms.forEach(platform => {
      const platformData = socialPresence[platform];
      
      if (!platformData || !platformData.hasProfile) {
        missingPlatforms++;
        score += 15; // Missing platform = opportunity
      } else if (platformData.engagement === 'low' || platformData.followersCount < 100) {
        lowEngagementPlatforms++;
        score += 10; // Low engagement = opportunity
      } else {
        score += 5; // Active presence
      }
    });

    // Extra points for no social presence at all
    if (missingPlatforms === platforms.length) {
      score = 100; // No social media at all - huge opportunity
    }

    return Math.min(score, 100);
  }

  /**
   * Score company size (0-100)
   */
  scoreCompanySize(lead) {
    const size = lead.estimated_size || lead.estimatedSize || 'Unknown';
    let score = 0;

    // Larger companies = better leads (more budget)
    switch (size.toLowerCase()) {
      case 'large':
        score = 90; // Large budget, multiple locations
        break;
      case 'medium':
        score = 75; // Good budget, established
        break;
      case 'small':
        score = 50; // Limited budget but growth potential
        break;
      case 'startup':
        score = 30; // Very limited budget
        break;
      default:
        score = 40;
    }

    // Adjust for employee count if available
    const employees = lead.employee_count || 0;
    if (employees > 50) score = Math.min(score + 10, 100);
    if (employees > 100) score = Math.min(score + 10, 100);

    return score;
  }

  /**
   * Score market competitiveness (0-100)
   */
  scoreMarketCompetitiveness(lead) {
    const location = lead.address || lead.location || '';
    let score = 50; // Default

    // Urban/metro areas = more competition = higher scores (more need)
    const majorCities = ['new york', 'los angeles', 'chicago', 'houston', 'phoenix', 
                         'philadelphia', 'san antonio', 'san diego', 'dallas', 'miami'];
    
    const isMetroArea = majorCities.some(city => 
      location.toLowerCase().includes(city)
    );

    if (isMetroArea) {
      score = 80; // High competition = high opportunity for ads/SEO
    } else {
      score = 60; // Lower competition but still valuable
    }

    // Adjust based on competitor density (if available)
    const competitorCount = lead.local_competitor_count || 0;
    if (competitorCount > 50) {
      score = Math.min(score + 15, 100);
    } else if (competitorCount > 20) {
      score = Math.min(score + 10, 100);
    }

    return score;
  }

  /**
   * Determine lead quality tier
   */
  determineLeadTier(score) {
    if (score >= 80) return 'Hot Lead';
    if (score >= 60) return 'Warm Lead';
    if (score >= 40) return 'Cold Lead';
    return 'Low Priority';
  }

  /**
   * Generate recommendations based on scores
   */
  generateRecommendations(scores, lead) {
    const recommendations = [];

    // Website recommendations
    if (scores.websiteQuality >= 70) {
      recommendations.push({
        priority: 'High',
        category: 'Website',
        recommendation: 'Website redesign and optimization needed',
        services: ['Website Development', 'Mobile Optimization', 'Speed Optimization']
      });
    }

    // SEO recommendations
    if (scores.seoRanking >= 60) {
      recommendations.push({
        priority: 'High',
        category: 'SEO',
        recommendation: 'SEO optimization required to improve rankings',
        services: ['Local SEO', 'On-Page SEO', 'Content Marketing', 'Link Building']
      });
    }

    // Ad recommendations
    if (scores.adPresence >= 60) {
      recommendations.push({
        priority: 'High',
        category: 'Paid Advertising',
        recommendation: 'PPC campaigns needed to increase visibility',
        services: ['Google Ads', 'Local Service Ads', 'Facebook Ads']
      });
    }

    // Review recommendations
    if (scores.reviewScore >= 60) {
      recommendations.push({
        priority: 'Medium',
        category: 'Reputation Management',
        recommendation: 'Review generation and management needed',
        services: ['Review Management', 'Reputation Monitoring', 'Review Response']
      });
    }

    // Social media recommendations
    if (scores.socialPresence >= 60) {
      recommendations.push({
        priority: 'Medium',
        category: 'Social Media',
        recommendation: 'Social media presence needs development',
        services: ['Social Media Marketing', 'Content Creation', 'Community Management']
      });
    }

    // Sort by priority
    const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  /**
   * Batch score multiple leads
   */
  async scoreLeads(leads) {
    logger.info(`Scoring ${leads.length} leads...`);
    const scoredLeads = [];

    for (const lead of leads) {
      try {
        const scoreData = this.calculateScore(lead);
        scoredLeads.push({
          ...lead,
          score: scoreData.totalScore,
          tier: scoreData.tier,
          component_scores: scoreData.componentScores,
          recommendations: scoreData.recommendations,
          scored_at: scoreData.calculatedAt
        });
      } catch (error) {
        logger.error(`Error scoring lead ${lead.company_name}:`, error);
        scoredLeads.push({ ...lead, score: 0, tier: 'Error' });
      }
    }

    // Sort by score descending
    scoredLeads.sort((a, b) => b.score - a.score);

    logger.info(`Completed scoring. Average score: ${this.calculateAverageScore(scoredLeads)}`);
    return scoredLeads;
  }

  /**
   * Calculate average score
   */
  calculateAverageScore(scoredLeads) {
    if (scoredLeads.length === 0) return 0;
    const total = scoredLeads.reduce((sum, lead) => sum + (lead.score || 0), 0);
    return Math.round(total / scoredLeads.length);
  }

  /**
   * Export scoring report
   */
  generateScoringReport(scoredLeads) {
    const report = {
      totalLeads: scoredLeads.length,
      averageScore: this.calculateAverageScore(scoredLeads),
      tierDistribution: {
        hotLeads: scoredLeads.filter(l => l.tier === 'Hot Lead').length,
        warmLeads: scoredLeads.filter(l => l.tier === 'Warm Lead').length,
        coldLeads: scoredLeads.filter(l => l.tier === 'Cold Lead').length,
        lowPriority: scoredLeads.filter(l => l.tier === 'Low Priority').length
      },
      topOpportunities: scoredLeads.slice(0, 10).map(l => ({
        name: l.company_name,
        score: l.score,
        tier: l.tier,
        topRecommendations: l.recommendations?.slice(0, 3) || []
      })),
      generatedAt: new Date().toISOString()
    };

    return report;
  }
}

module.exports = LeadScorer;
