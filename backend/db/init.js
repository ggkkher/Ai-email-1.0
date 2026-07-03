import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/galabau'
});

async function initDB() {
  try {
    console.log('🗄️  Initializing GaLaBau database...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS betriebe (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        whatsapp_number VARCHAR(20),
        logo_url TEXT,
        int_stundensatz DECIMAL(10,2) DEFAULT 45.00,
        standard_marge_percent INT DEFAULT 35,
        fahrtkosten DECIMAL(10,2) DEFAULT 50.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        subscription_plan VARCHAR(50) DEFAULT 'starter',
        stripe_customer_id VARCHAR(255)
      )
    `);
    console.log('✅ Tabelle betriebe erstellt');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS materialien (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        betrieb_id UUID NOT NULL REFERENCES betriebe(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        kategorie VARCHAR(100),
        einkaufspreis DECIMAL(10,2) NOT NULL,
        marge_prozent INT DEFAULT 35,
        einheit VARCHAR(50) DEFAULT 'Stk',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabelle materialien erstellt');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projekte (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        betrieb_id UUID NOT NULL REFERENCES betriebe(id) ON DELETE CASCADE,
        kunde_name VARCHAR(255) NOT NULL,
        kunde_email VARCHAR(255),
        kunde_telefon VARCHAR(20),
        kunde_adresse TEXT,
        beschreibung TEXT,
        projekttyp VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'draft'
      )
    `);
    console.log('✅ Tabelle projekte erstellt');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projekt_leistungen (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        projekt_id UUID NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
        typ VARCHAR(50) NOT NULL,
        beschreibung TEXT NOT NULL,
        menge DECIMAL(10,2) NOT NULL,
        einheit VARCHAR(50) DEFAULT 'Stk',
        preis_pro_einheit DECIMAL(10,2) NOT NULL,
        gesamt_preis DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabelle projekt_leistungen erstellt');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS angebote (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        projekt_id UUID NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
        betrieb_id UUID NOT NULL REFERENCES betriebe(id) ON DELETE CASCADE,
        angebotsnummer VARCHAR(50) UNIQUE NOT NULL,
        datum_erstellt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        gueltig_bis TIMESTAMP,
        summe_netto DECIMAL(10,2) NOT NULL,
        mwst DECIMAL(10,2) NOT NULL,
        summe_brutto DECIMAL(10,2) NOT NULL,
        pdf_url TEXT,
        online_link TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        kunde_unterschrift_url TEXT
      )
    `);
    console.log('✅ Tabelle angebote erstellt');

    // Worker Recruitment System Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source VARCHAR(50),
        source_url TEXT,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        whatsapp VARCHAR(20),
        location VARCHAR(255),
        region VARCHAR(50),
        skills TEXT[],
        experience_years INT,
        company_name VARCHAR(255),
        job_title VARCHAR(255),
        cv_url TEXT,
        qualification_score INT DEFAULT 0,
        pipeline_stage VARCHAR(50) DEFAULT 'identified',
        scrape_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabelle candidates erstellt');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        channel VARCHAR(50),
        content TEXT,
        phone_or_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'queued',
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        replied_at TIMESTAMP,
        reply_content TEXT,
        message_order INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabelle messages erstellt');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255),
        active BOOLEAN DEFAULT true,
        region_filter TEXT[],
        skill_filter TEXT[],
        message_interval_days INT DEFAULT 3,
        max_follow_ups INT DEFAULT 2,
        daily_send_limit INT DEFAULT 50,
        send_time_start VARCHAR(5) DEFAULT '09:00',
        send_time_end VARCHAR(5) DEFAULT '17:00',
        message_template_initial TEXT,
        message_template_followup1 TEXT,
        message_template_followup2 TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabelle campaign_settings erstellt');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS outreach_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES campaign_settings(id) ON DELETE CASCADE,
        date_sent TIMESTAMP,
        total_sent INT DEFAULT 0,
        total_delivered INT DEFAULT 0,
        total_viewed INT DEFAULT 0,
        total_replied INT DEFAULT 0,
        unique_qualified INT DEFAULT 0,
        conversion_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabelle outreach_analytics erstellt');

    console.log('\n✨ Datenbank erfolgreich initialisiert!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fehler:', err);
    process.exit(1);
  }
}

initDB();
