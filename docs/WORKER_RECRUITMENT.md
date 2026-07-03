# 🤖 Worker Recruitment Automation System

Automatisiertes Handwerker-Rekrutierungssystem für GaLaBau-Betriebe (Brandenburg/Berlin).

Das System identifiziert kontinuierlich potenzielle Handwerker und sendet personalisierte Rekrutierungs-Nachrichten via SMS, WhatsApp und Email - alles 24/7 automatisiert.

## 🎯 Features

### 1. 🔍 Automatische Handwerker-Identifizierung
- **LinkedIn Scraping**: Sucht nach Profilen mit GaLaBau-Keywords (Gärtner, Landschaftsbauer, Rasen, Terrasse, etc.)
- **Job Board Integration**: Durchsucht Handwerk-Portale (Handwerksberufe.de, etc.)
- **Google Local**: Findet lokale Gärtnereien und Landschaftsbauer in Brandenburg/Berlin
- **Branchen-Verzeichnisse**: Integriert Gelbe Seiten und Branchenbücher
- **Duplikat-Erkennung**: Verhindert Doppelkontakte (Name + Telefon Check)

### 2. 🧠 Claude AI-Qualifizierung
Jeder Kandidat wird automatisch mit Claude bewertet:
- **Qualification Score** (0-100): Wie gut passt die Person für GaLaBau?
- **Skill Matching**: Welche Fähigkeiten sind relevant?
- **Contact Recommendation**: Ja/Nein für Kontaktaufnahme

Kandidaten mit Score >= 60 werden automatisch zu Outreach-Kampagnen hinzugefügt.

### 3. 💬 Personalisierte Nachrichten
Claude generiert automatisch personalisierte Rekrutierungs-Nachrichten:
- **Initial Outreach**: "Du hast Erfahrung mit Rasenbau? Wir suchen genau dich..."
- **Smart Skill Matching**: Nachrichten sind auf spezifische Skills zugeschnitten
- **Follow-up Automation**: 3-Tage & 1-Woche Follow-ups bei keine Antwort
- **Tone**: Professionell aber freundlich, nicht Template-artig

### 4. 📱 Multi-Channel Versand
- **WhatsApp**: Primär (höchste Öffnungsrate für Handwerker)
- **SMS**: Fallback wenn WhatsApp nicht verfügbar
- **Email**: Für Kandidaten nur mit Email-Kontakt
- **Rate Limiting**: Intelligent gesteuerte Versende-Rates (kein Spam)

### 5. 📊 Pipeline Management
Kandidaten durchlaufen automatisch diese Stages:
1. **identified** - Neu gescraped und qualifiziert
2. **message_sent** - Nachricht versendet
3. **viewed** - Nachricht gelesen/SMS empfangen
4. **interested** - Kandidat hat geantwortet
5. **qualified** - Gespräch geführt, Skills bestätigt
6. **hired** - Eingestellt ✅
7. **rejected** - Kein Interesse

### 6. 📈 Performance Analytics
Dashboard zeigt Echtzeit-Metriken:
- Pipeline Übersicht (Kandidaten pro Stage)
- Response-Rate (wie viele Kandidaten antworten)
- Conversion-Rate (wie viele werden eingestellt)
- durchschnittlicher Qualification Score per Stage

## 🚀 Setup & Installation

### Voraussetzungen
- Node.js 18+
- PostgreSQL 13+
- Redis (für Message Queue)
- API Keys:
  - `ANTHROPIC_API_KEY` (Claude)
  - `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN` (SMS/WhatsApp)
  - `TWILIO_PHONE_NUMBER` & `TWILIO_WHATSAPP_NUMBER`
  - `SENDGRID_API_KEY` (Email)

### Installation

```bash
# Dependencies installieren
npm install

# .env konfigurieren
cp .env.example .env

# Bearbeite .env mit deinen Zugangsdaten:
ENABLE_AUTOMATION=true
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+49...
TWILIO_WHATSAPP_NUMBER=+49...
SENDGRID_API_KEY=SG...
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Datenbank Setup

```bash
# Initialisiere Datenbank (erstellt auch Worker-Tabellen)
npm run db:init

# Optional: Seed mit Test-Daten
npm run db:seed
```

### Server Starten

```bash
# Development Mode (mit Auto-Reload)
npm run dev

# Production Mode
npm start

# Automation sollte automatisch starten wenn ENABLE_AUTOMATION=true
```

Server läuft dann auf `http://localhost:3001`

## 📡 API Endpoints

### Worker Management

```bash
# Alle Kandidaten abrufen (optional mit Filtering)
GET /api/workers
GET /api/workers?stage=interested&minScore=70

# Einzelnen Kandidaten abrufen (mit Message-History)
GET /api/workers/{id}

# Kandidaten-Stage aktualisieren
PUT /api/workers/{id}/stage
{ "stage": "qualified" }

# Nachricht-History für Kandidaten
GET /api/workers/{id}/messages

# Manuelle Nachricht senden
POST /api/workers/{id}/send-message
{
  "message": "Hallo Max, wir suchen dich...",
  "channel": "whatsapp"  // oder "sms", "email"
}

# Notiz hinzufügen
POST /api/workers/{id}/note
{ "note": "Angerufen, interessiert aber aktuell nicht verfügbar" }
```

