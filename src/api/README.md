# API Directory

This directory contains API routes, controllers, and middleware for the lead generation system.

## API Structure

```
api/
├── routes/
│   ├── leads.js        # Lead management routes
│   ├── campaigns.js    # Campaign routes
│   └── analytics.js    # Analytics routes
├── controllers/
│   ├── leadController.js
│   ├── campaignController.js
│   └── analyticsController.js
└── middleware/
    ├── auth.js         # JWT authentication
    ├── validation.js   # Request validation
    └── rateLimiter.js  # Rate limiting
```

## Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Leads
- `GET /api/leads` - List all leads
- `GET /api/leads/:id` - Get lead details
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `GET /api/leads/search` - Search leads

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id/stats` - Campaign statistics

## Example Request

```javascript
// Create a new lead
POST /api/leads
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "company": "Acme Corp",
  "industry": "healthcare",
  "size": "medium"
}
```
