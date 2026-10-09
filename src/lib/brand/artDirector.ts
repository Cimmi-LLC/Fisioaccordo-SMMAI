// Art director AI: sceglie UN archetipo dalla libreria chiusa e lo
// parametrizza in un TemplateGenome.
//
// File PURO (prompt builder + parser, zero fetch): la chiamata Gemini vive
// nella edge function generate-template. Specchiato in
// supabase/functions/_shared/brand/artDirector.ts.

import { listArchetypesForPrompt } from './archetypes.ts';
import { validateGenome, type TemplateGenome } from './genome.ts';
import type { GenesisPalette } from './genesisPrompt.ts';

/** Lettura semantica dei post esistenti (output di Gemini vision). */
export type BrandSemantics = {
  typography: {
    title_character: string;
    title_weight: string;
    case: string;
    body_character: string;
  };
  visual_mood: string[];
  layout_tendency: string | null;
  decoration_motif: string | null;
  uses_photography: boolean;
  confidence: number;
};

/**
 * Sottoinsieme del brand kit utile alla direzione artistica.
 * Piu materiale specifico arriva, meno il risultato converge sulla scelta
 * generica: i campi distintivi (mission, vantaggi, temi, identita) sono
 * quelli che davvero separano uno studio dall'altro.
 */
export type ArtDirectorBrandInfo = {
  nome_business: string;
  /** Professione di chi pubblica (es. "Nutrizionista"): orienta decorazione e tono visivo. */
  professione?: string;
  descrizione: string;
  categorie: string[];
  servizi: string[];
  tono_voce: string;
  mission?: string;
  identita_core?: string;
  vantaggi_competitivi?: string[];
  temi_chiave?: string[];
  /** Font gia dichiarati nel brand kit: vincolano type_pairing. */
  font_intestazioni?: string;
  font_body?: string;
};

/**
 * Prompt per gemini-2.5-flash: scegliere un archetipo e produrre il genoma.
 * Output atteso: JSON puro conforme a TemplateGenome.
 */
