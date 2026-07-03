import cron from 'node-cron';
import { Pool } from 'pg';
import WorkerService from './workerService.js';
import MessagingService from '../messaging/messagingService.js';
import MessageQueue from '../messaging/messageQueue.js';
import ClaudeService from '../services/claudeService.js';

// Orchestrator für Worker Recruitment Automation
export class AutomationOrchestrator {
  constructor(pool) {
    this.pool = pool;
    this.workerService = new WorkerService(pool);
    this.messagingService = new MessagingService();
    this.messageQueue = new MessageQueue();
    this.claudeService = new ClaudeService();
    this.isRunning = false;
  }

  /**
   * Starte Automation
   */
  async start() {
    console.log('\n🚀 Starte Worker Recruitment Automation Orchestrator\n');

    await this.messageQueue.connect();

    // Job 1: Tägliches Scraping (jeden Tag um 02:00 Uhr)
    cron.schedule('0 2 * * *', () => {
      this.runScrapingCycle();
    });
    console.log('📅 Scraping Job geplant: täglich um 02:00 Uhr');

    // Job 2: Nachrichten-Versand (alle 15 Minuten)
    cron.schedule('*/15 * * * *', () => {
      this.runMessageSendingCycle();
    });
    console.log('📅 Message Sending Job geplant: alle 15 Minuten');

    // Job 3: Response Tracking (alle 30 Minuten)
    cron.schedule('*/30 * * * *', () => {
      this.runResponseTrackingCycle();
    });
    console.log('📅 Response Tracking Job geplant: alle 30 Minuten');

    // Job 4: Pipeline Cleanup (täglich um 03:00 Uhr)
    cron.schedule('0 3 * * *', () => {
      this.runPipelineCleanup();
    });
    console.log('📅 Pipeline Cleanup Job geplant: täglich um 03:00 Uhr');

    this.isRunning = true;
    console.log('\n✅ Automation läuft!\n');
  }

  /**
   * Scraping Cycle: Identifiziere neue Kandidaten
   */
  async runScrapingCycle() {
    console.log('\n\n--- 🔍 SCRAPING CYCLE START ---');
    const startTime = Date.now();

    try {
      const result = await this.workerService.scrapeAndProcessCandidates({
        regions: ['berlin', 'brandenburg'],
        limit: 100
      });

      console.log(`\n✅ Scraping Cycle abgeschlossen: ${result.total_saved} neue Kandidaten\n`);

      // Überschreibe zu Pipeline auslösen
      await this.triggerOutreachForNewCandidates();

    } catch (error) {
      console.error('❌ Scraping Cycle Fehler:', error.message);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`--- Dauer: ${duration}s ---\n`);
  }

  /**
   * Trigger Outreach für neue Kandidaten
   */
  async triggerOutreachForNewCandidates() {
    console.log('\n📤 Trigger Outreach für neue Kandidaten...');

    try {
      // Hole qualifizierte neue Kandidaten (score >= 60, stage = identified)
      const candidates = await this.workerService.getQualifiedCandidates(60);

      if (candidates.length === 0) {
        console.log('Keine neuen qualifizierten Kandidaten');
        return;
      }

      console.log(`🎯 ${candidates.length} Kandidaten für Outreach qualifiziert`);

      // Generiere Nachrichten und füge zur Queue hinzu
      for (const candidate of candidates.slice(0, 50)) { // Limit 50/Tag
        try {
          const message = await this.claudeService.generateRecruitmentMessage(
            candidate,
            'Kania GaLaBau',
            'initial'
          );

          if (!message) {
            console.warn(`⚠️  Keine Nachricht generiert für ${candidate.name}`);
            continue;
          }

          // Bestimme Kanal (Phone preferiert)
          const channel = candidate.phone ? 'whatsapp' : 'email';
          const contact = candidate.phone || candidate.email;

          // Enqueue Nachricht für Versand
          await this.messageQueue.enqueue({
            candidate_id: candidate.id,
            phone_or_email: contact,
            channel: channel,
            content: message,
            scheduled_at: this.getRandomScheduledTime(), // Streue Zeiten über Tag
            max_retries: 2
          });

          // Update Stage zu "message_sent"
          await this.workerService.updateCandidateStage(candidate.id, 'message_sent');

          console.log(`✅ Nachricht enqueued: ${candidate.name} → ${contact}`);
        } catch (error) {
          console.error(`❌ Fehler bei ${candidate.name}:`, error.message);
        }
      }

    } catch (error) {
      console.error('❌ Outreach Trigger Fehler:', error.message);
    }
  }

