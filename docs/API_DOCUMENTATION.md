# ServiceLine Lead Generation API Documentation

## Overview

RESTful API for managing leads, campaigns, messages, and scraping operations for the ServiceLine lead generation system.

**Base URL**: `http://localhost:3000/api`

**Authentication**: JWT Bearer Token

## Authentication

### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Change Password

```http
POST /api/auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

## Lead Management

### List Leads

```http
GET /api/leads?industry=HVAC&status=new&minScore=60&limit=50&offset=0
Authorization: Bearer {accessToken}
```

**Query Parameters**:
- `industry` (optional): HVAC, PLUMBING, ROOFING, ELECTRICAL
- `status` (optional): new, contacted, qualified, converted, lost
- `location` (optional): Filter by location
- `minScore` (optional): Minimum lead score (0-100)
- `maxScore` (optional): Maximum lead score (0-100)
- `tier` (optional): Hot Lead, Warm Lead, Cold Lead, Low Priority
- `search` (optional): Search company names
- `limit` (optional): Results per page (default: 50, max: 100)
- `offset` (optional): Pagination offset
- `sortBy` (optional): created_at, lead_score, company_name
- `sortOrder` (optional): asc, desc

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "company_name": "ABC HVAC Services",
      "email": "contact@abchvac.com",
      "phone": "555-1234",
      "website": "https://abchvac.com",
      "industry": "HVAC",
      "lead_score": 87,
      "tier": "Hot Lead",
      "status": "new",
      "location": "Phoenix, AZ",
      "created_at": "2026-01-29T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 247,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Lead by ID

```http
GET /api/leads/{id}
Authorization: Bearer {accessToken}
```

### Create Lead

```http
POST /api/leads
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "company_name": "XYZ Plumbing",
  "email": "info@xyzplumbing.com",
  "phone": "555-5678",
  "website": "https://xyzplumbing.com",
  "address": "123 Main St",
  "city": "Denver",
  "state": "CO",
  "zip_code": "80201",
  "industry": "PLUMBING",
  "estimated_size": "Medium",
  "rating": 4.5,
  "review_count": 45
}
```

### Update Lead

```http
PUT /api/leads/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "contacted",
  "phone": "555-9999"
}
```

### Delete Lead

```http
DELETE /api/leads/{id}
Authorization: Bearer {accessToken}
```

**Note**: Requires admin role

### Bulk Import Leads

```http
POST /api/leads/bulk/import
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "leads": [
    {
      "company_name": "Lead 1",
      "industry": "HVAC",
      "city": "Phoenix"
    },
    {
      "company_name": "Lead 2",
      "industry": "ROOFING",
      "city": "Dallas"
    }
  ]
}
```

**Limits**: 1-1000 leads per request

### Export Leads

```http
GET /api/leads/export/csv?industry=HVAC&minScore=60
Authorization: Bearer {accessToken}
```

**Response**: CSV file download

## Campaign Management

### List Campaigns

```http
GET /api/campaigns?status=active&limit=50&offset=0
Authorization: Bearer {accessToken}
```

### Get Campaign

```http
GET /api/campaigns/{id}
Authorization: Bearer {accessToken}
```

### Create Campaign

```http
POST /api/campaigns
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Q1 HVAC Outreach",
  "type": "email",
  "template_id": "hvac/intro-email.hbs",
  "target_industries": ["HVAC"],
  "target_tiers": ["Hot Lead", "Warm Lead"],
  "min_score": 60,
  "description": "Initial outreach to high-scoring HVAC leads"
}
```

### Update Campaign

```http
PUT /api/campaigns/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "active"
}
```

### Delete Campaign

```http
DELETE /api/campaigns/{id}
Authorization: Bearer {accessToken}
```

### Get Campaign Statistics

```http
GET /api/campaigns/{id}/stats
Authorization: Bearer {accessToken}
```

**Response**:
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Q1 HVAC Outreach",
    "status": "active"
  },
  "stats": {
    "totalSent": 150,
    "delivered": 148,
    "failed": 2,
    "opened": 89,
    "clicked": 34,
    "openRate": "60.14",
    "clickRate": "22.97"
  }
}
```

## Messaging

### List Messages

```http
GET /api/messages?campaignId={uuid}&status=sent&limit=50
Authorization: Bearer {accessToken}
```

### Send Message

