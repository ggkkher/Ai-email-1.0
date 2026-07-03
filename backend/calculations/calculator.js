const TAX_RATE = 0.19; // 19% MwSt

export class GaLaBauCalculator {
  constructor(betriebKonfiguration) {
    this.intStundensatz = betriebKonfiguration.int_stundensatz || 45;
    this.standardMarge = betriebKonfiguration.standard_marge_percent || 35;
    this.fahrtkosten = betriebKonfiguration.fahrtkosten || 50;
  }

  /**
   * Hauptkalkulation: Berechnet Angebotspreis basierend auf Leistungen
   */
  calculateQuote(leistungen, customOptions = {}) {
    const { mitFahrtkosten = true, margeOverride = null, rustzetZuschlag = 0 } = customOptions;

    let summeNetto = 0;

    // 1. Materialkosten + Arbeitsstunden berechnen
    for (const leistung of leistungen) {
      const leistungNetto = this._calculateLineItem(leistung);
      summeNetto += leistungNetto;
    }

    // 2. Rüstzeit-Zuschlag (optional, z.B. +10% für komplexe Projekte)
    if (rustzetZuschlag > 0) {
      summeNetto *= (1 + rustzetZuschlag / 100);
    }

    // 3. Fahrtkosten hinzufügen
    if (mitFahrtkosten) {
      summeNetto += this.fahrtkosten;
    }

    // 4. MwSt berechnen
    const mwst = Math.round(summeNetto * TAX_RATE * 100) / 100;
    const summeBrutto = summeNetto + mwst;

    return {
      summeNetto: Math.round(summeNetto * 100) / 100,
      mwst,
      summeBrutto,
      leistungen: leistungen.map(l => ({
        ...l,
        gesamt_preis: this._calculateLineItem(l)
      }))
    };
  }

  /**
   * Berechnet einzelne Leistungsposition
   */
  _calculateLineItem(leistung) {
    const { typ, menge, einheit, preis_pro_einheit } = leistung;

    if (typ === 'material') {
      // Materialkosten: Einkaufspreis * Marge% hinzufügen
      const einkaufspreis = preis_pro_einheit;
      const verkaufspreis = einkaufspreis * (1 + this.standardMarge / 100);
      return Math.round(menge * verkaufspreis * 100) / 100;
    } else if (typ === 'arbeit') {
      // Arbeitsstunden: Stunden * Stundensatz
      return Math.round(menge * this.intStundensatz * 100) / 100;
    } else if (typ === 'special') {
      // Spezialleistungen: direkt wie eingegeben
      return Math.round(menge * preis_pro_einheit * 100) / 100;
    }

    return 0;
  }

  /**
   * GaLaBau-spezifische Kalkulationen für häufige Projekttypen
   */
  calculateByType(projekttyp, projektDetails) {
    switch (projekttyp) {
      case 'rasen':
        return this._calculateRasen(projektDetails);
      case 'bepflanzung':
        return this._calculateBepflanzung(projektDetails);
      case 'terrasse':
        return this._calculateTerrasse(projektDetails);
      case 'zaun':
        return this._calculateZaun(projektDetails);
      default:
        return null;
    }
  }

  _calculateRasen({ qm, vorbereitung = true, aussaat = true, dummung = false }) {
    const leistungen = [];

    // Rasenvorbereitung: €15/qm
    if (vorbereitung) {
      leistungen.push({
        typ: 'arbeit',
        beschreibung: 'Rasenvorbereitung (Umgraben, Eggen)',
        menge: qm * 0.35, // ~20 Min pro qm
        einheit: 'h',
        preis_pro_einheit: this.intStundensatz
      });
    }

    // Rasensaat: €5-8/qm
    if (aussaat) {
      leistungen.push({
        typ: 'material',
        beschreibung: 'Rasensaat Premium',
        menge: qm,
        einheit: 'qm',
        preis_pro_einheit: 5 // €5/qm Einkauf
      });
      leistungen.push({
        typ: 'arbeit',
        beschreibung: 'Aussaat und Walzen',
        menge: qm * 0.15, // ~9 Min pro qm
        einheit: 'h',
        preis_pro_einheit: this.intStundensatz
      });
    }

    // Düngung: €2-3/qm
    if (dummung) {
      leistungen.push({
        typ: 'material',
        beschreibung: 'Rasendünger + Aussaat',
        menge: qm,
        einheit: 'qm',
        preis_pro_einheit: 2.50
      });
    }

    return this.calculateQuote(leistungen);
  }

