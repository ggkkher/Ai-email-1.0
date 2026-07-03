import axios from 'axios';
import * as cheerio from 'cheerio';
import ContactExtractor from '../contactExtractor.js';

// Job Board Scraper für Handwerk-Portale
export class JobBoardScraper {
  constructor(options = {}) {
    this.timeout = options.timeout || 10000;
    this.retries = options.retries || 3;
  }

  // Scrapet mehrere Job Boards
  async scrapeMultipleSources(region = 'Berlin', limit = 30) {
    console.log(`🔍 Starte Job Board Scraping für Region: ${region}`);

    const sources = [
      this.scrapeHandwerksberufe(region, Math.floor(limit / 2)),
      this.scrapeLocalBusinesses(region, Math.floor(limit / 2))
    ];

    const results = await Promise.allSettled(sources);
    const candidates = [];

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        candidates.push(...result.value);
      } else {
        console.warn(`⚠️  Scraper ${idx} failed:`, result.reason?.message);
      }
    });

    return candidates;
  }

  // Scrapet Handwerksberufe.de (simuliert für Demo)
  async scrapeHandwerksberufe(region, limit) {
    console.log(`📍 Scrape Handwerksberufe.de für ${region}`);

    try {
      // In echter Implementierung würde hier ein echtes Scraping stattfinden
      // Für Demo generieren wir Mock-Daten
      return this.generateMockCandidates('handwerksberufe', region, limit);
    } catch (error) {
      console.error('❌ Handwerksberufe Scraping fehler:', error.message);
      return [];
    }
  }

  // Scrapet lokale Geschäftsverzeichnisse (Google Maps, Gelbe Seiten simuliert)
  async scrapeLocalBusinesses(region, limit) {
    console.log(`📍 Scrape lokale Gärtnereien/Landschaftsbauer in ${region}`);

    try {
      // In echter Implementierung würde hier Google Maps API oder ähnliches genutzt
      return this.generateMockCandidates('google_local', region, limit);
    } catch (error) {
      console.error('❌ Local Scraping fehler:', error.message);
      return [];
    }
  }

  // Generiert realistische Mock-Kandidaten
  generateMockCandidates(source, region, count) {
    const businessNames = [
      'Grün & Mehr GmbH',
      'Gartenbau Schmidt',
      'Landschaftsbau Berlin',
      'Premium Garten GmbH',
      'Naturgestaltung Müller',
      'Grüne Oasen',
      'Gartenbau Fischer',
      'Landschafts-Spezialisten'
    ];

    const contacts = [
      { phone: '+49303012345', email: 'kontakt@garten-berlin.de' },
      { phone: '+49304512345', email: 'info@landscaping.de' },
      { phone: '+491234567890', email: 'anfragen@gruene-oasen.de' },
      { phone: '+493012388492', email: 'mail@gartenbau-mueller.de' }
    ];

    const candidates = [];
    const cities = region === 'Berlin' ?
      ['Berlin', 'Charlottenburg', 'Spandau', 'Friedrichshain', 'Mitte'] :
      ['Potsdam', 'Teltow', 'Oranienburg', 'Königs Wusterhausen'];

    for (let i = 0; i < count; i++) {
      const name = businessNames[Math.floor(Math.random() * businessNames.length)];
      const contact = contacts[Math.floor(Math.random() * contacts.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];

      candidates.push({
        source: source,
        source_url: `https://example.com/businesses/${i}`,
        company_name: name,
        name: name.split(' ')[0], // Erstes Wort als Name für Demo
        phone: contact.phone,
        email: contact.email,
        location: city,
        region: region === 'Berlin' ? 'berlin' : 'brandenburg',
        job_title: 'Geschäftsführer/in Garten & Landschaftsbau',
        experience_years: Math.floor(Math.random() * 15) + 5,
        skills: ['Gartengestaltung', 'Terrassenbau', 'Rasenpflege'],
        scrape_date: new Date()
      });
    }

    return candidates;
  }

  // Extrahiert Kontaktdaten aus HTML
  async extractContactsFromHtml(html, url) {
    const $ = cheerio.load(html);
    const contacts = [];

    // Suche nach Tel/Email Links
    $('a[href^="tel:"], a[href^="mailto:"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href.startsWith('tel:')) {
        contacts.push({
          type: 'phone',
          value: href.replace('tel:', '')
        });
      } else if (href.startsWith('mailto:')) {
        contacts.push({
          type: 'email',
          value: href.replace('mailto:', '')
        });
      }
    });

    // Suche nach Text-Nummern
    const phoneRegex = /(\+49|0)[0-9\s\-]{8,}/g;
    const phoneMatches = html.match(phoneRegex) || [];
    phoneMatches.forEach(phone => {
      const normalized = ContactExtractor.normalizePhone(phone);
      if (normalized && !contacts.find(c => c.value === normalized)) {
        contacts.push({
          type: 'phone',
          value: normalized
        });
      }
    });

    return contacts;
  }

  // Dedupliziert Kandidaten nach Name + Telefon
  deduplicate(candidates) {
    const seen = new Set();
    return candidates.filter(candidate => {
      const key = `${candidate.name}-${candidate.phone || candidate.email}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export default JobBoardScraper;
