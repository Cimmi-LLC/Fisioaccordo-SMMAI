// Pilota automatico: scoperte scientifiche → carosello → programmazione.
//
// Tre modi di chiamata:
//   cron (x-cron-secret, body vuoto)        → per ogni brand con
//       pubblicazione_automatica accesa lancia un giro per brand (fan-out),
//       così ogni brand ha il suo tempo di esecuzione.
//   giro (x-cron-secret + brandId)          → un brand: tanti caroselli
//       quanti sono gli orari scelti, programmati per oggi o domani.
//   prova (utente loggato + brandId)        → un solo carosello subito,
//       programmato al prossimo orario libero. Funziona anche a pilota spento.
//   anteprima (utente loggato + brandId + soloRicerca) → solo la ricerca,
//       senza salvare niente.
//
// Ogni scoperta trovata finisce in public.scoperte con lo stato del suo
// giro (nuova, in_produzione, programmata, errore), così l'app mostra da
// dove viene ogni post e la stessa fonte non viene mai usata due volte.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, assertBrandOwnership, requireCronSecret, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { logGeneration } from "../_shared/historyLogger.ts";
import { COST_NB2_IMAGE_1K } from "../_shared/brand/costs.ts";
import { resolveProfession, type ProfessionBrandLike } from "../_shared/brand/profession.ts";
import type { ArchetypeId, SlideRole } from "../_shared/brand/archetypes.ts";
import { leggiLogo, slideConLogo, type Logo } from "../_shared/logoSlide.ts";
import { dimensioniImmagine, disegnaSlideEditoriale, type Colori, type Immagine } from "../_shared/slideEditoriali.ts";
import {
  CONCURRENCY,
  MODEL_CASCADES,
  OUTPUT_BUCKET,
  downloadAsBase64,
  generateSlide,
  patchSlide,
  resolveSkeleton,
  runPool,
  type PaletteColors,
  type SlideInput,
  type SlideRecord,
  type VariantRow,
} from "../_shared/carouselProduction.ts";
import {
  chiaveUrl,
  etichettaContenuto,
  etichettaEditoriale,
  leggiCopyEditoriale,
  leggiGiudizio,
  problemiEditoriale,
  promptCaroselloEditoriale,
  promptGiudice,
  testoPiano,
  testoSlide,
  leggiArticoliPubmed,
  leggiCopy,
  leggiIdPubmed,
  leggiScelta,
  leggiTermini,
  normalizzaOrari,
  paroleVietateTrovate,
  problemiDelTesto,
  promptCarosello,
  promptControlloItaliano,
  prossimiSlot,
  richiestaScelta,
  richiestaTermini,
  temiRicerca,
  urlAbstractPubmed,
  urlCercaPubmed,
  urlPubmed,
  type BrandPerScoperte,
  type CopyEditoriale,
  type CopyScoperta,
  type Scoperta,
} from "../_shared/brand/scoperte.ts";

type Admin = ReturnType<typeof adminClient>;

// Termini di ricerca e scelta degli studi: due chiamate brevi per brand al giorno.
const RESEARCH_MODEL = "gemini-2.5-flash";
const COPY_MODEL = "gemini-2.5-flash";
// Un post non va programmato a meno di 20 minuti da un altro dello stesso profilo.
const DISTANZA_MINIMA_MS = 20 * 60 * 1000;

type BrandRow = BrandPerScoperte & {
  id: string;
  user_id: string;
  pubblicazione_automatica?: boolean | null;
  auto_orari?: string[] | null;
  logo_url?: string | null;
  colore_primario?: string | null;
  genome?: {
    archetype?: ArchetypeId;
    palette?: { bg_a?: string; text_on_light?: string };
    /** "editoriale" = slide disegnate dal server col metodo Kallaway (Terapista Stellato). */
    stile_pilota?: string;
  } | null;
};