  _calculateBepflanzung({ anzahlPflanzen, arbeitsStundenProPflanze = 0.25 }) {
    const leistungen = [];

    // Durchschnittliche Pflanze: €10-15 Einkauf
    leistungen.push({
      typ: 'material',
      beschreibung: 'Bepflanzung (Durchschnittliche Pflanzen)',
      menge: anzahlPflanzen,
      einheit: 'Stk',
      preis_pro_einheit: 12 // €12 Durchschnittspreis
    });

    // Arbeitsleistung: 15 Min pro Pflanze
    leistungen.push({
      typ: 'arbeit',
      beschreibung: 'Pflanzung und Bepflanzungsarbeiten',
      menge: anzahlPflanzen * arbeitsStundenProPflanze,
      einheit: 'h',
      preis_pro_einheit: this.intStundensatz
    });

    return this.calculateQuote(leistungen);
  }

  _calculateTerrasse({ qm, materialTyp = 'standard', with_montage = true }) {
    const leistungen = [];

    // Materialpreise pro qm (Einkauf)
    const materialPreise = {
      standard: 25,     // Betonsteine
      premium: 45,      // Naturstein
      holz: 35,         // Holzterrasse
      dielen: 50        // Thermo-Dielen
    };

    const preis = materialPreise[materialTyp] || 25;

    // Terrassenmaterial
    leistungen.push({
      typ: 'material',
      beschreibung: `Terrassenmaterial (${materialTyp})`,
      menge: qm,
      einheit: 'qm',
      preis_pro_einheit: preis
    });

    // Arbeit: Vorbereitung + Verlegung
    if (with_montage) {
      const arbeitsStunden = qm * 0.75; // ~45 Min pro qm
      leistungen.push({
        typ: 'arbeit',
        beschreibung: 'Vorbereitung, Verlegung und Fugenarbeiten',
        menge: arbeitsStunden,
        einheit: 'h',
        preis_pro_einheit: this.intStundensatz
      });
    }

    return this.calculateQuote(leistungen);
  }

  _calculateZaun({ meter, zauntyp = 'holz', with_montage = true }) {
    const leistungen = [];

    // Zaunmaterial pro Meter (Einkauf)
    const materialPreise = {
      holz: 30,        // Holzzaun
      metall: 45,      // Metallzaun
      kunststoff: 25,  // Kunststoff
      maschendraht: 15 // Maschendraht
    };

    const preis = materialPreise[zauntyp] || 30;

    // Zaunmaterial
    leistungen.push({
      typ: 'material',
      beschreibung: `${zauntyp} Zaun`,
      menge: meter,
      einheit: 'm',
      preis_pro_einheit: preis
    });

    // Pfosten: alle 1.5m ein Pfosten (ca. €15 pro Pfosten)
    const anzahlPfosten = Math.ceil(meter / 1.5);
    leistungen.push({
      typ: 'material',
      beschreibung: 'Zaunpfosten',
      menge: anzahlPfosten,
      einheit: 'Stk',
      preis_pro_einheit: 15
    });

    // Montagearbeit
    if (with_montage) {
      const arbeitsStunden = meter * 0.5; // ~30 Min pro Meter
      leistungen.push({
        typ: 'arbeit',
        beschreibung: 'Pfosten setzen und Zaun montieren',
        menge: arbeitsStunden,
        einheit: 'h',
        preis_pro_einheit: this.intStundensatz
      });
    }

    return this.calculateQuote(leistungen);
  }

  /**
   * Validiert ob Kalkulation realistisch ist
   */
  validateCalculation(result) {
    const issues = [];

    if (result.summeNetto < 50) {
      issues.push('⚠️  Angebotspreis sehr niedrig (< €50)');
    }

    if (result.summeNetto > 50000) {
      issues.push('⚠️  Angebotspreis sehr hoch (> €50.000) - bitte überprüfen');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export default GaLaBauCalculator;
