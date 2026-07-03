import redis from 'redis';
import { v4 as uuidv4 } from 'uuid';

// Message Queue für zeitgesteuerte Versände
export class MessageQueue {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: process.env.REDIS_DB || 0
    });

    this.client.on('error', (err) => {
      console.error('Redis Fehler:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis verbunden');
    });
  }

  /**
   * Verbinde zu Redis
   */
  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  /**
   * Füge Nachricht zur Queue hinzu
   */
  async enqueue(messageData) {
    try {
      await this.connect();

      const messageId = uuidv4();
      const key = `message:${messageId}`;

      const data = {
        id: messageId,
        candidate_id: messageData.candidate_id,
        phone_or_email: messageData.phone_or_email,
        channel: messageData.channel || 'whatsapp',
        content: messageData.content,
        status: 'queued',
        scheduled_at: messageData.scheduled_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: messageData.max_retries || 3
      };

      // Speichere in Redis mit Expiration (30 Tage)
      await this.client.setEx(key, 2592000, JSON.stringify(data));

      // Füge zur Sortierten Liste hinzu (für Scheduling)
      const scheduledTime = new Date(data.scheduled_at).getTime();
      await this.client.zAdd('message_queue', {
        score: scheduledTime,
        value: messageId
      });

      console.log(`✅ Nachricht enqueued: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      console.error('Fehler beim Enqueue:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Rufe nächste zu versendende Nachrichten ab
   */
  async getMessagesToSend(limit = 50) {
    try {
      await this.connect();

      const now = new Date().getTime();
      const messageIds = await this.client.zRangeByScore('message_queue', 0, now, {
        limit: { offset: 0, count: limit }
      });

      const messages = [];
      for (const id of messageIds) {
        const data = await this.client.get(`message:${id}`);
        if (data) {
          messages.push(JSON.parse(data));
        }
      }

      return messages;
    } catch (error) {
      console.error('Fehler beim Abrufen:', error.message);
      return [];
    }
  }

  /**
   * Markiere Nachricht als versendet
   */
  async markAsSent(messageId, result) {
    try {
      await this.connect();

      const key = `message:${messageId}`;
      const data = await this.client.get(key);

      if (!data) return false;

      const message = JSON.parse(data);
      message.status = result.success ? 'sent' : 'failed';
      message.sent_at = new Date().toISOString();
      message.result = result;

      await this.client.setEx(key, 2592000, JSON.stringify(message));

      // Entferne aus Queue
      await this.client.zRem('message_queue', messageId);

      console.log(`✅ Nachricht als ${message.status} markiert: ${messageId}`);
      return true;
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error.message);
      return false;
    }
  }

  /**
   * Retry-Logik für fehlgeschlagene Nachrichten
   */
  async retryMessage(messageId) {
    try {
      await this.connect();

      const key = `message:${messageId}`;
      const data = await this.client.get(key);

      if (!data) return false;

      const message = JSON.parse(data);

      if (message.retry_count < message.max_retries) {
        message.retry_count++;
        message.status = 'queued';

        // Verschiebe um 1 Stunde später
        const retryTime = new Date();
        retryTime.setHours(retryTime.getHours() + 1);
        message.scheduled_at = retryTime.toISOString();

        await this.client.setEx(key, 2592000, JSON.stringify(message));

        // Füge wieder zur Queue hinzu
        const scheduledTime = retryTime.getTime();
        await this.client.zAdd('message_queue', {
          score: scheduledTime,
          value: messageId
        });

        console.log(`🔄 Nachricht ${messageId} zur Wiederholung eingeplant (${message.retry_count}/${message.max_retries})`);
        return true;
      } else {
        message.status = 'failed_permanent';
        await this.client.setEx(key, 2592000, JSON.stringify(message));
        console.warn(`❌ Nachricht ${messageId} zu oft fehlgeschlagen, wird aufgegeben`);
        return false;
      }
    } catch (error) {
      console.error('Fehler beim Retry:', error.message);
      return false;
    }
  }

  /**
   * Rufe Nachricht ab
   */
  async getMessage(messageId) {
    try {
      await this.connect();
      const data = await this.client.get(`message:${messageId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Fehler beim Abrufen:', error.message);
      return null;
    }
  }

  /**
   * Queue-Statistiken
   */
  async getStats() {
    try {
      await this.connect();

      const queuedCount = await this.client.zCard('message_queue');
      const totalMessages = await this.client.keys('message:*');

      return {
        queued: queuedCount,
        total: totalMessages.length,
        redis_connected: this.client.isOpen
      };
    } catch (error) {
      console.error('Fehler beim Abrufen von Stats:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Schließe Verbindung
   */
  async close() {
    if (this.client.isOpen) {
      await this.client.quit();
      console.log('✅ Redis Verbindung geschlossen');
    }
  }
}

export default MessageQueue;
