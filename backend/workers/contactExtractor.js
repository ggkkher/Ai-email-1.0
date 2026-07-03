// Extrahiert Kontaktinformationen (Phone, Email, WhatsApp) aus Text/Profilen
export class ContactExtractor {
  // Normalisiert deutsche Telefonnummern zu E.164 Format
  static normalizePhone(phone) {
    if (!phone) return null;

    // Entferne alle Leerzeichen, Klammern, Striche
    let normalized = phone.replace(/[\s\(\)\-\.]/g, '');

    // Wenn es mit 0 anfängt, ersetze mit +49
    if (normalized.startsWith('0')) {
      normalized = '+49' + normalized.slice(1);
    }

    // Wenn es mit 49 anfängt, füge + hinzu
    if (normalized.startsWith('49') && !normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    // Validiere: sollte +49 und 10-11 Ziffern sein
    if (normalized.startsWith('+49') && normalized.length >= 12 && normalized.length <= 14) {
      return normalized;
    }

    return null;
  }

  // Extrahiert Email-Adresse (simple Validierung)
  static extractEmail(email) {
    if (!email) return null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      return email.toLowerCase();
    }
    return null;
  }

  // Extrahiert alle Telefonnummern aus Text
  static extractPhones(text) {
    if (!text) return [];

    // Deutsche Nummern: +49, 0049, 0 gefolgt von 9-11 Ziffern
    const phoneRegex = /(\+49|0049|0)\s?[\d\s\(\)\-\.]{8,13}/g;
    const matches = text.match(phoneRegex) || [];

    return matches
      .map(phone => this.normalizePhone(phone))
      .filter(Boolean)
      .filter((phone, idx, arr) => arr.indexOf(phone) === idx); // Duplikate entfernen
  }

  // Extrahiert alle Emails aus Text
  static extractEmails(text) {
    if (!text) return [];

    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
    const matches = text.match(emailRegex) || [];

    return matches
      .map(email => this.extractEmail(email))
      .filter(Boolean)
      .filter((email, idx, arr) => arr.indexOf(email) === idx);
  }

  // Extrahiert alle Kontaktinfos aus Profil-Objekt oder Text
  static extractFromProfile(profile) {
    const contacts = {
      phone: null,
      whatsapp: null,
      email: null
    };

    if (profile.phone) {
      contacts.phone = this.normalizePhone(profile.phone);
    }
    if (profile.whatsapp) {
      contacts.whatsapp = this.normalizePhone(profile.whatsapp);
    }
    if (profile.email) {
      contacts.email = this.extractEmail(profile.email);
    }

    // Falls keine Kontakte extrahiert, versuche aus Bio/Description
    const textToParse = `${profile.bio || ''} ${profile.description || ''} ${profile.about || ''}`;
    if (textToParse) {
      const phones = this.extractPhones(textToParse);
      const emails = this.extractEmails(textToParse);

      if (!contacts.phone && phones.length > 0) contacts.phone = phones[0];
      if (!contacts.email && emails.length > 0) contacts.email = emails[0];
    }

    return contacts;
  }

  // Prüft, ob genug Kontaktinfos vorhanden sind
  static hasValidContact(candidate) {
    return !!(candidate.phone || candidate.email || candidate.whatsapp);
  }
}

export default ContactExtractor;
