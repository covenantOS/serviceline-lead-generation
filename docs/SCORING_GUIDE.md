# Lead Scoring Guide

## Overview

The ServiceLine lead scoring algorithm evaluates prospects on a **0-100 scale** where **higher scores indicate better opportunities** for ServiceLine's services.

## Scoring Philosophy

🎯 **Key Insight**: Companies with *poor* digital presence score *higher* because they need ServiceLine's services more!

- **High Score (80-100)**: Hot leads - significant digital marketing gaps
- **Medium Score (60-79)**: Warm leads - some opportunities for improvement  
- **Low Score (40-59)**: Cold leads - decent digital presence
- **Very Low (<40)**: Low priority - already optimized

## Scoring Components

### 1. Website Quality (25 points)

**Inverse scoring**: Poor websites = high scores

| Issue | Points | Description |
|-------|--------|-------------|
| No website | 100 | Perfect prospect! |
| No mobile optimization | 20 | Not responsive |
| No SSL | 15 | Missing https:// |
| Slow load (>3s) | 15 | Poor performance |
| No meta description | 10 | Missing SEO basics |
| Poor title tag | 10 | Title < 30 chars |
| No analytics | 10 | No tracking setup |
| No live chat | 10 | Missing lead capture |
| No Facebook pixel | 10 | No retargeting |

### 2. SEO Ranking (20 points)

Poor rankings = opportunity!

- **Not indexed**: 100 points
- **Ranking >50**: 40 points (invisible online)
- **Ranking 20-50**: 25 points
- **Ranking <20**: 10 points (already visible)
- **Few keywords (<50)**: +30 points
- **Some keywords (50-200)**: +20 points
- **Many keywords (>200)**: +10 points
- **Missing industry keywords**: +30 points

### 3. Ad Presence (15 points)

No advertising = opportunity!

- **No Google Ads**: 80 points
- **Low ad spend**: 40 points  
- **High ad spend**: 20 points
- **No Facebook Ads**: +10 points
- **No Yelp Ads**: +10 points

### 4. Review Score (15 points)

Poor reputation = needs management!

**Review Count**:
- **<10 reviews**: 40 points (invisible)
- **10-50 reviews**: 25 points
- **50-100 reviews**: 15 points
- **>100 reviews**: 5 points

**Rating**:
- **<3.0 stars**: 40 points (reputation crisis)
- **3.0-4.0 stars**: 30 points
- **4.0-4.5 stars**: 20 points
- **>4.5 stars**: 10 points

**Response Rate**:
- **<30%**: +20 points (not engaging)
- **30-60%**: +10 points

### 5. Social Presence (10 points)

Missing platforms = opportunity!

- **No social media at all**: 100 points
- **Missing each platform**: 15 points
- **Low engagement per platform**: 10 points
- **Active presence per platform**: 5 points

Platforms checked:
- Facebook
- Instagram  
- LinkedIn
- Twitter
- YouTube

### 6. Company Size (10 points)

Larger = more budget!

- **Large company**: 90 points (multi-location, big budget)
- **Medium company**: 75 points (established business)
- **Small company**: 50 points (growing business)
- **Startup**: 30 points (limited budget)

**Bonuses**:
- **>50 employees**: +10 points
- **>100 employees**: +10 points (additional)

### 7. Market Competitiveness (5 points)

More competition = more need for marketing!

- **Major metro area**: 80 points (NYC, LA, Chicago, etc.)
- **Secondary market**: 60 points
- **>50 local competitors**: +15 points
- **20-50 competitors**: +10 points

## Tier Classification

| Score Range | Tier | Description |
|-------------|------|-------------|
| 80-100 | 🔥 Hot Lead | Multiple major opportunities |
| 60-79 | 🌡️ Warm Lead | Several improvement areas |
| 40-59 | ❄️ Cold Lead | Some opportunities |
| 0-39 | 💤 Low Priority | Already well-optimized |

## Running the Scorer

### Score Existing Leads

```bash
# Score all unscored leads
npm run score
```

