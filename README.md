# GaLaBau-Angebots-Automatisierungs-System

Ein KI-gestütztes SaaS-System für Garten- & Landschaftsbau-Betriebe (GaLaBau) zur automatischen Angebotsgenerierung mit intelligenter Kalkulation.

## 🎯 Features (MVP - Phase 1 + Phase 2)

**Phase 1: MVP**
- ✅ **Web-Formular** für Projekt-Eingabe
- ✅ **Intelligente Kalkulations-Engine** für GaLaBau-Leistungen
- ✅ **PDF-Angebots-Generierung** mit Betrieb-Branding
- ✅ **Multi-Tenant** (mehrere Betriebe unterstützen)
- ✅ **REST API** für alle Operationen
- ✅ **PostgreSQL Datenbank** für Persistierung

**Phase 2: Claude AI Intelligence** 🚀 NEW
- ✅ **Claude Vision API** für Projektbild-Analyse
- ✅ **Intelligente Arbeitsleistungs-Schätzung**
- ✅ **Automatische Angebotsbeschreibung**
- ✅ **Smart Validierung & Optimierung**
- ✅ **Auto-generierte Verkaufsargumente**
- ✅ **Online-Angebots-Links** (interaktiv)

## 🚀 Quick Start

### Voraussetzungen

- Node.js 18+
- PostgreSQL 13+
- npm oder yarn

### Installation

```bash
# Dependencies installieren
npm install

# .env Datei aus Template erstellen
cp .env.example .env

# Datenbank initialisieren
npm run db:init

# Server starten (Development Mode)
npm run dev
```

Server läuft dann auf `http://localhost:3001`

## 🏗️ Projekt-Struktur

```
.
├── backend/
│   ├── server.js                 # Express Server
│   ├── routes/
│   │   ├── betriebe.js          # Betrieb-Management API
│   │   ├── projekte.js          # Projekt-Management API
│   │   └── angebote.js          # Angebots-Generierung API
│   ├── calculations/
│   │   └── calculator.js        # GaLaBau Kalkulations-Engine
│   ├── services/
│   │   └── pdfGenerator.js      # PDF Generierung
│   └── db/
│       └── init.js              # Database Initialization
├── frontend/                     # React App (später)
└── package.json
```

## 📡 API Endpoints

### Betriebe Management

```bash
# Betrieb erstellen
POST /api/betriebe
{
  "name": "GaLaBau Müller",
  "email": "info@galabau-mueller.de",
  "whatsapp_number": "+491234567890",
  "int_stundensatz": 50,
  "standard_marge_percent": 35,
  "fahrtkosten": 50
}

# Betrieb abrufen
GET /api/betriebe/:id

# Betrieb aktualisieren
PUT /api/betriebe/:id
{
  "int_stundensatz": 55,
  "standard_marge_percent": 40
}
```

### Projekte Management

```bash
# Projekt erstellen
POST /api/projekte
{
  "betrieb_id": "uuid",
  "kunde_name": "Max Mustermann",
  "kunde_email": "max@example.de",
  "kunde_adresse": "Musterstr. 1, 12345 Berlin",
  "projekttyp": "rasen",
  "leistungen": [
    {
      "typ": "arbeit",
      "beschreibung": "Rasenvorbereitung",
      "menge": 10,
      "einheit": "h",
      "preis_pro_einheit": 45
    }
  ]
}

# Projekt abrufen
GET /api/projekte/:id

# Leistung hinzufügen
POST /api/projekte/:id/leistungen
{
  "typ": "material",
  "beschreibung": "Rasensaat",
  "menge": 100,
  "einheit": "qm",
  "preis_pro_einheit": 5
}
```

### Angebote Generierung

**Standard-Angebot (Phase 1)**
```bash
# Angebot generieren (Kalkulation + PDF)
POST /api/angebote/generate
{
  "projekt_id": "uuid",
  "betrieb_id": "uuid",
  "custom_options": {
    "mitFahrtkosten": true,
    "rustzetZuschlag": 10
  }
}
```

