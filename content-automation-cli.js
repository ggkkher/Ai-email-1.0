#!/usr/bin/env node

/**
 * 🚀 Content Automation CLI - Generiere €100-300 Pakete auf Knopfdruck
 *
 * Usage:
 *   node content-automation-cli.js --type email --topic "SaaS Signup" --client "TechStartup"
 *   node content-automation-cli.js --type sales-page --topic "Coaching Program"
 *   node content-automation-cli.js --type blog --topic "LinkedIn Growth" --seo true
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

const client = new Anthropic();

// Presets für schnelle Content-Generierung
const CONTENT_TEMPLATES = {
    'email': {
        'sales-email': 'Generiere eine verkaufsstarke Email für {{topic}} an {{audience}}. Die Email sollte: 1) Hook (erste Zeile zieht Aufmerksamkeit), 2) Problem (identifiziert das Problem), 3) Solution (präsentiert Lösung), 4) CTA (starker Call-to-Action). Format: Nur der Email-Text, kein Subject und keine Grüße.',
        'cold-email': 'Schreibe eine Cold Email für {{topic}}. Format: Kurz (50-100 Wörter), Personalisierbar, Mit CTA zum Termin. Ziel: {{goal}}',
        'newsletter': 'Schreibe einen Newsletter zu {{topic}} (200-300 Wörter). Format: Hook → Story → Takeaway → CTA',
    },
    'sales-page': {
        'headline': 'Generiere 5 verschiedene High-Converting Headlines für {{topic}}. Jeder Headline sollte ein klares Benefit haben und unter 10 Wörter sein.',
        'full-page': 'Schreibe eine komplette Sales Page für {{topic}}. Struktur: Headline → Subheadline → Problem → Solution → Benefits → Social Proof → CTA. Zielgruppe: {{audience}}. Ziel: {{goal}}',
        'landing-page': 'Minimal Landing Page für {{topic}} (300 Wörter). Fokus: Clarity + Urgency + CTA. Format: HTML-ready (mit <h1>, <h2>, <p>, <button> tags)',
    },
    'blog': {
        'seo-post': 'Schreibe einen SEO-optimierten Blog Post zu {{topic}} (1500 Wörter). Struktur: Intro → H2 Sections → Conclusion. Keywords: {{keywords}}. Tone: {{tone}}',
        'long-form': 'Schreibe einen ausführlichen Blog Post zu {{topic}} (2000+ Wörter). Tiefgang mit Daten/Examples. Struktur: Intro → 5-6 H2 Sections → Conclusion + CTA',
        'list-post': 'Schreibe einen "Top 10" oder "X Ways" Blog Post zu {{topic}}. Format: Intro → 10 numbered items mit Erklärungen → Conclusion. Style: Praktisch + Actionable',
    },
    'social': {
        'linkedin-thread': 'Schreibe einen LinkedIn Thread zu {{topic}} (5-7 Tweets). Format: Hook Tweet → Insight Tweets → CTA Tweet. Style: Konversational, Mit Emojis',
        'twitter-viral': 'Generiere 5 Twitter Posts zum Thema {{topic}}, die viral gehen sollen. Style: Hot Takes, Contrarian, Mit Emojis. Ziel: {{goal}}',
        'instagram-captions': 'Schreibe 5 Instagram Captions zu {{topic}}. Format: Hook → Story → CTA mit Hashtags. Style: Relatable + Emoji-rich',
    },
    'other': {
        'ad-copy': 'Schreibe Google Ads / Facebook Ads Copy für {{topic}}. 3-5 Varianten. Format: Headline (30 chars) + Description (90 chars) + CTA',
        'email-subject': 'Generiere 10 High-Open-Rate Email Subject Lines zu {{topic}}. Zielgruppe: {{audience}}',
        'meta-description': 'Schreibe SEO Meta Descriptions für {{topic}} (150-160 chars). Mehrere Varianten.',
    }
};

// Preise für verschiedene Content-Typen
const PRICING = {
    'email': { base: 100, rush: 130 },
    'sales-page': { base: 200, rush: 260 },
    'blog': { base: 150, rush: 195 },
    'social': { base: 80, rush: 104 },
    'other': { base: 100, rush: 130 },
};

class ContentAutomation {
    constructor() {
        this.outputDir = './content-output';
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async generateContent(options) {
        const {
            type = 'email',
            subtype = null,
            topic,
            audience = 'Dein Zielmarkt',
            goal = 'Conversion',
            keywords = '',
            tone = 'professional',
            rush = false,
            clientName = 'Client'
        } = options;

        console.log(`\n🚀 Generiere ${type} Content...\n`);

        let template;
        if (subtype && CONTENT_TEMPLATES[type]?.[subtype]) {
            template = CONTENT_TEMPLATES[type][subtype];
        } else {
            // Fallback auf first available
            const templates = CONTENT_TEMPLATES[type] || CONTENT_TEMPLATES['other'];
            template = Object.values(templates)[0];
        }

        // Replace placeholders
        const prompt = template
            .replace(/{{topic}}/g, topic)
            .replace(/{{audience}}/g, audience)
            .replace(/{{goal}}/g, goal)
            .replace(/{{keywords}}/g, keywords)
            .replace(/{{tone}}/g, tone);

        try {
            const response = await client.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const generatedContent = response.content[0].text;

            // Speichere Output
            const filename = this.saveOutput(generatedContent, {
                type,
                subtype,
                topic,
                clientName,
                rush
            });

            // Berechne Preis
            const price = PRICING[type]?.base || 100;
            const rushPrice = rush ? PRICING[type]?.rush || (price * 1.3) : price;

            console.log(`✅ Content generiert!\n`);
            console.log(`📊 Statistiken:`);
            console.log(`  • Typ: ${type} (${subtype || 'default'})`);
            console.log(`  • Wörter: ${this.countWords(generatedContent)}`);
            console.log(`  • Preis: €${rush ? rushPrice : price}${rush ? ' (Rush +30%)' : ''}`);
            console.log(`  • Datei: ${filename}\n`);
            console.log(`📝 Content Preview:`);
            console.log(`${'='.repeat(60)}`);
            console.log(generatedContent.substring(0, 500) + (generatedContent.length > 500 ? '\n... (gekürzt)' : ''));
            console.log(`${'='.repeat(60)}\n`);

            return {
                content: generatedContent,
                filename,
                price: rush ? rushPrice : price,
                words: this.countWords(generatedContent)
            };
        } catch (error) {
            console.error('❌ Fehler bei Content-Generierung:', error.message);
            process.exit(1);
        }
    }

    saveOutput(content, metadata) {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${metadata.clientName}_${metadata.type}_${timestamp}.txt`;
        const filepath = path.join(this.outputDir, filename);

        const output = `
📝 CONTENT DELIVERY
==================

Client: ${metadata.clientName}
Type: ${metadata.type}
Subtype: ${metadata.subtype || 'default'}
Topic: ${metadata.topic}
Date: ${new Date().toLocaleString('de-DE')}
Price: €${metadata.rush ? 'RUSH +30%' : 'STANDARD'}

Content:
--------

${content}

==================
Generated with KaniaContent Automation
`;

        fs.writeFileSync(filepath, output);
        return filename;
    }

    countWords(text) {
        return text.trim().split(/\s+/).length;
    }

    async interactiveMode() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

        console.log(`\n🎯 KaniaContent Automation - Interaktiver Modus\n`);

        const type = await question('Content Type (email/sales-page/blog/social/other): ');
        const topic = await question('Thema/Topic: ');
        const audience = await question('Zielgruppe (optional): ') || 'Dein Zielmarkt';
        const clientName = await question('Client Name: ');
        const rush = await question('Rush Service? (y/n): ');

        rl.close();

        await this.generateContent({
            type: type || 'email',
            topic,
            audience,
            clientName,
            rush: rush?.toLowerCase() === 'y'
        });
    }
}

// CLI Argument Parsing
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Interaktiver Modus
        const automation = new ContentAutomation();
        await automation.interactiveMode();
        return;
    }

    // Parse Arguments
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];
        options[key] = value;
    }

    // Validierung
    if (!options.topic) {
        console.error('❌ Error: --topic ist erforderlich');
        process.exit(1);
    }

    const automation = new ContentAutomation();
    await automation.generateContent({
        type: options.type || 'email',
        subtype: options.subtype,
        topic: options.topic,
        audience: options.audience,
        goal: options.goal,
        keywords: options.keywords,
        tone: options.tone || 'professional',
        rush: options.rush === 'true',
        clientName: options.client || 'Client'
    });
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
