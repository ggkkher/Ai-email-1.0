# 🤖 Claude AI Features - Phase 2

Intelligente Angebotsgenerierung mit Bildanalyse und automatischer Kalkulation.

## Features

### 1. 📸 Projektbild-Analyse

Claude Vision API analysiert Bilder von GaLaBau-Projekten und extrahiert automatisch:

```javascript
POST /api/angebote/ai-generate
{
  "projekt_id": "uuid",
  "betrieb_id": "uuid",
  "image_base64": "data:image/jpeg;base64,..."
}
```

**Extrahierte Informationen:**
- `projekttyp`: rasen, bepflanzung, terrasse, zaun, andere
- `geschaetzteFlaeche`: Fläche in qm (oder Meter)
- `materialien`: Erkannte Materialien
- `arbeitsaufwand`: Geschätzte Arbeitsstunden
- `besonderheiten`: Spezielle Anforderungen
- `schwierigkeitsgrad`: einfach, mittel, komplex
- `vertrauensgrad`: hoch, mittel, niedrig

**Beispiel Response:**
```json
{
  "projekttyp": "rasen",
  "geschaetzteFlaeche": "150",
  "materialien": ["Rasensaat", "Dünger"],
  "arbeitsaufwand": "20-25",
  "besonderheiten": ["Kleine Steigung", "Regenrinne"],
  "schwierigkeitsgrad": "mittel",
  "vertrauensgrad": "hoch"
}
```

### 2. ⏱️ Intelligente Arbeitsleistungs-Schätzung

Automatische Stunden-Berechnung basierend auf Projekttyp und Komplexität:

```javascript
const hours = await claudeService.estimateWorkingHours(
  'rasen',      // Projekttyp
  100,          // Fläche in qm
  'mittel'      // Komplexität: einfach, mittel, komplex
);
// Returns: 32.5 Stunden
```

**Basis-Schätzungen:**
| Typ | Einfach | Mittel | Komplex |
|-----|---------|--------|---------|
| Rasen | 0.3h/qm | 0.35h/qm | 0.5h/qm |
| Bepflanzung | 0.2h/Pflanze | 0.25h/Pflanze | 0.4h/Pflanze |
| Terrasse | 0.7h/qm | 0.85h/qm | 1.2h/qm |
| Zaun | 0.4h/m | 0.5h/m | 0.75h/m |

### 3. 📝 Smart Angebotsbeschreibung

Claude generiert automatisch professionelle Angebotsbeschreibungen:

```javascript
const description = await claudeService.generateSmartQuoteDescription(
  {
    projekttyp: 'rasen',
    flaeche: '150',
    materialien: ['Rasensaat', 'Dünger'],
    besonderheiten: ['Kleine Steigung']
  },
  'GaLaBau Müller'
);
```

**Beispiel Output:**
```
Wir bieten eine hochwertige Rasenanlage mit Premium-Rasensaat 
und professioneller Bodenvorbereitung. Unser erfahrenes Team 
berücksichtigt alle Besonderheiten Ihres Grundstücks und garantiert 
langfristigen Erfolg mit hochwertigem Material und handwerklicher Qualität.
```

### 4. 🔍 Intelligente Validierung & Optimierung

Claude validiert Kalkulationen auf Realistik:

```javascript
const optimization = await claudeService.validateAndOptimizeQuote(
  {
    materialkosten: 1500,
    arbeitsStunden: 30,
    stundensatz: 50,
    fahrtkosten: 50,
    marge: 35,
    summeNetto: 4000,
    summeBrutto: 4760
  },
  {
    projekttyp: 'rasen',
    flaeche: 100,
    komplexitaet: 'mittel'
  }
);
```

**Response:**
```json
{
  "istRealistisch": true,
  "empfehlungenVerkauf": [
    "Höher bei Premium-Service verkaufen",
    "Liefersicherheit hervorheben",
    "Langzeit-Garantie erwähnen"
  ],
  "risiken": ["Arbeitszeit könnte unterschätzt sein"],
  "margenVergleich": "Ihre Marge von 35% ist im Markt"
}
```

