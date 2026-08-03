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

// ── Gradi di liberta aggiuntivi ────────────────────────────────────────
// Leve visibili a occhio nudo: due brand sullo stesso archetipo devono
// comunque produrre template riconoscibilmente diversi. Tutti opzionali
// per retro compatibilita con i genomi generati prima della loro
// introduzione (i template gia congelati restano validi).

/** Come viene trattato il numero progressivo nelle slide content. */
export type NumberTreatment = 'plain' | 'outline' | 'oversized_bg' | 'circle_badge' | 'none';
/** Linguaggio delle forme: spigoli, raccordi, pillole, forme organiche. */
export type ShapeLanguage = 'sharp' | 'rounded' | 'pill' | 'organic';
/** Texture di fondo, sempre discreta. */
export type BgTexture = 'none' | 'subtle_grain' | 'halftone_dots' | 'thin_grid';
/** Elemento grafico che marca il titolo. */
export type AccentElement = 'underline' | 'side_bar' | 'corner_block' | 'bracket' | 'none';
/** Indicatore di avanzamento nel carosello. */
export type ProgressIndicator = 'none' | 'dots' | 'bar' | 'counter';
/** Stile dei visual esplicativi nelle slide content: scelto dall'utente nel wizard. */
export type VisualStyle = 'flat_icon' | 'realistic';
/** Formato delle slide: quadrato o verticale Instagram. Scelto nel wizard. */
export type SlideFormat = '1:1' | '4:5';

/** Dimensioni canvas in pixel per formato. */
export function canvasForFormat(format: SlideFormat | undefined): { w: number; h: number } {
  return format === '4:5' ? { w: 1080, h: 1350 } : { w: 1080, h: 1080 };
}

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
  /**
   * Stile visual delle slide content. Non lo decide l'art director: viene
   * iniettato dalla scelta utente nel wizard. Assente = flat_icon.
   */
  visual_style?: VisualStyle;
  /**
   * Formato slide. Anche questo e una scelta utente iniettata dal wizard.
   * Assente = 1:1 (compatibilita con i template creati prima del campo).
   */
  format?: SlideFormat;

  // Gradi di liberta aggiuntivi scelti dall'art director. Opzionali: i
  // genomi precedenti restano validi e cadono sui default neutri.
  number_treatment?: NumberTreatment;
  shape_language?: ShapeLanguage;
  bg_texture?: BgTexture;
  accent_element?: AccentElement;
  progress_indicator?: ProgressIndicator;
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
const NUMBER_TREATMENTS: readonly string[] = ['plain', 'outline', 'oversized_bg', 'circle_badge', 'none'];
const SHAPE_LANGUAGES: readonly string[] = ['sharp', 'rounded', 'pill', 'organic'];
const BG_TEXTURES: readonly string[] = ['none', 'subtle_grain', 'halftone_dots', 'thin_grid'];
const ACCENT_ELEMENTS: readonly string[] = ['underline', 'side_bar', 'corner_block', 'bracket', 'none'];
const PROGRESS_INDICATORS: readonly string[] = ['none', 'dots', 'bar', 'counter'];

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

  // Campo opzionale: se presente deve essere uno dei due stili noti.
  if (
    o.visual_style !== undefined &&
    o.visual_style !== 'flat_icon' &&
    o.visual_style !== 'realistic'
  ) {
    errors.push('visual_style non valido: ' + String(o.visual_style));
  }

  // Campo opzionale: formato slide.
  if (o.format !== undefined && o.format !== '1:1' && o.format !== '4:5') {
    errors.push('format non valido: ' + String(o.format));
  }

  // Gradi di liberta aggiuntivi: opzionali, ma se presenti devono essere
  // valori noti (un valore inventato dall'LLM non produrrebbe nulla di
  // visibile nel prompt e falserebbe la varieta dichiarata).
  const optionalEnums: Array<[string, readonly string[]]> = [
    ['number_treatment', NUMBER_TREATMENTS],
    ['shape_language', SHAPE_LANGUAGES],
    ['bg_texture', BG_TEXTURES],
    ['accent_element', ACCENT_ELEMENTS],
    ['progress_indicator', PROGRESS_INDICATORS],
  ];
  for (const [key, allowed] of optionalEnums) {
    const value = o[key];
    if (value !== undefined && !allowed.includes(value as string)) {
      errors.push(key + ' non valido: ' + String(value));
    }
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

  // ── Gradi di liberta aggiuntivi ──
  // Sono le leve che rendono due brand sullo stesso archetipo comunque
  // diversi a colpo d'occhio. Assenti = si omette la riga, nessun default
  // implicito che uniformerebbe di nuovo i risultati.

  const shapeMap: Record<ShapeLanguage, string> = {
    sharp: 'perfectly sharp corners, hard edges, no rounding anywhere',
    rounded: 'consistently rounded corners, radius around 24px on blocks and panels',
    pill: 'fully pill shaped elements, capsule blocks with maximum corner radius',
    organic: 'soft organic shapes with irregular curved edges, nothing geometrically perfect',
  };
  if (g.shape_language) {
    lines.push('Shape language: ' + shapeMap[g.shape_language] + '. Apply it to every block, panel and badge.');
  }

  const numberMap: Record<NumberTreatment, string> = {
    plain: 'the index number is set in the title typeface, solid accent color, no container',
    outline: 'the index number is outlined only, transparent inside, thin stroke',
    oversized_bg: 'the index number is oversized and bleeds behind the text as a background element, low opacity',
    circle_badge: 'the index number sits inside a solid filled circular badge',
    none: 'no index number is displayed at all',
  };
  if (g.number_treatment) {
    lines.push('Index number treatment: ' + numberMap[g.number_treatment] + '.');
  }

  const textureMap: Record<BgTexture, string> = {
    none: '',
    subtle_grain: 'Background texture: a very subtle paper grain over the flat background, barely perceptible.',
    halftone_dots: 'Background texture: a fine halftone dot pattern in one corner region, low contrast.',
    thin_grid: 'Background texture: a thin regular grid of hairlines, very low contrast, behind the content.',
  };
  if (g.bg_texture && textureMap[g.bg_texture]) {
    lines.push(textureMap[g.bg_texture]);
  }

  const accentMap: Record<AccentElement, string> = {
    underline: 'a thick accent color underline sits under the headline',
    side_bar: 'a vertical accent color bar runs along the left side of the headline',
    corner_block: 'a solid accent color block anchors one corner of the layout',
    bracket: 'accent color bracket marks frame the headline on two sides',
    none: 'no additional graphic marker on the headline',
  };
  if (g.accent_element) {
    lines.push('Headline marker: ' + accentMap[g.accent_element] + '.');
  }

  const progressMap: Record<ProgressIndicator, string> = {
    none: '',
    dots: 'Progress indicator: a row of small dots along the bottom edge, the current one filled with the accent color.',
    bar: 'Progress indicator: a thin horizontal progress bar along the bottom edge, partially filled with the accent color.',
    counter: 'Progress indicator: a small counter in a bottom corner, in the body typeface.',
  };
  if (g.progress_indicator && progressMap[g.progress_indicator]) {
    lines.push(progressMap[g.progress_indicator]);
  }

  return lines.join('\n');
}
