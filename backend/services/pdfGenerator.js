import puppeteer from 'puppeteer';

export async function generatePDF({ angebotsnummer, projekt, betrieb, kalkulationResult, gueltig_bis }) {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    const htmlContent = generateHTMLTemplate({
      angebotsnummer,
      projekt,
      betrieb,
      kalkulationResult,
      gueltig_bis
    });

    await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
    const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: 20, right: 20, bottom: 20, left: 20 } });

    await browser.close();

    // In Produktion würde PDF zu S3 hochgeladen
    // Für MVP: Lokales Speichern
    const fs = await import('fs');
    const pdfPath = `./storage/angebote/${angebotsnummer}.pdf`;
    fs.writeFileSync(pdfPath, pdfBuffer);

    return pdfPath;
  } catch (err) {
    console.error('PDF-Generierungsfehler:', err);
    throw err;
  }
}

function generateHTMLTemplate({ angebotsnummer, projekt, betrieb, kalkulationResult, gueltig_bis }) {
  const formatDate = (date) => {
    return date.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const leistungenHTML = kalkulationResult.leistungen.map(l => `
    <tr>
      <td style="border-bottom: 1px solid #ddd; padding: 8px;">${l.beschreibung}</td>
      <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">${l.menge} ${l.einheit}</td>
      <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(l.gesamt_preis)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          background: #f5f5f5;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 3px solid #4CAF50;
          padding-bottom: 20px;
        }
        .logo-section {
          flex: 1;
        }
        .company-name {
          font-size: 28px;
          font-weight: bold;
          color: #4CAF50;
          margin-bottom: 5px;
        }
        .angebot-title {
          font-size: 18px;
          color: #666;
          text-align: right;
          flex: 1;
        }
        .meta-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          font-size: 14px;
        }
        .meta-box {
          border-left: 4px solid #4CAF50;
          padding-left: 15px;
        }
        .meta-label {
          font-weight: bold;
          color: #4CAF50;
          margin-bottom: 3px;
        }
        .meta-value {
          color: #333;
        }
        table {
          width: 100%;
          margin-bottom: 20px;
          border-collapse: collapse;
        }
        thead {
          background: #f0f0f0;
          border-bottom: 2px solid #4CAF50;
        }
        th {
          padding: 12px;
          text-align: left;
          font-weight: bold;
          color: #333;
        }
        td {
          padding: 10px;
        }
        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }
        .summary-box {
          width: 300px;
          background: #f9f9f9;
          border: 2px solid #4CAF50;
          padding: 20px;
          border-radius: 5px;
        }
        .summary-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
        }
        .summary-line.total {
          font-size: 18px;
          font-weight: bold;
          color: #4CAF50;
          border-bottom: 2px solid #4CAF50;
          border-top: 2px solid #4CAF50;
          padding-top: 10px;
          margin-top: 10px;
        }
        .terms {
          margin-top: 40px;
          font-size: 12px;
          color: #666;
          line-height: 1.6;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .signature-area {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
        }
        .signature-block {
          width: 200px;
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-top: 40px;
          font-size: 12px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 11px;
          color: #999;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            <div class="company-name">${betrieb.name}</div>
          </div>
          <div class="angebot-title">
            <strong>ANGEBOT</strong>
          </div>
        </div>

        <!-- Meta Info -->
        <div class="meta-info">
          <div class="meta-box">
            <div class="meta-label">Angebotsnummer:</div>
            <div class="meta-value">${angebotsnummer}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Angebotsdatum:</div>
            <div class="meta-value">${formatDate(new Date())}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Gültig bis:</div>
            <div class="meta-value">${formatDate(gueltig_bis)}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Kontakt:</div>
            <div class="meta-value">${betrieb.email}</div>
          </div>
        </div>

        <!-- Kunde Info -->
        <div style="margin-bottom: 30px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #4CAF50;">Kunde</h3>
          <p style="margin: 0;"><strong>${projekt.kunde_name}</strong></p>
          ${projekt.kunde_adresse ? `<p style="margin: 3px 0;">${projekt.kunde_adresse}</p>` : ''}
          ${projekt.kunde_telefon ? `<p style="margin: 3px 0;">Tel: ${projekt.kunde_telefon}</p>` : ''}
          ${projekt.kunde_email ? `<p style="margin: 3px 0;">E-Mail: ${projekt.kunde_email}</p>` : ''}
        </div>

        <!-- Leistungen Tabelle -->
        <h3 style="color: #4CAF50; margin-bottom: 15px;">Leistungen</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 60%;">Beschreibung</th>
              <th style="width: 20%; text-align: right;">Menge</th>
              <th style="width: 20%; text-align: right;">Betrag</th>
            </tr>
          </thead>
          <tbody>
            ${leistungenHTML}
          </tbody>
        </table>

        <!-- Summary -->
        <div class="summary-section">
          <div class="summary-box">
            <div class="summary-line">
              <span>Summe netto:</span>
              <span>${formatCurrency(kalkulationResult.summeNetto)}</span>
            </div>
            <div class="summary-line">
              <span>MwSt. (19%):</span>
              <span>${formatCurrency(kalkulationResult.mwst)}</span>
            </div>
            <div class="summary-line total">
              <span>GESAMT BRUTTO:</span>
              <span>${formatCurrency(kalkulationResult.summeBrutto)}</span>
            </div>
          </div>
        </div>

        <!-- Terms -->
        <div class="terms">
          <p><strong>Allgemeine Bedingungen:</strong></p>
          <p>
            Dieses Angebot ist unverbindlich und gültig bis ${formatDate(gueltig_bis)}.
            Bei Annahme durch den Kunden entsteht ein verbindlicher Auftrag.
            Änderungen nach Auftragserteilung können Auswirkungen auf den Preis haben.
          </p>
        </div>

        <!-- Signature Area -->
        <div class="signature-area">
          <div class="signature-block">
            <div class="signature-line">Unterschrift Kunde</div>
          </div>
          <div class="signature-block">
            <div class="signature-line">Unterschrift ${betrieb.name}</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Generiert am ${formatDate(new Date())} | ${betrieb.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default generatePDF;
