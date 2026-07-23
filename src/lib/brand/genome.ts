// Genoma del template: i parametri che l'art director AI applica
// all'archetipo scelto. Archetipo = griglia; genoma = personalita del brand.
//
// File PURO, specchiato in supabase/functions/_shared/brand/genome.ts.
// Niente zod: guardie scritte a mano per portabilita Deno senza dipendenze.

import { isArchetypeId, type ArchetypeId } from './archetypes.ts';

export type DecorationScale = 'subtle' | 'medium' | 'dominant';
export type DecorationAnchor = 'corner' | 'edge' | 'behind_text' | 'full_bleed';
export type TypeContrast = 'low' | 'high' | 'extreme';
export type Density = 'airy' | 'balanced' | 'packed';
export type Alignment = 'left' | 'center';
export type BgStrategy = 'alternating_solid' | 'accent_cover' | 'mono_with_accent_blocks';

export type TemplateGenome = {
  archetype: ArchetypeId;
  /** Motivo decorativo libero, generato dal brand (es. "thin concentric arcs"). */
  decoration_motif: string;
  decoration_scale: DecorationScale;
  decoration_anchor: DecorationAnchor;
  /** Opacita della decorazione, range consentito 0.05 - 0.35. */
  decoration_opacity: number;
  type_pairing: { title: string; body: string };
  type_contrast: TypeContrast;
  density: Density;
  alignment: Alignment;
  bg_strategy: BgStrategy;
  /** Una frase dell'art director che giustifica la scelta. */
  rationale: string;
};

const DECORATION_SCALES: readonly string[] = ['subtle', 'medium', 'dominant'];
const DECORATION_ANCHORS: readonly string[] = ['corner', 'edge', 'behind_text', 'full_bleed'];
const TYPE_CONTRASTS: readonly string[] = ['low', 'high', 'extreme'];
const DENSITIES: readonly string[] = ['airy', 'balanced', 'packed'];
const ALIGNMENTS: readonly string[] = ['left', 'center'];
const BG_STRATEGIES: readonly string[] = [
  'alternating_solid',
  'accent_cover',
  'mono_with_accent_blocks',
];

/** Archetipi incompatibili con l'allineamento centrato. */
const CENTER_INCOMPATIBLE: readonly ArchetypeId[] = ['numeric_grid', 'diagonal_band'];

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}

/**
 * Valida un genoma arrivato dall'LLM (unknown). Ritorna la lista completa
 * degli errori, non si ferma al primo: gli errori vengono appesi al prompt
 * di retry dell'art director.
 */
export function validateGenome(g: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof g !== 'object' || g === null) {
    return { ok: false, errors: ['il genoma non e un oggetto'] };
  }
  const o = g as Record<string, unknown>;

  if (!isArchetypeId(o.archetype)) {
    errors.push('archetype non presente nella libreria: ' + String(o.archetype));
  }

  if (!isNonEmptyString(o.decoration_motif)) {
    errors.push('decoration_motif mancante o vuoto');
  }

  if (!DECORATION_SCALES.includes(o.decoration_scale as string)) {
    errors.push('decoration_scale non valido: ' + String(o.decoration_scale));
  }

  if (!DECORATION_ANCHORS.includes(o.decoration_anchor as string)) {
    errors.push('decoration_anchor non valido: ' + String(o.decoration_anchor));
  }

  const op = o.decoration_opacity;
  if (typeof op !== 'number' || Number.isNaN(op) || op < 0.05 || op > 0.35) {
    errors.push('decoration_opacity fuori range 0.05-0.35: ' + String(op));
  }

  const tp = o.type_pairing as Record<string, unknown> | undefined;
  if (typeof tp !== 'object' || tp === null || !isNonEmptyString(tp.title) || !isNonEmptyString(tp.body)) {
    errors.push('type_pairing incompleto: servono title e body non vuoti');
  }

  if (!TYPE_CONTRASTS.includes(o.type_contrast as string)) {
    errors.push('type_contrast non valido: ' + String(o.type_contrast));
  }

  if (!DENSITIES.includes(o.density as string)) {
    errors.push('density non valida: ' + String(o.density));
  }

  if (!ALIGNMENTS.includes(o.alignment as string)) {
    errors.push('alignment non valido: ' + String(o.alignment));
  }

  if (!BG_STRATEGIES.includes(o.bg_strategy as string)) {
    errors.push('bg_strategy non valida: ' + String(o.bg_strategy));
  }

  if (!isNonEmptyString(o.rationale)) {
    errors.push('rationale mancante');
  }

  // Vincolo incrociato: allineamento centrato incompatibile con archetipi
  // strutturalmente asimmetrici.
  if (
    o.alignment === 'center' &&
    isArchetypeId(o.archetype) &&
    CENTER_INCOMPATIBLE.includes(o.archetype)
  ) {
    errors.push(
      'alignment center incompatibile con archetipo ' + o.archetype
    );
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Frammento di prompt (inglese) che traduce il genoma in istruzioni visive.
 * Deterministico: stesso genoma, stesso frammento.
 */
export function genomeToPromptFragment(g: TemplateGenome): string {
  const lines: string[] = [];

  lines.push(
    'Decoration motif: ' +
      g.decoration_motif +
      ', scale ' +
      g.decoration_scale +
      ', anchored at ' +
      g.decoration_anchor.replace(/_/g, ' ') +
      ', opacity ' +
      g.decoration_opacity.toFixed(2) +
      '. The same single motif must appear consistently on every slide of the set.'
  );

  lines.push(
    'Typography: titles set in ' +
      g.type_pairing.title +
      ', body text set in ' +
      g.type_pairing.body +
      '. Maximum two type families. Contrast between title and body is ' +
      g.type_contrast +
      '.'
  );

  const densityMap: Record<Density, string> = {
    airy: 'generous whitespace, sparse composition, elements breathe',
    balanced: 'moderate whitespace, comfortable composition',
    packed: 'compact composition, tighter spacing, strong information presence',
  };
  lines.push('Density: ' + densityMap[g.density] + '.');

  lines.push('Text alignment: ' + g.alignment + ' aligned throughout.');

  const bgMap: Record<BgStrategy, string> = {
    alternating_solid:
      'Background strategy: alternate solid background colors between slides, switching between the two brand background colors.',
    accent_cover:
      'Background strategy: the cover uses the accent color as full background, inner slides use the light background color.',
    mono_with_accent_blocks:
      'Background strategy: one single background color across all slides, with solid accent color blocks as structural elements.',
  };
  lines.push(bgMap[g.bg_strategy]);

  return lines.join('\n');
}
