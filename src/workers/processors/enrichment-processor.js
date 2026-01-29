/**
 * Enrichment Job Processor
 * Handles lead data enrichment from external APIs
 */

const axios = require('axios');
const logger = require('../../utils/logger');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Process enrichment job
 */
async function process(job) {
  const { leadId, enrichmentType } = job.data;

  logger.info(`Processing enrichment for lead ${leadId}`);

  try {
    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    let enrichedData = {};

    // Perform enrichment based on type
    switch (enrichmentType) {
      case 'email':
        enrichedData = await enrichEmail(lead);
        break;
      case 'social':
        enrichedData = await enrichSocial(lead);
        break;
      case 'company':
        enrichedData = await enrichCompanyData(lead);
        break;
      default:
        enrichedData = await enrichAll(lead);
    }

    // Update lead with enriched data
    await updateLeadWithEnrichment(leadId, enrichedData);

    logger.info(`Lead ${leadId} enrichment completed`);

    return {
      success: true,
      leadId,
      enrichedFields: Object.keys(enrichedData)
    };

  } catch (error) {
    logger.error(`Enrichment failed for lead ${leadId}:`, error);
    throw error;
  }
}

/**
 * Enrich email data using Hunter.io or similar
 */
async function enrichEmail(lead) {
  if (!process.env.HUNTER_API_KEY || lead.email) {
    return {};
  }

  try {
    const domain = lead.website?.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
    if (!domain) return {};

    const response = await axios.get('https://api.hunter.io/v2/email-finder', {
      params: {
        domain,
        company: lead.company_name,
        api_key: process.env.HUNTER_API_KEY
      },
      timeout: 10000
    });

    if (response.data?.data?.email) {
      return {
        email: response.data.data.email,
        email_confidence: response.data.data.score
      };
    }
  } catch (error) {
    logger.debug('Email enrichment failed:', error.message);
  }

  return {};
}

/**
 * Enrich social media presence
 */
async function enrichSocial(lead) {
  const socialPresence = {};

  try {
    const companyName = lead.company_name;
    const domain = lead.website?.replace(/https?:\/\/(www\.)?/, '').split('/')[0];

    // Check Facebook
    socialPresence.facebook = await checkSocialPlatform('facebook', companyName);
    
    // Check Instagram
    socialPresence.instagram = await checkSocialPlatform('instagram', companyName);
    
    // Check LinkedIn
    socialPresence.linkedin = await checkSocialPlatform('linkedin', companyName);

    return { social_presence: socialPresence };

  } catch (error) {
    logger.debug('Social enrichment failed:', error.message);
    return {};
  }
}

/**
 * Check if company has presence on social platform
 */
async function checkSocialPlatform(platform, companyName) {
  try {
    const searchQuery = encodeURIComponent(companyName);
    const urls = {
      facebook: `https://www.facebook.com/search/pages/?q=${searchQuery}`,
      instagram: `https://www.instagram.com/${companyName.toLowerCase().replace(/\s+/g, '')}/`,
      linkedin: `https://www.linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`
    };

    // Simple check - in production, use official APIs
    const response = await axios.head(urls[platform], {
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });

    return {
      hasProfile: true,
      url: urls[platform]
    };

  } catch (error) {
    return {
      hasProfile: false
    };
  }
}

/**
 * Enrich company data using Clearbit or similar
 */
async function enrichCompanyData(lead) {
  if (!process.env.CLEARBIT_API_KEY) {
    return {};
  }

  try {
    const domain = lead.website?.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
    if (!domain) return {};

    const response = await axios.get(`https://company.clearbit.com/v2/companies/find`, {
      params: { domain },
      headers: {
        Authorization: `Bearer ${process.env.CLEARBIT_API_KEY}`
      },
      timeout: 10000
    });

    const data = response.data;
    
    return {
      employee_count: data.metrics?.employees,
      estimated_revenue: data.metrics?.estimatedAnnualRevenue,
      industry_tags: data.tags,
      tech_stack: data.tech,
      company_description: data.description,
      founded_year: data.foundedYear
    };

  } catch (error) {
    logger.debug('Company enrichment failed:', error.message);
    return {};
  }
}

/**
 * Perform all enrichment types
 */
async function enrichAll(lead) {
  const [emailData, socialData, companyData] = await Promise.allSettled([
    enrichEmail(lead),
    enrichSocial(lead),
    enrichCompanyData(lead)
  ]);

  return {
    ...(emailData.status === 'fulfilled' ? emailData.value : {}),
    ...(socialData.status === 'fulfilled' ? socialData.value : {}),
    ...(companyData.status === 'fulfilled' ? companyData.value : {})
  };
}

/**
 * Update lead with enriched data
 */
async function updateLeadWithEnrichment(leadId, enrichedData) {
  if (Object.keys(enrichedData).length === 0) {
    return;
  }

  try {
    const { error } = await supabase
      .from('leads')
      .update({
        ...enrichedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      logger.error('Failed to update lead with enrichment:', error);
    }
  } catch (error) {
    logger.error('Error updating lead with enrichment:', error);
  }
}

module.exports = { process };
