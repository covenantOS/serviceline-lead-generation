#!/usr/bin/env node
/**
 * Run Lead Scorer
 * Command-line script to score existing leads
 */

require('dotenv').config({ path: './config/.env' });
const LeadScorer = require('../src/scoring/lead-scorer');
const { getUnscoredLeads, getLeadsByTier } = require('../src/database/supabase-client');
const logger = require('../src/utils/logger');

async function main() {
  logger.info('='.repeat(60));
  logger.info('ServiceLine Lead Scorer');
  logger.info('='.repeat(60));

  const scorer = new LeadScorer();

  try {
    // Get unscored leads
    logger.info('Fetching unscored leads...');
    const unscoredLeads = await getUnscoredLeads();
    
    if (unscoredLeads.length === 0) {
      logger.info('No unscored leads found.');
      
      // Show distribution of existing scored leads
      logger.info('\nExisting Lead Distribution:');
      const hotLeads = await getLeadsByTier('Hot Lead');
      const warmLeads = await getLeadsByTier('Warm Lead');
      const coldLeads = await getLeadsByTier('Cold Lead');
      
      logger.info(`  Hot Leads: ${hotLeads.length}`);
      logger.info(`  Warm Leads: ${warmLeads.length}`);
      logger.info(`  Cold Leads: ${coldLeads.length}`);
      
      process.exit(0);
    }

    logger.info(`Found ${unscoredLeads.length} unscored leads`);
    logger.info('Starting scoring process...\n');

    // Score leads
    const scoredLeads = await scorer.scoreLeads(unscoredLeads);

    // Generate report
    const report = scorer.generateScoringReport(scoredLeads);

    logger.info('\n' + '='.repeat(60));
    logger.info('SCORING COMPLETE');
    logger.info('='.repeat(60));
    logger.info(`Total Leads Scored: ${report.totalLeads}`);
    logger.info(`Average Score: ${report.averageScore}/100`);
    logger.info('\nTier Distribution:');
    logger.info(`  Hot Leads: ${report.tierDistribution.hotLeads}`);
    logger.info(`  Warm Leads: ${report.tierDistribution.warmLeads}`);
    logger.info(`  Cold Leads: ${report.tierDistribution.coldLeads}`);
    logger.info(`  Low Priority: ${report.tierDistribution.lowPriority}`);

    logger.info('\nTop 10 Opportunities:');
    report.topOpportunities.forEach((lead, i) => {
      logger.info(`\n${i + 1}. ${lead.name} - Score: ${lead.score}/100 (${lead.tier})`);
      if (lead.topRecommendations.length > 0) {
        logger.info('   Top Recommendations:');
        lead.topRecommendations.forEach(rec => {
          logger.info(`   - [${rec.priority}] ${rec.recommendation}`);
        });
      }
    });

    logger.info('\n' + '='.repeat(60));
    process.exit(0);

  } catch (error) {
    logger.error('Scoring failed:', error);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run
main();
