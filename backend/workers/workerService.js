import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import LinkedInScraper from './scrapers/linkedinScraper.js';
import JobBoardScraper from './scrapers/jobBoardScraper.js';
import ContactExtractor from './contactExtractor.js';
import ClaudeService from '../services/claudeService.js';

// Service für Worker Recruitment Automation
export class WorkerService {
  constructor(pool) {
    this.pool = pool;
    this.linkedinScraper = new LinkedInScraper();
    this.jobBoardScraper = new JobBoardScraper();
    this.claudeService = new ClaudeService();
  }

  // Hauptfunktion: Scrape & Process neue Kandidaten
  async scrapeAndProcessCandidates(options = {}) {
    const regions = options.regions || ['berlin', 'brandenburg'];
    const limit = options.limit || 50;

    console.log(`\n🚀 Starte Worker Recruitment Pipeline...`);
    console.log(`📍 Regionen: ${regions.join(', ')}`);
    console.log(`📊 Kandidaten Target: ${limit}\n`);

    const allCandidates = [];

    for (const region of regions) {
      try {
        // Scrape LinkedIn
        console.log(`\n1️⃣  LinkedIn Scraping für ${region}...`);
        const linkedinCandidates = await this.linkedinScraper.searchCandidates(region, Math.floor(limit / 2));
        console.log(`✅ ${linkedinCandidates.length} LinkedIn Kandidaten gefunden`);
        allCandidates.push(...linkedinCandidates);

        // Scrape Job Boards
        console.log(`\n2️⃣  Job Board Scraping für ${region}...`);
        const jobBoardCandidates = await this.jobBoardScraper.scrapeMultipleSources(region, Math.floor(limit / 2));
        console.log(`✅ ${jobBoardCandidates.length} Job Board Kandidaten gefunden`);
        allCandidates.push(...jobBoardCandidates);
      } catch (error) {
        console.error(`❌ Fehler beim Scraping für ${region}:`, error.message);
      }
    }

    console.log(`\n3️⃣  Deduplizierung...`);
    const deduped = this.dedupCandidates(allCandidates);
    console.log(`✅ ${deduped.length} eindeutige Kandidaten nach Dedup`);

    // Speichere in DB
    console.log(`\n4️⃣  Speichere in Datenbank...`);
    const savedCount = await this.saveCandidates(deduped);
    console.log(`✅ ${savedCount} Kandidaten in DB gespeichert`);

    return {
      total_scraped: allCandidates.length,
      total_unique: deduped.length,
      total_saved: savedCount,
      timestamp: new Date()
    };
  }

