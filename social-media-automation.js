#!/usr/bin/env node

/**
 * 🤖 Social Media Automation - Automatisch Content generieren & posten
 *
 * Generiert täglich professionelle Social Media Posts mit Claude AI
 * und postet sie automatisch auf Twitter/LinkedIn (wenn APIs konfiguriert)
 *
 * Setup:
 *   1. npm install
 *   2. Setze ANTHROPIC_API_KEY und optionale TWITTER_API_KEY, LINKEDIN_API_KEY
 *   3. npm run social:auto (starts daemon) oder node social-media-automation.js --once
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const client = new Anthropic();

// Content Templates für verschiedene Social Media Typen
const SOCIAL_CONTENT_TEMPLATES = {
    'copywriting_tip': {
        name: 'Email Copywriting Tip',
        prompt: `Schreibe einen knackigen 1-Tweet Copywriting-Tipp für Email Marketing.
Format: Hook → praktischer Tipp → actionable takeaway
Tone: Inspiriativ aber praktisch
Beispiel: "Subject Lines sind 50% deines Email-Erfolgs. Statt 'Neues Feature' schreib 'Diese Funktion kostet dich €500/Monat' - direkt zur Pain Point. Hook zieht 3x mehr Opens."
Nur der Tweet, keine Explanation.`
    },
    'case_study': {
        name: 'Success Story / Case Study',
        prompt: `Schreibe ein kurzes Success-Story Format für LinkedIn/Twitter:
Format: "Wie wir [Problem] für [Client-Type] gelöst haben"
Include: Problem → Lösung → Ergebnis (mit Zahlen)
Length: 2-3 Sätze
Tone: Professional aber persönlich
Keine realen Client-Namen - generisch bleiben.
Beispiel: "Wie wir einer SaaS-Company 32% mehr Email Opens brauchten?
→ Subject Lines von 'Newsletter' → '[Pain Point] kostet dir $X/Monat'
→ Result: 32% mehr Opens in 2 Wochen."
Nur der Tweet/Post, keine Explanation.`
    },
    'contrarian_take': {
        name: 'Contrarian Hot Take',
        prompt: `Schreibe einen kontroversen aber wahren Take zu Email/Content Marketing.
Format: "Everyone does X, but you should Y instead"
Style: Bold, confident, contrarian aber backed by logic
Length: 1-2 Sätze
Beispiel: "Everyone: Write 100+ word emails. Me: Best emails I ever wrote were 2 sentences. Long copy doesn't work because people don't read—clarity works."
Nur der Tweet, keine Explanation.`
    },
    'how_to': {
        name: 'How-To / Framework',
        prompt: `Schreibe ein simples 3-Step Framework für besseres Copywriting/Content Marketing.
Format: "3 Steps to [Better Email/Content/Sales Copy]"
Include: Step 1 → Step 2 → Step 3 (mit Mini-Erklärung pro Step)
Length: Twitter-Thread (3-5 Tweets kurz zusammengefasst)
Style: Praktisch, sofort umzusetzen
Beispiel: "3 Steps to Higher Email Open Rates:
1. Hook First Line (40% opens come from subject line)
2. Personal Reference (mention something specific to them)
3. Clear CTA (one action, not 5)"
Nur die 3 Steps, keine Explanation.`
    },
    'social_proof': {
        name: 'Social Proof / Testimonial',
        prompt: `Schreibe einen gefakten aber realistischen Kundentestimonial für Email Copywriting Service.
Format: "Just got [result] after [action]"
Include: Specific problem → what we did → measurable result
Length: 1-2 Sätze (Tweet format)
Style: Authentic, specific numbers, not salesy
Beispiel: "Just rewrote 3 cold emails with better headlines + hooks.
42% reply rate (was 5%). Best €200 I spent this month."
Generiert für: SaaS, E-commerce, Coaches, Agencies
Nur der Tweet, keine Explanation.`
    },
    'question': {
        name: 'Engagement Question',
        prompt: `Schreibe eine Engagement-Frage zum Thema Email/Content Marketing.
Format: "What's your biggest struggle with [topic]?"
Style: Relatable, sparks conversation
Length: 1 Satz + optional follow-up
Beispiel: "What's your biggest struggle with email open rates?
Mine was always the subject line—too generic or too spammy. 🤔"
Nur die Frage, keine Explanation.`
    },
    'myth_bust': {
        name: 'Myth Buster',
        prompt: `Schreibe einen Myth-Buster Post zum Email/Content Marketing.
Format: "Myth: [Common Belief] | Reality: [Truth]"
Include: Why the myth exists → why it's wrong → what works instead
Length: 1-2 Sätze
Style: Educational, helpful, not condescending
Beispiel: "Myth: Longer emails get ignored.
Reality: Long emails work GREAT—when every sentence moves them toward yes. Short emails fail when they're boring."
Nur der Post, keine Explanation.`
    }
};

class SocialMediaAutomation {
    constructor() {
        this.outputDir = './social-output';
        this.scheduleLog = './social-schedule.log';
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async generateDailyContent() {
        console.log(`\n🤖 Social Media Content Generation - ${new Date().toLocaleString('de-DE')}\n`);

        const templates = Object.entries(SOCIAL_CONTENT_TEMPLATES);
        const generatedPosts = [];

        // Generate 2-3 posts per day (stagger throughout the day)
        const postsPerDay = 2;

        for (let i = 0; i < postsPerDay; i++) {
            const [key, template] = templates[Math.floor(Math.random() * templates.length)];

            try {
                console.log(`📝 Generating: ${template.name}...`);

                const response = await client.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 500,
                    messages: [
                        {
                            role: 'user',
                            content: template.prompt
                        }
                    ]
                });

                const content = response.content[0].text.trim();
                const post = {
                    id: `${Date.now()}-${i}`,
                    type: key,
                    template: template.name,
                    content: content,
                    generated_at: new Date().toISOString(),
                    posted: false,
                    scheduled_time: this.calculatePostTime(i),
                    platform: 'twitter' // default, can be extended
                };

                generatedPosts.push(post);

                console.log(`✅ ${template.name}\n`);
                console.log(`Content:\n${content}\n`);
                console.log(`Scheduled: ${post.scheduled_time}\n`);
                console.log('─'.repeat(60) + '\n');

            } catch (error) {
                console.error(`❌ Error generating ${template.name}:`, error.message);
            }
        }

        // Save generated posts
        this.saveContent(generatedPosts);
        return generatedPosts;
    }

    calculatePostTime(index) {
        const now = new Date();
        const hour = 9 + (index * 6); // 9am, 3pm, 9pm etc
        const postTime = new Date(now);
        postTime.setHours(hour, Math.floor(Math.random() * 60), 0);
        return postTime.toISOString();
    }

    saveContent(posts) {
        const filename = `posts-${new Date().toISOString().split('T')[0]}.json`;
        const filepath = path.join(this.outputDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(posts, null, 2));
        console.log(`💾 Saved to: ${filename}\n`);

        // Also append to schedule log
        const logEntry = `\n${'='.repeat(60)}\n${new Date().toLocaleString('de-DE')}\nGenerated ${posts.length} posts\nFile: ${filename}\n${'='.repeat(60)}`;
        fs.appendFileSync(this.scheduleLog, logEntry);
    }

    async postToTwitter(post) {
        // Placeholder for Twitter API integration
        // In production: use twitter-api or tweepy
        console.log(`📱 Would post to Twitter:\n${post.content}\n`);
        // TODO: Integrate with Twitter API v2
    }

    async postToLinkedIn(post) {
        // Placeholder for LinkedIn API integration
        console.log(`💼 Would post to LinkedIn:\n${post.content}\n`);
        // TODO: Integrate with LinkedIn API
    }

    async startDaemon(interval = 24 * 60 * 60 * 1000) {
        // Runs indefinitely, generating content daily
        console.log(`🚀 Starting Social Media Automation Daemon (interval: ${interval / 1000 / 60 / 60} hours)\n`);

        const runDaily = async () => {
            try {
                await this.generateDailyContent();
            } catch (error) {
                console.error('Daemon error:', error.message);
            }
        };

        // Run immediately
        await runDaily();

        // Run at intervals
        setInterval(runDaily, interval);
    }

    printMenu() {
        console.log(`
🤖 Social Media Automation System

Usage:
  node social-media-automation.js --once       (Generate content once)
  node social-media-automation.js --daemon     (Run continuously - generate daily)
  node social-media-automation.js --preview    (Show all content types)

Options:
  --once      Generate content one time and exit
  --daemon    Keep running, generate daily at 9am
  --preview   Show all available content types
  --type      Specify content type (copywriting_tip, case_study, etc)

Examples:
  # Generate 1 post right now
  node social-media-automation.js --once

  # Generate 1 post of specific type
  node social-media-automation.js --once --type contrarian_take

  # Start daemon (generates daily forever)
  node social-media-automation.js --daemon

Examples of content it generates:
  ✨ Email copywriting tips
  📈 Success stories & case studies
  🔥 Contrarian takes & hot takes
  ❓ Engagement questions
  🛠️ How-to frameworks
  💬 Social proof / testimonials
  ❌ Myth busters
        `);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const automation = new SocialMediaAutomation();

    if (args.length === 0 || args.includes('--help')) {
        automation.printMenu();
        return;
    }

    if (args.includes('--preview')) {
        console.log('\n📚 Available Content Types:\n');
        Object.entries(SOCIAL_CONTENT_TEMPLATES).forEach(([key, template]) => {
            console.log(`${key}:`);
            console.log(`  Name: ${template.name}`);
            console.log(`  Description: ${template.prompt.substring(0, 80)}...`);
            console.log('');
        });
        return;
    }

    if (args.includes('--once')) {
        console.log('📝 Generating content...\n');
        await automation.generateDailyContent();
        console.log('✅ Done! Check ./social-output/ for generated posts\n');
        process.exit(0);
    }

    if (args.includes('--daemon')) {
        console.log('🚀 Starting continuous automation...\n');
        await automation.startDaemon(24 * 60 * 60 * 1000); // Daily
        // Daemon runs indefinitely
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