type Contesto = {
  brand: BrandRow;
  connectionId: string;
  byRole: Map<SlideRole, VariantRow>;
  refCache: Map<SlideRole, string>;
  format: "1:1" | "4:5";
  models: string[];
  kicker: string;
  colors: PaletteColors;
  /** Logo del Brand Kit, già letto: va sovrapposto a ogni slide (null = brand senza logo). */
  logo: Logo | null;
  /** Stile editoriale: colori e logo per le slide disegnate dal server (null = template del brand). */
  editoriale: { colori: Colori; logo: Immagine | null } | null;
};

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const supabase = adminClient();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const brandId = typeof body.brandId === "string" ? body.brandId : "";

    // ── Chiamate del cron ──
    if (req.headers.get("x-cron-secret")) {
      const cron = requireCronSecret(req);
      if (!cron.ok) return jsonResponse(req, { error: cron.error }, cron.status);

      if (!brandId) {
        const { data: brands, error } = await supabase
          .from("brands")
          .select("id")
          .eq("pubblicazione_automatica", true);
        if (error) return jsonResponse(req, { error: error.message }, 500);
        const self = `${Deno.env.get("SUPABASE_URL")}/functions/v1/scoperte-automatiche`;
        const lanciati: string[] = [];
        for (const b of (brands || []) as Array<{ id: string }>) {
          const r = await fetch(self, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-cron-secret": Deno.env.get("CRON_SECRET") || "" },
            body: JSON.stringify({ brandId: b.id }),
          }).catch((e) => ({ ok: false, status: 0, statusText: String(e) } as Response));
          if (r.ok) lanciati.push(b.id);
          else console.error("Giro non lanciato per", b.id, r.status);
        }
        return jsonResponse(req, { brand: (brands || []).length, lanciati: lanciati.length });
      }

      const prep = await prepara(supabase, brandId);
      if (!prep.ok) return jsonResponse(req, { brandId, saltato: prep.motivo }, 200);
      const slot = await slotLiberi(supabase, prep.ctx, prossimiSlot(normalizzaOrari(prep.ctx.brand.auto_orari), new Date()));
      if (slot.length === 0) return jsonResponse(req, { brandId, saltato: "orari già occupati" });
      // @ts-ignore EdgeRuntime disponibile nell'ambiente Supabase
      EdgeRuntime.waitUntil(giro(supabase, prep.ctx, slot));
      return jsonResponse(req, { brandId, caroselli: slot.length }, 202);
    }

    // ── Prova dall'app ──
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);
    if (!brandId) return jsonResponse(req, { error: "brandId obbligatorio" }, 400);
    const own = await assertBrandOwnership(supabase, auth.userId, brandId);
    if (!own.ok) return jsonResponse(req, { error: own.error }, own.status);
    // Anteprima (solo ricerca) e prova (carosello vero) hanno limiti separati.
    const anteprima = body.soloRicerca === true;
    const rl = await requireWithinRateLimit(
      supabase, auth.userId, anteprima ? "scoperte-anteprima" : "scoperte-automatiche", anteprima ? 10 : 3, 3600,
    );
    if (!rl.ok) return jsonResponse(req, { error: rl.error }, rl.status);

    // Anteprima: solo la ricerca, niente salvato. Non servono template né Instagram.
    if (anteprima) {
      const { data: brand } = await supabase.from("brands").select("*").eq("id", brandId).maybeSingle();
      if (!brand) return jsonResponse(req, { error: "Brand non trovato" }, 404);
      const { data: usate } = await supabase
        .from("scoperte").select("url, titolo").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(200);
      const temi = temiRicerca(brand as BrandRow);
      const { scoperte: trovate, diagnosi } = await cerca(temi, 4, (usate || []) as Array<{ url: string; titolo: string }>);
      return jsonResponse(req, { temi, scoperte: trovate, diagnosi });
    }

    const prep = await prepara(supabase, brandId);
    if (!prep.ok) return jsonResponse(req, { error: prep.motivo }, 409);
    const candidati = prossimiSlot(normalizzaOrari(prep.ctx.brand.auto_orari), new Date(), 20);
    // Se gli orari di oggi e domani sono già presi, il primo libero nei giorni dopo.
    let slot = await slotLiberi(supabase, prep.ctx, candidati);
    for (let giorni = 1; slot.length === 0 && giorni <= 7; giorni++) {
      slot = await slotLiberi(supabase, prep.ctx, candidati.map((d) => new Date(d.getTime() + giorni * 86400000)));
    }
    if (slot.length === 0) return jsonResponse(req, { error: "Nessun orario libero nei prossimi 7 giorni" }, 409);
    // @ts-ignore EdgeRuntime disponibile nell'ambiente Supabase
    EdgeRuntime.waitUntil(giro(supabase, prep.ctx, slot.slice(0, 1)));
    return jsonResponse(req, { avviato: true, programmatoPer: slot[0].toISOString() }, 202);
  } catch (e) {
    console.error("scoperte-automatiche error:", e);
    return jsonResponse(req, { error: (e as Error).message || "Errore interno" }, 500);
  }
});

