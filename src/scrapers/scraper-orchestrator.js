/**
 * Scraper Orchestrator
 * Manages scraping campaigns across multiple industries and locations
 */

const HomeServiceScraper = require('./home-service-scraper');
const LeadScorer = require('../scoring/lead-scorer');
const { updateLeadScore, getUnscoredLeads } = require('../database/supabase-client');
const logger = require('../utils/logger');
const cron = require('node-cron');

class ScraperOrchestrator {
  constructor() {
    this.scraper = null;
    this.scorer = new LeadScorer();
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Run full scraping and scoring campaign
   */
  async runCampaign(options = {}) {
    if (this.isRunning) {
      logger.warn('Campaign already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting lead generation campaign...');

    try {
      const {
        industries = ['HVAC', 'PLUMBING', 'ROOFING', 'ELECTRICAL'],
        locations = ['United States'],
        maxLeadsPerIndustry = 50
      } = options;

      const results = {
        totalLeads: 0,
        totalScored: 0,
        industries: {},
        startTime: new Date().toISOString(),
        errors: []
      };

      // Process each industry
      for (const industry of industries) {
        logger.info(`Processing ${industry}...`);
        
        try {
          // Scrape leads
          this.scraper = new HomeServiceScraper({ maxResults: maxLeadsPerIndustry });
          const leads = await this.scraper.scrapeAllSources(industry, locations[0]);
          
          results.totalLeads += leads.length;
          results.industries[industry] = {
            leadsFound: leads.length,
            leadsScored: 0
          };

          // Score leads
          if (leads.length > 0) {
            const scoredLeads = await this.scorer.scoreLeads(leads);
            results.industries[industry].leadsScored = scoredLeads.length;
            results.totalScored += scoredLeads.length;

            // Update scores in database
            await this.updateLeadScores(scoredLeads);
          }

          // Cleanup and wait between industries
          await this.scraper.cleanup();
          await this.sleep(5000);

        } catch (error) {
          logger.error(`Error processing ${industry}:`, error);
          results.errors.push({ industry, error: error.message });
        }
      }

      results.endTime = new Date().toISOString();
      results.duration = this.calculateDuration(results.startTime, results.endTime);

      logger.info('Campaign completed:', results);
      return results;

    } catch (error) {
      logger.error('Campaign error:', error);
      throw error;
    } finally {
      this.isRunning = false;
      if (this.scraper) {
        await this.scraper.cleanup();
      }
    }
  }

  /**
   * Score existing unscored leads
   */
  async scoreExistingLeads() {
    logger.info('Scoring existing unscored leads...');

    try {
      const unscoredLeads = await getUnscoredLeads();
      logger.info(`Found ${unscoredLeads.length} unscored leads`);

      if (unscoredLeads.length === 0) {
        return { scored: 0, message: 'No unscored leads found' };
      }

      const scoredLeads = await this.scorer.scoreLeads(unscoredLeads);
      await this.updateLeadScores(scoredLeads);

      logger.info(`Successfully scored ${scoredLeads.length} leads`);
      return { scored: scoredLeads.length };

    } catch (error) {
      logger.error('Error scoring existing leads:', error);
      throw error;
    }
  }

  /**
   * Update lead scores in database
   */
  async updateLeadScores(scoredLeads) {
    logger.info(`Updating scores for ${scoredLeads.length} leads...`);
    let updated = 0;

    for (const lead of scoredLeads) {
      try {
        await updateLeadScore(lead.id, {
          totalScore: lead.score,
          tier: lead.tier,
          componentScores: lead.component_scores,
          recommendations: lead.recommendations,
          calculatedAt: lead.scored_at
        });
        updated++;
      } catch (error) {
        logger.error(`Error updating score for lead ${lead.id}:`, error);
      }
    }

    logger.info(`Updated ${updated}/${scoredLeads.length} lead scores`);
    return updated;
  }

  /**
   * Schedule recurring campaigns
   */
  scheduleCampaign(cronExpression = '0 2 * * *') {
    if (this.cronJob) {
      logger.warn('Cron job already scheduled');
      return;
    }

    logger.info(`Scheduling campaign with cron: ${cronExpression}`);
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      logger.info('Running scheduled campaign...');
      try {
        await this.runCampaign();
      } catch (error) {
        logger.error('Scheduled campaign error:', error);
      }
    });

    logger.info('Campaign scheduled successfully');
  }

  /**
   * Stop scheduled campaigns
   */
  stopSchedule() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Scheduled campaign stopped');
    }
  }

  /**
   * Helper: Calculate duration
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Helper: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ScraperOrchestrator;