export function buildArtDirectorPrompt(
  brand: ArtDirectorBrandInfo,
  semantics: BrandSemantics | null,
  palette: GenesisPalette,
  feedback?: string,
  previousErrors?: string[],
  usedArchetypes?: string[],
  usedMotifs?: string[]
): string {
  const sections: string[] = [];

  sections.push(
    'You are the art director of a template system for Instagram carousels of Italian healthcare professionals. ' +
    'You do NOT design free layouts. You pick EXACTLY ONE archetype from the closed library below and parameterize it.'
  );

  sections.push('ARCHETYPE LIBRARY:\n' + listArchetypesForPrompt());

  const brandLines = [
    'BRAND:',
    'Name: ' + brand.nome_business,
    'Profession: ' + (brand.professione || 'healthcare professional'),
    'Description: ' + brand.descrizione,
    'Categories: ' + brand.categorie.join(', '),
    'Services: ' + brand.servizi.join(', '),
    'Tone of voice: ' + brand.tono_voce,
  ];
  if (brand.mission) brandLines.push('Mission: ' + brand.mission);
  if (brand.identita_core) brandLines.push('Core identity: ' + brand.identita_core);
  if (brand.vantaggi_competitivi?.length) {
    brandLines.push('What makes it different: ' + brand.vantaggi_competitivi.join('; '));
  }
  if (brand.temi_chiave?.length) {
    brandLines.push('Key themes: ' + brand.temi_chiave.join(', '));
  }
  sections.push(brandLines.join('\n'));

  if (brand.font_intestazioni || brand.font_body) {
    sections.push(
      'BRAND TYPEFACES already chosen by this studio (respect them in type_pairing, describe them faithfully):\n' +
      'Headings: ' + (brand.font_intestazioni || 'not specified') + '\n' +
      'Body: ' + (brand.font_body || 'not specified')
    );
  }

  sections.push(
    'BRAND PALETTE (already resolved, do not invent colors):\n' +
    'light background ' + palette.bg_a + ', dark background ' + palette.bg_b +
    ', accent ' + palette.accent
  );

  if (semantics) {
    sections.push(
      'VISUAL ANALYSIS OF EXISTING POSTS (confidence ' + semantics.confidence.toFixed(2) + '):\n' +
      'Typography: ' + semantics.typography.title_character + ', weight ' + semantics.typography.title_weight +
      ', case ' + semantics.typography.case + '; body ' + semantics.typography.body_character + '\n' +
      'Mood: ' + semantics.visual_mood.join(', ') + '\n' +
      'Layout tendency: ' + (semantics.layout_tendency ?? 'unknown') + '\n' +
      'Recurring decoration: ' + (semantics.decoration_motif ?? 'none detected') + '\n' +
      'Uses photography: ' + String(semantics.uses_photography)
    );
  }

  if ((usedArchetypes && usedArchetypes.length > 0) || (usedMotifs && usedMotifs.length > 0)) {
    const lines = [
      'ANTI CONVERGENCE: every studio of this agency must end up with a visually distinct template. Two brands that look like recolors of each other are a failure.',
    ];
    if (usedArchetypes?.length) {
      lines.push('Archetypes already assigned to other brands: ' + usedArchetypes.join(', ') + '. Pick a DIFFERENT one unless the brand identity strongly demands one of these.');
    }
    if (usedMotifs?.length) {
      lines.push('Decoration motifs already in use: ' + usedMotifs.join(' | ') + '. Your motif must not be a paraphrase of any of them: change the geometry family, not just the wording.');
    }
    lines.push('If you are forced to reuse an archetype, then shape_language, number_treatment, bg_texture and accent_element MUST differ from a conventional treatment, so the result reads as a different design system.');
    sections.push(lines.join('\n'));
  }

  if (feedback && feedback.trim().length > 0) {
    sections.push(
      'PRIORITY CONSTRAINT FROM THE CLIENT (overrides your own judgement where conflicting):\n' + feedback.trim()
    );
  }

  if (previousErrors && previousErrors.length > 0) {
    sections.push(
      'YOUR PREVIOUS ANSWER WAS REJECTED with these validation errors, fix ALL of them:\n- ' +
      previousErrors.join('\n- ')
    );
  }

  sections.push(
    'HARD CONSTRAINTS:\n' +
    '- format 1080x1080, safe area 90px on every side\n' +
    '- maximum 2 type families\n' +
    '- one single decoration motif, consistent on every slide\n' +
    '- no stock photography, no generated human figures\n' +
    '- text to background contrast at least 4.5 to 1\n' +
    '- the system must hold titles and body text up to the character limits of the chosen archetype\n' +
    '- alignment center is forbidden with archetypes numeric_grid and diagonal_band'
  );

  sections.push(
    'DERIVE FROM THIS SPECIFIC BRAND, not from the healthcare category in general: the decoration motif must come from something concrete about THIS studio (its name, its specialties, its equipment, its city, its core identity), never a generic medical cliche such as a cross, a heartbeat line or a plain circle. Two studios in the same field must not receive the same motif.'
  );

  sections.push(
    'TASK: choose ONE archetype (justify it in one sentence in the rationale field, in Italian) and return ONLY a pure JSON object, no surrounding text, no markdown fences, with exactly this shape:\n' +
    '{\n' +
    '  "archetype": "<one of the 6 ids>",\n' +
    '  "decoration_motif": "<short english description of one abstract decorative motif derived from THIS brand>",\n' +
    '  "decoration_scale": "subtle" | "medium" | "dominant",\n' +
    '  "decoration_anchor": "corner" | "edge" | "behind_text" | "full_bleed",\n' +
    '  "decoration_opacity": <number between 0.05 and 0.35>,\n' +
    '  "type_pairing": { "title": "<english description>", "body": "<english description>" },\n' +
    '  "type_contrast": "low" | "high" | "extreme",\n' +
    '  "density": "airy" | "balanced" | "packed",\n' +
    '  "alignment": "left" | "center",\n' +
    '  "bg_strategy": "alternating_solid" | "accent_cover" | "mono_with_accent_blocks",\n' +
    '  "number_treatment": "plain" | "outline" | "oversized_bg" | "circle_badge" | "none",\n' +
    '  "shape_language": "sharp" | "rounded" | "pill" | "organic",\n' +
    '  "bg_texture": "none" | "subtle_grain" | "halftone_dots" | "thin_grid",\n' +
    '  "accent_element": "underline" | "side_bar" | "corner_block" | "bracket" | "none",\n' +
    '  "progress_indicator": "none" | "dots" | "bar" | "counter",\n' +
    '  "rationale": "<one sentence in Italian>"\n' +
    '}\n' +
    'The last five fields are the ones that make two studios on the same archetype look different: choose them from the brand personality, do not default to the first option of each list.'
  );

  return sections.join('\n\n');
}

/**
 * Estrae e valida il genoma dalla risposta dell'LLM.
 * Tollera fence markdown e testo attorno al JSON.
 */
export function parseArtDirectorResponse(
  raw: string
): { ok: true; genome: TemplateGenome } | { ok: false; errors: string[] } {
  let text = raw.trim();
  // strip fence markdown
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // estrai il primo blocco {...}
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last <= first) {
    return { ok: false, errors: ['nessun JSON nella risposta'] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(first, last + 1));
  } catch (e) {
    return { ok: false, errors: ['JSON non valido: ' + (e instanceof Error ? e.message : 'parse error')] };
  }

  const check = validateGenome(parsed);
  if (!check.ok) return { ok: false, errors: check.errors };
  return { ok: true, genome: parsed as TemplateGenome };
}