/** Controlla che il brand possa andare in automatico e carica template e profilo Instagram. */
async function prepara(
  supabase: Admin,
  brandId: string,
): Promise<{ ok: true; ctx: Contesto } | { ok: false; motivo: string }> {
  const { data: brand } = await supabase.from("brands").select("*").eq("id", brandId).maybeSingle();
  if (!brand) return { ok: false, motivo: "Brand non trovato" };
  const b = brand as BrandRow;

  const { data: conn } = await supabase
    .from("meta_connections")
    .select("id, instagram_business_id")
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!conn || !(conn as { instagram_business_id?: string }).instagram_business_id) {
    return { ok: false, motivo: "Collega prima un profilo Instagram a questo brand" };
  }

  if (!Deno.env.get("GEMINI_API_KEY")) return { ok: false, motivo: "Manca la chiave GEMINI_API_KEY sul server" };
  const modelKey = String((b as { image_model?: string }).image_model || "nano-2");
  const palette = b.genome?.palette;

  // Stile editoriale: niente template né modello per il testo, le slide le disegna il server.
  if (b.genome?.stile_pilota === "editoriale") {
    let logoEd: Immagine | null = null;
    if (b.logo_url) {
      logoEd = await logoPerSatori(b.logo_url);
      if (!logoEd) return { ok: false, motivo: "Logo del brand non leggibile: caricalo in PNG o JPG nel Brand Kit" };
    }
    return {
      ok: true,
      ctx: {
        brand: b,
        connectionId: (conn as { id: string }).id,
        byRole: new Map(),
        refCache: new Map(),
        format: "4:5",
        models: MODEL_CASCADES[modelKey] || MODEL_CASCADES["nano-2"],
        kicker: "",
        colors: { bg_color: "", title_color: "", body_color: "" },
        logo: null,
        editoriale: {
          colori: {
            sfondo: palette?.bg_a || "#111111",
            testo: palette?.text_on_light || "#FFFFFF",
            accento: b.colore_primario || "#FFD700",
          },
          logo: logoEd,
        },
      },
    };
  }

  const { data: variants } = await supabase
    .from("template_variants")
    .select("slide_role, storage_bucket, storage_path, prompt_skeleton, genome")
    .eq("brand_id", brandId);
  const byRole = new Map<SlideRole, VariantRow>();
  for (const v of (variants || []) as VariantRow[]) byRole.set(v.slide_role, v);
  if (!byRole.has("cover") || !byRole.has("content") || !byRole.has("cta")) {
    return { ok: false, motivo: "Approva prima il template delle slide di questo brand" };
  }

  const refCache = new Map<SlideRole, string>();
  for (const role of ["cover", "content", "cta"] as SlideRole[]) {
    const v = byRole.get(role)!;
    const b64 = await downloadAsBase64(supabase, v.storage_bucket, v.storage_path);
    if (!b64) return { ok: false, motivo: `Immagine di riferimento ${role} non scaricabile` };
    refCache.set(role, b64);
  }

  // Il logo non sta nei template: si legge qui una volta e va su ogni slide
  // (nell'app lo sovrappone il browser quando programmi a mano).
  let logo: Logo | null = null;
  if (b.logo_url) {
    logo = await leggiLogo(b.logo_url);
    if (!logo) return { ok: false, motivo: "Logo del brand non leggibile: caricalo in PNG o JPG nel Brand Kit" };
  }

  // Stessi colori che usa l'app (useNb2Carousel): palette del genoma del brand.
  return {
    ok: true,
    ctx: {
      brand: b,
      connectionId: (conn as { id: string }).id,
      byRole,
      refCache,
      format: byRole.get("content")!.genome?.format === "4:5" ? "4:5" : "1:1",
      models: MODEL_CASCADES[modelKey] || MODEL_CASCADES["nano-2"],
      kicker: resolveProfession(b as unknown as ProfessionBrandLike).kicker,
      colors: {
        bg_color: palette?.bg_a || "#f7f5f0",
        title_color: palette?.text_on_light || "#1a1a1a",
        body_color: palette?.text_on_light || "#1a1a1a",
      },
      logo,
      editoriale: null,
    },
  };
}