**AI-Angebot mit Bildanalyse (Phase 2) 🚀**
```bash
# AI-Angebot generieren (Bildanalyse + intelligente Kalkulation)
POST /api/angebote/ai-generate
{
  "projekt_id": "uuid",
  "betrieb_id": "uuid",
  "image_base64": "data:image/jpeg;base64,...",
  "custom_options": {
    "mitFahrtkosten": true
  }
}

# Response includes:
# - Bildanalyse (Projekttyp, Fläche, Materialien, Schwierigkeitsgrad)
# - Geschätzte Arbeitsleistung
# - Auto-generierte Angebotsbeschreibung
# - Verkaufsargumente
# - Validierung & Optimierungsvorschläge
# - Fertige Kalkulation + PDF
```

**Weitere Endpoints**
```bash
# Angebot abrufen
GET /api/angebote/:id

# Angebote für Betrieb auflisten
GET /api/angebote/betrieb/:betrieb_id

# Online-Angebots-Link (für Kunde)
GET /api/angebote/quote/:angebotsnummer

# Angebot-Status aktualisieren
PATCH /api/angebote/:id/status
{
  "status": "sent"
}
```

## 🧮 Kalkulations-Engine

Die Engine unterstützt automatische Berechnung für:

### Allgemeine Leistungen
- **Arbeit**: `Stunden × Stundensatz`
- **Material**: `Menge × Einkaufspreis × (1 + Marge%)`
- **Spezialleistungen**: Custom-Preisierung

### GaLaBau-Spezifische Typen

#### Rasenanlage
```javascript
POST /api/angebote/generate
{
  "projekt_id": "uuid",
  "betrieb_id": "uuid",
  "projekttyp": "rasen",
  "projektDetails": {
    "qm": 200,
    "vorbereitung": true,
    "aussaat": true,
    "dummung": false
  }
}
```

Berechnet automatisch:
- Rasenvorbereitung: 20 Min/qm
- Rasensaat: €5/qm Einkauf + Arbeit
- Walzen + Nachbereitung

#### Bepflanzung
```javascript
{
  "projekttyp": "bepflanzung",
  "projektDetails": {
    "anzahlPflanzen": 50,
    "arbeitsStundenProPflanze": 0.25
  }
}
```

Durchschnittliche Pflanze: €12 Einkauf
Arbeit: 15 Min pro Pflanze

#### Terrasse
```javascript
{
  "projekttyp": "terrasse",
  "projektDetails": {
    "qm": 100,
    "materialTyp": "premium",
    "with_montage": true
  }
}
```

Material-Varianten:
- Standard (Betonsteine): €25/qm
- Premium (Naturstein): €45/qm
- Holz: €35/qm
- Dielen: €50/qm

#### Zaun
```javascript
{
  "projekttyp": "zaun",
  "projektDetails": {
    "meter": 50,
    "zauntyp": "holz",
    "with_montage": true
  }
}
```

## 💰 Beispiel-Kalkulation (Rasenanlage 200qm)

```
Materialkosten:
  Rasensaat (200qm × €5)           €1.000
  Dünger (200qm × €2,50)           €  500

Arbeitsleistung:
  Vorbereitung (40h × €45/h)       €1.800
  Aussaat & Walzen (30h × €45/h)   €1.350

Fahrtkosten                         €   50
─────────────────────────────────
Summe Netto                         €4.700
+ MwSt 19%                          €  893
─────────────────────────────────
GESAMT BRUTTO                       €5.593
```

## 🧪 Tests

```bash
# Unit Tests für Kalkulations-Engine
npm test -- calculator.test.js

# Alle Tests
npm test
```

## 📝 Nächste Schritte (Phase 2-4)

### Phase 2: Intelligence
- [ ] Claude API Integration für intelligente Angebotsgenerierung
- [ ] Bildanalyse für Projektbeschreibungen
- [ ] Automatische Fehlervalidierung

### Phase 3: Messenger-Bot
- [ ] WhatsApp-Bot mit Bildanalyse
- [ ] Automatische Datenextraktion
- [ ] Telegram-Integration

### Phase 4: Frontend & Launch
- [ ] React Dashboard
- [ ] User Authentication & Subscription
- [ ] Stripe Integration
- [ ] Analytics & Reporting

## 🔐 Sicherheit

- Multi-Tenant Isolation
- UUID-basierte Resource IDs
- SQL Parameterized Queries (PostgreSQL)
- Environment Variables für Secrets

## 📞 Support

E-Mail: info@kania-galabau.de

## 📄 Lizenz

Proprietary - GaLaBau SaaS Platform
