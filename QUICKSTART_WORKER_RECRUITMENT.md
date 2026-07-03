# ⚡ Quick Start: Worker Recruitment Automation

Los geht's mit deinem automatisierten Handwerker-Rekrutierungssystem in 5 Minuten!

## 1️⃣ Installation (2 Minuten)

```bash
# Dependencies installieren
npm install

# Kopiere .env.example → .env
cp .env.example .env
```

## 2️⃣ .env Konfigurieren (2 Minuten)

Bearbeite `.env` und füge deine API Keys ein:

```bash
# ESSENTIAL (Recruitment läuft nicht ohne diese!)
ENABLE_AUTOMATION=true
ANTHROPIC_API_KEY=sk-ant-xxxxxx       # Von console.anthropic.com
TWILIO_ACCOUNT_SID=ACxxxxx             # Von twilio.com
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+49123456789       # Deine SMS Nummer
TWILIO_WHATSAPP_NUMBER=+49123456789    # Deine WhatsApp Nummer
SENDGRID_API_KEY=SG.xxxxx              # Von sendgrid.com

# Database & Redis (lokal für testing)
DATABASE_URL=postgresql://user:password@localhost:5432/galabau
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 3️⃣ Datenbank Initialisieren (1 Minute)

```bash
npm run db:init
```

Das erstellt alle Tabellen (betriebe, projekte, angebote, candidates, messages, etc.)

## 4️⃣ Server Starten (0 Minuten)

```bash
npm run dev
```

Du solltest sehen:
```
✅ Redis verbunden
✅ Tabelle candidates erstellt
✅ Tabelle messages erstellt
📅 Scraping Job geplant: täglich um 02:00 Uhr
📅 Message Sending Job geplant: alle 15 Minuten
✅ Automation läuft!
🚀 GaLaBau API running on http://localhost:3001
```

## ✅ System Test

### Test 1: Scraping manuell starten
```bash
curl -X POST http://localhost:3001/api/workers/scrape/now \
  -H "Content-Type: application/json" \
  -d '{"regions": ["berlin"], "limit": 10}'
```

Expected Response:
```json
{
  "success": true,
  "result": {
    "total_scraped": 10,
    "total_unique": 8,
    "total_saved": 5,
    "timestamp": "2026-01-15T10:30:00Z"
  }
}
```

### Test 2: Kandidaten abrufen
```bash
curl http://localhost:3001/api/workers?stage=identified
```

### Test 3: Pipeline Stats
```bash
curl http://localhost:3001/api/workers/pipeline/stats
```

## 🚀 Productive Konfiguration

Wenn Tests erfolgreich:

### 1. Kampagne erstellen
```bash
curl -X POST http://localhost:3001/api/workers/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Berlinale Rasenbau Spezialisten",
    "region_filter": ["berlin"],
    "skill_filter": ["Rasenbau", "Rasenanlage"],
    "message_interval_days": 3,
    "max_follow_ups": 2,
    "daily_send_limit": 50
  }'
```

### 2. Automation vollständig aktivieren
```bash
# Edit .env:
ENABLE_AUTOMATION=true
DAILY_SCRAPE_LIMIT=100
DAILY_MESSAGE_LIMIT=50
```

### 3. Neustarten
```bash
npm run dev
```

Das System läuft jetzt:
- **02:00 Uhr**: Täglich neue Kandidaten scrapen
- **09:00-17:00**: Nachrichten versendet (gestaffelt)
- **Alle 15 Min**: Versand-Queue abarbeiten
- **Alle 30 Min**: Responses tracking

## 📊 Monitoring

### Pipeline Status anschauen
```bash
# In separatem Terminal:
watch -n 10 'curl -s http://localhost:3001/api/workers/pipeline/stats | jq'
```

### Kandidaten durchsuchen
```bash
# Alle interessierten Kandidaten
curl 'http://localhost:3001/api/workers?stage=interested'

# Alle qualified
curl 'http://localhost:3001/api/workers?stage=qualified'

# Mit mindest-Score
curl 'http://localhost:3001/api/workers?minScore=75'
```

### Einzelnen Kandidaten anschauen
```bash
curl 'http://localhost:3001/api/workers/{candidate-id}'
```

## 💬 Manuelle Tests

### Nachricht zu Kandidaten senden
```bash
curl -X POST http://localhost:3001/api/workers/{id}/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hallo! Wir suchen Handwerker für große Rasenbau-Projekte. Interessiert?",
    "channel": "whatsapp"
  }'
```

### Kandidaten-Status updaten
```bash
curl -X PUT http://localhost:3001/api/workers/{id}/stage \
  -H "Content-Type: application/json" \
  -d '{"stage": "qualified"}'
```

### Notiz hinzufügen
```bash
curl -X POST http://localhost:3001/api/workers/{id}/note \
  -H "Content-Type: application/json" \
  -d '{"note": "Angerufen, interessiert, kommt Montag vorbei"}'
```

## 🎯 Was jetzt passiert

1. **Du**: Startest System → Automation läuft 24/7
2. **02:00 Uhr**: Neue Handwerker gescraped von LinkedIn, Job Boards
3. **Claude**: Qualifiziert automatisch (Score 0-100)
4. **09:00-17:00**: Personalisierte Nachrichten versendet
5. **Kandidaten**: Antworten per SMS/WhatsApp
6. **Du**: Siehst Antworten im Dashboard, kannst anrufen/hiring
7. **Repeat**: Nächster Tag neue Kandidaten

## 💰 Was es kostet

**Monatlich bei 100 Kandidaten:**
- SMS/WhatsApp: €20-50
- Email: €0
- Claude API: €5-15
- **Total: €30-80**

## 🆘 Probleme?

### Nachrichten werden nicht versendet
```bash
# Redis funktioniert?
redis-cli ping  # sollte PONG sagen

# Queue hat Nachrichten?
curl http://localhost:3001/api/workers/queue/stats
```

### Candidates werden nicht gescraped
```bash
# Automation aktiviert?
grep ENABLE_AUTOMATION .env  # sollte true sein

# Manuell testen:
curl -X POST http://localhost:3001/api/workers/scrape/now

# Logs schauen:
npm run dev | grep -i "scraping\|error"
```

### Claude funktioniert nicht
```bash
# API Key korrekt?
echo $ANTHROPIC_API_KEY

# Test:
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY"
```

## 📚 Ausführliche Doku

Mehr Details findest du in:
- [`docs/WORKER_RECRUITMENT.md`](docs/WORKER_RECRUITMENT.md) - Vollständige Dokumentation
- [`backend/workers/`](backend/workers/) - Source Code

## ✨ Nächste Schritte

1. **Diese Woche**: System live nehmen, Flows testen
2. **Nächste Woche**: Erste 100 Kandidaten scrapen
3. **Woche 3**: Optimize basierend auf Response-Rates
4. **Phase 2**: Dashboard UI hinzufügen, A/B Testing

---

**Viel Spaß mit deinem automatisierten Rekrutierungs-System! 🚀**

Fragen? Schau in den Code oder starte `npm run dev` und experimentiery!