function base64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Il logo come data URL con le sue misure (Satori le vuole). Solo PNG o JPEG. */
async function logoPerSatori(url: string): Promise<Immagine | null> {
  try {
    let bytes: Uint8Array;
    if (url.startsWith("data:")) {
      bytes = Uint8Array.from(atob(url.slice(url.indexOf(",") + 1)), (c) => c.charCodeAt(0));
    } else {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) return null;
      bytes = new Uint8Array(await r.arrayBuffer());
    }
    const d = dimensioniImmagine(bytes);
    if (!d || d.w === 0 || d.h === 0) return null;
    const tipo = bytes[0] === 0x89 ? "image/png" : "image/jpeg";
    return { src: `data:${tipo};base64,${base64(bytes)}`, ...d };
  } catch {
    return null;
  }
}

/** La slide col logo del brand sopra; senza logo resta com'è. */
async function conLogo(bytes: Uint8Array, ctx: Contesto, role: SlideRole): Promise<Uint8Array> {
  if (!ctx.logo) return bytes;
  const genome = ctx.brand.genome;
  if (!genome?.archetype) throw new Error("Genoma del template senza archetipo: non so dove mettere il logo");
  const { png } = await slideConLogo(bytes, ctx.logo, { ...genome, archetype: genome.archetype }, ctx.format, role);
  return png;
}

/** Toglie gli orari troppo vicini a un post già in programmazione sullo stesso profilo. */
async function slotLiberi(supabase: Admin, ctx: Contesto, candidati: Date[]): Promise<Date[]> {
  if (candidati.length === 0) return [];
  const da = new Date(Math.min(...candidati.map((d) => d.getTime())) - DISTANZA_MINIMA_MS).toISOString();
  const a = new Date(Math.max(...candidati.map((d) => d.getTime())) + DISTANZA_MINIMA_MS).toISOString();
  const { data } = await supabase
    .from("published_posts")
    .select("scheduled_for")
    .eq("connection_id", ctx.connectionId)
    .in("status", ["scheduled", "published"])
    .gte("scheduled_for", da)
    .lte("scheduled_for", a);
  const occupati = ((data || []) as Array<{ scheduled_for: string }>).map((r) => new Date(r.scheduled_for).getTime());
  return candidati.filter((d) => occupati.every((o) => Math.abs(o - d.getTime()) >= DISTANZA_MINIMA_MS));
}

/** Un giro completo per un brand: ricerca, poi un carosello per ogni orario. */
async function giro(supabase: Admin, ctx: Contesto, slot: Date[]): Promise<void> {
  const { brand } = ctx;
  try {
    const { data: usate } = await supabase
      .from("scoperte")
      .select("url, titolo")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false })
      .limit(200);

    const { scoperte } = await cerca(temiRicerca(brand), Math.max(slot.length * 2, 4), (usate || []) as Array<{ url: string; titolo: string }>);
    if (scoperte.length === 0) {
      console.warn("Nessuna scoperta nuova per", brand.id);
      return;
    }

    // Tutte le scoperte trovate restano in archivio; si usano le prime.
    const { data: righe, error } = await supabase
      .from("scoperte")
      .upsert(
        scoperte.map((s) => ({
          brand_id: brand.id,
          user_id: brand.user_id,
          titolo: s.titolo,
          sintesi: s.sintesi,
          fonte: s.fonte,
          url: s.url,
          data_pubblicazione: s.data,
          tipo_fonte: s.tipo_fonte,
          stato: "nuova",
        })),
        { onConflict: "brand_id,url", ignoreDuplicates: true },
      )
      .select("id, url");
    if (error) throw new Error("Salvataggio scoperte: " + error.message);
    const idPerUrl = new Map(((righe || []) as Array<{ id: string; url: string }>).map((r) => [r.url, r.id]));

    const daUsare = scoperte.filter((s) => idPerUrl.has(s.url)).slice(0, slot.length);
    await runPool(
      daUsare.map((s, i) => () => unCarosello(supabase, ctx, s, idPerUrl.get(s.url)!, slot[i])),
      2,
    );
  } catch (e) {
    console.error("Giro fallito per", brand.id, e);
  }
}

type Diagnosi = { termini: string[]; trovati: number; letti: number; tenute: number };

/**
 * Ricerca su PubMed: Gemini traduce gli argomenti in termini inglesi,
 * PubMed dà gli studi dell'ultimo mese (o degli ultimi 4 se sono pochi) con
 * abstract, Gemini sceglie quelli utili ai pazienti e li riassume.
 */
