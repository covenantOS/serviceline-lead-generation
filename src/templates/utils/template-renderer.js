/**
 * Email Template Renderer
 * Renders Handlebars templates with provided variables
 */

const Handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

// Register custom Handlebars helpers
Handlebars.registerHelper('default', function(value, defaultValue) {
  return value || defaultValue;
});

Handlebars.registerHelper('currency', function(value) {
  return '$' + parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
});

Handlebars.registerHelper('percentage', function(value) {
  return parseFloat(value).toFixed(1) + '%';
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

Handlebars.registerHelper('formatDate', function(date, format) {
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
});

class TemplateRenderer {
  constructor() {
    this.templateCache = new Map();
  }

  /**
   * Load and compile a template
   * @param {string} templatePath - Relative path to template from templates directory
   * @returns {Function} Compiled Handlebars template
   */
  async loadTemplate(templatePath) {
    // Check cache first
    if (this.templateCache.has(templatePath)) {
      return this.templateCache.get(templatePath);
    }

    try {
      const fullPath = path.join(__dirname, '..', templatePath);
      const templateContent = await fs.readFile(fullPath, 'utf-8');
      const compiled = Handlebars.compile(templateContent);
      
      // Cache the compiled template
      this.templateCache.set(templatePath, compiled);
      
      return compiled;
    } catch (error) {
      logger.error(`Failed to load template: ${templatePath}`, error);
      throw new Error(`Template not found: ${templatePath}`);
    }
  }

  /**
   * Render a template with variables
   * @param {string} templatePath - Path to template (e.g., 'hvac/intro-email.hbs')
   * @param {Object} variables - Variables to pass to template
   * @returns {Object} Rendered email with subject and body
   */
  async render(templatePath, variables = {}) {
    try {
      const template = await this.loadTemplate(templatePath);
      const rendered = template(variables);
      
      // Split subject from body (subject is first line)
      const lines = rendered.split('\n');
      const subjectLine = lines[0];
      const subject = subjectLine.replace('Subject: ', '').trim();
      const body = lines.slice(2).join('\n').trim(); // Skip subject and blank line
      
      return {
        subject,
        body,
        rendered: rendered
      };
    } catch (error) {
      logger.error(`Failed to render template: ${templatePath}`, error);
      throw error;
    }
  }

  /**
   * Get available templates by industry
   * @param {string} industry - Industry name (hvac, plumbing, roofing)
   * @returns {Array} List of available template names
   */
  async getTemplatesByIndustry(industry) {
    try {
      const industryPath = path.join(__dirname, '..', industry.toLowerCase());
      const files = await fs.readdir(industryPath);
      return files.filter(f => f.endsWith('.hbs')).map(f => f.replace('.hbs', ''));
    } catch (error) {
      logger.error(`Failed to get templates for industry: ${industry}`, error);
      return [];
    }
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache() {
    this.templateCache.clear();
    logger.info('Template cache cleared');
  }

  /**
   * Preview template with sample data
   * @param {string} templatePath - Path to template
   * @param {string} industry - Industry for sample data
   * @returns {Object} Rendered template with sample data
   */
  async preview(templatePath, industry) {
    const sampleData = this.getSampleData(industry);
    return await this.render(templatePath, sampleData);
  }

  /**
   * Get sample data for template preview
   * @param {string} industry - Industry name
   * @returns {Object} Sample variables
   */
  getSampleData(industry) {
    const baseData = {
      firstName: 'John',
      lastName: 'Smith',
      companyName: `${industry === 'hvac' ? 'Comfort Pro' : industry === 'plumbing' ? 'Quick Flow' : 'Reliable Roofing'} Services`,
      city: 'Phoenix',
      state: 'AZ',
      senderName: 'Sarah Johnson',
      senderTitle: 'Senior Marketing Consultant',
      senderPhone: '(555) 123-4567',
      senderEmail: 'sarah@serviceline.com',
      suggestedDay1: 'Tuesday afternoon',
      suggestedDay2: 'Thursday morning',
      exampleCompany: 'Desert HVAC Solutions',
      exampleCity: 'Tempe',
      currentMonthlyCost: '2,400',
      projectedMonthlyCost: '1,100',
      projectedMonthlyCostHigh: '1,500',
      monthlySavings: '1,300',
      totalAnnualSavings: '15,600',
      estimatedAdManagementFee: '600',
      adManagementSavings: '600',
      leadIncrease: '85-150',
      guaranteedKeywords: '5',
      avgJobValue: '3,500',
      estimatedMonthlyCalls: '45-60',
      reviewCount: '47',
      technicalIssues: '23'
    };

    // Industry-specific additions
    if (industry === 'hvac') {
      return {
        ...baseData,
        topKeyword1: 'emergency AC repair Phoenix',
        topKeyword2: 'HVAC installation Phoenix',
        topKeyword3: 'AC repair near me',
        estimatedMonthlySearches: '1,240'
      };
    } else if (industry === 'plumbing') {
      return {
        ...baseData,
        emergencyRanking: '3',
        waterHeaterRanking: '4',
        drainRanking: '2',
        estimatedEmergencySearches: '890',
        estimatedWaterHeaterSearches: '640',
        estimatedDrainSearches: '420'
      };
    } else if (industry === 'roofing') {
      return {
        ...baseData,
        replacementRanking: '3',
        stormRanking: '4',
        metalRanking: '5',
        estimatedReplacementSearches: '720',
        estimatedStormSearches: '890',
        estimatedInsuranceSearches: '340',
        estimatedMetalSearches: '280',
        avgJobValue: '12,500',
        stormSeasonTiming: 'approaching in 8 weeks',
        stormSeasonMonth: 'Spring',
        stormSeasonWeeks: '8'
      };
    }

    return baseData;
  }
}

module.exports = new TemplateRenderer();
