import { describe, it, expect } from 'vitest';
import GaLaBauCalculator from './calculator.js';

describe('GaLaBau Calculator', () => {
  const betrieb = {
    int_stundensatz: 45,
    standard_marge_percent: 35,
    fahrtkosten: 50
  };

  const calculator = new GaLaBauCalculator(betrieb);

  it('sollte Materialkosten korrekt berechnen', () => {
    const leistungen = [
      {
        typ: 'material',
        beschreibung: 'Rasensaat',
        menge: 100,
        einheit: 'qm',
        preis_pro_einheit: 5 // €5 Einkauf
      }
    ];

    const result = calculator.calculateQuote(leistungen, { mitFahrtkosten: false });

    // €5 × 100qm × 1.35 (35% Marge) = €675
    expect(result.summeNetto).toBe(675);
  });

  it('sollte Arbeitsleistung korrekt berechnen', () => {
    const leistungen = [
      {
        typ: 'arbeit',
        beschreibung: 'Rasenvorbereitung',
        menge: 10, // 10 Stunden
        einheit: 'h',
        preis_pro_einheit: 45
      }
    ];

    const result = calculator.calculateQuote(leistungen, { mitFahrtkosten: false });

    // 10h × €45 = €450
    expect(result.summeNetto).toBe(450);
  });

  it('sollte Fahrtkosten hinzufügen', () => {
    const leistungen = [
      {
        typ: 'arbeit',
        menge: 1,
        preis_pro_einheit: 100
      }
    ];

    const result = calculator.calculateQuote(leistungen, { mitFahrtkosten: true });

    // €100 + €50 Fahrt = €150
    expect(result.summeNetto).toBe(150);
  });

  it('sollte MwSt. korrekt berechnen (19%)', () => {
    const leistungen = [
      {
        typ: 'arbeit',
        menge: 100,
        preis_pro_einheit: 45
      }
    ];

    const result = calculator.calculateQuote(leistungen, { mitFahrtkosten: false });

    // €4500 × 0.19 = €855
    expect(result.mwst).toBe(855);
    expect(result.summeBrutto).toBe(5355);
  });

  it('sollte Rasenanlage-Kalkulation durchführen', () => {
    const result = calculator.calculateByType('rasen', {
      qm: 100,
      vorbereitung: true,
      aussaat: true,
      dummung: false
    });

    expect(result).toBeDefined();
    expect(result.summeNetto).toBeGreaterThan(0);
    expect(result.mwst).toBeGreaterThan(0);
    expect(result.summeBrutto).toBeGreaterThan(0);
  });

  it('sollte Bepflanzungs-Kalkulation durchführen', () => {
    const result = calculator.calculateByType('bepflanzung', {
      anzahlPflanzen: 50,
      arbeitsStundenProPflanze: 0.25
    });

    expect(result).toBeDefined();
    expect(result.summeBrutto).toBeGreaterThan(0);
  });

  it('sollte Terrassen-Kalkulation durchführen', () => {
    const result = calculator.calculateByType('terrasse', {
      qm: 50,
      materialTyp: 'premium',
      with_montage: true
    });

    expect(result).toBeDefined();
    expect(result.summeBrutto).toBeGreaterThan(0);
  });

  it('sollte Zaun-Kalkulation durchführen', () => {
    const result = calculator.calculateByType('zaun', {
      meter: 30,
      zauntyp: 'holz',
      with_montage: true
    });

    expect(result).toBeDefined();
    expect(result.summeBrutto).toBeGreaterThan(0);
  });

  it('sollte Kalkulationen validieren', () => {
    const result = calculator.calculateQuote([
      { typ: 'arbeit', menge: 1, preis_pro_einheit: 45 }
    ]);

    const validation = calculator.validateCalculation(result);
    expect(validation.valid).toBe(true);
    expect(validation.issues.length).toBe(0);
  });

  it('sollte niedrige Preise warnen', () => {
    const result = calculator.calculateQuote([
      { typ: 'arbeit', menge: 0.1, preis_pro_einheit: 1 }
    ]);

    const validation = calculator.validateCalculation(result);
    expect(validation.valid).toBe(false);
    expect(validation.issues.length).toBeGreaterThan(0);
  });

  it('sollte sehr hohe Preise warnen', () => {
    const result = calculator.calculateQuote([
      { typ: 'arbeit', menge: 1000, preis_pro_einheit: 100 }
    ]);

    const validation = calculator.validateCalculation(result);
    expect(validation.valid).toBe(false);
  });
});