async function cerca(
  temi: string,
  quante: number,
  usate: { url: string; titolo: string }[],
): Promise<{ scoperte: Scoperta[]; diagnosi: Diagnosi }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")!;
  const tr = await callGeminiWithRetry({ apiKey, model: RESEARCH_MODEL, body: richiestaTermini(temi) });
  if (!tr.ok) throw new Error(`Termini Gemini ${tr.status}: ${(tr.errorBody || "").slice(0, 300)}`);
  const termini = leggiTermini(tr.data);

  const usati = new Set(usate.map((u) => chiaveUrl(u.url)));
  const ids: string[] = [];
  for (const giorni of [30, 120]) {
    for (const t of termini) {
      const json = await chiediPubmed(urlCercaPubmed(t, giorni)).then((r) => JSON.parse(r)).catch(() => null);
      for (const id of leggiIdPubmed(json)) {
        if (!ids.includes(id) && !usati.has(chiaveUrl(urlPubmed(id)))) ids.push(id);
      }
    }
    if (ids.length >= quante * 3) break;
  }

  const studi = ids.length > 0 ? leggiArticoliPubmed(await chiediPubmed(urlAbstractPubmed(ids.slice(0, 30)))) : [];
  const diagnosi: Diagnosi = { termini, trovati: ids.length, letti: studi.length, tenute: 0 };
  if (studi.length === 0) {
    console.log("Ricerca senza studi:", JSON.stringify(diagnosi));
    return { scoperte: [], diagnosi };
  }

  const scelta = await callGeminiWithRetry({
    apiKey, model: RESEARCH_MODEL, body: richiestaScelta(temi, quante, studi, usate.map((u) => u.titolo)),
  });
  if (!scelta.ok) throw new Error(`Scelta Gemini ${scelta.status}: ${(scelta.errorBody || "").slice(0, 300)}`);
  const scoperte = leggiScelta(scelta.data, studi, usate.map((u) => u.url));
  diagnosi.tenute = scoperte.length;
  console.log("Ricerca:", JSON.stringify(diagnosi));
  return { scoperte, diagnosi };
}

// PubMed senza chiave accetta 3 richieste al secondo: le facciamo una alla volta, distanziate.
let ultimaPubmed = 0;
async function chiediPubmed(url: string): Promise<string> {
  const attesa = ultimaPubmed + 400 - Date.now();
  if (attesa > 0) await new Promise((r) => setTimeout(r, attesa));
  ultimaPubmed = Date.now();
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`PubMed ${r.status}`);
  return await r.text();
}

