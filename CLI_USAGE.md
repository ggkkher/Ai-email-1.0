# 🚀 Content Automation CLI - Quick Start

Your personal content generation machine. Generate professional email sequences, sales pages, blog posts, and more — on demand.

## Setup (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
# Or add to .env file
```

## Usage

### Option 1: Interactive Mode (Easiest)
```bash
node content-automation-cli.js
```

Then answer the prompts:
- Content Type: `email` / `sales-page` / `blog` / `social` / `other`
- Topic: What's the content about? (e.g., "SaaS Signup Flow")
- Audience: Who's it for? (e.g., "SaaS Founders")
- Client Name: Your client's name (for file organization)
- Rush Service: `y` or `n` (adds 30% to price, instant turnaround)

### Option 2: Command Line (Faster)
```bash
# Email copywriting
node content-automation-cli.js --type email --topic "Abandoned Cart" --client "Shopify Store"

# Sales page
node content-automation-cli.js --type sales-page --topic "Coaching Program" --audience "Entrepreneurs"

# Blog post
node content-automation-cli.js --type blog --topic "LinkedIn Growth Hacks" --keywords "LinkedIn, social media, growth"

# Social media
node content-automation-cli.js --type social --topic "Email Copywriting Tips" --audience "Freelancers"

# Rush pricing
node content-automation-cli.js --type email --topic "Product Launch" --client "TechCo" --rush true
```

## What You Can Generate

### Email (€100-130)
- **sales-email**: High-converting sales email (Problem → Solution → CTA)
- **cold-email**: Short, personalized outreach (50-100 words)
- **newsletter**: Engaging newsletter (200-300 words)

### Sales Pages (€200-260)
- **headline**: 5 different high-converting headlines
- **full-page**: Complete sales page (Headline → Problem → Solution → CTA)
- **landing-page**: Minimal, focused landing page (300 words)

### Blog Posts (€150-195)
- **seo-post**: SEO-optimized blog (1500 words)
- **long-form**: Deep-dive article (2000+ words)
- **list-post**: "Top 10" style post with actionable items

### Social Media (€80-104)
- **linkedin-thread**: 5-7 tweet thread format
- **twitter-viral**: Hot-take tweets designed for virality
- **instagram-captions**: 5 Instagram captions with hashtags

### Other (€100-130)
- **ad-copy**: Google/Facebook Ads copy (multiple variations)
- **email-subject**: 10 high-open-rate subject lines
- **meta-description**: SEO meta descriptions (150-160 chars)

## Complete Command Examples

```bash
# Sales-focused email with specific audience
node content-automation-cli.js \
  --type email \
  --subtype sales-email \
  --topic "Email Automation Software" \
  --audience "Marketing Managers" \
  --goal "Get Demo Signup" \
  --client "HubSpot Competitor"

# Blog post with SEO optimization
node content-automation-cli.js \
  --type blog \
  --subtype seo-post \
  --topic "How to Write Better Emails" \
  --keywords "email copywriting, sales emails, conversion" \
  --tone professional \
  --client "ContentHub"

# Social media thread
node content-automation-cli.js \
  --type social \
  --subtype linkedin-thread \
  --topic "Freelance Copywriting Tips" \
  --audience "Freelancers" \
  --client "Personal Brand"

# Rush service (30% price bump)
node content-automation-cli.js \
  --type sales-page \
  --topic "Limited Time Offer" \
  --audience "E-commerce Owners" \
  --rush true \
  --client "UrgentClient"
```

## Output

Each generated piece is saved to `./content-output/` with:
- Client name + type + date = filename
- Full metadata (client, type, topic, date, price, rush status)
- Word count and pricing info in console

Example output:
```
✅ Content generiert!

📊 Statistiken:
  • Typ: email (sales-email)
  • Wörter: 287
  • Preis: €100
  • Datei: TechStartup_email_2026-01-15.txt

📝 Content Preview:
============================================================
[First 500 chars of generated content...]
============================================================
```

## Pricing Breakdown

| Content Type | Base Price | Rush Price (+30%) |
|---|---|---|
| Email Copy | €100 | €130 |
| Sales Page | €200 | €260 |
| Blog Post | €150 | €195 |
| Social Bundle | €80 | €104 |
| Other (Ads, Subjects) | €100 | €130 |

## Tips for Best Results

1. **Be Specific**: The more detailed your topic/audience, the better the output
2. **Use Keywords**: For blog posts, include relevant keywords for SEO
3. **Set Tone**: Professional, casual, technical, conversational — it matters
4. **Provide Context**: Who's the audience? What's the goal? (leads, sales, engagement?)
5. **Test & Iterate**: Generate a few variations, pick the best one

## Workflow Example: From Prospect to Delivery

```bash
# 1. Client asks for email sequence
node content-automation-cli.js \
  --type email \
  --topic "SaaS Onboarding" \
  --audience "Startup Founders" \
  --client "ClientName"

# 2. Generate sales page too
node content-automation-cli.js \
  --type sales-page \
  --topic "SaaS Onboarding" \
  --audience "Startup Founders" \
  --client "ClientName"

# 3. Add blog post for SEO
node content-automation-cli.js \
  --type blog \
  --topic "SaaS Onboarding Best Practices" \
  --keywords "SaaS, onboarding, customer success" \
  --client "ClientName"

# 4. Invoice client: €100 + €200 + €150 = €450
# Time spent: 15 minutes on prompts = €1.800/hour ⚡
```

## Troubleshooting

**"ANTHROPIC_API_KEY not set"**
- Set it: `export ANTHROPIC_API_KEY=sk-ant-xxxxxxxx`
- Or create `.env` file with: `ANTHROPIC_API_KEY=sk-ant-xxxxxxxx`

**"Content output not saving"**
- Check that `./content-output/` directory exists and is writable
- CLI will create it automatically if missing

**"Claude API error"**
- Verify your API key is valid at https://console.anthropic.com/
- Check your API quota (should have credits/billing set up)

---

**Ready to make €100-300 per delivery?** Start with interactive mode:
```bash
node content-automation-cli.js
```

Then use the output templates to land clients on Upwork, Fiverr, or via cold email. ⚡
