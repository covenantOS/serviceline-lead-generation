-- ServiceLine Lead Generation System
-- Supabase Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Company information
  company_name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Address
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  location VARCHAR(255),
  
  -- Business details
  industry VARCHAR(100),
  estimated_size VARCHAR(50) CHECK (estimated_size IN ('Small', 'Medium', 'Large', 'Unknown')),
  years_in_business INTEGER,
  
  -- Ratings and reviews
  rating DECIMAL(3,2),
  review_count INTEGER,
  review_response_rate INTEGER,
  
  -- SEO & Marketing data
  seo_score INTEGER,
  domain_authority INTEGER,
  has_google_ads BOOLEAN DEFAULT false,
  has_facebook_ads BOOLEAN DEFAULT false,
  has_yelp_ads BOOLEAN DEFAULT false,
  organic_keywords INTEGER,
  backlinks_count INTEGER,
  
  -- Website quality
  website_quality JSONB,
  seo_data JSONB,
  ad_presence JSONB,
  social_presence JSONB,
  
  -- Lead scoring
  lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100),
  tier VARCHAR(50),
  component_scores JSONB,
  recommendations JSONB,
  scored_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  data_source VARCHAR(100),
  source_url VARCHAR(500),
  scraped_at TIMESTAMP WITH TIME ZONE,
  
  -- Lead management
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  assigned_to UUID REFERENCES users(id),
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'email' CHECK (type IN ('email', 'sms', 'direct_mail')),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
  
  -- Campaign configuration
  template_id VARCHAR(255),
  target_industries VARCHAR(100)[],
  target_tiers VARCHAR(50)[],
  min_score INTEGER,
  
  -- Scheduling
  schedule_date TIMESTAMP WITH TIME ZONE,
  
  -- Description
  description TEXT,
  
  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- Message content
  template_id VARCHAR(255),
  subject VARCHAR(500),
  body TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,
  
  -- Tracking
  message_id VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- User tracking
  sent_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scraping jobs table
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Job configuration
  industries VARCHAR(100)[],
  locations VARCHAR(255)[],
  max_leads_per_industry INTEGER,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Results
  results JSONB,
  error_message TEXT,
  
  -- Timing
  started_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Lead notes table (for activity tracking)
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Full-text search index for leads
CREATE INDEX IF NOT EXISTS idx_leads_search ON leads 
USING gin(to_tsvector('english', coalesce(company_name, '') || ' ' || coalesce(location, '') || ' ' || coalesce(industry, '')));

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- Users policies (admin can see all, users can see themselves)
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (auth.uid() = id OR auth.jwt()->>'role' = 'admin');

CREATE POLICY users_update_policy ON users
  FOR UPDATE
  USING (auth.uid() = id OR auth.jwt()->>'role' = 'admin');

-- Leads policies (all authenticated users can read, admin/user can write)
CREATE POLICY leads_select_policy ON leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY leads_insert_policy ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' IN ('admin', 'user'));

CREATE POLICY leads_update_policy ON leads
  FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'role' IN ('admin', 'user'));

CREATE POLICY leads_delete_policy ON leads
  FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

-- Campaigns policies
CREATE POLICY campaigns_select_policy ON campaigns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY campaigns_insert_policy ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' IN ('admin', 'user'));

CREATE POLICY campaigns_update_policy ON campaigns
  FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'role' IN ('admin', 'user'));

CREATE POLICY campaigns_delete_policy ON campaigns
  FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

-- Messages policies
CREATE POLICY messages_select_policy ON messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY messages_insert_policy ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' IN ('admin', 'user'));

-- Scraping jobs policies
CREATE POLICY scraping_jobs_select_policy ON scraping_jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY scraping_jobs_insert_policy ON scraping_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' IN ('admin', 'user'));

-- Lead notes policies
CREATE POLICY lead_notes_select_policy ON lead_notes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY lead_notes_insert_policy ON lead_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Seed data: Create default admin user
-- Note: Change password before deploying!
INSERT INTO users (email, password, name, role, is_active)
VALUES (
  'admin@serviceline.com',
  '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'Admin User',
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE leads IS 'Business leads with scoring and tracking';
COMMENT ON TABLE campaigns IS 'Email/SMS campaigns for lead outreach';
COMMENT ON TABLE messages IS 'Individual messages sent to leads';
COMMENT ON TABLE scraping_jobs IS 'Web scraping job tracking';
COMMENT ON TABLE lead_notes IS 'Activity notes and comments on leads';

COMMENT ON COLUMN leads.lead_score IS 'Calculated lead quality score (0-100)';
COMMENT ON COLUMN leads.tier IS 'Lead quality tier: Hot Lead, Warm Lead, Cold Lead, Low Priority';
COMMENT ON COLUMN leads.component_scores IS 'JSON breakdown of scoring components';
COMMENT ON COLUMN leads.recommendations IS 'JSON array of recommended services for this lead';
