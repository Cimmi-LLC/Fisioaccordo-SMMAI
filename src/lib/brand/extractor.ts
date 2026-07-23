// Estrazione del brand dai materiali caricati.
//
// Due responsabilita indipendenti:
// 1. extractPalette: PROGRAMMATICA e deterministica (node-vibrant, browser).
//    Mai delegata all'LLM. Corregge i colori testo fino a contrasto WCAG 4.5.
// 2. BrandSemantics: il TIPO della lettura semantica via Gemini vision.
//    La chiamata vive nella edge function generate-template (serve la API
//    key); qui teniamo solo il contratto dati.
//
// Le funzioni WCAG sono esportate pure per i test.

import { Vibrant } from 'node-vibrant/browser';
import type { GenesisPalette } from './genesisPrompt.ts';

// ── WCAG ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

/** Luminanza relativa WCAG 2.x (0 = nero, 1 = bianco). */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

/** Rapporto di contrasto WCAG tra due colori (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Garantisce contrasto minimo 4.5:1 del testo sullo sfondo dato.
 * Se il colore proposto non basta, lo spinge progressivamente verso
 * nero o bianco puro (direzione scelta in base alla luminanza dello sfondo).
 */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;

  const towardBlack = relativeLuminance(bg) > 0.5;
  const target = towardBlack ? 0 : 255;
  const rgb = hexToRgb(fg) ?? (towardBlack ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 });

  // Interpola verso il target finche il contrasto regge, max 20 passi.
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const candidate = rgbToHex(
      rgb.r + (target - rgb.r) * t,
      rgb.g + (target - rgb.g) * t,
      rgb.b + (target - rgb.b) * t
    );
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return towardBlack ? '#000000' : '#ffffff';
}

// ── Palette ──────────────────────────────────────────────────────

export type PaletteResult = GenesisPalette & { candidates: string[] };

type SwatchLike = { hex: string; population: number } | null | undefined;

/** Saturazione HSL approssimata di un colore hex (0..1). */
function saturationOf(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

/**
 * Estrae la palette del brand dalle immagini (logo + post).
 * Deterministica: stessi input, stessa palette.
 *
 * Regole:
 * - bg_a: il colore CHIARO dominante
 * - bg_b: il colore SCURO dominante
 * - accent: il piu saturo con popolazione sufficiente
 * - text_on_light / text_on_dark: contrasto minimo 4.5:1 garantito
 */
export async function extractPalette(images: Array<File | Blob | string>): Promise<PaletteResult> {
  const allSwatches: Array<{ hex: string; population: number }> = [];

  for (const img of images) {
    const src = typeof img === 'string' ? img : URL.createObjectURL(img);
    try {
      const palette = await Vibrant.from(src).getPalette();
      const entries: SwatchLike[] = [
        palette.Vibrant, palette.Muted,
        palette.DarkVibrant, palette.DarkMuted,
        palette.LightVibrant, palette.LightMuted,
      ];
      for (const s of entries) {
        if (s && s.hex) allSwatches.push({ hex: s.hex, population: s.population || 1 });
      }
    } finally {
      if (typeof img !== 'string') URL.revokeObjectURL(src);
    }
  }

  if (allSwatches.length === 0) {
    // Fallback neutro: palette di default del prodotto.
    const fallback: PaletteResult = {
      bg_a: '#f7f5f0',
      bg_b: '#1e2430',
      accent: '#554697',
      text_on_light: '#1a1a1a',
      text_on_dark: '#ffffff',
      candidates: [],
    };
    return fallback;
  }

  // Aggrega per hex sommando le popolazioni.
  const byHex = new Map<string, number>();
  for (const s of allSwatches) {
    byHex.set(s.hex.toLowerCase(), (byHex.get(s.hex.toLowerCase()) || 0) + s.population);
  }
  const aggregated = Array.from(byHex.entries()).map(([hex, population]) => ({ hex, population }));
  const totalPop = aggregated.reduce((a, s) => a + s.population, 0);

  // bg_a: chiaro dominante (luminanza > 0.55, max popolazione)
  const lights = aggregated.filter((s) => relativeLuminance(s.hex) > 0.55);
  const darks = aggregated.filter((s) => relativeLuminance(s.hex) < 0.25);
  const bgA = lights.sort((a, b) => b.population - a.population)[0]?.hex || '#f7f5f0';
  const bgB = darks.sort((a, b) => b.population - a.population)[0]?.hex || '#1e2430';

  // accent: il piu saturo con popolazione >= 3% del totale, diverso dagli sfondi
  const accentCandidates = aggregated
    .filter((s) => s.hex !== bgA && s.hex !== bgB)
    .filter((s) => s.population >= totalPop * 0.03)
    .sort((a, b) => saturationOf(b.hex) - saturationOf(a.hex));
  const accent = accentCandidates[0]?.hex
    || aggregated.sort((a, b) => saturationOf(b.hex) - saturationOf(a.hex))[0]?.hex
    || '#554697';

  const textOnLight = ensureContrast(bgB, bgA);
  const textOnDark = ensureContrast(bgA, bgB);

  return {
    bg_a: bgA,
    bg_b: bgB,
    accent,
    text_on_light: textOnLight,
    text_on_dark: textOnDark,
    candidates: aggregated
      .sort((a, b) => b.population - a.population)
      .slice(0, 10)
      .map((s) => s.hex),
  };
}

// ── Lettura semantica ────────────────────────────────────────────
// Il tipo BrandSemantics vive in artDirector.ts (file mirrorabile in Deno);
// qui lo ri-esportiamo per comodita dei consumer client-side.
export type { BrandSemantics } from './artDirector.ts';
