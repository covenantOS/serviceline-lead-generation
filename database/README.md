# Database Setup Guide

## Supabase Configuration

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon/service keys

### 2. Run Database Schema

1. Open Supabase SQL Editor
2. Copy and paste the contents of `schema.sql`
3. Execute the SQL

### 3. Update Environment Variables

Add to `config/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

### 4. Create Admin User

Generate a bcrypt password hash:

```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('your_secure_password', 10);
console.log(hash);
```

Then update the seed data in `schema.sql` with your hash:

```sql
INSERT INTO users (email, password, name, role, is_active)
VALUES (
  'admin@serviceline.com',
  '$2b$10$YOUR_HASH_HERE',
  'Admin User',
  'admin',
  true
);
```

## Database Schema Overview

### Tables

#### users
Stores system users with authentication data

**Columns**:
- `id` (UUID) - Primary key
- `email` (VARCHAR) - Unique email address
- `password` (VARCHAR) - Bcrypt hashed password
- `name` (VARCHAR) - User's full name
- `role` (VARCHAR) - admin, user, or viewer
- `is_active` (BOOLEAN) - Account status
- `last_login` (TIMESTAMP) - Last login time
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### leads
Business leads with comprehensive data

**Columns**:
- Company info: name, website, phone, email, address
- Business details: industry, size, years in business
- Ratings: rating, review_count, review_response_rate
- SEO/Marketing: seo_score, domain_authority, ad presence
- Website quality: JSONB field with quality metrics
- Lead scoring: lead_score (0-100), tier, component_scores
- Status tracking: status, assigned_to, notes

#### campaigns
Email/SMS marketing campaigns

**Columns**:
- `id` (UUID)
- `name` (VARCHAR)
- `type` (VARCHAR) - email, sms, direct_mail
- `status` (VARCHAR) - draft, scheduled, active, paused, completed
- `template_id` (VARCHAR) - Email template reference
- `target_industries` (ARRAY) - Targeted industries
- `target_tiers` (ARRAY) - Targeted lead tiers
- `min_score` (INTEGER) - Minimum lead score
- `schedule_date` (TIMESTAMP)

#### messages
Individual messages sent to leads

**Columns**:
- `id` (UUID)
- `lead_id` (UUID) - Foreign key to leads
- `campaign_id` (UUID) - Foreign key to campaigns
- `template_id` (VARCHAR)
- `subject` (VARCHAR)
- `body` (TEXT)
- `status` (VARCHAR) - pending, sent, delivered, failed, bounced
- Tracking: sent_at, delivered_at, opened_at, clicked_at

#### scraping_jobs
Web scraping job tracking

**Columns**:
- `id` (UUID)
- `industries` (ARRAY)
- `locations` (ARRAY)
- `max_leads_per_industry` (INTEGER)
- `status` (VARCHAR) - pending, running, completed, failed, cancelled
- `results` (JSONB) - Job results data
- Timing: started_at, completed_at

#### lead_notes
Activity notes on leads

**Columns**:
- `id` (UUID)
- `lead_id` (UUID)
- `user_id` (UUID)
- `note` (TEXT)
- `created_at` (TIMESTAMP)

### Indexes

- `idx_leads_company_name` - Fast company name lookups
- `idx_leads_industry` - Filter by industry
- `idx_leads_lead_score` - Sort by score (descending)
- `idx_leads_tier` - Filter by tier
- `idx_leads_search` - Full-text search (GIN index)
- Plus indexes on foreign keys and common filters

### Row Level Security (RLS)

Enabled on all tables with policies:

**Users**:
- Can select/update own record
- Admins can see all users

**Leads**:
- All authenticated users can read
- Admin/user can insert/update
- Only admin can delete

**Campaigns**:
- All authenticated users can read
- Admin/user can insert/update
- Only admin can delete

**Messages**:
- All authenticated users can read
- Admin/user can insert

**Scraping Jobs**:
- All authenticated users can read
- Admin/user can insert

**Lead Notes**:
- All authenticated users can read
- Users can insert their own notes

## Migrations

For production deployments, use Supabase migrations:

```bash
# Initialize migrations
supabase init

# Create a new migration
supabase migration new create_tables

# Apply migrations
supabase db push
```

## Backup

Supabase provides automatic backups. For manual backups:

1. Go to Supabase Dashboard → Database → Backups
2. Click "Download backup"

For CLI backup:

```bash
supabase db dump -f backup.sql
```

## Performance Optimization

### Query Optimization

1. Always use indexed columns in WHERE clauses
2. Limit result sets with LIMIT
3. Use pagination (OFFSET/LIMIT)
4. Avoid SELECT *; specify columns

### Connection Pooling

Supabase uses PgBouncer for connection pooling. Connection string:

```
postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres
```

### Monitoring

1. Check slow queries in Supabase Dashboard → Database → Query Performance
2. Monitor table sizes: Database → Tables
3. Review index usage

## Troubleshooting

### Connection Issues

**Error**: "Could not connect to database"

**Solution**:
1. Check SUPABASE_URL and SUPABASE_ANON_KEY in .env
2. Verify project is active in Supabase dashboard
3. Check firewall/network settings

### Authentication Errors

**Error**: "JWT token invalid"

**Solution**:
1. Ensure JWT_SECRET matches between app and Supabase
2. Check token expiration
3. Verify user exists and is active

### RLS Policy Issues

**Error**: "Permission denied for table"

**Solution**:
1. Check RLS policies are created
2. Verify user role is correct
3. Test with service key (bypasses RLS) to confirm issue

### Slow Queries

**Symptoms**: API responses taking >1s

**Solution**:
1. Check query plan: `EXPLAIN ANALYZE SELECT ...`
2. Add missing indexes
3. Reduce result set size
4. Use database views for complex queries

## Security Best Practices

1. **Never commit** real passwords or keys
2. Use **Row Level Security** for multi-tenant data
3. **Validate input** before database queries
4. Use **parameterized queries** (Supabase client does this)
5. **Rotate keys** regularly
6. **Enable SSL** for database connections (Supabase default)
7. **Backup regularly**
8. **Monitor** for suspicious activity

## Support

For database issues:
- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- PostgreSQL Documentation: https://www.postgresql.org/docs/
