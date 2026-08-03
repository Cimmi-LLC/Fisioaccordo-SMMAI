// Lettura semantica dei post esistenti via Gemini vision (server-only).
// Prompt + parser: la chiamata HTTP la fa index.ts con callGeminiWithRetry.

import type { BrandSemantics } from "../_shared/brand/artDirector.ts";

/** Testi del brand: danno personalita alla lettura anche senza post. */
export type SemanticsBrandContext = {
  nome_business?: string | null;
  descrizione?: string | null;
  servizi?: string[] | null;
  mission?: string | null;
  identita_core?: string | null;
  vantaggi_competitivi?: string[] | null;
  temi_chiave?: string[] | null;
  tono_voce?: string | null;
};

/**
 * Prompt della lettura semantica.
 *
 * `hasPosts = false` copre il caso reale in cui il cliente non carica post:
 * l'analisi lavora su logo e foto dello studio e si appoggia molto di piu
 * ai testi del brand, invece di non partire affatto (era la causa
 * principale dei template tutti uguali).
 */
export function buildSemanticsPrompt(
  hasPosts = true,
  brand?: SemanticsBrandContext,
): string {
  const brandLines: string[] = [];
  if (brand) {
    if (brand.nome_business) brandLines.push('Studio name: ' + brand.nome_business);
    if (brand.descrizione) brandLines.push('Description: ' + brand.descrizione);
    if (brand.servizi?.length) brandLines.push('Services: ' + brand.servizi.slice(0, 12).join(', '));
    if (brand.mission) brandLines.push('Mission: ' + brand.mission);
    if (brand.identita_core) brandLines.push('Core identity: ' + brand.identita_core);
    if (brand.vantaggi_competitivi?.length) brandLines.push('Differentiators: ' + brand.vantaggi_competitivi.slice(0, 8).join('; '));
    if (brand.temi_chiave?.length) brandLines.push('Key themes: ' + brand.temi_chiave.join(', '));
    if (brand.tono_voce) brandLines.push('Tone of voice: ' + brand.tono_voce);
  }

  const intro = hasPosts
    ? [
        'You are analyzing existing Instagram posts of an Italian healthcare professional to extract their visual identity.',
        'Look at typography, mood, layout habits and recurring decorative motifs.',
        'IMPORTANT: if a field cannot be deduced from the images, set it to null. Do NOT invent.',
      ]
    : [
        'You are defining the visual identity of an Italian healthcare studio. No published posts are available: you only have the logo, and possibly photos of the premises, plus the written brand context below.',
        'Read the logo carefully: its letterforms tell you the typographic character, its construction suggests a shape vocabulary and a possible decorative motif.',
        'Then use the written brand context to give the identity a personality that fits THIS studio specifically, not the healthcare category in general.',
        'Set confidence accordingly (a reading without posts should rarely exceed 0.5), but always propose a coherent direction: null everywhere is not useful.',
      ];

  return [
    ...intro,
    ...(brandLines.length > 0 ? ['', 'BRAND CONTEXT:', ...brandLines, ''] : []),
    'Return ONLY a pure JSON object, no markdown fences, no surrounding text, with exactly this shape:',
    '{',
    '  "typography": {',
    '    "title_character": "<short english description of the display type, e.g. geometric sans, humanist serif>",',
    '    "title_weight": "<light|regular|medium|bold|heavy>",',
    '    "case": "<uppercase|title case|sentence case|mixed>",',
    '    "body_character": "<short english description>"',
    '  },',
    '  "visual_mood": ["<3 to 5 english mood adjectives>"],',
    '  "layout_tendency": "<short english description or null>",',
    '  "decoration_motif": "<short english description of a recurring motif or null>",',
    '  "uses_photography": <true|false>,',
    '  "confidence": <number 0..1, how confident you are in this reading overall>',
    '}',
  ].join('\n');
}

/** Parser difensivo: fence strip + primo blocco JSON + campi con default. */
export function parseSemanticsResponse(raw: string): BrandSemantics | null {
  let text = raw.trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  try {
    const p = JSON.parse(text.slice(first, last + 1)) as Record<string, unknown>;
    const t = (p.typography ?? {}) as Record<string, unknown>;
    return {
      typography: {
        title_character: typeof t.title_character === "string" ? t.title_character : "unknown",
        title_weight: typeof t.title_weight === "string" ? t.title_weight : "regular",
        case: typeof t.case === "string" ? t.case : "mixed",
        body_character: typeof t.body_character === "string" ? t.body_character : "unknown",
      },
      visual_mood: Array.isArray(p.visual_mood) ? p.visual_mood.map(String).slice(0, 5) : [],
      layout_tendency: typeof p.layout_tendency === "string" ? p.layout_tendency : null,
      decoration_motif: typeof p.decoration_motif === "string" ? p.decoration_motif : null,
      uses_photography: p.uses_photography === true,
      confidence: typeof p.confidence === "number" && p.confidence >= 0 && p.confidence <= 1
        ? p.confidence
        : 0.3,
    };
  } catch {
    return null;
  }
}
