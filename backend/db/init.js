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

    console.log('\n✨ Datenbank erfolgreich initialisiert!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fehler:', err);
    process.exit(1);
  }
}

initDB();