  /**
   * Message Sending Cycle: Versende queued Nachrichten
   */
  async runMessageSendingCycle() {
    try {
      const stats = await this.messageQueue.getStats();
      if (stats.queued === 0) return;

      console.log(`\n📤 Message Sending Cycle: ${stats.queued} queued Nachrichten`);

      // Hole Nachrichten zum Versand
      const messages = await this.messageQueue.getMessagesToSend(20);

      if (messages.length === 0) return;

      // Versende Batch
      const sendMessages = messages.map(msg => ({
        candidate_id: msg.candidate_id,
        phone_or_email: msg.phone_or_email,
        channel: msg.channel,
        content: msg.content
      }));

      const result = await this.messagingService.sendBatch(sendMessages, 500);

      // Update Message Status in Queue
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const sendResult = result.results[i];

        if (sendResult.success) {
          await this.messageQueue.markAsSent(msg.id, sendResult);

          // Speichere in DB
          await this.pool.query(`
            INSERT INTO messages (
              candidate_id, channel, content, phone_or_email, status, sent_at, message_order
            ) VALUES ($1, $2, $3, $4, $5, $6, 1)
          `, [msg.candidate_id, msg.channel, msg.content, msg.phone_or_email, 'sent', new Date()]);
        } else {
          // Retry
          await this.messageQueue.retryMessage(msg.id);
        }
      }

      console.log(`✅ ${result.successful}/${result.total} Nachrichten versendet`);
    } catch (error) {
      console.error('❌ Message Sending Fehler:', error.message);
    }
  }

  /**
   * Response Tracking Cycle: Tracke Replies
   */
  async runResponseTrackingCycle() {
    try {
      console.log('\n👂 Response Tracking Cycle');

      // In echter Implementierung würde hier Twilio Webhook Callbacks verarbeitet
      // oder SMS-Replies von der Twilio API abgerufen

      // Für jetzt: Aktualisiere Candidate Stage basierend auf Message Status
      const result = await this.pool.query(`
        UPDATE candidates
        SET pipeline_stage = 'viewed'
        WHERE pipeline_stage = 'message_sent'
        AND created_at < NOW() - INTERVAL '4 hours'
        AND qualification_score >= 70
      `);

      if (result.rowCount > 0) {
        console.log(`✅ ${result.rowCount} Kandidaten auf 'viewed' aktualisiert`);
      }
    } catch (error) {
      console.error('❌ Response Tracking Fehler:', error.message);
    }
  }

  /**
   * Pipeline Cleanup: Schließe inactive Kandidaten
   */
  async runPipelineCleanup() {
    try {
      console.log('\n🧹 Pipeline Cleanup Cycle');

      // Archiviere Kandidaten ohne Responses nach 30 Tagen
      const result = await this.pool.query(`
        UPDATE candidates
        SET pipeline_stage = 'rejected'
        WHERE pipeline_stage IN ('identified', 'message_sent', 'viewed')
        AND created_at < NOW() - INTERVAL '30 days'
      `);

      console.log(`✅ ${result.rowCount} Kandidaten archiviert`);

      // Gebe Pipeline Stats aus
      const stats = await this.workerService.getPipelineStats();
      console.log('\n📊 Pipeline Stats:');
      stats.forEach(row => {
        console.log(`  ${row.pipeline_stage}: ${row.count} (Ø Score: ${Math.round(row.avg_score || 0)})`);
      });

    } catch (error) {
      console.error('❌ Cleanup Fehler:', error.message);
    }
  }

  /**
   * Hilfsfunktion: Zufällige Versendungszeit über den Tag
   */
  getRandomScheduledTime() {
    const now = new Date();

    // Verteile über 9-18 Uhr (Arbeitszeiten)
    const hour = 9 + Math.floor(Math.random() * 9);
    const minute = Math.floor(Math.random() * 60);

    const scheduled = new Date();
    scheduled.setHours(hour, minute, 0, 0);

    // Falls Zeit in Vergangenheit, verschiebe auf morgen
    if (scheduled < now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled.toISOString();
  }

  /**
   * Manuelle Triggers (für Admin/Testing)
   */
  async scrapeNow() {
    await this.runScrapingCycle();
  }

  async sendMessagesNow() {
    await this.runMessageSendingCycle();
  }

  async trackResponsesNow() {
    await this.runResponseTrackingCycle();
  }

  /**
   * Stoppe Automation
   */
  async stop() {
    console.log('\n🛑 Stoppe Automation...');
    await this.messageQueue.close();
    this.isRunning = false;
    console.log('✅ Automation gestoppt\n');
  }
}

export default AutomationOrchestrator;
