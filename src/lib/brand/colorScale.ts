// Scala colori personalizzata per il wizard del template.
//
// L'utente parte da UN colore (o incolla i suoi codici) e ottiene una scala
// dal chiarissimo allo scurissimo, da cui assegnare i 5 ruoli della palette
// (sfondi, accento, testi). Pura e deterministica: niente rete, niente DOM.

import { ensureContrast } from './extractor.ts';
import type { GenesisPalette } from './genesisPrompt.ts';

export type ScaleStop = { stop: number; hex: string };

/** Gradini della scala, stile 50..900; il 500 e il colore di partenza. */
export const SCALE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

// Quanto bianco (gradini chiari) o nero (gradini scuri) mescolare al colore base.
const MIX: Record<number, { toward: 'white' | 'black' | 'none'; amount: number }> = {
  50: { toward: 'white', amount: 0.95 },
  100: { toward: 'white', amount: 0.88 },
  200: { toward: 'white', amount: 0.74 },
  300: { toward: 'white', amount: 0.56 },
  400: { toward: 'white', amount: 0.3 },
  500: { toward: 'none', amount: 0 },
  600: { toward: 'black', amount: 0.15 },
  700: { toward: 'black', amount: 0.32 },
  800: { toward: 'black', amount: 0.5 },
  900: { toward: 'black', amount: 0.66 },
};

/** '#abc', 'abc', '#AABBCC' o 'aabbcc' -> '#aabbcc'; null se non e un colore valido. */
export function normalizeHex(input: string): string | null {
  const raw = String(input || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return ('#' + raw.split('').map((c) => c + c).join('')).toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return ('#' + raw).toLowerCase();
  return null;
}

/** Estrae i codici colore da un testo libero (virgole, spazi, a capo), senza doppioni. */
export function parseHexList(text: string, max = 24): string[] {
  const out: string[] = [];
  // Codici a 3 cifre solo con il cancelletto: senza, parole come "add" sembrerebbero colori.
  const re = /#([0-9a-f]{6}|[0-9a-f]{3})\b|\b([0-9a-f]{6})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text || ''))) !== null) {
    const hex = normalizeHex(m[1] || m[2] || '');
    if (hex && out.indexOf(hex) === -1) out.push(hex);
    if (out.length >= max) break;
  }
  return out;
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

/** Scala di 10 tonalita dal colore base; [] se il colore non e valido. */
export function generateScale(baseInput: string): ScaleStop[] {
  const base = normalizeHex(baseInput);
  if (!base) return [];
  const [r, g, b] = toRgb(base);
  return SCALE_STOPS.map((stop) => {
    const { toward, amount } = MIX[stop];
    if (toward === 'none') return { stop, hex: base };
    const t = toward === 'white' ? 255 : 0;
    return { stop, hex: toHex(r + (t - r) * amount, g + (t - g) * amount, b + (t - b) * amount) };
  });
}

/**
 * Palette del template ricavata dalla scala: sfondo chiaro dal gradino 50,
 * sfondo scuro dal 900, accento dal colore base, testi con contrasto
 * WCAG 4.5:1 garantito sul rispettivo sfondo.
 */
export function paletteFromScale(scale: ScaleStop[]): GenesisPalette | null {
  const at = (s: number) => scale.find((x) => x.stop === s)?.hex;
  const light = at(50);
  const dark = at(900);
  const base = at(500);
  if (!light || !dark || !base) return null;
  return {
    bg_a: light,
    bg_b: dark,
    accent: base,
    text_on_light: ensureContrast(dark, light),
    text_on_dark: ensureContrast(light, dark),
  };
}
