// Slide dei 3 layout (A colore del brand, B foto editoriale, C carta
// clinica) disegnate dal server.
//
// Niente modello delle immagini per il testo: Satori impagina (flexbox) e
// Resvg fa il PNG, così il testo esce esatto. È lo stesso motore delle slide
// editoriali approvate da Attilio il 01/11/2026. L'albero della slide sta in
// _shared/brand/layouts.ts (puro, specchiato in src/lib/brand).
//
// Limite di CPU delle edge function (2 s): una slide per chiamata. Il lavoro
// in background chiama la funzione stessa con `chiamaDisegno`, una slide
// alla volta, girando il token dell'utente.

import satori from "npm:satori@0.12.2";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";
import { ALTEZZA, LARGHEZZA, alberoSlide, coloriLayout, isLayoutId, type ColoriLayout, type Immagine, type InputSlide, type LayoutId, type LayoutRole } from "./brand/layouts.ts";
import type { TestiProva } from "./brand/layoutCopy.ts";
import type { adminClient } from "./auth.ts";

type Admin = ReturnType<typeof adminClient>;
type Peso = 500 | 600 | 700 | 800 | 900;
type Font = { name: string; data: ArrayBuffer; weight: Peso; style: "normal" };

// ── Font e motore, caricati una volta per istanza ──
const INTER = "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin";
const FRAUNCES = "https://cdn.jsdelivr.net/npm/@fontsource/fraunces@5.0.20/files/fraunces-latin";
let pronti: Promise<Font[]> | null = null;

async function font(base: string, name: string, weight: Peso): Promise<Font> {
  const r = await fetch(`${base}-${weight}-normal.woff`);
  if (!r.ok) throw new Error(`Font ${name} ${weight}: ${r.status}`);
  return { name, data: await r.arrayBuffer(), weight, style: "normal" };
}

function prepara(): Promise<Font[]> {
  if (!pronti) {
    pronti = (async () => {
      await initWasm(fetch("https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));
      return await Promise.all([
        ...([500, 600, 700, 800, 900] as const).map((w) => font(INTER, "Inter", w)),
        font(FRAUNCES, "Fraunces", 600),
      ]);
    })();
    pronti.catch(() => { pronti = null; });
  }
  return pronti;
}

/** PNG 1080×1350 della slide. */
export async function disegnaLayout(i: InputSlide): Promise<Uint8Array> {
  const fonts = await prepara();
  // deno-lint-ignore no-explicit-any
  const svg = await satori(alberoSlide(i) as any, { width: LARGHEZZA, height: ALTEZZA, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: LARGHEZZA } }).render().asPng();
}

// ── Immagini ──

/** Larghezza e altezza di un PNG o di un JPEG (servono a Satori per il logo). */
export function dimensioniImmagine(b: Uint8Array): { w: number; h: number } | null {
  if (b[0] === 0x89 && b[1] === 0x50) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { w: v.getUint32(16), h: v.getUint32(20) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xc3) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
  }
  return null;
}

