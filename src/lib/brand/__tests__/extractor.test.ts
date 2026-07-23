// Test WCAG + estrazione palette (node-vibrant mockato, zero rete).
import { describe, it, expect, vi } from 'vitest';

vi.mock('node-vibrant/browser', () => {
  return {
    Vibrant: {
      from: (_src: string) => ({
        getPalette: async () => ({
          Vibrant: { hex: '#2a688c', population: 120 },
          Muted: { hex: '#8a9aa5', population: 60 },
          DarkVibrant: { hex: '#1e2a32', population: 200 },
          DarkMuted: { hex: '#22303a', population: 90 },
          LightVibrant: { hex: '#f5f2ec', population: 300 },
          LightMuted: { hex: '#e8e4dc', population: 110 },
        }),
      }),
    },
  };
});

import {
  relativeLuminance,
  contrastRatio,
  ensureContrast,
  extractPalette,
} from '../extractor.ts';

describe('WCAG helpers', () => {
  it('luminanza: nero 0, bianco 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('contrasto nero/bianco = 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('ensureContrast lascia invariata una coppia gia conforme', () => {
    expect(ensureContrast('#1a1a1a', '#f5f2ec')).toBe('#1a1a1a');
  });

  it('ensureContrast corregge una coppia insufficiente fino a >= 4.5', () => {
    const fixed = ensureContrast('#c9c4ba', '#f5f2ec'); // grigio chiaro su avorio
    expect(contrastRatio(fixed, '#f5f2ec')).toBeGreaterThanOrEqual(4.5);
  });

  it('ensureContrast va verso il bianco su sfondo scuro', () => {
    const fixed = ensureContrast('#334455', '#1e2a32');
    expect(contrastRatio(fixed, '#1e2a32')).toBeGreaterThanOrEqual(4.5);
    expect(relativeLuminance(fixed)).toBeGreaterThan(relativeLuminance('#334455'));
  });
});

describe('extractPalette', () => {
  it('mappa gli swatch nelle chiavi giuste e garantisce contrasto su entrambe le coppie', async () => {
    const p = await extractPalette(['blob:fake-1']);
    expect(p.bg_a).toBe('#f5f2ec');        // chiaro dominante
    expect(p.bg_b).toBe('#1e2a32');        // scuro dominante
    expect(p.accent).toBe('#2a688c');      // il piu saturo con popolazione
    expect(contrastRatio(p.text_on_light, p.bg_a)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.text_on_dark, p.bg_b)).toBeGreaterThanOrEqual(4.5);
    expect(p.candidates.length).toBeGreaterThan(0);
  });

  it('e deterministica sugli stessi input', async () => {
    const a = await extractPalette(['blob:x']);
    const b = await extractPalette(['blob:x']);
    expect(a).toEqual(b);
  });
});

describe('parseArtDirectorResponse', () => {
  it('accetta JSON valido con fence markdown', async () => {
    const { parseArtDirectorResponse } = await import('../artDirector.ts');
    const genome = {
      archetype: 'quote_block',
      decoration_motif: 'oversized quotation marks',
      decoration_scale: 'medium',
      decoration_anchor: 'corner',
      decoration_opacity: 0.2,
      type_pairing: { title: 'serif display', body: 'sans regular' },
      type_contrast: 'extreme',
      density: 'airy',
      alignment: 'left',
      bg_strategy: 'accent_cover',
      rationale: 'Afferma autorevolezza.',
    };
    const raw = 'Ecco il risultato:\n```json\n' + JSON.stringify(genome) + '\n```';
    const r = parseArtDirectorResponse(raw);
    expect(r.ok).toBe(true);
  });

  it('rifiuta risposta senza JSON', async () => {
    const { parseArtDirectorResponse } = await import('../artDirector.ts');
    const r = parseArtDirectorResponse('non ho capito la domanda');
    expect(r.ok).toBe(false);
  });

  it('rifiuta genoma con vincoli violati e riporta gli errori', async () => {
    const { parseArtDirectorResponse } = await import('../artDirector.ts');
    const bad = { archetype: 'numeric_grid', alignment: 'center', decoration_opacity: 0.9 };
    const r = parseArtDirectorResponse(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(1);
  });
});
