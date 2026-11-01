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
import type { SlideRole } from "../_shared/brand/archetypes.ts";
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
  leggiCopy,
  leggiRicerca,
  normalizzaOrari,
  paroleVietateTrovate,
  promptCarosello,
  promptControlloItaliano,
  prossimiSlot,
  richiestaRicerca,
  temiRicerca,
  type BrandPerScoperte,
  type CopyScoperta,
  type Scoperta,
} from "../_shared/brand/scoperte.ts";

type Admin = ReturnType<typeof adminClient>;

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
const COPY_MODEL = "gemini-2.5-flash";
// Un post non va programmato a meno di 20 minuti da un altro dello stesso profilo.
const DISTANZA_MINIMA_MS = 20 * 60 * 1000;

type BrandRow = BrandPerScoperte & {
  id: string;
  user_id: string;
  pubblicazione_automatica?: boolean | null;
  auto_orari?: string[] | null;
  genome?: { palette?: { bg_a?: string; text_on_light?: string } } | null;
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
    const rl = await requireWithinRateLimit(supabase, auth.userId, "scoperte-automatiche", 3, 3600);
    if (!rl.ok) return jsonResponse(req, { error: rl.error }, rl.status);

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

  const { data: variants } = await supabase
    .from("template_variants")
    .select("slide_role, storage_bucket, storage_path, prompt_skeleton, genome")
    .eq("brand_id", brandId);
  const byRole = new Map<SlideRole, VariantRow>();
  for (const v of (variants || []) as VariantRow[]) byRole.set(v.slide_role, v);
  if (!byRole.has("cover") || !byRole.has("content") || !byRole.has("cta")) {
    return { ok: false, motivo: "Approva prima il template delle slide di questo brand" };
  }

  if (!Deno.env.get("PERPLEXITY_API_KEY")) return { ok: false, motivo: "Manca la chiave PERPLEXITY_API_KEY sul server" };
  if (!Deno.env.get("GEMINI_API_KEY")) return { ok: false, motivo: "Manca la chiave GEMINI_API_KEY sul server" };

  const refCache = new Map<SlideRole, string>();
  for (const role of ["cover", "content", "cta"] as SlideRole[]) {
    const v = byRole.get(role)!;
    const b64 = await downloadAsBase64(supabase, v.storage_bucket, v.storage_path);
    if (!b64) return { ok: false, motivo: `Immagine di riferimento ${role} non scaricabile` };
    refCache.set(role, b64);
  }

  const modelKey = String((b as { image_model?: string }).image_model || "nano-2");
  // Stessi colori che usa l'app (useNb2Carousel): palette del genoma del brand.
  const palette = b.genome?.palette;
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
    },
  };
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
      .select("url")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false })
      .limit(200);
    const urlUsati = ((usate || []) as Array<{ url: string }>).map((r) => r.url);

    const scoperte = await cerca(temiRicerca(brand), Math.max(slot.length * 2, 4), urlUsati);
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

async function cerca(temi: string, quante: number, urlUsati: string[]): Promise<Scoperta[]> {
  const r = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("PERPLEXITY_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(richiestaRicerca(temi, quante, urlUsati)),
  });
  if (!r.ok) throw new Error(`Perplexity ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return leggiRicerca(await r.json(), urlUsati);
}

async function chiediGemini(prompt: string): Promise<string> {
  const res = await callGeminiWithRetry({
    apiKey: Deno.env.get("GEMINI_API_KEY")!,
    model: COPY_MODEL,
    body: {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
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
  return copy;
}

async function aggiornaScoperta(supabase: Admin, id: string, campi: Record<string, unknown>) {
  await supabase.from("scoperte").update({ ...campi, updated_at: new Date().toISOString() }).eq("id", id);
}

async function unCarosello(supabase: Admin, ctx: Contesto, s: Scoperta, scopertaId: string, quando: Date): Promise<void> {
  const { brand } = ctx;
  await aggiornaScoperta(supabase, scopertaId, { stato: "in_produzione" });
  try {
    const copy = await scriviCopy(brand, s);
    const slides: SlideInput[] = copy.slides.map((sl, index) => ({
      index,
      role: sl.role as SlideRole,
      title: sl.title,
      body: sl.body,
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

    const risultati = await runPool(
      slides.map((sl) => async () => {
        const r = await produciSlide(supabase, ctx, carouselId, sl);
        await patchSlide(supabase, carouselId, r);
        return r;
      }),
      CONCURRENCY,
    );
    const ok = risultati.filter((r) => r.status === "done").length;
    const stato = ok === slides.length ? "ready" : ok > 0 ? "partial" : "failed";
    await supabase
      .from("produced_carousels")
      .update({ status: stato, ok_count: ok, updated_at: new Date().toISOString() })
      .eq("id", carouselId);
    await logGeneration({
      userId: brand.user_id,
      brandId: brand.id,
      type: "carousel",
      topic: s.titolo,
      title: copy.titolo_carosello,
      status: stato === "ready" ? "success" : stato === "partial" ? "partial" : "failed",
      metadata: { phase: "scoperte-automatiche", carouselId, fonte: s.url, estimated_cost_usd: ok * COST_NB2_IMAGE_1K },
    });
    // Un carosello a metà non si pubblica: resta nell'archivio da sistemare a mano.
    if (stato !== "ready") throw new Error(`Slide prodotte ${ok} di ${slides.length}`);

    const paths = [...risultati].sort((a, b) => a.index - b.index).map((r) => r.path as string);
    const { data: post, error: postErr } = await supabase
      .from("published_posts")
      .insert({
        user_id: brand.user_id,
        content: copy.caption,
        hashtags: copy.hashtags || null,
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
  } catch (e) {
    console.error("Carosello non riuscito per", s.url, e);
    await aggiornaScoperta(supabase, scopertaId, { stato: "errore", errore: (e as Error).message.slice(0, 500) });
  }
}

async function produciSlide(supabase: Admin, ctx: Contesto, carouselId: string, slide: SlideInput): Promise<SlideRecord> {
  const variant = ctx.byRole.get(slide.role)!;
  const prompt = resolveSkeleton(variant.prompt_skeleton, slide, ctx.colors, ctx.kicker);
  const bytes = await generateSlide(Deno.env.get("GEMINI_API_KEY")!, ctx.refCache.get(slide.role)!, prompt, ctx.format, ctx.models);
  if (!bytes) return { ...slide, path: null, error: "nessuna immagine dal modello", status: "failed" };
  const path = `${ctx.brand.user_id}/${carouselId}/slide_${slide.index + 1}_${Date.now()}.png`;
  const { error } = await supabase.storage.from(OUTPUT_BUCKET).upload(path, bytes, { contentType: "image/png", upsert: true });
  if (error) return { ...slide, path: null, error: error.message, status: "failed" };
  return { ...slide, path, error: null, status: "done" };
}