### Scraping & Automation

```bash
# Scraping sofort starten
POST /api/workers/scrape/now
{
  "regions": ["berlin", "brandenburg"],
  "limit": 50
}

# Pipeline Statistiken
GET /api/workers/pipeline/stats

Response:
{
  "success": true,
  "stats": [
    { "pipeline_stage": "identified", "count": 145, "avg_score": 72 },
    { "pipeline_stage": "message_sent", "count": 89, "avg_score": 71 },
    { "pipeline_stage": "interested", "count": 12, "avg_score": 78 },
    { "pipeline_stage": "qualified", "count": 5, "avg_score": 85 }
  ]
}
```

### Campaign Management

```bash
# Alle Kampagnen abrufen
GET /api/workers/campaigns

# Neue Kampagne erstellen
POST /api/workers/campaigns
{
  "name": "Rasenbau Spezialisten Berlin",
  "region_filter": ["berlin"],
  "skill_filter": ["Rasenbau", "Rasenanlage"],
  "message_interval_days": 3,
  "max_follow_ups": 2,
  "daily_send_limit": 50
}
```

## 🤖 Automation Pipeline

Das System läuft 24/7 mit folgenden automatisierten Jobs:

### 1️⃣ Scraping Cycle (täglich 02:00)
```
LinkedIn + Job Boards scrapen
→ Kontakte extrahieren + normalisieren
→ Duplikate entfernen
→ Claude qualifiziert (Score 0-100)
→ In DB speichern
→ Trigger Outreach für qualifizierte (Score >= 60)
```

### 2️⃣ Message Sending (alle 15 Minuten)
```
Redis Queue auslesen
→ Nachrichten mit Twilio/SendGrid versenden
→ Rate Limiting (nicht > 50/Tag)
→ Status in DB aktualisieren
→ Fehler: Auto-Retry nach 1h (max 3x)
```

### 3️⃣ Response Tracking (alle 30 Minuten)
```
SMS/WhatsApp Replies prüfen
→ Sentiment analysieren (Claude)
→ Kandidaten-Stage aktualisieren
→ Auto Follow-ups ggf. versendet
```

### 4️⃣ Pipeline Cleanup (täglich 03:00)
```
Kandidaten ohne Response > 30 Tage archivieren
→ Pipeline Statistiken berechnen
→ Log Summary
```

## 💡 Beispiel-Workflows

### Szenario 1: Automatischer Tagesablauf

**02:00 Uhr** - Scraping startet automatisch
```
✅ LinkedIn: 45 neue Profile gefunden
✅ Job Boards: 23 neue Profile gefunden  
✅ Deduplizierung: 28 eindeutig
✅ Claude Qualifizierung: 17 qualified (Score >= 60)
✅ Outreach triggered: 17 Nachrichten in Queue
```

**09:00-17:00** - Nachrichten werden gestaffelt versendet
```
09:15 - 15 SMS/WhatsApp versendet
10:30 - 3 Replies empfangen (von 15)
11:00 - Auto Follow-ups für 12 nicht geantwortet
12:15 - 5 weitere Replies
...
```

**02:30 nächster Tag** - Follow-ups für alte Kandidaten
```
3 Tage alte Kandidaten ohne Antwort: 12
→ Follow-up #1 ("Wir haben noch 2 große Projekte diesen Monat...")
→ Queue für 09:00-17:00 Versand
```

### Szenario 2: Interessierter Kandidat

1. System scraped Max Müller (Gärtner, Berlin, 5 Jahre Erfahrung)
2. Claude qualifiziert: Score 78 ✅ ("Erfahrung + relevante Skills")
3. Personalisierte Nachricht: "Hallo Max! 👋 Wir sind Kania GaLaBau und haben gerade 2 große Rasenbau-Projekte in Berlin-Spandau. Interessiert dich ein langfristiger Kontakt?"
4. WhatsApp versendet (09:30)
5. Max antwortet: "Klingt interessant! 👍"
6. Pipeline automatisch aktualisiert → "interested"
7. Sofortige Folge-Nachricht: "Super! Können wir morgen kurz telefonieren? Tel: 030/123456"
8. Max wird angerufen → zu "qualified" aktualisiert
9. Angebot + Vertrag → "hired" ✅

## 📊 Expected Performance

Bei optimaler Konfiguration kannst du mit folgendem rechnen:

**Monatliche Metriken:**
- Kandidaten gescraped: 100-200
- Nach Qualifizierung: 50-70
- Nach Outreach: 40-60 (Zustellung)
- Response Rate: 15-25% (6-15 Replies)
- Qualified: 3-5 (nach Gespräch)
- **Hired Rate**: 1-2 pro Monat (20-40% der Qualified)

