import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import GaLaBauCalculator from '../calculations/calculator.js';
import ClaudeService from '../services/claudeService.js';
import { generatePDF } from '../services/pdfGenerator.js';

const router = express.Router();
const claudeService = new ClaudeService();

/**
 * AI-Angebot generieren: Image-Analyse + intelligente Kalkulation
 * POST /api/angebote/ai-generate
 */
router.post('/ai-generate', async (req, res) => {
  const { projekt_id, betrieb_id, image_base64, imageUrl, custom_options } = req.body;

  if (!projekt_id || !betrieb_id || (!image_base64 && !imageUrl)) {
    return res.status(400).json({
      error: 'projekt_id, betrieb_id und image_base64/imageUrl erforderlich'
    });
  }

  try {
    console.log('🤖 AI-Angebotsgenerierung gestartet...');

    // 1. Bild analysieren mit Claude Vision
    console.log('📸 Analysiere Projektbild...');
    const imageAnalysis = await claudeService.analyzeProjectImage(image_base64 || imageUrl);
    console.log('✅ Bildanalyse:', imageAnalysis);

    // 2. Projekt + Betrieb abrufen
    const betriebResult = await req.pool.query('SELECT * FROM betriebe WHERE id = $1', [betrieb_id]);
    if (betriebResult.rows.length === 0) {
      return res.status(404).json({ error: 'Betrieb nicht gefunden' });
    }

    const projektResult = await req.pool.query('SELECT * FROM projekte WHERE id = $1', [projekt_id]);
    if (projektResult.rows.length === 0) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' });
    }

    const betrieb = betriebResult.rows[0];
    const projekt = projektResult.rows[0];

    // 3. Arbeitsleistung schätzen
    console.log('⏱️  Schätze Arbeitsleistung...');
    const estimatedHours = await claudeService.estimateWorkingHours(
      imageAnalysis.projekttyp,
      parseFloat(imageAnalysis.geschaetzteFlaeche),
      imageAnalysis.schwierigkeitsgrad
    );
    console.log('✅ Geschätzte Stunden:', estimatedHours);

    // 4. Auto-Leistungen generieren basierend auf Bildanalyse
    const calculator = new GaLaBauCalculator(betrieb);
    let kalkulationResult;

    if (['rasen', 'bepflanzung', 'terrasse', 'zaun'].includes(imageAnalysis.projekttyp)) {
      // GaLaBau-Standard-Kalkulation nutzen
      const projektDetails = {
        qm: parseFloat(imageAnalysis.geschaetzteFlaeche),
        meter: parseFloat(imageAnalysis.geschaetzteFlaeche), // Für Zaun
        anzahlPflanzen: parseFloat(imageAnalysis.geschaetzteFlaeche), // Für Bepflanzung
        materialTyp: imageAnalysis.schwierigkeitsgrad === 'komplex' ? 'premium' : 'standard'
      };

      kalkulationResult = calculator.calculateByType(imageAnalysis.projekttyp, projektDetails);
    } else {
      // Manuelle Leistungsberechnung
      const leistungen = [
        {
          typ: 'arbeit',
          beschreibung: `${imageAnalysis.projekttyp} - Arbeitsleistung`,
          menge: estimatedHours,
          einheit: 'h',
          preis_pro_einheit: betrieb.int_stundensatz
        },
        ...(imageAnalysis.materialien.length > 0 ? [{
          typ: 'material',
          beschreibung: `Materialien: ${imageAnalysis.materialien.join(', ')}`,
          menge: 1,
          einheit: 'Paket',
          preis_pro_einheit: parseFloat(imageAnalysis.geschaetzteFlaeche) * 20 // Rough estimate
        }] : [])
      ];

      kalkulationResult = calculator.calculateQuote(leistungen, custom_options || {});
    }

    // 5. Kalkulation validieren + optimieren
    console.log('🔍 Validiere Kalkulation...');
    const validation = calculator.validateCalculation(kalkulationResult);
    const optimization = await claudeService.validateAndOptimizeQuote(
      {
        materialkosten: kalkulationResult.summeNetto * 0.4, // Rough split
        arbeitsStunden: estimatedHours,
        stundensatz: betrieb.int_stundensatz,
        fahrtkosten: betrieb.fahrtkosten,
        marge: betrieb.standard_marge_percent,
        summeNetto: kalkulationResult.summeNetto,
        summeBrutto: kalkulationResult.summeBrutto
      },
      {
        projekttyp: imageAnalysis.projekttyp,
        flaeche: imageAnalysis.geschaetzteFlaeche,
        komplexitaet: imageAnalysis.schwierigkeitsgrad
      }
    );

    // 6. Verkaufsargumente generieren
    console.log('💼 Generiere Verkaufsargumente...');
    const salesArgs = await claudeService.generateSalesArguments(
      imageAnalysis.projekttyp,
      betrieb.name
    );

    // 7. Beschreibung generieren
    console.log('📝 Generiere Angebotsbeschreibung...');
    const description = await claudeService.generateSmartQuoteDescription(
      {
        projekttyp: imageAnalysis.projekttyp,
        flaeche: imageAnalysis.geschaetzteFlaeche,
        materialien: imageAnalysis.materialien,
        besonderheiten: imageAnalysis.besonderheiten
      },
      betrieb.name
    );

    // 8. Angebotsnummer generieren
    const angebotsnummer = `GLA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const gueltig_bis = new Date();
    gueltig_bis.setDate(gueltig_bis.getDate() + 7);

    // 9. PDF generieren
    console.log('📄 Generiere PDF...');
    let pdfUrl = null;
    try {
      pdfUrl = await generatePDF({
        angebotsnummer,
        projekt: { ...projekt, beschreibung: description },
        betrieb,
        kalkulationResult,
        gueltig_bis
      });
    } catch (pdfErr) {
      console.warn('⚠️  PDF-Generierung fehlgeschlagen:', pdfErr.message);
    }

    // 10. Online-Link generieren
    const onlineLink = `/quotes/${angebotsnummer}`;

    // 11. In DB speichern
    const angebot_id = uuidv4();
    const angebotResult = await req.pool.query(
      `INSERT INTO angebote (id, projekt_id, betrieb_id, angebotsnummer, gueltig_bis, summe_netto, mwst, summe_brutto, pdf_url, online_link, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        angebot_id, projekt_id, betrieb_id, angebotsnummer, gueltig_bis,
        kalkulationResult.summeNetto, kalkulationResult.mwst, kalkulationResult.summeBrutto,
        pdfUrl, onlineLink, 'draft'
      ]
    );

    console.log('✅ AI-Angebot erfolgreich generiert');

    res.status(201).json({
      message: '✅ AI-Angebot mit Bildanalyse generiert',
      angebot: angebotResult.rows[0],
      ai_analysis: {
        imageAnalysis,
        estimatedHours,
        description,
        salesArguments: salesArgs,
        validation,
        optimization
      },
      kalkulation: kalkulationResult
    });
  } catch (err) {
    console.error('❌ Fehler bei AI-Angebotsgenerierung:', err);
    res.status(500).json({
      error: 'Fehler bei AI-Angebotsgenerierung: ' + err.message
    });
  }
});

