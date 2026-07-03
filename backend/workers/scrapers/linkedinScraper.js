import { chromium } from 'playwright';
import ContactExtractor from '../contactExtractor.js';

// LinkedIn Scraper für GaLaBau Handwerker
export class LinkedInScraper {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
    this.profiles = [];
  }

  // Keywords für GaLaBau Suche
  static GALABAU_KEYWORDS = [
    'Gärtner', 'Gärtnerin',
    'Landschaftsbauer', 'Landschaftsbauerin',
    'Rasenanlage', 'Rasenpflege',
    'Bepflanzung', 'Pflanzung',
    'Terrasse', 'Terrassenbau',
    'Zaun', 'Zaunbau',
    'Gartenbau',
    'Baumschnitt',
    'Gartengestaltung',
    'Grünanlagen',
    'GaLaBau'
  ];

  // Suche auf LinkedIn nach Kandidaten
  async searchCandidates(region = 'Berlin', limit = 50) {
    console.log(`🔍 Starte LinkedIn-Suche für Region: ${region}`);

    try {
      const browser = await chromium.launch({ headless: this.headless });
      const context = await browser.createContext();
      const page = await context.newPage();

      // LinkedIn Search URL konstruieren
      const keywords = this.GALABAU_KEYWORDS.slice(0, 3).join(' OR ');
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords + ' ' + region)}`;

      console.log(`📍 URL: ${searchUrl}`);

      // Gehe zur Seite (ohne tatsächlich zu scrapem, da LinkedIn Bot-Detection hat)
      // In Produktion würde man hier mit LinkedIn API oder authorized sessions arbeiten

      // Mock-Daten für Demo (in echter Implementierung würde hier scraping stattfinden)
      const mockProfiles = this.generateMockProfiles(region, limit);

      await browser.close();

      return mockProfiles;
    } catch (error) {
      console.error('❌ LinkedIn Scraping Fehler:', error.message);
      // Fallback auf Mock-Daten
      return this.generateMockProfiles(region, limit);
    }
  }

  // Generiert realistische Mock-Profile für Tests/Demo
  generateMockProfiles(region, count) {
    const firstNames = ['Max', 'Christian', 'Frank', 'Thomas', 'Andreas', 'Stefan', 'Michael', 'Jörg', 'Klaus', 'Peter'];
    const lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Becker', 'Meyer', 'Wagner', 'Weber', 'Schulz', 'Hoffmann'];
    const cities = region === 'Berlin' ? ['Berlin', 'Berlin-Mitte', 'Berlin-Spandau', 'Berlin-Charlottenburg'] : ['Potsdam', 'Oranienburg', 'Teltow'];
    const jobTitles = ['Gärtner', 'Landschaftsbauer', 'Gartengestalter', 'Rasenanlage-Spezialist', 'Terrassenbauer'];
    const companies = ['Grün & Co', 'Garten Müller', 'Landschaftsbau GmbH', 'Freiberuflich'];

    const profiles = [];
    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const phone = this.generateGermanPhone();

      const profile = {
        source: 'linkedin',
        source_url: `https://www.linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        name: `${firstName} ${lastName}`,
        phone: phone,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.de`,
        location: cities[Math.floor(Math.random() * cities.length)],
        region: region === 'Berlin' ? 'berlin' : 'brandenburg',
        job_title: jobTitles[Math.floor(Math.random() * jobTitles.length)],
        company_name: companies[Math.floor(Math.random() * companies.length)],
        experience_years: Math.floor(Math.random() * 15) + 2,
        skills: this.randomSkills(),
        bio: `${jobTitles[Math.floor(Math.random() * jobTitles.length)]} mit ${Math.floor(Math.random() * 15) + 2} Jahren Erfahrung`,
        scrape_date: new Date()
      };

      profiles.push(profile);
    }

    return profiles;
  }

  // Generiert realistische deutsche Telefonnummern
  generateGermanPhone() {
    const areaCode = Math.floor(Math.random() * 900) + 100; // 100-999
    const number = Math.floor(Math.random() * 900000000) + 10000000; // 8 Ziffern
    return `+49${areaCode}${number}`;
  }

  // Wählt zufällig GaLaBau-relevante Skills aus
  randomSkills() {
    const allSkills = ['Rasenbau', 'Bepflanzung', 'Terrasse', 'Zaun', 'Baumschnitt', 'Gartengestaltung'];
    const skillCount = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...allSkills].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, skillCount);
  }

  // Qualifiziert Profile (einfache Heuristik)
  async qualifyProfile(profile) {
    const score = {
      base: 0,
      reasons: []
    };

    // Kontakt vorhanden?
    if (profile.phone || profile.email) {
      score.base += 20;
      score.reasons.push('Kontakt vorhanden');
    }

    // Hat Erfahrung?
    if (profile.experience_years && profile.experience_years > 2) {
      score.base += 20;
      score.reasons.push(`${profile.experience_years} Jahre Erfahrung`);
    }

    // Hat GaLaBau-Skills?
    const galabauSkills = profile.skills?.filter(s =>
      LinkedInScraper.GALABAU_KEYWORDS.some(k => k.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(k.toLowerCase()))
    ) || [];

    if (galabauSkills.length > 0) {
      score.base += 30;
      score.reasons.push(`Relevante Skills: ${galabauSkills.join(', ')}`);
    }

    // Job Title relevan?
    const jobRelevant = LinkedInScraper.GALABAU_KEYWORDS.some(k =>
      profile.job_title?.toLowerCase().includes(k.toLowerCase())
    );

    if (jobRelevant) {
      score.base += 30;
      score.reasons.push('Relevanter Jobtitel');
    }

    return {
      qualification_score: Math.min(100, score.base),
      qualification_reasons: score.reasons
    };
  }
}

export default LinkedInScraper;
