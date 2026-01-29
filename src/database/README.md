# Database Module

This module handles all database operations for the ServiceLine lead generation system using Supabase.

## Files

- `supabase-client.js` - Supabase client initialization and connection management
- `lead-repository.js` - CRUD operations for leads table

## Supabase Setup

### Environment Variables

Add these to your `config/.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

### Database Schema

The `leads` table should have the following structure:

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  location TEXT,
  industry TEXT,
  estimated_size TEXT,
  rating DECIMAL,
  review_count INTEGER,
  years_in_business INTEGER,
  
  -- SEO & Marketing
  seo_score INTEGER,
  domain_authority INTEGER,
  has_google_ads BOOLEAN DEFAULT false,
  has_facebook_ads BOOLEAN DEFAULT false,
  organic_keywords INTEGER,
  backlinks_count INTEGER,
  
  -- Metadata
  data_source TEXT,
  source_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE,
  
  -- Lead Management
  status TEXT DEFAULT 'new',
  lead_score INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_company_name ON leads(company_name);
CREATE INDEX idx_leads_location ON leads(location);
CREATE INDEX idx_leads_industry ON leads(industry);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_lead_score ON leads(lead_score);
```

## Usage Examples

### Save a Lead

```javascript
const { saveLeadToDatabase } = require('./lead-repository');

const lead = {
  company_name: 'ABC Plumbing',
  website: 'https://abcplumbing.com',
  phone: '555-1234',
  city: 'New York',
  state: 'NY',
  industry: 'plumbing',
  status: 'new'
};

const savedLead = await saveLeadToDatabase(lead);
```

### Get Leads with Filters

```javascript
const { getLeads } = require('./lead-repository');

const results = await getLeads(
  { industry: 'hvac', status: 'new' },
  { limit: 50, offset: 0 }
);

console.log(results.leads);
console.log(`Total: ${results.total}`);
```

### Get Lead Statistics

```javascript
const { getLeadStats } = require('./lead-repository');

const stats = await getLeadStats();
console.log(stats);
```

## Error Handling

All repository functions include try-catch blocks and log errors using Winston. Make sure to handle errors in your calling code:

```javascript
try {
  const lead = await getLeadById(id);
} catch (error) {
  console.error('Failed to fetch lead:', error);
}
```
