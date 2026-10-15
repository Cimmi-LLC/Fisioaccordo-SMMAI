import { describe, it, expect } from 'vitest';
import { normalizeHex, parseHexList, generateScale, paletteFromScale, SCALE_STOPS } from '../colorScale.ts';
import { contrastRatio, relativeLuminance } from '../extractor.ts';

describe('normalizeHex', () => {
  it('accetta 3 e 6 cifre, con o senza cancelletto', () => {
    expect(normalizeHex('#0B7834')).toBe('#0b7834');
    expect(normalizeHex('0b7834')).toBe('#0b7834');
    expect(normalizeHex('#fa0')).toBe('#ffaa00');
    expect(normalizeHex(' FA0 ')).toBe('#ffaa00');
  });
  it('rifiuta valori non validi', () => {
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('verde')).toBeNull();
  });
});

describe('parseHexList', () => {
  it('estrae i codici da testo libero senza doppioni', () => {
    expect(parseHexList('#0B7834, #92bb93\n0b7834 e poi #fff')).toEqual(['#0b7834', '#92bb93', '#ffffff']);
  });
  it('non scambia parole per colori', () => {
    expect(parseHexList('add bad cafe dad')).toEqual([]);
  });
  it('rispetta il massimo', () => {
    const many = Array.from({ length: 40 }, (_, i) => '#' + (100000 + i)).join(' ');
    expect(parseHexList(many, 5)).toHaveLength(5);
  });
});

describe('generateScale', () => {
  it('produce 10 gradini con il colore base al 500', () => {
    const scale = generateScale('#0b7834');
    expect(scale.map((s) => s.stop)).toEqual([...SCALE_STOPS]);
    expect(scale.find((s) => s.stop === 500)?.hex).toBe('#0b7834');
  });
  it('va dal chiaro allo scuro senza salti all\'indietro', () => {
    const lum = generateScale('#e6007e').map((s) => relativeLuminance(s.hex));
    for (let i = 1; i < lum.length; i++) expect(lum[i]).toBeLessThanOrEqual(lum[i - 1]);
    expect(lum[0]).toBeGreaterThan(0.85);
    expect(lum[lum.length - 1]).toBeLessThan(0.1);
  });
  it('colore non valido: scala vuota', () => {
    expect(generateScale('ciao')).toEqual([]);
  });
});

describe('paletteFromScale', () => {
  it('assegna i 5 ruoli con testi leggibili', () => {
    for (const base of ['#0b7834', '#e6007e', '#ffd400', '#554697']) {
      const p = paletteFromScale(generateScale(base));
      expect(p).not.toBeNull();
      if (!p) continue;
      expect(p.accent).toBe(base);
      expect(contrastRatio(p.text_on_light, p.bg_a)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.text_on_dark, p.bg_b)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('scala incompleta: null', () => {
    expect(paletteFromScale([])).toBeNull();
  });
});