**Kostenbeispiel (monatlich):**
- SMS/WhatsApp: ~€20-50 (Twilio)
- Email: kostenlos (SendGrid kostenlosen Plan)
- Claude API: ~€5-15 (Message Generation + Qualification)
- **Total: €30-80/Monat** für 20-30 neue Worker/Monat

## ⚙️ Konfiguration

### Environment Variables (.env)

```bash
# Automation
ENABLE_AUTOMATION=true  # Starte Automation beim Server-Start
AUTOMATION_DEBUG=true   # Verbose logging

# Region für Scraping
SCRAPING_REGIONS=berlin,brandenburg
DAILY_SCRAPE_LIMIT=100

# Nachricht-Versand
DAILY_MESSAGE_LIMIT=50
MESSAGE_RETRY_MAX=3
MESSAGE_RETRY_HOURS=1

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+49...
TWILIO_WHATSAPP_NUMBER=+49...

# SendGrid
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=jobs@kania-galabau.de

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Claude
ANTHROPIC_API_KEY=sk-ant-...
```

### Kampagnen-Konfiguration

Erstelle Kampagnen mit gezielten Einstellungen:

```bash
curl -X POST http://localhost:3001/api/workers/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Berliner Rasenbau Spezialisten",
    "region_filter": ["berlin"],
    "skill_filter": ["Rasenbau", "Rasenanlage", "Rasenpflege"],
    "message_interval_days": 3,
    "max_follow_ups": 2,
    "daily_send_limit": 30
  }'
```

## 🔍 Monitoring & Debugging

### Queue Status prüfen
```bash
curl http://localhost:3001/api/workers/queue/stats
```

### Pipeline Übersicht
```bash
curl http://localhost:3001/api/workers/pipeline/stats
```

### Manuelle Testversendung
```bash
curl -X POST http://localhost:3001/api/workers/12345/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test Nachricht",
    "channel": "whatsapp"
  }'
```

### Server Logs
```bash
# Tail logs mit Automation Details
tail -f logs/automation.log

# Oder: stdout anschauen (development mode)
npm run dev | grep -E "SCRAPING|MESSAGE|RESPONSE"
```

## 🚨 Troubleshooting

### Problem: Nachrichten werden nicht versendet

1. Prüfe Redis Verbindung:
```bash
redis-cli ping  # sollte "PONG" zurückgeben
```

2. Prüfe Twilio Konfiguration:
```bash
# In .env prüfen
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
```

3. Prüfe Queue Status:
```bash
curl http://localhost:3001/api/workers/queue/stats
```

### Problem: Claude Qualifizierung schlägt fehl

1. Prüfe API Key:
```bash
echo $ANTHROPIC_API_KEY
```

2. Test Claude direkt:
```bash
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY"
```

### Problem: Kandidaten werden nicht gescraped

1. Prüfe ob Automation aktiviert:
```bash
grep ENABLE_AUTOMATION .env  # sollte "true" sein
```

2. Trigger manuell:
```bash
curl -X POST http://localhost:3001/api/workers/scrape/now
```

3. Prüfe Logs auf Fehler

## 📚 Best Practices

1. **Starte mit kleinen Zahlen**: 
   - Beginne mit 10-20 Kandidaten/Tag
   - Erhöhe schrittweise auf 50-100

2. **Überwache Response-Rates**:
   - < 10% = Nachrichten-Text optimieren
   - 15-25% = Gut 👍
   - > 30% = Ausgezeichnet 🚀

3. **Follow-up Timing**:
   - 1. Versuch: Sofort (Initial)
   - 2. Versuch: Nach 3 Tagen
   - 3. Versuch: Nach 1 Woche
   - Dann: Archivieren

4. **Personalisierung**:
   - Claude ist gut, aber nicht perfekt
   - Review random Nachrichten 1x pro Woche
   - Feedback → System wird besser

5. **Compliance**:
   - Keine Spam-Listen (nur genuine GaLaBau Skills)
   - Opt-out Links in Emails
   - GDPR beachten (Datenschutz)

## 📞 Support

Fehler oder Fragen?
- Check Logs: `tail -f logs/automation.log`
- Manuelle Scraping: `curl -X POST http://localhost:3001/api/workers/scrape/now`
- Pipeline Stats: `curl http://localhost:3001/api/workers/pipeline/stats`

---

**Status: MVP (Production-ready für Phase 1)**

Nächste Features (Phase 2+):
- [ ] WhatsApp Button Links ("Jetzt anrufen!")
- [ ] Email Templates mit Branding
- [ ] A/B Testing verschiedener Nachrichten
- [ ] Advanced Sentiment Analysis
- [ ] Integration mit deinem CRM/Kalendersystem
- [ ] Mobile App für Kandidaten-Management
