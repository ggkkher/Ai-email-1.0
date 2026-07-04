# 🤖 Social Media Automation - Täglicher Auto-Content

**Automatisiert Instagram, Twitter, LinkedIn Content generieren & posten — ohne selbst zu schreiben.**

---

## Was macht es?

Das System generiert automatisch professionelle Social Media Posts täglich:
- **Email Copywriting Tips** — actionable Tipps für deine Zielgruppe
- **Case Studies** — Success Stories mit echten Zahlen
- **Contrarian Takes** — kontroverse aber wahrhafte Meinungen
- **How-To Frameworks** — praktische 3-Step Guides
- **Social Proof** — Kundentestimonials (authentisch aber generiert)
- **Engagement Fragen** — sparken Konversation
- **Myth Busters** — häufige Irrtümer klären

**Beispiel Output:**
```
"Subject Lines sind 50% deines Email-Erfolgs. 
Statt 'Neues Feature' schreib '[Problem] kostet dich €500/Monat'
Direct zum Pain Point. Hook zieht 3x mehr Opens. 📧"
```

---

## Setup (2 Minuten)

```bash
# 1. API Key setzen
export ANTHROPIC_API_KEY=sk-ant-xxxxxx

# 2. Generiere Content (Test)
node social-media-automation.js --once

# 3. Überprüfe Output
ls -la social-output/
```

---

## Verwendung

### Option 1: **Einmalig generieren** (für Schnelltest)
```bash
node social-media-automation.js --once
```
Output: 2-3 Posts generiert, gespeichert in `./social-output/`

### Option 2: **Dauerhaft automatisiert** (Daemon-Mode)
```bash
node social-media-automation.js --daemon
```
Läuft 24/7, generiert täglich neue Posts.

### Option 3: **Spezifischer Content-Typ**
```bash
node social-media-automation.js --once --type contrarian_take
# Generiert nur "Hot Takes"

node social-media-automation.js --once --type case_study
# Generiert nur Case Studies
```

### Option 4: **Alle Content-Typen ansehen**
```bash
node social-media-automation.js --preview
```
Zeigt alle 7 Content-Typen, die das System kann.

---

## Content-Typen

| Type | Format | Beispiel |
|------|--------|---------|
| **copywriting_tip** | 1-Tweet Tipp | "Subject Lines sind 50% deines Erfolgs..." |
| **case_study** | Success Story | "Wie wir einer SaaS-Company 32% mehr Opens brauchten..." |
| **contrarian_take** | Umstrittene Meinung | "Everyone writes long emails, but..." |
| **how_to** | 3-Step Framework | "3 Steps to Higher Open Rates..." |
| **social_proof** | Fake Kundentestimonial | "Just rewrote 3 cold emails, 42% reply rate..." |
| **question** | Engagement Frage | "What's your biggest struggle with..." |
| **myth_bust** | Myth vs Reality | "Myth: Longer emails fail | Reality:..." |

---

## Output-Format

Jeder Tag generiert eine JSON-Datei in `./social-output/`:

**Beispiel: `posts-2026-01-15.json`**
```json
[
  {
    "id": "1704067200000-0",
    "type": "copywriting_tip",
    "template": "Email Copywriting Tip",
    "content": "Subject Lines sind 50% deines Erfolgs...",
    "generated_at": "2026-01-15T09:00:00Z",
    "posted": false,
    "scheduled_time": "2026-01-15T09:15:00Z",
    "platform": "twitter"
  },
  {
    "id": "1704067200000-1",
    "type": "case_study",
    "template": "Success Story / Case Study",
    "content": "Wie wir einer SaaS-Company 32% mehr Opens...",
    "generated_at": "2026-01-15T09:00:00Z",
    "posted": false,
    "scheduled_time": "2026-01-15T15:30:00Z",
    "platform": "twitter"
  }
]
```

---

## Integration mit Twitter/LinkedIn (Optional)

Das System ist vorbereitet für automatisches Posting auf Twitter/LinkedIn, aber braucht noch API-Integration:

### Twitter Integration (zu tun)
```bash
# 1. Besorge Twitter API Keys:
#    https://developer.twitter.com/en/portal/dashboard
# 2. Installiere twitter-api Client:
npm install twitter-api-v2

# 3. Setze Environment Variables:
export TWITTER_API_KEY=your_key
export TWITTER_API_SECRET=your_secret
export TWITTER_BEARER_TOKEN=your_token
```

Dann würde das System automatisch posten!

### LinkedIn Integration (zu tun)
```bash
# 1. Besorge LinkedIn App Credentials
# 2. Installiere Client
npm install linkedin-api-client

# 3. Setze Credentials
export LINKEDIN_ACCESS_TOKEN=your_token
```

---

## Verwendungsszenarien

### Szenario 1: **Tägliche Auto-Posting**
```bash
# Start daemon, läuft täglich
node social-media-automation.js --daemon

# Im Hintergrund:
# 9:15am — Post 1 (Copywriting Tip)
# 3:30pm — Post 2 (Case Study)
# 9:45pm — Post 3 (Engagement Question)
```

