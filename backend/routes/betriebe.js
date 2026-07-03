import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Betrieb erstellen
router.post('/', async (req, res) => {
  const { name, email, whatsapp_number, int_stundensatz, standard_marge_percent, fahrtkosten } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name und E-Mail erforderlich' });
  }

  try {
    const id = uuidv4();
    const result = await req.pool.query(
      `INSERT INTO betriebe (id, name, email, whatsapp_number, int_stundensatz, standard_marge_percent, fahrtkosten)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name, email, whatsapp_number || null, int_stundensatz || 45, standard_marge_percent || 35, fahrtkosten || 50]
    );

    res.status(201).json({
      message: '✅ Betrieb erfolgreich erstellt',
      betrieb: result.rows[0]
    });
  } catch (err) {
    console.error('Fehler beim Erstellen des Betriebs:', err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Betriebs' });
  }
});

// Betrieb abrufen
router.get('/:id', async (req, res) => {
  try {
    const result = await req.pool.query('SELECT * FROM betriebe WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Betrieb nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen des Betriebs' });
  }
});

// Betrieb aktualisieren
router.put('/:id', async (req, res) => {
  const { name, whatsapp_number, int_stundensatz, standard_marge_percent, fahrtkosten, logo_url } = req.body;

  try {
    const updates = [];
    const params = [req.params.id];
    let paramIndex = 2;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (whatsapp_number) {
      updates.push(`whatsapp_number = $${paramIndex++}`);
      params.push(whatsapp_number);
    }
    if (int_stundensatz !== undefined) {
      updates.push(`int_stundensatz = $${paramIndex++}`);
      params.push(int_stundensatz);
    }
    if (standard_marge_percent !== undefined) {
      updates.push(`standard_marge_percent = $${paramIndex++}`);
      params.push(standard_marge_percent);
    }
    if (fahrtkosten !== undefined) {
      updates.push(`fahrtkosten = $${paramIndex++}`);
      params.push(fahrtkosten);
    }
    if (logo_url) {
      updates.push(`logo_url = $${paramIndex++}`);
      params.push(logo_url);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'Keine Änderungen zu speichern' });
    }

    const result = await req.pool.query(
      `UPDATE betriebe SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Betrieb nicht gefunden' });
    }

    res.json({
      message: '✅ Betrieb aktualisiert',
      betrieb: result.rows[0]
    });
  } catch (err) {
    console.error('Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

export default router;
