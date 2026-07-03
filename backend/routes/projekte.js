import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Projekt erstellen
router.post('/', async (req, res) => {
  const { betrieb_id, kunde_name, kunde_email, kunde_telefon, kunde_adresse, beschreibung, projekttyp, leistungen } = req.body;

  if (!betrieb_id || !kunde_name) {
    return res.status(400).json({ error: 'Betrieb-ID und Kundename erforderlich' });
  }

  try {
    const projekt_id = uuidv4();

    // Projekt erstellen
    await req.pool.query(
      `INSERT INTO projekte (id, betrieb_id, kunde_name, kunde_email, kunde_telefon, kunde_adresse, beschreibung, projekttyp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [projekt_id, betrieb_id, kunde_name, kunde_email || null, kunde_telefon || null, kunde_adresse || null, beschreibung || null, projekttyp || null]
    );

    // Leistungen hinzufügen
    if (leistungen && Array.isArray(leistungen)) {
      for (const leistung of leistungen) {
        const leistung_id = uuidv4();
        await req.pool.query(
          `INSERT INTO projekt_leistungen (id, projekt_id, typ, beschreibung, menge, einheit, preis_pro_einheit, gesamt_preis)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [leistung_id, projekt_id, leistung.typ, leistung.beschreibung, leistung.menge, leistung.einheit || 'Stk', leistung.preis_pro_einheit, leistung.gesamt_preis || 0]
        );
      }
    }

    const result = await req.pool.query('SELECT * FROM projekte WHERE id = $1', [projekt_id]);

    res.status(201).json({
      message: '✅ Projekt erstellt',
      projekt: result.rows[0]
    });
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Projekts' });
  }
});

// Projekt abrufen (mit Leistungen)
router.get('/:id', async (req, res) => {
  try {
    const projektResult = await req.pool.query('SELECT * FROM projekte WHERE id = $1', [req.params.id]);

    if (projektResult.rows.length === 0) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' });
    }

    const leistungenResult = await req.pool.query('SELECT * FROM projekt_leistungen WHERE projekt_id = $1', [req.params.id]);

    res.json({
      projekt: projektResult.rows[0],
      leistungen: leistungenResult.rows
    });
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen' });
  }
});

// Leistung hinzufügen
router.post('/:id/leistungen', async (req, res) => {
  const { typ, beschreibung, menge, einheit, preis_pro_einheit, gesamt_preis } = req.body;

  if (!typ || !beschreibung || !menge) {
    return res.status(400).json({ error: 'Typ, Beschreibung und Menge erforderlich' });
  }

  try {
    const leistung_id = uuidv4();
    const result = await req.pool.query(
      `INSERT INTO projekt_leistungen (id, projekt_id, typ, beschreibung, menge, einheit, preis_pro_einheit, gesamt_preis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [leistung_id, req.params.id, typ, beschreibung, menge, einheit || 'Stk', preis_pro_einheit || 0, gesamt_preis || 0]
    );

    res.status(201).json({
      message: '✅ Leistung hinzugefügt',
      leistung: result.rows[0]
    });
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Hinzufügen der Leistung' });
  }
});

export default router;
