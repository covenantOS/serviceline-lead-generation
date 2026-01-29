# Configuration Directory

This directory contains configuration files and environment variables for the ServiceLine lead generation system.

## Files

- `.env.example` - Template for environment variables (copy to `.env` and fill in your values)
- `.env` - Your actual environment variables (DO NOT commit this file)
- `scoring-config.json` - Lead scoring algorithm configuration
- `scraping-config.json` - Web scraping settings
- `email-config.json` - Email template and campaign settings

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual credentials and settings

3. Ensure `.env` is in `.gitignore` to prevent committing sensitive data

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique secrets for JWT_SECRET
- Rotate API keys regularly
- Use environment-specific configurations for dev/staging/production