/**
 * Online-Angebots-Link abrufen (für Kunde)
 * GET /api/angebote/quote/:angebotsnummer
 */
router.get('/quote/:angebotsnummer', async (req, res) => {
  try {
    const result = await req.pool.query(
      'SELECT * FROM angebote WHERE angebotsnummer = $1',
      [req.params.angebotsnummer]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Angebot nicht gefunden' });
    }

    const angebot = result.rows[0];

    // Projekt + Betrieb abrufen
    const projektResult = await req.pool.query('SELECT * FROM projekte WHERE id = $1', [angebot.projekt_id]);
    const betriebResult = await req.pool.query('SELECT * FROM betriebe WHERE id = $1', [angebot.betrieb_id]);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Angebot ${angebot.angebotsnummer}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 800px;
            width: 100%;
            padding: 40px;
          }
          .header {
            border-bottom: 4px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          h1 { color: #667eea; font-size: 28px; margin-bottom: 10px; }
          .angebotsnummer { color: #999; font-size: 14px; }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .info-box {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          }
          .info-label { color: #667eea; font-weight: bold; font-size: 12px; margin-bottom: 5px; }
          .info-value { color: #333; font-size: 16px; }
          .amount-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
          }
          .amount-label { font-size: 14px; opacity: 0.9; margin-bottom: 10px; }
          .amount { font-size: 42px; font-weight: bold; }
          .actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
          }
          .btn {
            padding: 15px 20px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          .btn-primary {
            background: #667eea;
            color: white;
          }
          .btn-primary:hover { background: #5568d3; transform: translateY(-2px); }
          .btn-secondary {
            background: #f0f0f0;
            color: #333;
            border: 2px solid #667eea;
          }
          .btn-secondary:hover { background: #667eea; color: white; }
          .terms {
            font-size: 12px;
            color: #999;
            line-height: 1.6;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .signature-section {
            border-top: 2px solid #f0f0f0;
            padding-top: 20px;
            margin-top: 20px;
          }
          .signature-area { display: flex; gap: 30px; margin-bottom: 20px; }
          .signature-box { flex: 1; }
          .signature-label { font-size: 12px; color: #999; margin-bottom: 10px; }
          .signature-line {
            border-bottom: 2px solid #333;
            height: 80px;
            display: flex;
            align-items: flex-end;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #999;
            padding-top: 20px;
            border-top: 1px solid #f0f0f0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${betriebResult.rows[0]?.name || 'Angebot'}</h1>
            <div class="angebotsnummer">Angebot: ${angebot.angebotsnummer}</div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">KUNDE</div>
              <div class="info-value">${projektResult.rows[0]?.kunde_name}</div>
            </div>
            <div class="info-box">
              <div class="info-label">GÜLTIG BIS</div>
              <div class="info-value">${new Date(angebot.gueltig_bis).toLocaleDateString('de-DE')}</div>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-label">ANGEBOTSPREIS (BRUTTO)</div>
            <div class="amount">€ ${angebot.summe_brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</div>
          </div>

          <div class="actions">
            <button class="btn btn-primary" onclick="acceptQuote()">✅ Angebot annehmen</button>
            <button class="btn btn-secondary" onclick="downloadPDF()">📄 PDF herunterladen</button>
          </div>

          <div class="terms">
            <strong>Allgemeine Bedingungen:</strong>
            <p>
              Dieses Angebot ist gültig bis ${new Date(angebot.gueltig_bis).toLocaleDateString('de-DE')}.
              Mit der Annahme akzeptieren Sie die Bedingungen und es entsteht ein verbindlicher Auftrag.
              Der Auftragnehmer behält sich vor, Änderungen nach Auftragserteilung separat zu berechnen.
            </p>
          </div>

          <div class="signature-section">
            <div class="signature-area">
              <div class="signature-box">
                <div class="signature-label">Unterschrift Kunde</div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-box">
                <div class="signature-label">Datum</div>
                <div class="signature-line"></div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Generiert für ${betriebResult.rows[0]?.name} | ${betriebResult.rows[0]?.email}</p>
          </div>
        </div>

        <script>
          function acceptQuote() {
            alert('✅ Angebot akzeptiert! Der Betrieb wird kontaktiert.');
          }
          function downloadPDF() {
            window.location.href = '${angebot.pdf_url || '#'}';
          }
        </script>
      </body>
      </html>
    `;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen des Angebots' });
  }
});

export default router;