function base64(b: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Solo PNG e JPEG (Resvg non legge WebP né SVG): altrimenti null. */
export function immagineDaByte(b: Uint8Array): Immagine | null {
  const d = dimensioniImmagine(b);
  if (!d || d.w === 0 || d.h === 0) return null;
  const mime = b[0] === 0x89 ? "image/png" : "image/jpeg";
  return { src: `data:${mime};base64,${base64(b)}`, w: d.w, h: d.h };
}

const MAX_BYTE = 6 * 1024 * 1024;

async function scaricaUrl(url: string): Promise<Uint8Array | null> {
  try {
    if (url.startsWith("data:image/")) {
      const b64 = url.slice(url.indexOf(",") + 1);
      return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }
    if (!/^https?:\/\//.test(url)) return null;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" } });
    if (!r.ok) return null;
    const b = new Uint8Array(await r.arrayBuffer());
    return b.length > 0 && b.length <= MAX_BYTE ? b : null;
  } catch {
    return null;
  }
}

/** Foto salvata: in storage (bucket + path) o a un indirizzo. */
export type RifFoto = { bucket: string; path: string } | { url: string };

/**
 * Scarica la foto ridotta a 1080 px quando lo storage lo permette (meno
 * lavoro per Resvg), altrimenti l'originale.
 */
export async function caricaFoto(supabase: Admin, rif: RifFoto | null | undefined): Promise<Immagine | null> {
  if (!rif) return null;
  if ("url" in rif) {
    const b = await scaricaUrl(rif.url);
    return b ? immagineDaByte(b) : null;
  }
  const { data: ridotta } = await supabase.storage.from(rif.bucket)
    .createSignedUrl(rif.path, 600, { transform: { width: LARGHEZZA, quality: 80, format: "origin" } });
  const b = ridotta?.signedUrl ? await scaricaUrl(ridotta.signedUrl) : null;
  const img = b ? immagineDaByte(b) : null;
  if (img) return img;
  const { data, error } = await supabase.storage.from(rif.bucket).download(rif.path);
  if (error || !data) return null;
  const orig = new Uint8Array(await data.arrayBuffer());
  return orig.length <= MAX_BYTE ? immagineDaByte(orig) : null;
}

/** Foto vere dello studio: tabella brand_photos, poi le foto del Brand Kit. */
export async function fotoDelBrand(supabase: Admin, brandId: string, brand: Record<string, unknown>): Promise<RifFoto[]> {
  const out: RifFoto[] = [];
  const { data } = await supabase.from("brand_photos").select("url, storage_path").eq("brand_id", brandId).limit(12);
  for (const r of (data || []) as Array<{ url: string | null; storage_path: string | null }>) {
    if (r.storage_path) out.push({ bucket: "user-photos", path: r.storage_path });
    else if (r.url) out.push({ url: r.url });
  }
  for (const k of ["location_photos", "gallery_photos"]) {
    const v = brand[k];
    if (Array.isArray(v)) for (const u of v) if (typeof u === "string" && u) out.push({ url: u });
  }
  return out;
}

/** Logo del Brand Kit (brands.logo_url); SVG e WebP non si disegnano → null. */
export async function logoDelBrand(logoUrl: unknown): Promise<Immagine | null> {
  if (typeof logoUrl !== "string" || !logoUrl) return null;
  const b = await scaricaUrl(logoUrl);
  return b ? immagineDaByte(b) : null;
}

/**
 * Cosa disegnare per un template a layout. Sta in template_candidates.
 * genesis_prompt (e, dopo l'approvazione, in template_variants.
 * prompt_skeleton): così «Riprova» ridisegna la stessa slide e la
 * produzione ritrova la foto scelta per il template.
 */
export type SpecLayout = { tipo: "layout"; layout: LayoutId; role: LayoutRole; testi: TestiProva; foto: RifFoto | null };

export function leggiSpec(s: unknown): SpecLayout | null {
  if (typeof s !== "string" || !s.startsWith("{")) return null;
  try {
    const o = JSON.parse(s);
    if (o?.tipo !== "layout" || !isLayoutId(o.layout) || !["cover", "content", "cta"].includes(o.role)) return null;
    return o as SpecLayout;
  } catch {
    return null;
  }
}

// ── Colori ──
// Regola della revisione 03/11: se il colore primario è nel kit, le slide
// usano quello. I default FisioAccordo (presenti su ogni brand appena creato)
// non contano come scelta del cliente.
const DEFAULT_KIT_COLORS = new Set(["#554697", "#e6007e", "#1a1a2e"]);

export function coloreSceltoDalKit(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return /^#[0-9a-f]{6}$/.test(s) && !DEFAULT_KIT_COLORS.has(s) ? s : null;
}

/** Colori del layout: kit del brand, poi l'accento della palette, poi viola. */
export function coloriDelBrand(brand: Record<string, unknown>, paletteAccent?: unknown): ColoriLayout {
  const primario = coloreSceltoDalKit(brand.colore_primario) || coloreSceltoDalKit(paletteAccent) || "#554697";
  return coloriLayout(primario, coloreSceltoDalKit(brand.colore_secondario));
}

// ── Una slide per chiamata ──

/** Chiama la funzione stessa per disegnare una slide, col token dell'utente. */
export async function chiamaDisegno(funzione: string, authHeader: string, body: Record<string, unknown>): Promise<{ ok: boolean; errore?: string }> {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return { ok: false, errore: "configurazione Supabase mancante" };
  try {
    const r = await fetch(`${url}/functions/v1/${funzione}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: anon },
      body: JSON.stringify(body),
    });
    if (r.ok) return { ok: true };
    const j = await r.json().catch(() => null) as { error?: string } | null;
    return { ok: false, errore: j?.error || `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, errore: (e as Error).message };
  }
}
