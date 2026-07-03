import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Messaging Service für SMS, WhatsApp und Email
export class MessagingService {
  constructor() {
    // Twilio Setup
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    // SendGrid Setup
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    this.sendgridFrom = process.env.SENDGRID_FROM_EMAIL || 'noreply@kania-galabau.de';
  }

  /**
   * Sendet SMS über Twilio
   */
  async sendSMS(phoneNumber, message) {
    try {
      console.log(`📱 Sende SMS an ${phoneNumber}...`);

      if (!this.twilioPhoneNumber) {
        console.warn('⚠️  TWILIO_PHONE_NUMBER nicht konfiguriert, skipping SMS');
        return { success: false, error: 'Twilio nicht konfiguriert' };
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: phoneNumber
      });

      console.log(`✅ SMS versendet: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error(`❌ SMS Fehler: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sendet WhatsApp Nachricht über Twilio
   */
  async sendWhatsApp(phoneNumber, message) {
    try {
      console.log(`💬 Sende WhatsApp an ${phoneNumber}...`);

      if (!this.twilioWhatsAppNumber) {
        console.warn('⚠️  TWILIO_WHATSAPP_NUMBER nicht konfiguriert, fallback zu SMS');
        return this.sendSMS(phoneNumber, message);
      }

      // WhatsApp nutzt "whatsapp:" prefix bei Twilio
      const result = await this.twilioClient.messages.create({
        body: message,
        from: `whatsapp:${this.twilioWhatsAppNumber}`,
        to: `whatsapp:${phoneNumber}`
      });

      console.log(`✅ WhatsApp versendet: ${result.sid}`);
      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error(`❌ WhatsApp Fehler: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sendet Email über SendGrid
   */
  async sendEmail(toEmail, subject, htmlContent, textContent = null) {
    try {
      console.log(`📧 Sende Email an ${toEmail}...`);

      const msg = {
        to: toEmail,
        from: this.sendgridFrom,
        subject: subject,
        html: htmlContent,
        text: textContent || htmlContent.replace(/<[^>]*>/g, '')
      };

      await sgMail.send(msg);
      console.log(`✅ Email versendet an ${toEmail}`);

      return {
        success: true,
        email: toEmail
      };
    } catch (error) {
      console.error(`❌ Email Fehler: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sendet Nachricht über bevorzugten Kanal (Phone > Email)
   */
  async sendViaPreferredChannel(candidate, message, channel = null) {
    // Falls Kanal vorgegeben
    if (channel === 'sms' && candidate.phone) {
      return this.sendSMS(candidate.phone, message);
    }

    if (channel === 'whatsapp' && candidate.phone) {
      return this.sendWhatsApp(candidate.phone, message);
    }

    if (channel === 'email' && candidate.email) {
      return this.sendEmail(candidate.email, 'GaLaBau Rekrutierung', message);
    }

    // Automatische Kanalwahl: Versuche Telefon erst, dann Email
    if (candidate.phone) {
      // Versuche WhatsApp wenn Phone vorhanden
      const result = await this.sendWhatsApp(candidate.phone, message);
      if (result.success) return result;

      // Fallback auf SMS
      return this.sendSMS(candidate.phone, message);
    }

    if (candidate.email) {
      return this.sendEmail(candidate.email, 'GaLaBau Rekrutierung', message);
    }

    return {
      success: false,
      error: 'Keine Kontaktdaten verfügbar'
    };
  }

  /**
   * Batch-Versand mit Rate Limiting
   */
  async sendBatch(messages, delayMs = 1000) {
    console.log(`\n📤 Starte Batch-Versand (${messages.length} Nachrichten)...`);

    const results = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      try {
        const result = await this.sendViaPreferredChannel(msg.candidate, msg.content, msg.channel);
        results.push({
          candidate_id: msg.candidate_id,
          ...result,
          timestamp: new Date()
        });

        // Rate Limiting - warte zwischen Versenden
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`❌ Fehler bei ${msg.candidate_id}:`, error.message);
        results.push({
          candidate_id: msg.candidate_id,
          success: false,
          error: error.message,
          timestamp: new Date()
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    console.log(`✅ Batch-Versand abgeschlossen: ${successful}/${messages.length} erfolgreich\n`);

    return {
      total: messages.length,
      successful: successful,
      failed: messages.length - successful,
      results: results
    };
  }

  /**
   * Prüft ob Kontaktdaten valide sind für einen Kanal
   */
  canSend(candidate, channel) {
    switch (channel) {
      case 'sms':
      case 'whatsapp':
        return !!candidate.phone;
      case 'email':
        return !!candidate.email;
      default:
        return !!(candidate.phone || candidate.email);
    }
  }
}

export default MessagingService;
