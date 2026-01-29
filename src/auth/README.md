# Authentication Directory

This directory contains authentication and authorization logic.

## Components

- `jwt.js` - JWT token generation and verification
- `middleware.js` - Authentication middleware
- `password.js` - Password hashing utilities
- `routes.js` - Auth routes (login, register, refresh)

## Authentication Flow

1. User registers or logs in
2. Server generates JWT token with user payload
3. Client stores token (localStorage/cookie)
4. Client includes token in Authorization header for protected routes
5. Server validates token on each request

## JWT Payload

```javascript
{
  "userId": "123",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Usage Example

```javascript
const authMiddleware = require('./middleware');

// Protect a route
app.get('/api/leads', authMiddleware.requireAuth, (req, res) => {
  // req.user contains decoded JWT payload
  const leads = getLeads(req.user.userId);
  res.json(leads);
});
```

## Security Best Practices

1. Use strong JWT secrets (min 32 characters)
2. Set appropriate token expiry times
3. Implement token refresh mechanism
4. Hash passwords with bcrypt (min 10 rounds)
5. Implement rate limiting on auth endpoints
6. Use HTTPS in production
7. Validate all inputs
