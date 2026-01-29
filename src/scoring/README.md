# Scoring Directory

This directory contains lead scoring algorithms and related utilities.

## Scoring Criteria

Leads are scored based on multiple factors:

1. **Company Size** (0-30 points)
   - Small: 10 points
   - Medium: 20 points
   - Large: 30 points

2. **Industry Relevance** (0-20 points)
   - High priority industries: 20 points
   - Medium priority: 10 points
   - Low priority: 5 points

3. **Engagement Level** (0-25 points)
   - Website visits, email opens, link clicks

4. **Budget Indicators** (0-15 points)
   - Funding rounds, revenue estimates

5. **Decision Maker Access** (0-10 points)
   - Contact level (C-suite, VP, Manager)

## Usage Example

```javascript
const leadScorer = require('./lead-scorer');

const score = leadScorer.calculateScore({
  companySize: 'medium',
  industry: 'healthcare',
  engagement: { visits: 5, opens: 3 },
  budget: 'high',
  contactLevel: 'C-suite'
});

console.log(`Lead Score: ${score}/100`);
```
