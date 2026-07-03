import express from 'express';
import WorkerService from '../workers/workerService.js';
import MessagingService from '../messaging/messagingService.js';

const router = express.Router();

// Wird aus server.js injiziert
let workerService, messagingService, pool;

export function initWorkerRoutes(p) {
  pool = p;
  workerService = new WorkerService(pool);
  messagingService = new MessagingService();
}

// ============================================
// WORKER MANAGEMENT
// ============================================

/**
 * GET /api/workers - Alle Kandidaten abrufen
 */
router.get('/', async (req, res) => {
  try {
    const stage = req.query.stage || null;
    const minScore = parseInt(req.query.minScore) || 0;

    let query = 'SELECT * FROM candidates WHERE qualification_score >= $1';
    let params = [minScore];

    if (stage) {
      query += ' AND pipeline_stage = $2';
      params.push(stage);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json({
      success: true,
      count: result.rows.length,
      candidates: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/workers/:id - Einzelnen Kandidaten abrufen
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM candidates WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Kandidat nicht gefunden' });
    }

    // Hole auch Nachrichten-History
    const messagesResult = await pool.query(
      'SELECT * FROM messages WHERE candidate_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      success: true,
      candidate: result.rows[0],
      messages: messagesResult.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/workers/:id/stage - Update Kandidaten-Stage
 */
router.put('/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;

    if (!['identified', 'message_sent', 'viewed', 'interested', 'qualified', 'hired', 'rejected'].includes(stage)) {
      return res.status(400).json({ success: false, error: 'Ungültige Stage' });
    }

    await pool.query(
      'UPDATE candidates SET pipeline_stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [stage, req.params.id]
    );

    res.json({ success: true, message: 'Stage aktualisiert' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/workers/:id/note - Notiz hinzufügen (in messages speichern als interne Notiz)
 */
router.post('/:id/note', async (req, res) => {
  try {
    const { note } = req.body;

    await pool.query(`
      INSERT INTO messages (candidate_id, channel, content, status)
      VALUES ($1, 'internal_note', $2, 'completed')
    `, [req.params.id, note]);

    res.json({ success: true, message: 'Notiz hinzugefügt' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SCRAPING & AUTOMATION
// ============================================

/**
 * POST /api/workers/scrape/now - Starte Scraping sofort
 */
router.post('/scrape/now', async (req, res) => {
  try {
    const result = await workerService.scrapeAndProcessCandidates({
      regions: req.body.regions || ['berlin', 'brandenburg'],
      limit: req.body.limit || 50
    });

    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/workers/pipeline/stats - Pipeline Statistiken
 */
router.get('/pipeline/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pipeline_stage,
        COUNT(*) as count,
        ROUND(AVG(qualification_score)::numeric, 0) as avg_score
      FROM candidates
      GROUP BY pipeline_stage
      ORDER BY pipeline_stage
    `);

    res.json({
      success: true,
      stats: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// MESSAGING
// ============================================

/**
 * POST /api/workers/:id/send-message - Sende Nachricht an Kandidaten
 */
router.post('/:id/send-message', async (req, res) => {
  try {
    const { message, channel } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Nachricht erforderlich' });
    }

    // Hole Kandidaten
    const candidateResult = await pool.query(
      'SELECT * FROM candidates WHERE id = $1',
      [req.params.id]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Kandidat nicht gefunden' });
    }

    const candidate = candidateResult.rows[0];

    // Versende
    const result = await messagingService.sendViaPreferredChannel(candidate, message, channel);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Speichere in DB
    await pool.query(`
      INSERT INTO messages (candidate_id, channel, content, phone_or_email, status, sent_at)
      VALUES ($1, $2, $3, $4, 'sent', CURRENT_TIMESTAMP)
    `, [req.params.id, result.channel || channel, message, candidate.phone || candidate.email]);

    res.json({ success: true, result: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/workers/:id/messages - Nachrichten-History für Kandidaten
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM messages WHERE candidate_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CAMPAIGNS
// ============================================

/**
 * GET /api/workers/campaigns - Alle Kampagnen
 */
router.get('/campaigns', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM campaign_settings ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      campaigns: result.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/workers/campaigns - Neue Kampagne erstellen
 */
router.post('/campaigns', async (req, res) => {
  try {
    const {
      name,
      region_filter,
      skill_filter,
      message_interval_days,
      max_follow_ups,
      daily_send_limit
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name erforderlich' });
    }

    const result = await pool.query(`
      INSERT INTO campaign_settings (
        name, region_filter, skill_filter, message_interval_days, max_follow_ups, daily_send_limit, active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [
      name,
      region_filter ? JSON.stringify(region_filter) : null,
      skill_filter ? JSON.stringify(skill_filter) : null,
      message_interval_days || 3,
      max_follow_ups || 2,
      daily_send_limit || 50
    ]);

    res.json({
      success: true,
      campaign: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