```http
POST /api/messages/send
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "leadId": "uuid",
  "campaignId": "uuid",
  "templateId": "hvac/intro-email.hbs",
  "variables": {
    "firstName": "John",
    "senderName": "Sarah Johnson",
    "senderTitle": "Marketing Consultant",
    "senderPhone": "555-1234",
    "senderEmail": "sarah@serviceline.com"
  }
}
```

### List Email Templates

```http
GET /api/messages/templates?industry=hvac
Authorization: Bearer {accessToken}
```

### Preview Template

```http
GET /api/messages/templates/{templateId}/preview?industry=hvac
Authorization: Bearer {accessToken}
```

## Analytics

### Lead Statistics

```http
GET /api/analytics/leads?startDate=2026-01-01&endDate=2026-01-31
Authorization: Bearer {accessToken}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 487,
    "byIndustry": {
      "HVAC": 145,
      "PLUMBING": 162,
      "ROOFING": 98,
      "ELECTRICAL": 82
    },
    "byStatus": {
      "new": 321,
      "contacted": 98,
      "qualified": 45,
      "converted": 23
    },
    "byTier": {
      "Hot Lead": 156,
      "Warm Lead": 203,
      "Cold Lead": 98,
      "Low Priority": 30
    },
    "averageScore": 67
  }
}
```

### Scoring Distribution

```http
GET /api/analytics/scoring
Authorization: Bearer {accessToken}
```

### Campaign Performance

```http
GET /api/analytics/campaigns
Authorization: Bearer {accessToken}
```

### Dashboard Overview

```http
GET /api/analytics/dashboard
Authorization: Bearer {accessToken}
```

## Scraping Operations

### Start Scraping Job

```http
POST /api/scraping/start
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "industries": ["HVAC", "PLUMBING"],
  "locations": ["Phoenix, AZ", "Denver, CO"],
  "maxLeadsPerIndustry": 50
}
```

**Response**:
```json
{
  "success": true,
  "message": "Scraping job started",
  "jobId": "uuid",
  "status": "pending"
}
```

**Rate Limit**: 10 jobs per hour

### Get Scraping Status

```http
GET /api/scraping/status/{jobId}
Authorization: Bearer {accessToken}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "industries": ["HVAC", "PLUMBING"],
    "results": {
      "totalLeads": 87,
      "totalScored": 87,
      "industries": {
        "HVAC": { "leadsFound": 45, "leadsScored": 45 },
        "PLUMBING": { "leadsFound": 42, "leadsScored": 42 }
      }
    },
    "started_at": "2026-01-29T10:00:00Z",
    "completed_at": "2026-01-29T10:15:32Z"
  }
}
```

### List Scraping Jobs

```http
GET /api/scraping/jobs?status=completed&limit=50
Authorization: Bearer {accessToken}
```

### Cancel Scraping Job

```http
POST /api/scraping/cancel/{jobId}
Authorization: Bearer {accessToken}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "body.email",
      "message": "Please provide a valid email address",
      "type": "string.email"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "Authentication required",
  "message": "No token provided"
}
```

### 403 Forbidden

```json
{
  "error": "Insufficient permissions",
  "message": "Required role: admin or user",
  "userRole": "viewer"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Lead not found"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too many requests",
  "message": "Please try again later",
  "retryAfter": 900
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Rate Limits

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 login attempts per 15 minutes per IP
- **Scraping**: 10 jobs per hour per user
- **Bulk Operations**: 20 operations per hour per user

## Roles and Permissions

### Admin
- Full access to all endpoints
- Can delete resources
- Can manage users (if user management endpoints are added)

### User
- Can create, read, and update leads
- Can create and manage campaigns
- Can send messages
- Can trigger scraping jobs
- Cannot delete resources

### Viewer
- Read-only access
- Can view leads, campaigns, messages
- Can view analytics
- Cannot modify or create resources

## Best Practices

1. **Always use HTTPS in production**
2. **Store tokens securely** (not in localStorage for sensitive apps)
3. **Refresh tokens before expiry** (access tokens expire in 7 days)
4. **Implement exponential backoff** for rate-limited requests
5. **Use pagination** for large datasets
6. **Filter and sort** on the server side
7. **Validate input** on client side before sending
8. **Handle errors gracefully**

## Support

For API support, contact: support@serviceline.com
