// Test di validateGenome e genomeToPromptFragment.
import { describe, it, expect } from 'vitest';
import { validateGenome, genomeToPromptFragment, type TemplateGenome } from '../genome.ts';

const GOLDEN: TemplateGenome = {
  archetype: 'split_panel',
  decoration_motif: 'thin concentric arcs radiating from the corner',
  decoration_scale: 'subtle',
  decoration_anchor: 'corner',
  decoration_opacity: 0.12,
  type_pairing: { title: 'geometric sans serif, heavy weight', body: 'humanist sans serif, regular' },
  type_contrast: 'high',
  density: 'balanced',
  alignment: 'left',
  bg_strategy: 'alternating_solid',
  rationale: 'Struttura clinica e ordinata, adatta a un poliambulatorio.',
};

describe('validateGenome', () => {
  it('accetta il genoma golden', () => {
    const r = validateGenome(GOLDEN);
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('rifiuta archetipo non in libreria', () => {
    const r = validateGenome({ ...GOLDEN, archetype: 'free_style' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('archetype');
  });

  it('rifiuta opacity fuori range (bassa e alta)', () => {
    expect(validateGenome({ ...GOLDEN, decoration_opacity: 0.01 }).ok).toBe(false);
    expect(validateGenome({ ...GOLDEN, decoration_opacity: 0.5 }).ok).toBe(false);
    expect(validateGenome({ ...GOLDEN, decoration_opacity: Number.NaN }).ok).toBe(false);
  });

  it('rifiuta alignment center con numeric_grid e diagonal_band', () => {
    const r1 = validateGenome({ ...GOLDEN, archetype: 'numeric_grid', alignment: 'center' });
    expect(r1.ok).toBe(false);
    expect(r1.errors.join(' ')).toContain('incompatibile');
    const r2 = validateGenome({ ...GOLDEN, archetype: 'diagonal_band', alignment: 'center' });
    expect(r2.ok).toBe(false);
  });

  it('accetta alignment center con centered_minimal', () => {
    const r = validateGenome({ ...GOLDEN, archetype: 'centered_minimal', alignment: 'center' });
    expect(r.ok).toBe(true);
  });

  it('accumula piu errori invece di fermarsi al primo', () => {
    const r = validateGenome({ archetype: 'x', decoration_opacity: 9 });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(2);
  });

  it('rifiuta input non oggetto', () => {
    expect(validateGenome(null).ok).toBe(false);
    expect(validateGenome('genoma').ok).toBe(false);
  });

  it('gradi di liberta aggiuntivi: opzionali, valori noti accettati, inventati rifiutati', () => {
    expect(validateGenome(GOLDEN).ok).toBe(true);
    expect(validateGenome({
      ...GOLDEN,
      number_treatment: 'circle_badge',
      shape_language: 'organic',
      bg_texture: 'halftone_dots',
      accent_element: 'bracket',
      progress_indicator: 'dots',
    }).ok).toBe(true);
    const r = validateGenome({ ...GOLDEN, shape_language: 'wobbly' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('shape_language');
  });

  it('format: opzionale, accetta 1:1 e 4:5, rifiuta il resto', () => {
    expect(validateGenome({ ...GOLDEN, format: '1:1' }).ok).toBe(true);
    expect(validateGenome({ ...GOLDEN, format: '4:5' }).ok).toBe(true);
    const r = validateGenome({ ...GOLDEN, format: '16:9' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('format');
  });

  it('visual_style: opzionale, accetta i due stili noti, rifiuta il resto', () => {
    expect(validateGenome(GOLDEN).ok).toBe(true);
    expect(validateGenome({ ...GOLDEN, visual_style: 'flat_icon' }).ok).toBe(true);
    expect(validateGenome({ ...GOLDEN, visual_style: 'realistic' }).ok).toBe(true);
    const r = validateGenome({ ...GOLDEN, visual_style: 'cartoon' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('visual_style');
  });
});

describe('genomeToPromptFragment', () => {
  it('e deterministico', () => {
    expect(genomeToPromptFragment(GOLDEN)).toBe(genomeToPromptFragment(GOLDEN));
  });

  it('contiene motivo, tipografia, densita, allineamento e bg strategy', () => {
    const f = genomeToPromptFragment(GOLDEN);
    expect(f).toContain(GOLDEN.decoration_motif);
    expect(f).toContain(GOLDEN.type_pairing.title);
    expect(f).toContain('left aligned');
    expect(f).toContain('alternate solid background');
  });

  it('non contiene em/en dash', () => {
    expect(genomeToPromptFragment(GOLDEN)).not.toMatch(/[‒–—―]/);
  });
});

describe('genomeToPromptFragment: gradi di liberta', () => {
  const base: TemplateGenome = {
    archetype: 'split_panel',
    decoration_motif: 'thin concentric arcs',
    decoration_scale: 'subtle',
    decoration_anchor: 'corner',
    decoration_opacity: 0.12,
    type_pairing: { title: 'geometric sans', body: 'humanist sans' },
    type_contrast: 'high',
    density: 'balanced',
    alignment: 'left',
    bg_strategy: 'alternating_solid',
    rationale: 'Struttura ordinata.',
  };

  it('omette le leve non specificate (nessun default che uniforma)', () => {
    const f = genomeToPromptFragment(base);
    expect(f).not.toContain('Shape language');
    expect(f).not.toContain('Index number treatment');
    expect(f).not.toContain('Progress indicator');
  });

  it('due genomi con leve diverse producono frammenti diversi', () => {
    const a = genomeToPromptFragment({
      ...base, shape_language: 'sharp', number_treatment: 'outline', accent_element: 'side_bar',
    });
    const b = genomeToPromptFragment({
      ...base, shape_language: 'organic', number_treatment: 'circle_badge', accent_element: 'bracket',
    });
    expect(a).not.toBe(b);
    expect(a).toContain('sharp corners');
    expect(b).toContain('organic shapes');
    expect(b).toContain('circular badge');
  });
});
