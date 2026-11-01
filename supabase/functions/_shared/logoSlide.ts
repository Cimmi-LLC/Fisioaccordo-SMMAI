// Logo sulle slide prodotte dal server (pilota scoperte-automatiche).
//
// Il logo non sta nei template: il modello non lo riproduce fedelmente.
// Nell'app lo sovrappone il browser quando programmi a mano (compositeLogo
// in src/lib/brand/composite.ts); qui la stessa operazione lato server.

import { decode, Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { getArchetype, type ArchetypeId, type SlideRole } from "./brand/archetypes.ts";
import { canvasForFormat, type SlideFormat } from "./brand/genome.ts";
import { posizioneLogo, slotLogoDelBrand, slotLogoScalato, slotPiuLibero } from "./brand/scoperte.ts";

export type Logo = Image;

/** Margine attorno al logo che deve restare libero, in pixel. */
const MARGINE = 12;

/** Logo del Brand Kit: data URL (salvato dall'app) o indirizzo http. null se non leggibile. */
export async function leggiLogo(url: string): Promise<Logo | null> {
  try {
    let bytes: Uint8Array;
    const m = /^data:[^;,]+;base64,(.+)$/.exec(url);
    if (m) {
      bytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
    } else {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) return null;
      bytes = new Uint8Array(await r.arrayBuffer());
    }
    const img = await decode(bytes);
    return img instanceof Image ? img : null;
  } catch (e) {
    console.error("Logo non leggibile:", e);
    return null;
  }
}

function luminosita(rgba: number): number {
  return 0.2126 * ((rgba >>> 24) & 255) + 0.7152 * ((rgba >>> 16) & 255) + 0.0722 * ((rgba >>> 8) & 255);
}

/**
 * Quota di pixel "occupati" (che si staccano dallo sfondo) nel riquadro,
 * margine compreso, campionando un pixel ogni 3.
 */
function occupazione(slide: Image, r: { x: number; y: number; w: number; h: number }, sfondo: number): number {
  const x0 = Math.max(0, r.x - MARGINE), y0 = Math.max(0, r.y - MARGINE);
  const x1 = Math.min(slide.width, r.x + r.w + MARGINE), y1 = Math.min(slide.height, r.y + r.h + MARGINE);
  let pieni = 0, tot = 0;
  for (let y = y0; y < y1; y += 3) {
    for (let x = x0; x < x1; x += 3) {
      tot++;
      if (Math.abs(luminosita(slide.getPixelAt(x + 1, y + 1)) - sfondo) > 28) pieni++;
    }
  }
  return tot ? pieni / tot : 1;
}

/**
 * Sovrappone il logo alla slide: slide portata alle misure del formato,
 * logo adattato senza deformarlo. Posizione: lo slot dell'archetipo, o tra
 * quelle scelte per il brand (genome.logo_slots) la più libera della slide.
 */
export async function slideConLogo(
  slidePng: Uint8Array,
  logo: Logo,
  genome: { archetype: ArchetypeId },
  formato: SlideFormat,
  ruolo: SlideRole,
): Promise<{ png: Uint8Array; posizione: number }> {
  const tela = canvasForFormat(formato);
  const slide = await decode(slidePng);
  if (!(slide instanceof Image)) throw new Error("Slide non leggibile per il logo");
  if (slide.width !== tela.w || slide.height !== tela.h) slide.resize(tela.w, tela.h);

  const delBrand = slotLogoDelBrand(genome);
  const slots = (delBrand.length > 0 ? delBrand : [getArchetype(genome.archetype).roles[ruolo].logo_slot])
    .map((s) => posizioneLogo(slotLogoScalato(s, tela.h), logo.width, logo.height));
  // Sfondo: la luminosità più comune sui quattro angoli.
  const angoli = [[8, 8], [tela.w - 9, 8], [8, tela.h - 9], [tela.w - 9, tela.h - 9]]
    .map(([x, y]) => Math.round(luminosita(slide.getPixelAt(x + 1, y + 1))));
  const sfondo = angoli.sort((a, b) => a - b)[1];
  const scelta = slots.length > 1 ? slotPiuLibero(slots.map((p) => occupazione(slide, p, sfondo))) : 0;
  const p = slots[scelta];

  slide.composite(logo.clone().resize(p.w, p.h), p.x, p.y);
  return { png: await slide.encode(1), posizione: scelta };
}
