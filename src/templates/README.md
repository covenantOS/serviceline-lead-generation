# Templates Directory

This directory contains email templates for lead outreach campaigns.

## Template Format

Templates use Handlebars syntax for variable interpolation:

```handlebars
Subject: {{subject}}

Hi {{firstName}},

I noticed that {{companyName}} is {{relevantInfo}}.

Best regards,
{{senderName}}
```

## Available Templates

- `intro-email.hbs` - Initial outreach
- `follow-up-1.hbs` - First follow-up (3 days)
- `follow-up-2.hbs` - Second follow-up (7 days)
- `case-study.hbs` - Case study sharing
- `demo-request.hbs` - Demo invitation

## Variables

Common variables available in all templates:

- `firstName` - Contact's first name
- `lastName` - Contact's last name
- `companyName` - Company name
- `industry` - Industry
- `senderName` - Your name
- `senderTitle` - Your title
- `companyUrl` - Company website

## Usage Example

```javascript
const emailSender = require('./email-sender');

await emailSender.sendTemplate('intro-email', {
  to: 'lead@company.com',
  variables: {
    firstName: 'John',
    companyName: 'Acme Corp',
    relevantInfo: 'growing rapidly in the healthcare space'
  }
});
```
