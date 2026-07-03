import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const client = new Anthropic();

/**
 * Claude AI Service für intelligente GaLaBau-Funktionen
 */
export class ClaudeService {
  /**
   * Analysiert ein Bild eines GaLaBau-Projekts und extrahiert Informationen
   * @param {string} imagePath - Pfad zum Bild oder Base64-encoded
   * @returns {Promise<Object>} - Extrahierte Projektinformationen
   */
  async analyzeProjectImage(imagePath) {
    try {
      const imageData = this._getImageData(imagePath);

      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageData
                }
              },
              {
                type: 'text',
                text: `Du bist ein Experte für Garten- und Landschaftsbau (GaLaBau).
Analysiere dieses Bild eines GaLaBau-Projekts und extrahiere folgende Informationen im JSON-Format:

{
  "projekttyp": "rasen|bepflanzung|terrasse|zaun|andere",
  "geschaetzteFlaeche": "Fläche in qm (oder Länge in Meter für Zaun)",
  "materialien": ["Liste von erkannten Materialien"],
  "arbeitsaufwand": "geschätzte Arbeitsstunden",
  "besonderheiten": ["Liste von speziellen Anforderungen"],
  "schwierigkeitsgrad": "einfach|mittel|komplex",
  "vertrauensgrad": "hoch|mittel|niedrig"
}

Sei konservativ bei Schätzungen. Wenn du dir unsicher bist, nutze "niedrig" bei vertrauensgrad.`
              }
            ]
          }
        ]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Keine JSON-Daten in Antwort gefunden');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('Fehler bei Bildanalyse:', err);
      throw err;
    }
  }

  /**
   * Generiert intelligente Angebots-Beschreibung basierend auf Projektdetails
   */
  async generateSmartQuoteDescription(projektDetails, betriebName) {
    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Du bist ein erfahrener GaLaBau-Betrieb-Besitzer.
Schreibe eine professionelle, kurze Angebotsbeschreibung für folgendes Projekt:

Projekttyp: ${projektDetails.projekttyp}
Fläche/Länge: ${projektDetails.flaeche}
Materialien: ${projektDetails.materialien?.join(', ')}
Besonderheiten: ${projektDetails.besonderheiten?.join(', ')}
Betrieb: ${betriebName}

Die Beschreibung sollte:
- Professionell und präzise sein
- Die Kundenvorteile hervorheben
- Maximal 3-4 Sätze
- Deutsche Sprache
- Für das Angebot geeignet

Nur die Beschreibung, keine zusätzlichen Erklärungen.`
          }
        ]
      });

      return response.content[0].text.trim();
    } catch (err) {
      console.error('Fehler bei Beschreibungsgenerierung:', err);
      return ''; // Fallback: leere Beschreibung
    }
  }

  /**
   * Schätzt automatisch die Arbeitsleistung basierend auf Projekttyp
   */
  async estimateWorkingHours(projekttyp, flaeche, komplexitaet = 'mittel') {
    const baseEstimates = {
      rasen: { einfach: 0.3, mittel: 0.35, komplex: 0.5 }, // h/qm
      bepflanzung: { einfach: 0.2, mittel: 0.25, komplex: 0.4 }, // h/Pflanze
      terrasse: { einfach: 0.7, mittel: 0.85, komplex: 1.2 }, // h/qm
      zaun: { einfach: 0.4, mittel: 0.5, komplex: 0.75 } // h/Meter
    };

    const estimate = baseEstimates[projekttyp]?.[komplexitaet] || 0.3;
    return Math.ceil(flaeche * estimate * 10) / 10; // Runden auf 0.1
  }

  /**
   * Validiert eine Kalkulation und schlägt Anpassungen vor
   */
  async validateAndOptimizeQuote(kalkulationResult, projektDetails) {
    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: `Du bist ein Experte für GaLaBau-Kalkulationen.
Überprüfe folgende Kalkulation auf Realistik und Marktfähigkeit:

PROJEKTDETAILS:
- Typ: ${projektDetails.projekttyp}
- Fläche: ${projektDetails.flaeche}
- Komplexität: ${projektDetails.komplexitaet}

KALKULATION:
- Materialkosten: €${kalkulationResult.materialkosten}
- Arbeitsleistung: ${kalkulationResult.arbeitsStunden}h × €${kalkulationResult.stundensatz}
- Fahrtkosten: €${kalkulationResult.fahrtkosten}
- Marge: ${kalkulationResult.marge}%
- Netto: €${kalkulationResult.summeNetto}
- Brutto: €${kalkulationResult.summeBrutto}

Antworte im JSON-Format:
{
  "istRealistisch": true|false,
  "empfehlungenVerkauf": ["Punkt 1", "Punkt 2"],
  "risiken": ["Risiko 1"],
  "margenVergleich": "Ihre Marge von XXX% ist [unter/im/über] Markt"
}

Sei ehrlich aber konstruktiv.`
          }
        ]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return { istRealistisch: true, empfehlungen: [], risiken: [] };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('Fehler bei Validierung:', err);
      return { istRealistisch: true, empfehlungen: [], risiken: [] };
    }
  }

  /**
   * Generiert Verkaufs-Argumente basierend auf Projektdetails
   */
  async generateSalesArguments(projekttyp, betriebName) {
    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: `Du bist ein Verkaufs-Experte für GaLaBau-Betriebe.
Generiere 3 überzeugende Verkaufsargumente für ein ${projekttyp}-Projekt von ${betriebName}.

Format (JSON):
{
  "argument1": "Text",
  "argument2": "Text",
  "argument3": "Text",
  "hinweis": "Kurzer Hinweis für den Kundenkontakt"
}

Argumente sollten:
- Kundennutzen fokussieren
- Konkret sein
- Marktüblich wirken`
          }
        ]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return {
          argument1: 'Professionelle Ausführung',
          argument2: 'Beste Materialqualität',
          argument3: 'Langfristige Haltbarkeit',
          hinweis: 'Kontakt für Details'
        };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('Fehler bei Verkaufsargumenten:', err);
      return {};
    }
  }

  /**
   * Generische Claude API Anfrage (für Worker Recruitment u.ä.)
   */
  async callClaude(prompt, maxTokens = 1024) {
    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.content[0].text;
    } catch (err) {
      console.error('Fehler bei Claude API Aufruf:', err);
      throw err;
    }
  }

  /**
   * Generiert personalisierte Rekrutierungs-Nachrichten
   */
  async generateRecruitmentMessage(candidate, businessName, messageType = 'initial') {
    try {
      const templates = {
        initial: `Generiere eine kurze, freundliche Rekrutierungs-Nachricht für einen Gärtner/Landschaftsbauer:
Name: ${candidate.name}
Erfahrung: ${candidate.experience_years} Jahre
Skills: ${candidate.skills?.join(', ')}
Firma des Kandidaten: ${candidate.company_name}
Standort: ${candidate.location}
Betriebsname: ${businessName}

Die Nachricht sollte:
- Kurz & prägnant sein (unter 200 Zeichen)
- Persönlich wirken (nicht template-artig)
- Konkret auf die Skills eingehen
- Einen klaren Call-to-Action haben
- Deutsch sein
- Für SMS/WhatsApp geeignet

Nur die Nachricht, ohne Anführungszeichen.`,

        followup: `Generiere eine kurze Follow-up Nachricht für einen Handwerker, den wir vor 3 Tagen kontaktiert haben.
Name: ${candidate.name}
Ursprüngliche Message hatte keinen Response.

Die Nachricht sollte:
- Freundlich bleiben
- Kurz sein (unter 200 Zeichen)
- Einen guten Grund geben, warum wir nochmal schreiben
- Konkrete Opportunity erwähnen (aktuell ein großes Projekt)
- Deutschen sein
- Für SMS/WhatsApp geeignet

Nur die Nachricht.`,

        interest: `Generiere eine Nachricht für einen Handwerker, der Interesse gezeigt hat.
Name: ${candidate.name}
Betriebsname: ${businessName}
Standort: ${candidate.location}

Die Nachricht sollte:
- Enthusiastisch sein
- Konkrete nächste Schritte vorschlagen (Telefonat, Treffen)
- Kurz sein
- Deutsch
- Für SMS/WhatsApp geeignet

Nur die Nachricht.`
      };

      const prompt = templates[messageType] || templates.initial;
      return await this.callClaude(prompt, 500);
    } catch (err) {
      console.error('Fehler bei Message Generation:', err);
      return null;
    }
  }

  /**
   * Hilfsfunktion: Konvertiert Bild zu Base64
   */
  _getImageData(imagePath) {
    // Falls bereits Base64
    if (imagePath.startsWith('data:image') || imagePath.length > 1000) {
      return imagePath.split(',')[1] || imagePath;
    }

    // Falls Dateipfad
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    }

    throw new Error('Ungültiges Bildformat oder Pfad');
  }
}

export default ClaudeService;