### Programmatic Usage

```javascript
const LeadScorer = require('./src/scoring/lead-scorer');

const scorer = new LeadScorer();

// Score single lead
const result = scorer.calculateScore(lead);
console.log(`Score: ${result.totalScore}/100`);
console.log(`Tier: ${result.tier}`);
console.log('Recommendations:', result.recommendations);

// Score multiple leads
const scoredLeads = await scorer.scoreLeads(leads);

// Generate report
const report = scorer.generateScoringReport(scoredLeads);
```

## Score Output

```javascript
{
  totalScore: 87,
  tier: 'Hot Lead',
  componentScores: {
    websiteQuality: 85,
    seoRanking: 75,
    adPresence: 80,
    reviewScore: 65,
    socialPresence: 90,
    companySize: 75,
    marketCompetitiveness: 80
  },
  recommendations: [
    {
      priority: 'High',
      category: 'Website',
      recommendation: 'Website redesign and optimization needed',
      services: ['Website Development', 'Mobile Optimization']
    },
    {
      priority: 'High',
      category: 'SEO',
      recommendation: 'SEO optimization required to improve rankings',
      services: ['Local SEO', 'On-Page SEO', 'Content Marketing']
    }
  ],
  calculatedAt: '2026-01-29T18:12:00.000Z'
}
```

## Recommendations Generated

Based on component scores, the algorithm generates:

### High Priority
- **Website redesign** (score >= 70)
- **SEO optimization** (score >= 60)
- **PPC campaigns** (score >= 60)

### Medium Priority  
- **Reputation management** (score >= 60)
- **Social media marketing** (score >= 60)

### Services Suggested
- Website Development
- Mobile Optimization
- Speed Optimization
- Local SEO
- On-Page SEO
- Content Marketing
- Link Building
- Google Ads
- Local Service Ads
- Facebook Ads
- Review Management
- Reputation Monitoring
- Social Media Marketing
- Content Creation

## Customizing Scoring

Edit `src/scoring/lead-scorer.js` to adjust:

```javascript
this.weights = {
  websiteQuality: 25,      // Adjust weight (0-100)
  seoRanking: 20,
  adPresence: 15,
  reviewScore: 15,
  socialPresence: 10,
  companySize: 10,
  marketCompetitiveness: 5
};
```

**Note**: Total weights should equal 100.

## Example Scenarios

### Hot Lead Example (Score: 92)
```
ABC Plumbing
- No website (100 pts)
- Not indexed in Google (100 pts)  
- No Google Ads (80 pts)
- 8 reviews, 3.2 stars (70 pts)
- No social media (100 pts)
- Medium-sized company (75 pts)
- Major metro area (80 pts)

Result: Hot Lead - Perfect prospect for full digital package!
```

### Warm Lead Example (Score: 68)
```
XYZ HVAC
- Outdated website, no mobile (65 pts)
- Ranking #35 for keywords (40 pts)
- Some Google Ads (40 pts)
- 45 reviews, 4.2 stars (35 pts)
- Facebook only, low engagement (60 pts)
- Small company (50 pts)
- Suburban area (60 pts)

Result: Warm Lead - Multiple improvement opportunities
```

### Cold Lead Example (Score: 42)
```
Pro Electric
- Modern website (30 pts)
- Ranking #8-12 (20 pts)
- Active ads (20 pts)
- 150 reviews, 4.7 stars (15 pts)
- Active on 3 platforms (30 pts)
- Large company (90 pts)
- Competitive market (80 pts)

Result: Cold Lead - Already optimized, less opportunity
```

## Integration with CRM

Scored leads can be exported to:

- **Salesforce** - Prioritize outreach
- **HubSpot** - Trigger workflows
- **Pipedrive** - Set deal values
- **Email campaigns** - Personalized messaging

## Performance

- **Single lead**: ~50ms
- **100 leads**: ~5 seconds
- **1000 leads**: ~50 seconds

Scoring is CPU-bound and can run in parallel.
