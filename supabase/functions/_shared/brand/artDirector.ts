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

/** Sottoinsieme del brand kit utile alla direzione artistica. */
export type ArtDirectorBrandInfo = {
  nome_business: string;
  descrizione: string;
  categorie: string[];
  servizi: string[];
  tono_voce: string;
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
  usedArchetypes?: string[]
): string {
  const sections: string[] = [];

  sections.push(
    'You are the art director of a template system for Instagram carousels of Italian healthcare professionals. ' +
    'You do NOT design free layouts. You pick EXACTLY ONE archetype from the closed library below and parameterize it.'
  );

  sections.push('ARCHETYPE LIBRARY:\n' + listArchetypesForPrompt());

  sections.push(
    'BRAND:\n' +
    'Name: ' + brand.nome_business + '\n' +
    'Description: ' + brand.descrizione + '\n' +
    'Categories: ' + brand.categorie.join(', ') + '\n' +
    'Services: ' + brand.servizi.join(', ') + '\n' +
    'Tone of voice: ' + brand.tono_voce
  );

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

  if (usedArchetypes && usedArchetypes.length > 0) {
    sections.push(
      'ARCHETYPES ALREADY USED by other brands of this same agency: ' +
      usedArchetypes.join(', ') + '. ' +
      'Visual variety across brands is a goal: choose a DIFFERENT archetype unless the brand identity strongly demands one of these. ' +
      'If you do reuse one, differentiate it clearly through decoration, density and background strategy.'
    );
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
    'TASK: choose ONE archetype (justify it in one sentence in the rationale field, in Italian) and return ONLY a pure JSON object, no surrounding text, no markdown fences, with exactly this shape:\n' +
    '{\n' +
    '  "archetype": "<one of the 6 ids>",\n' +
    '  "decoration_motif": "<short english description of one abstract decorative motif derived from the brand>",\n' +
    '  "decoration_scale": "subtle" | "medium" | "dominant",\n' +
    '  "decoration_anchor": "corner" | "edge" | "behind_text" | "full_bleed",\n' +
    '  "decoration_opacity": <number between 0.05 and 0.35>,\n' +
    '  "type_pairing": { "title": "<english description>", "body": "<english description>" },\n' +
    '  "type_contrast": "low" | "high" | "extreme",\n' +
    '  "density": "airy" | "balanced" | "packed",\n' +
    '  "alignment": "left" | "center",\n' +
    '  "bg_strategy": "alternating_solid" | "accent_cover" | "mono_with_accent_blocks",\n' +
    '  "rationale": "<one sentence in Italian>"\n' +
    '}'
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
