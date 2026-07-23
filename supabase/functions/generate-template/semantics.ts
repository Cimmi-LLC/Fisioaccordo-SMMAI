// Lettura semantica dei post esistenti via Gemini vision (server-only).
// Prompt + parser: la chiamata HTTP la fa index.ts con callGeminiWithRetry.

import type { BrandSemantics } from "../_shared/brand/artDirector.ts";

export function buildSemanticsPrompt(): string {
  return [
    'You are analyzing existing Instagram posts of an Italian healthcare professional to extract their visual identity.',
    'Look at typography, mood, layout habits and recurring decorative motifs.',
    'IMPORTANT: if a field cannot be deduced from the images, set it to null. Do NOT invent.',
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
