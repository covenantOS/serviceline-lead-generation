/**
 * Supabase Database Client
 * Handles connection and queries to Supabase PostgreSQL database
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

class SupabaseClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Supabase client
   */
  initialize() {
    if (this.client) return this.client;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false
        }
      });

      this.isConnected = true;
      logger.info('Supabase client initialized successfully');
      
      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  /**
   * Get client instance
   */
  getClient() {
    if (!this.client) {
      this.initialize();
    }
    return this.client;
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('leads')
        .select('count')
        .limit(1);

      if (error) throw error;

      logger.info('Supabase connection test successful');
      return true;
    } catch (error) {
      logger.error('Supabase connection test failed:', error);
      return false;
    }
  }

  /**
   * Execute health check
   */
  async healthCheck() {
    return {
      service: 'Supabase',
      connected: this.isConnected,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const supabaseClient = new SupabaseClient();
module.exports = supabaseClient;
