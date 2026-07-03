import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import GaLaBauCalculator from '../calculations/calculator.js';
import { generatePDF } from '../services/pdfGenerator.js';

const router = express.Router();

// Angebot generieren (Kalkulation + PDF)
router.post('/generate', async (req, res) => {
  const { projekt_id, betrieb_id, custom_options } = req.body;

  if (!projekt_id || !betrieb_id) {
    return res.status(400).json({ error: 'Projekt-ID und Betrieb-ID erforderlich' });
  }

  try {
    // 1. Betrieb-Konfiguration abrufen
    const betriebResult = await req.pool.query('SELECT * FROM betriebe WHERE id = $1', [betrieb_id]);
    if (betriebResult.rows.length === 0) {
      return res.status(404).json({ error: 'Betrieb nicht gefunden' });
    }

    const betrieb = betriebResult.rows[0];

    // 2. Projekt + Leistungen abrufen
    const projektResult = await req.pool.query('SELECT * FROM projekte WHERE id = $1', [projekt_id]);
    if (projektResult.rows.length === 0) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' });
    }

    const projekt = projektResult.rows[0];

    const leistungenResult = await req.pool.query('SELECT * FROM projekt_leistungen WHERE projekt_id = $1', [projekt_id]);
    const leistungen = leistungenResult.rows;

    // 3. Kalkulation durchführen
    const calculator = new GaLaBauCalculator(betrieb);
    const kalkulationResult = calculator.calculateQuote(leistungen, custom_options || {});

    // Validierung
    const validation = calculator.validateCalculation(kalkulationResult);
    if (!validation.valid) {
      console.warn('⚠️  Validierungswarnungen:', validation.issues);
    }

    // 4. Angebotsnummer generieren
    const angebotsnummer = `GLA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 5. Gültigkeitsdatum: 7 Tage
    const gueltig_bis = new Date();
    gueltig_bis.setDate(gueltig_bis.getDate() + 7);

    // 6. PDF generieren (optional)
    let pdfUrl = null;
    try {
      pdfUrl = await generatePDF({
        angebotsnummer,
        projekt,
        betrieb,
        kalkulationResult,
        gueltig_bis
      });
    } catch (pdfErr) {
      console.warn('⚠️  PDF-Generierung fehlgeschlagen (wird später generiert):', pdfErr.message);
    }

    // 7. Angebot in DB speichern
    const angebot_id = uuidv4();
    const angebotResult = await req.pool.query(
      `INSERT INTO angebote (id, projekt_id, betrieb_id, angebotsnummer, gueltig_bis, summe_netto, mwst, summe_brutto, pdf_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [angebot_id, projekt_id, betrieb_id, angebotsnummer, gueltig_bis, kalkulationResult.summeNetto, kalkulationResult.mwst, kalkulationResult.summeBrutto, pdfUrl, 'draft']
    );

    res.status(201).json({
      message: '✅ Angebot generiert',
      angebot: angebotResult.rows[0],
      kalkulation: kalkulationResult,
      validierung: validation
    });
  } catch (err) {
    console.error('Fehler bei Angebotsgenerierung:', err);
    res.status(500).json({ error: 'Fehler bei Angebotsgenerierung: ' + err.message });
  }
});

// Angebot abrufen
router.get('/:id', async (req, res) => {
  try {
    const result = await req.pool.query('SELECT * FROM angebote WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Angebot nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen' });
  }
});

// Angebote für Betrieb auflisten
router.get('/betrieb/:betrieb_id', async (req, res) => {
  try {
    const result = await req.pool.query(
      'SELECT * FROM angebote WHERE betrieb_id = $1 ORDER BY datum_erstellt DESC LIMIT 50',
      [req.params.betrieb_id]
    );

    res.json({ angebote: result.rows });
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen' });
  }
});

// Angebot-Status aktualisieren (sent, viewed, accepted, rejected)
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }

  try {
    const result = await req.pool.query(
      'UPDATE angebote SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Angebot nicht gefunden' });
    }

    res.json({ message: '✅ Status aktualisiert', angebot: result.rows[0] });
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

export default router;