async function chiediGemini(prompt: string, temperature = 0.7): Promise<string> {
  const res = await callGeminiWithRetry({
    apiKey: Deno.env.get("GEMINI_API_KEY")!,
    model: COPY_MODEL,
    body: {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature },
    },
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(res.errorBody || "").slice(0, 200)}`);
  const parts = res.data?.candidates?.[0]?.content?.parts as Array<{ text?: string }> | undefined;
  return (parts || []).map((p) => p.text || "").join("");
}

/** Testo del carosello: prima stesura, controllo dell'italiano, parole vietate. */
async function scriviCopy(brand: BrandRow, s: Scoperta): Promise<CopyScoperta> {
  const bozza = leggiCopy(await chiediGemini(promptCarosello(brand, s)), brand);
  if (!bozza) throw new Error("Testo del carosello non valido");
  const corretta = leggiCopy(await chiediGemini(promptControlloItaliano(bozza, brand)), brand);
  // Il controllo non deve mai cambiare la struttura: se lo fa, resta la bozza.
  const copy = corretta && corretta.slides.length === bozza.slides.length ? corretta : bozza;
  const vietate = paroleVietateTrovate(copy, brand);
  if (vietate.length > 0) throw new Error("Parole vietate nel testo: " + vietate.join(", "));
  const problemi = problemiDelTesto(copy, s);
  if (problemi.length > 0) throw new Error("Testo da rifare: " + problemi.join(", "));
  return copy;
}

async function aggiornaScoperta(supabase: Admin, id: string, campi: Record<string, unknown>) {
  await supabase.from("scoperte").update({ ...campi, updated_at: new Date().toISOString() }).eq("id", id);
}

async function unCarosello(supabase: Admin, ctx: Contesto, s: Scoperta, scopertaId: string, quando: Date): Promise<void> {
  if (ctx.editoriale) return unCaroselloEditoriale(supabase, ctx, s, scopertaId, quando);
  const { brand } = ctx;
  await aggiornaScoperta(supabase, scopertaId, { stato: "in_produzione" });
  try {
    const copy = await scriviCopy(brand, s);
    let contenuti = 0;
    const slides: SlideInput[] = copy.slides.map((sl, index) => ({
      index,
      role: sl.role as SlideRole,
      title: sl.title,
      body: sl.body,
      ...(sl.role === "content" ? { label: etichettaContenuto(contenuti++) } : {}),
    }));

    const { data: riga, error: insErr } = await supabase
      .from("produced_carousels")
      .insert({
        user_id: brand.user_id,
        brand_id: brand.id,
        title: copy.titolo_carosello,
        copy: { ...copy, fonte: { titolo: s.titolo, fonte: s.fonte, url: s.url, data: s.data } },
        slides: slides.map((sl) => ({ ...sl, path: null, error: null, status: "pending" })),
        storage_bucket: OUTPUT_BUCKET,
        format: ctx.format,
        status: "producing",
        total: slides.length,
      })
      .select("id")
      .single();
    if (insErr || !riga) throw new Error("Creazione carosello: " + (insErr?.message || ""));
    const carouselId = (riga as { id: string }).id;
    await aggiornaScoperta(supabase, scopertaId, { carousel_id: carouselId });

    // patchSlide rilegge e riscrive tutto l'elenco: in parallelo una slide
    // cancellava l'altra (5 su 6 restavano «pending» nell'archivio). In fila.
    let coda: Promise<void> = Promise.resolve();
    const risultati = await runPool(
      slides.map((sl) => async () => {
        const r = await produciSlide(supabase, ctx, carouselId, sl);
        coda = coda.then(() => patchSlide(supabase, carouselId, r));
        await coda;
        return r;
      }),
      CONCURRENCY,
    );
    const ok = risultati.filter((r) => r.status === "done").length;
    await chiudiCarosello(supabase, ctx, s, scopertaId, quando, carouselId, risultati, {
      titolo: copy.titolo_carosello, caption: copy.caption, hashtags: copy.hashtags, costoUsd: ok * COST_NB2_IMAGE_1K,
    });
  } catch (e) {
    console.error("Carosello non riuscito per", s.url, e);
    await aggiornaScoperta(supabase, scopertaId, { stato: "errore", errore: (e as Error).message.slice(0, 500) });
  }
}

/**
 * Coda comune ai due stili: stato del carosello, storico, e se tutte le
 * slide sono pronte il post in programmazione.
 */
async function chiudiCarosello(
  supabase: Admin,
  ctx: Contesto,
  s: Scoperta,
  scopertaId: string,
  quando: Date,
  carouselId: string,
  risultati: SlideRecord[],
  testo: { titolo: string; caption: string; hashtags: string; costoUsd: number },
): Promise<void> {
  const { brand } = ctx;
  const ok = risultati.filter((r) => r.status === "done").length;
  const stato = ok === risultati.length ? "ready" : ok > 0 ? "partial" : "failed";
  await supabase
    .from("produced_carousels")
    .update({
      slides: [...risultati].sort((a, b) => a.index - b.index),
      status: stato,
      ok_count: ok,
      updated_at: new Date().toISOString(),
    })
    .eq("id", carouselId);
  await logGeneration({
    userId: brand.user_id,
    brandId: brand.id,
    type: "carousel",
    topic: s.titolo,
    title: testo.titolo,
    status: stato === "ready" ? "success" : stato === "partial" ? "partial" : "failed",
    metadata: { phase: "scoperte-automatiche", carouselId, fonte: s.url, estimated_cost_usd: testo.costoUsd },
  });
  // Un carosello a metà non si pubblica: resta nell'archivio da sistemare a mano.
  if (stato !== "ready") throw new Error(`Slide prodotte ${ok} di ${risultati.length}`);

  const paths = [...risultati].sort((a, b) => a.index - b.index).map((r) => r.path as string);
  const { data: post, error: postErr } = await supabase
    .from("published_posts")
    .insert({
      user_id: brand.user_id,
      content: testo.caption,
      hashtags: testo.hashtags || null,
      image_urls: null,
      image_paths: paths,
      image_bucket: OUTPUT_BUCKET,
      platforms: ["instagram"],
      connection_id: ctx.connectionId,
      status: "scheduled",
      scheduled_for: quando.toISOString(),
      attempts: 0,
      media_type: "post",
    })
    .select("id")
    .single();
  if (postErr || !post) throw new Error("Programmazione: " + (postErr?.message || ""));

  await aggiornaScoperta(supabase, scopertaId, {
    stato: "programmata",
    post_id: (post as { id: string }).id,
    programmata_per: quando.toISOString(),
    errore: null,
  });
}

/**
 * Testo del carosello editoriale: stesura, controlli fissi (numeri, sigle,
 * parole vietate) e giudice col metodo. Una seconda stesura coi problemi
 * trovati; se non passa neanche quella, il carosello non si fa.
 */
async function scriviCopyEditoriale(
  brand: BrandRow,
  s: Scoperta,
): Promise<{ copy: CopyEditoriale; voti: Record<string, number> }> {
  let problemi: string[] = [];
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    const correzioni = problemi.length > 0
      ? `\n\nLA STESURA PRECEDENTE È STATA SCARTATA PER QUESTI PROBLEMI, CORREGGILI:\n${problemi.map((p) => `- ${p}`).join("\n")}`
      : "";
    const copy = leggiCopyEditoriale(await chiediGemini(promptCaroselloEditoriale(brand, s) + correzioni));
    if (!copy) { problemi = ["JSON non valido o slide fuori posto: rispetta le 8 slide e i loro tipi"]; continue; }
    problemi = problemiEditoriale(copy, s, brand);
    if (problemi.length > 0) continue;
    const giudizio = leggiGiudizio(await chiediGemini(promptGiudice(copy, s), 0.2));
    if (giudizio.ok) return { copy, voti: giudizio.voti };
    problemi = [
      ...Object.entries(giudizio.voti).filter(([, v]) => v < 4).map(([k, v]) => `voto ${k}: ${v}/5`),
      ...giudizio.problemi,
    ];
  }
  throw new Error("Carosello scartato: " + problemi.join("; ").slice(0, 400));
}

/** Foto realistica senza testo (copertina o passi), come data URL; null se il modello non la dà. */
async function generaFoto(descrizione: string, formato: string, modelli: string[]): Promise<string | null> {
  if (!descrizione) return null;
  for (const model of modelli) {
    try {
      const r = await callGeminiWithRetry({
        apiKey: Deno.env.get("GEMINI_API_KEY")!,
        model,
        body: {
          contents: [{
            role: "user",
            parts: [{ text: `${descrizione}\nPhotorealistic photo. Absolutely no text, letters, numbers, logos or watermarks.` }],
          }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: formato, imageSize: "1K" } },
        },
      });
      const parts = r?.data?.candidates?.[0]?.content?.parts as Array<Record<string, unknown>> | undefined;
      const inline = parts?.find((p) => p.inlineData) as { inlineData?: { data?: string; mimeType?: string } } | undefined;
      if (inline?.inlineData?.data) return `data:${inline.inlineData.mimeType || "image/png"};base64,${inline.inlineData.data}`;
    } catch (e) {
      console.warn(`Foto con ${model} fallita:`, (e as Error).message);
    }
  }
  return null;
}

/** Carosello editoriale: testo col metodo, 2 foto, 8 slide disegnate dal server. */
async function unCaroselloEditoriale(supabase: Admin, ctx: Contesto, s: Scoperta, scopertaId: string, quando: Date): Promise<void> {
  const { brand } = ctx;
  const ed = ctx.editoriale!;
  await aggiornaScoperta(supabase, scopertaId, { stato: "in_produzione" });
  try {
    const { copy, voti } = await scriviCopyEditoriale(brand, s);
    const [fotoCopertina, fotoPassi] = await Promise.all([
      generaFoto(copy.foto_copertina, "4:3", ctx.models),
      generaFoto(copy.foto_passi, "16:9", ctx.models),
    ]);
    const anno = s.data ? s.data.slice(0, 4) : "";
    const fonte = `${s.fonte}${anno ? `, ${anno}` : ""}`;
    const ultima = copy.slides.length - 1;
    const slides: SlideInput[] = copy.slides.map((sl, index) => ({
      index,
      role: (index === 0 ? "cover" : index === ultima ? "cta" : "content") as SlideRole,
      title: testoPiano(sl.titolo),
      body: testoPiano(testoSlide(sl)),
    }));

    const { data: riga, error: insErr } = await supabase
      .from("produced_carousels")
      .insert({
        user_id: brand.user_id,
        brand_id: brand.id,
        title: copy.titolo_carosello,
        copy: {
          ...copy,
          stile: "editoriale",
          giudizio: voti,
          foto: { copertina: !!fotoCopertina, passi: !!fotoPassi },
          fonte: { titolo: s.titolo, fonte: s.fonte, url: s.url, data: s.data },
        },
        slides: slides.map((sl) => ({ ...sl, path: null, error: null, status: "pending" })),
        storage_bucket: OUTPUT_BUCKET,
        format: "4:5",
        status: "producing",
        total: slides.length,
      })
      .select("id")
      .single();
    if (insErr || !riga) throw new Error("Creazione carosello: " + (insErr?.message || ""));
    const carouselId = (riga as { id: string }).id;
    await aggiornaScoperta(supabase, scopertaId, { carousel_id: carouselId });

    // Una slide alla volta: il disegno usa la CPU, in parallelo non si guadagna niente.
    const risultati: SlideRecord[] = [];
    for (const sl of slides) {
      const dati = copy.slides[sl.index];
      let r: SlideRecord;
      try {
        const png = await disegnaSlideEditoriale(dati, {
          indice: sl.index,
          totale: slides.length,
          etichetta: etichettaEditoriale(sl.index, brand.nome_business || ""),
          colori: ed.colori,
          logo: ed.logo,
          foto: dati.tipo === "copertina" ? fotoCopertina : dati.tipo === "passi" ? fotoPassi : null,
          fonte,
        });
        const path = `${brand.user_id}/${carouselId}/slide_${sl.index + 1}_${Date.now()}.png`;
        const { error } = await supabase.storage.from(OUTPUT_BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
        r = error ? { ...sl, path: null, error: error.message, status: "failed" } : { ...sl, path, error: null, status: "done" };
      } catch (e) {
        r = { ...sl, path: null, error: "disegno: " + ((e as Error).message || String(e)), status: "failed" };
      }
      risultati.push(r);
      await patchSlide(supabase, carouselId, r);
    }

    const foto = [fotoCopertina, fotoPassi].filter(Boolean).length;
    await chiudiCarosello(supabase, ctx, s, scopertaId, quando, carouselId, risultati, {
      titolo: copy.titolo_carosello, caption: copy.caption, hashtags: copy.hashtags, costoUsd: foto * COST_NB2_IMAGE_1K,
    });
  } catch (e) {
    console.error("Carosello editoriale non riuscito per", s.url, e);
    await aggiornaScoperta(supabase, scopertaId, { stato: "errore", errore: (e as Error).message.slice(0, 500) });
  }
}

async function produciSlide(supabase: Admin, ctx: Contesto, carouselId: string, slide: SlideInput): Promise<SlideRecord> {
  const variant = ctx.byRole.get(slide.role)!;
  let prompt = resolveSkeleton(variant.prompt_skeleton, slide, ctx.colors, ctx.kicker);
  // Nella prova del 01/11 il titolo della chiusura è andato sopra al testo.
  if (slide.role === "cta") {
    prompt += "\nLayout of the text block: the headline may wrap onto at most 2 lines; the supporting line sits BELOW " +
      "the last headline line, with the same gap as in the reference. Text must never overlap other text.";
  }
  const bytes = await generateSlide(Deno.env.get("GEMINI_API_KEY")!, ctx.refCache.get(slide.role)!, prompt, ctx.format, ctx.models);
  if (!bytes) return { ...slide, path: null, error: "nessuna immagine dal modello", status: "failed" };
  let finale: Uint8Array;
  try {
    finale = await conLogo(bytes, ctx, slide.role);
  } catch (e) {
    return { ...slide, path: null, error: "logo: " + ((e as Error).message || String(e)), status: "failed" };
  }
  const path = `${ctx.brand.user_id}/${carouselId}/slide_${slide.index + 1}_${Date.now()}.png`;
  const { error } = await supabase.storage.from(OUTPUT_BUCKET).upload(path, finale, { contentType: "image/png", upsert: true });
  if (error) return { ...slide, path: null, error: error.message, status: "failed" };
  return { ...slide, path, error: null, status: "done" };
}
