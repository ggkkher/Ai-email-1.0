import { describe, it, expect, beforeAll } from 'vitest';
import ClaudeService from './claudeService.js';

describe('Claude AI Service', () => {
  let claudeService;

  beforeAll(() => {
    claudeService = new ClaudeService();
  });

  describe('Arbeitsleistungs-Schätzung', () => {
    it('sollte Rasen-Arbeitsleistung schätzen', async () => {
      const hours = await claudeService.estimateWorkingHours('rasen', 100, 'mittel');
      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThan(100);
    });

    it('sollte Bepflanzungs-Arbeitsleistung schätzen', async () => {
      const hours = await claudeService.estimateWorkingHours('bepflanzung', 50, 'mittel');
      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThan(50);
    });

    it('sollte Terrassen-Arbeitsleistung schätzen', async () => {
      const hours = await claudeService.estimateWorkingHours('terrasse', 50, 'mittel');
      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThan(100);
    });

    it('sollte Zaun-Arbeitsleistung schätzen', async () => {
      const hours = await claudeService.estimateWorkingHours('zaun', 30, 'mittel');
      expect(hours).toBeGreaterThan(0);
      expect(hours).toBeLessThan(50);
    });

    it('sollte komplexe Projekte höher schätzen', async () => {
      const einfach = await claudeService.estimateWorkingHours('rasen', 100, 'einfach');
      const komplex = await claudeService.estimateWorkingHours('rasen', 100, 'komplex');
      expect(komplex).toBeGreaterThan(einfach);
    });
  });

  describe('Validierung und Optimierung', () => {
    it('sollte realistische Kalkulationen validieren', async () => {
      const kalkulation = {
        materialkosten: 500,
        arbeitsStunden: 10,
        stundensatz: 50,
        fahrtkosten: 50,
        marge: 35,
        summeNetto: 2000,
        summeBrutto: 2380
      };

      const result = await claudeService.validateAndOptimizeQuote(kalkulation, {
        projekttyp: 'rasen',
        flaeche: 100,
        komplexitaet: 'mittel'
      });

      expect(result).toHaveProperty('istRealistisch');
    });
  });

  describe('Verkaufsargumente', () => {
    it('sollte Verkaufsargumente generieren', async () => {
      const args = await claudeService.generateSalesArguments('rasen', 'GaLaBau Müller');
      expect(args).toBeDefined();
    });
  });

  describe('Beschreibungsgenerierung', () => {
    it('sollte Angebotsbeschreibung generieren', async () => {
      const description = await claudeService.generateSmartQuoteDescription(
        {
          projekttyp: 'rasen',
          flaeche: '100',
          materialien: ['Rasensaat', 'Dünger'],
          besonderheiten: ['Kleine Steigung']
        },
        'GaLaBau Test'
      );

      expect(description).toBeTruthy();
      expect(description.length).toBeGreaterThan(0);
    });
  });
});