  // Dedupliziert Kandidaten
  dedupCandidates(candidates) {
    const seen = new Set();
    const deduped = [];

    candidates.forEach(candidate => {
      const key = `${candidate.name}-${candidate.phone || candidate.email}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(candidate);
      }
    });

    return deduped;
  }

  // Speichert Kandidaten in DB (neu oder aktualisiert)
  async saveCandidates(candidates) {
    let savedCount = 0;

    for (const candidate of candidates) {
      try {
        // Extrahiere Kontaktdaten
        const contacts = ContactExtractor.extractFromProfile(candidate);

        // Validiere Kontaktdaten
        if (!ContactExtractor.hasValidContact(contacts)) {
          console.warn(`⚠️  Keine gültigen Kontaktdaten für ${candidate.name}`);
          continue;
        }

        // Prüfe ob Kandidat bereits existiert
        const existing = await this.findExistingCandidate(candidate.name, contacts.phone || contacts.email);

        if (!existing) {
          // Qualifiziere Kandidat mit Claude
          const qualification = await this.qualifyCandidate(candidate);

          // Speichere neu
          const result = await this.pool.query(`
            INSERT INTO candidates (
              source, source_url, name, phone, email, whatsapp,
              location, region, skills, experience_years, company_name,
              job_title, qualification_score, pipeline_stage, scrape_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id
          `, [
            candidate.source,
            candidate.source_url,
            candidate.name,
            contacts.phone || null,
            contacts.email || null,
            contacts.whatsapp || null,
            candidate.location,
            candidate.region,
            candidate.skills ? JSON.stringify(candidate.skills) : null,
            candidate.experience_years || null,
            candidate.company_name || null,
            candidate.job_title || null,
            qualification.score,
            'identified',
            candidate.scrape_date || new Date()
          ]);

          savedCount++;
        } else {
          console.log(`ℹ️  Kandidat ${candidate.name} existiert bereits`);
        }
      } catch (error) {
        console.error(`❌ Fehler beim Speichern von ${candidate.name}:`, error.message);
      }
    }

    return savedCount;
  }

  // Sucht existierende Kandidaten (Duplikat-Check)
  async findExistingCandidate(name, phoneOrEmail) {
    try {
      const result = await this.pool.query(`
        SELECT id FROM candidates
        WHERE name = $1 OR phone = $2 OR email = $3
        LIMIT 1
      `, [name, phoneOrEmail, phoneOrEmail]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Fehler beim Duplikat-Check:', error.message);
      return null;
    }
  }

  // Qualifiziert Kandidat mit Claude
  async qualifyCandidate(candidate) {
    try {
      // Builtle Info-String für Claude
      const candidateInfo = `
Name: ${candidate.name}
Job Title: ${candidate.job_title}
Company: ${candidate.company_name}
Experience: ${candidate.experience_years} Jahre
Skills: ${candidate.skills?.join(', ') || 'Unbekannt'}
Bio/Beschreibung: ${candidate.bio || 'Keine Beschreibung'}
      `.trim();

      const prompt = `Bewerte diese Kandidat/in für Garten- & Landschaftsbau (GaLaBau) Arbeiten in Brandenburg/Berlin.

Kandidat Info:
${candidateInfo}

Antworte kurz mit:
1. Qualification Score (0-100): Wie gut passt diese Person für GaLaBau Arbeiten?
2. Relevante Skills: Welche Skills sind relevant?
3. Empfehlung: Ja/Nein für Kontaktaufnahme

Format:
SCORE: [Zahl]
SKILLS: [Komma-getrennt]
RECOMMEND: [Ja/Nein]
      `;

      const response = await this.claudeService.callClaude(prompt);

      // Parse Response
      const scoreMatch = response.match(/SCORE:\s*(\d+)/);
      const skillsMatch = response.match(/SKILLS:\s*([^\n]+)/);
      const recommendMatch = response.match(/RECOMMEND:\s*(Ja|Nein)/);

      const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
      const skills = skillsMatch ? skillsMatch[1].split(',').map(s => s.trim()) : [];
      const shouldContact = recommendMatch ? recommendMatch[1] === 'Ja' : score >= 60;

      return {
        score: Math.min(100, Math.max(0, score)),
        skills: skills,
        shouldContact: shouldContact,
        response: response
      };
    } catch (error) {
      console.error('❌ Claude Qualifikation Fehler:', error.message);
      return {
        score: 50,
        skills: candidate.skills || [],
        shouldContact: true,
        error: error.message
      };
    }
  }

  // Ruft qualifizierte Kandidaten ab
  async getQualifiedCandidates(minScore = 60) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM candidates
        WHERE qualification_score >= $1
        AND pipeline_stage = 'identified'
        ORDER BY qualification_score DESC
        LIMIT 100
      `, [minScore]);

      return result.rows;
    } catch (error) {
      console.error('Fehler beim Abrufen qualifizierter Kandidaten:', error.message);
      return [];
    }
  }

  // Ruft Kandidaten nach Stage ab
  async getCandidatesByStage(stage) {
    try {
      const result = await this.pool.query(`
        SELECT * FROM candidates
        WHERE pipeline_stage = $1
        ORDER BY created_at DESC
      `, [stage]);

      return result.rows;
    } catch (error) {
      console.error('Fehler beim Abrufen von Kandidaten:', error.message);
      return [];
    }
  }

  // Aktualisiert Kandidaten-Stage
  async updateCandidateStage(candidateId, newStage) {
    try {
      await this.pool.query(`
        UPDATE candidates
        SET pipeline_stage = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newStage, candidateId]);

      return true;
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error.message);
      return false;
    }
  }

  // Pipeline Overview
  async getPipelineStats() {
    try {
      const result = await this.pool.query(`
        SELECT
          pipeline_stage,
          COUNT(*) as count,
          AVG(qualification_score) as avg_score
        FROM candidates
        GROUP BY pipeline_stage
        ORDER BY pipeline_stage
      `);

      return result.rows;
    } catch (error) {
      console.error('Fehler beim Abrufen Pipeline Stats:', error.message);
      return [];
    }
  }
}

export default WorkerService;
