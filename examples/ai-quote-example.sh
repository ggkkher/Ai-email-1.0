#!/bin/bash

# GaLaBau AI-Angebots-Beispiel
# Demonstriert die Bildanalyse + intelligente Angebotsgenerierung

BASE_URL="http://localhost:3001/api"

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== GaLaBau AI-Angebots-System Demo ===${NC}\n"

# Step 1: Betrieb erstellen
echo -e "${BLUE}1️⃣  Erstelle Betrieb...${NC}"
BETRIEB=$(curl -s -X POST "$BASE_URL/betriebe" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GaLaBau Schmidt",
    "email": "info@galabau-schmidt.de",
    "int_stundensatz": 50,
    "standard_marge_percent": 35,
    "fahrtkosten": 50
  }')

BETRIEB_ID=$(echo $BETRIEB | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
echo -e "${GREEN}✅ Betrieb erstellt: $BETRIEB_ID${NC}\n"

# Step 2: Projekt erstellen
echo -e "${BLUE}2️⃣  Erstelle Projekt...${NC}"
PROJEKT=$(curl -s -X POST "$BASE_URL/projekte" \
  -H "Content-Type: application/json" \
  -d "{
    \"betrieb_id\": \"$BETRIEB_ID\",
    \"kunde_name\": \"Karl Müller\",
    \"kunde_email\": \"karl@example.de\",
    \"kunde_adresse\": \"Gartenstr. 42, 10115 Berlin\",
    \"projekttyp\": \"rasen\"
  }")

PROJEKT_ID=$(echo $PROJEKT | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
echo -e "${GREEN}✅ Projekt erstellt: $PROJEKT_ID${NC}\n"

# Step 3: AI-Angebot mit Bildanalyse generieren
echo -e "${BLUE}3️⃣  Generiere AI-Angebot mit Bildanalyse...${NC}"

# Beispiel: Base64-encoded Test-Image (in Produktion würde echtes Foto kommen)
TEST_IMAGE="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDA..." # Abgekürzt

ANGEBOT=$(curl -s -X POST "$BASE_URL/angebote/ai-generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"projekt_id\": \"$PROJEKT_ID\",
    \"betrieb_id\": \"$BETRIEB_ID\",
    \"image_base64\": \"$TEST_IMAGE\",
    \"custom_options\": {
      \"mitFahrtkosten\": true
    }
  }")

echo $ANGEBOT | jq '.'
echo ""

# Step 4: Angebots-ID extrahieren
ANGEBOT_ID=$(echo $ANGEBOT | jq -r '.angebot.id' 2>/dev/null)
ANGEBOTSNUMMER=$(echo $ANGEBOT | jq -r '.angebot.angebotsnummer' 2>/dev/null)

echo -e "${GREEN}✅ AI-Angebot generiert${NC}"
echo -e "   ID: $ANGEBOT_ID"
echo -e "   Nummer: $ANGEBOTSNUMMER"
echo ""

# Step 5: Online-Angebots-Link abrufen
echo -e "${BLUE}4️⃣  Abrufe Online-Angebots-Link...${NC}"
ONLINE_LINK="http://localhost:3001/api/angebote/quote/$ANGEBOTSNUMMER"
echo -e "${GREEN}✅ Kunde kann Angebot hier einsehen:${NC}"
echo -e "   $ONLINE_LINK\n"

# Step 6: Kalkulation anzeigen
echo -e "${BLUE}5️⃣  Kalkulations-Details:${NC}"
echo $ANGEBOT | jq '.kalkulation' || echo "Kalkulation nicht verfügbar"
echo ""

# Step 7: AI-Analyse anzeigen
echo -e "${BLUE}6️⃣  AI-Analyse-Details:${NC}"
echo $ANGEBOT | jq '.ai_analysis' || echo "AI-Analyse nicht verfügbar"
echo ""

# Step 8: Angebot als "gesendet" markieren
echo -e "${BLUE}7️⃣  Markiere Angebot als 'gesendet'...${NC}"
curl -s -X PATCH "$BASE_URL/angebote/$ANGEBOT_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "sent"}' | jq '.'

echo -e "\n${GREEN}=== Demo abgeschlossen! ===${NC}\n"

echo "Zusammenfassung:"
echo "- Betrieb: $BETRIEB_ID"
echo "- Projekt: $PROJEKT_ID"
echo "- Angebot: $ANGEBOT_ID ($ANGEBOTSNUMMER)"
echo "- Online: $ONLINE_LINK"
echo ""
echo "Nächste Schritte:"
echo "1. Angebot per Mail an Kunde senden"
echo "2. Online-Link via WhatsApp teilen"
echo "3. Kundenreaktion in Dashboard verfolgn"