### 5. 💼 Automatische Verkaufsargumente

Claude generiert Verkaufs-Argumente für den Kundenkontakt:

```javascript
const args = await claudeService.generateSalesArguments(
  'rasen',
  'GaLaBau Müller'
);
```

**Beispiel:**
```json
{
  "argument1": "Professionelle Bodenvorbereitung für optimales Wurzelwachstum",
  "argument2": "Premium Rasensaat mit 10 Jahren Garantie",
  "argument3": "Regelmäßige Nachsorge im ersten Jahr inklusive",
  "hinweis": "Erwähnen Sie die Langzeit-Ersparnis beim Kontakt"
}
```

## 🔄 Kompletter AI-Workflow

```
[Kunde schickt Foto]
        ↓
  [Claude Vision analysiert Bild]
        ↓
  [Extrahiert Projekttyp, Fläche, Materialien]
        ↓
  [Schätzt Arbeitsleistung intelligent]
        ↓
  [Generiert automatisch Kalkulation]
        ↓
  [Validiert und optimiert mit Claude]
        ↓
  [Erstellt Angebotsbeschreibung]
        ↓
  [Generiert Verkaufsargumente]
        ↓
  [PDF generieren + Online-Link]
        ↓
  [Kunde erhält professionelles Angebot]
```

## 📊 Beispiel: Rasen-Projekt (100qm)

**Input:**
```bash
POST /api/angebote/ai-generate
{
  "projekt_id": "xyz",
  "betrieb_id": "abc",
  "image_base64": "[Photo of garden]"
}
```

**Claude Vision Analyse:**
```
✅ Projekttyp: Rasen
✅ Fläche: 100qm
✅ Besonderheiten: Kleine Steigung, alte Vegetation
✅ Schwierigkeitsgrad: Mittel
✅ Vertrauensgrad: Hoch
```

**Automatische Kalkulation:**
```
Arbeitsleistung:  35h × €50      = €1.750
Rasensaat:        100qm × €5     = €  500 (mit 35% Marge)
Fahrtkosten:                      = €   50
─────────────────────────────────
Netto:                            = €2.300
MwSt 19%:                         = €  437
─────────────────────────────────
BRUTTO:                           = €2.737
```

**Generierte Angebotsbeschreibung:**
```
Wir bieten Ihnen eine professionelle Rasenanlage mit Premium-Materialien.
Das abfallende Gelände wird optimal ausgeglichen und mit hochwertiger
Rasensaat begrünt. Inklusive Bodenvorbereitung und Anwuchspflege.
```

**Verkaufsargumente:**
- "Professionelle Bodenvorbereitung für optimales Wurzelwachstum"
- "Premium Rasensaat mit bester Keimfähigkeit"
- "Anwuchspflege im ersten Jahr inklusive"

## ⚠️ Error Handling

Falls Claude API nicht erreichbar:
- Service fällt elegant ab und nutzt Standardwerte
- Kalkulation funktioniert weiterhin
- Kunde erhält Angebot (nur ohne AI-Optimierungen)

## 🔐 API Key Management

Benötigt in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-xxx
```

## 💡 Best Practices

1. **Bildqualität**: Klare, gut beleuchtete Fotos liefern beste Ergebnisse
2. **Vertrauensgrad nutzen**: "niedrig" = extra Berechnung vor Angebot
3. **Validierung checken**: Warnung wenn automatische Schätzung unsicher
4. **Verkaufsargumente**: Im Kundengespräch nutzen

## 🚀 Nächste Features (Phase 3+)

- WhatsApp-Bot mit automatischer Foto-Analyse
- Mehrsprachige Angebotsbeschreibungen
- Integration mit Airtable CRM
- Automatische Follow-up Emails