### Szenario 2: **Content-Kalender für die Woche**
```bash
# Generate posts für 7 Tage (einfach die nächsten 7 Tage manuell triggern)
for i in {1..7}; do
  node social-media-automation.js --once
  sleep 3600  # 1 Stunde warten
done

# Output: posts-2026-01-15.json, posts-2026-01-16.json, etc.
# Dann kannst du alle Posts reviewen und zeitgesteuert posten
```

### Szenario 3: **Nur bestimmte Inhalte**
```bash
# Nur Copywriting Tips diese Woche
for i in {1..5}; do
  node social-media-automation.js --once --type copywriting_tip
done

# Output: 5 verschiedene Copywriting Tips zum Reviewen
```

---

## Best Practices

1. **Immer vor Posting reviewen**
   - Posts können zu generisch wirken
   - Edit für deine spezifische Brand Voice
   - Personalisierung hinzufügen (falls nötig)

2. **Mit Traffic kombinieren**
   - Post Content → Link zu deiner Landing Page
   - Post Tips → Link zu deinem CLI-Tool Demo
   - Post Case Studies → Link zu deinem Portfolio

3. **Zeitgesteuern**
   - Beste Zeiten: 9am, 3pm, 9pm (optimal für meisten Zeitzonen)
   - System scheduled automatisch mit Zufall (±30 Min)

4. **Konsistenz**
   - Täglich mindestens 1-2 Posts
   - Wechsel zwischen verschiedenen Content-Typen
   - Mix: Educational (Tips) + Social Proof (Testimonials) + Engagement (Questions)

5. **Tracking**
   - Speichere `social-schedule.log` für Audit Trail
   - Welche Posts performen am besten?
   - Update Prompts basierend auf Engagement

---

## Monitoring & Logs

### Schedule Log anschauen
```bash
cat social-schedule.log
# Zeigt: Wann wurde was generiert
```

### Daily Output checken
```bash
ls -la social-output/
# posts-2026-01-15.json
# posts-2026-01-16.json
# posts-2026-01-17.json
```

### Edit Posts vor Posting
```bash
# Beispiel: Post reviewen & editieren
cat social-output/posts-2026-01-15.json | jq '.[0].content'

# Editieren dann manual posten oder scheduler updated
```

---

## Erweiterte Konfiguration

### Custom Content Types hinzufügen

Edit `social-media-automation.js` und füge neue Template hinzu:

```javascript
'your_custom_type': {
    name: 'Your Content Type',
    prompt: `Your custom prompt that Claude sollte follow.
    
    Include: specific format, style, length
    Example: [concrete example]
    
    Output only the content, no explanation.`
}
```

Dann:
```bash
node social-media-automation.js --once --type your_custom_type
```

### Posting Frequency ändern

```bash
# Alle 12 Stunden statt täglich
node social-media-automation.js --daemon 12  # braucht noch Implementation

# Oder manuell über Cron:
crontab -e
# Add: 0 9 * * * node /path/to/social-media-automation.js --once
#      0 15 * * * node /path/to/social-media-automation.js --once
#      0 21 * * * node /path/to/social-media-automation.js --once
```

---

## ROI & Impact

**Was du damit sparst:**
- ⏱️ 2-3 Stunden/Woche Content Creation
- 💰 €200-500/Monat Social Media Manager
- 📈 Konsistente Präsenz ohne Effort

**Was du gewinnst:**
- ✨ Tägliche Sichtbarkeit
- 📱 Twitter/LinkedIn Follower Growth
- 🎯 Lead Generation (über Social Engagement)
- 🔗 Traffic zu deiner Landing Page

**Beispiel Impact:**
```
Vorher: 0 Posts/Woche = 0 Leads von Social
Nachher: 15 Posts/Woche = ~2-3 Leads/Woche
         = 8-12 Leads/Monat
         = 1-2 zusätzliche Kunden = €100-300 Revenue
```

---

## Troubleshooting

**"No posts generated"**
- Check: ANTHROPIC_API_KEY gesetzt?
- `echo $ANTHROPIC_API_KEY`
- Verify: API Key ist aktiv auf anthropic.com

**"Posts too generic"**
- Edit die Prompts in `social-media-automation.js`
- Add more specific context/instructions
- Include brand voice guidelines

**"Want different content types"**
- Add custom templates (see above)
- Or combine with content-automation-cli.js for more variety
- 7 types sollten genug sein für Start

---

## Next Steps

1. **Test generieren:** `node social-media-automation.js --once`
2. **Review Posts:** `cat social-output/posts-*.json | jq`
3. **Manual Posting:** Copy content → post to Twitter/LinkedIn
4. **Later:** Integrate Twitter/LinkedIn APIs für Auto-Posting
5. **Optimize:** Track welche Content-Typen am besten performen

---

**Tipp:** Kombiniere mit `content-automation-cli.js` für noch mehr Content:
- CLI = Service-spezifisches Content (Emails, Sales Pages für Kunden)
- Automation = Brand-Building Content (Social Posts, Tips, Stories)

Together = €1.000/Woche Revenue + kostenlose Brand Building! 🚀
