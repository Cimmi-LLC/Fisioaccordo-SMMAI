// Pipeline di PRODUZIONE caroselli (sostituisce SlideTemplate DOM + Pixabay).
//
// Per ogni slide del copy: reference image = template_variants del ruolo,
// prompt = prompt_skeleton con i placeholder risolti, NB2 genera la slide
// finale nel formato del template (1:1 o 4:5). Una slide fallita non
// uccide il job.
//
// Persistenza e progresso: ogni run crea una riga in produced_carousels;
// le slide vengono aggiornate nel jsonb man mano che escono e il client
// segue via Realtime (+ polling di sicurezza).
//
// Actions:
//   generate      → crea la riga, risponde 202, produce in background
//   regenerate    → una singola slide di una riga esistente (sincrona)
//   disegna_slide → interna: disegna UNA slide di un template a layout
//
// Template a layout (genome.layout, dal 06/11/2026): niente NB2, le slide le
// disegna il server con Satori + Resvg (testo esatto), una per chiamata per
// stare nel limite di CPU delle edge function.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, assertBrandOwnership, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { logGeneration } from "../_shared/historyLogger.ts";
import type { SlideRole } from "../_shared/brand/archetypes.ts";
import { COST_NB2_IMAGE_1K } from "../_shared/brand/costs.ts";
import { resolveProfession, type ProfessionBrandLike } from "../_shared/brand/profession.ts";
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
import { evidenziaAuto, isLayoutId, layoutDiBase, vuoleFoto, type LayoutId } from "../_shared/brand/layouts.ts";
import {
  DISEGNI_IN_PARALLELO, caricaFoto, chiamaDisegno, coloriDelBrand, disegnaLayout, fotoDelBrand, leggiSpec, logoDelBrand,
} from "../_shared/layoutRender.ts";

// ── Colori del brand kit ───────────────────────────────────────────────
// Regola della revisione 03/11: se il colore primario è nel kit, le slide
// usano quello. I default FisioAccordo (presenti su ogni brand appena creato)
// non contano come scelta del cliente.
const DEFAULT_KIT_COLORS = new Set(["#554697", "#e6007e", "#1a1a2e"]);

function coloreSceltoDalKit(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return /^#[0-9a-f]{6}$/.test(s) && !DEFAULT_KIT_COLORS.has(s) ? s : null;
}

// ── Controllo del testo renderizzato ───────────────────────────────────
// Le slide sono PNG disegnate dal modello: a volte il titolo esce doppio,
// sovrapposto o troncato («PERCHÉ LA SPALLA PERCHÉ LA…», «ANCHE IDA DA
// FERMA»). Dopo la generazione si trascrive il testo dell'immagine e si
// confronta col titolo atteso; in caso di problema si ritenta una volta.
const VERIFY_MODEL = "gemini-2.5-flash";

function normalizzaTesto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** null = testo a posto; altrimenti il problema trovato (per log e retry). */
async function problemaTestoRenderizzato(
  apiKey: string,
  bytes: Uint8Array,
  titoloAtteso: string,
): Promise<string | null> {
  const atteso = normalizzaTesto(titoloAtteso);
  if (!atteso || atteso.length < 4) return null;
  try {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const res = await callGeminiWithRetry({
      apiKey,
      model: VERIFY_MODEL,
      body: {
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: "image/png", data: btoa(bin) } },
            { text: "Trascrivi TUTTO il testo leggibile in questa immagine, nell'ordine in cui appare, compresi i pezzi ripetuti. Rispondi solo con JSON: {\"testo\": \"tutto il testo, separato da spazi\"}" },
          ],
        }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      },
    });
    const raw = res?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    const visto = normalizzaTesto(String(parsed?.testo || ""));
    if (!visto) return null; // trascrizione vuota: non giudico, meglio nessun falso positivo

    // Titolo duplicato: la stringa intera compare più di una volta.
    const occorrenze = visto.split(atteso).length - 1;
    if (occorrenze > 1) return "il titolo è uscito doppio";

    // Titolo mancante o troncato: meno di metà delle parole significative.
    const parole = atteso.split(" ").filter((w) => w.length >= 3);
    if (parole.length === 0) return null;
    const presenti = parole.filter((w) => visto.includes(w)).length;
    if (presenti / parole.length < 0.5) return "il titolo è mancante o troncato";
    return null;
  } catch (e) {
    // Il controllo non deve mai bloccare la produzione: in dubbio, passa.
    console.warn("verifica testo saltata:", (e as Error).message);
    return null;
  }
}

/** Sceglie una foto dello studio diversa a ogni carosello (stessa per la stessa riga). */
function scegli<T>(lista: T[], chiave: string): T | null {
  if (lista.length === 0) return null;
  let h = 0;
  for (const ch of chiave) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return lista[h % lista.length];
}

/** Disegna e carica UNA slide di un template a layout, poi la scrive nella riga. */
async function disegnaSlideLayout(
  supabase: ReturnType<typeof adminClient>,
  userId: string,
  brandId: string,
  rowId: string,
  slide: SlideInput,
  totale: number,
): Promise<SlideRecord> {
  const fallita = (error: string): SlideRecord => ({ ...slide, path: null, error, status: "failed" });
  try {
    const { data: variant } = await supabase
      .from("template_variants")
      .select("genome, prompt_skeleton")
      .eq("brand_id", brandId)
      .eq("slide_role", slide.role)
      .maybeSingle();
    const v = variant as Pick<VariantRow, "genome" | "prompt_skeleton"> | null;

    const { data: brand } = await supabase.from("brands").select("*").eq("id", brandId).single();
    const b = (brand || {}) as Record<string, unknown>;
    const tutte = await fotoDelBrand(supabase, brandId, b);

    // Template scelto: il suo layout. Senza template (brand nuovo, wizard
    // saltato, proposte mai scelte): il layout di base, nei colori del kit.
    const layout: LayoutId = v && isLayoutId(v.genome?.layout)
      ? v.genome!.layout as LayoutId
      : layoutDiBase((b.genome as { layout?: unknown } | null)?.layout, tutte.length > 0);

    // Foto: una vera dello studio (a rotazione fra i caroselli), altrimenti
    // quella scelta per il template approvato.
    let foto = null;
    if (vuoleFoto(layout, slide.role) !== "no") {
      const rif = scegli(tutte, rowId + slide.role) ?? (v ? leggiSpec(v.prompt_skeleton)?.foto : null) ?? null;
      foto = await caricaFoto(supabase, rif);
    }
    const logo = await logoDelBrand(supabase, brandId, b.logo_url);
    const etichetta = v?.genome?.layout_etichetta || resolveProfession(b as unknown as ProfessionBrandLike).kicker;

    const bytes = await disegnaLayout({
      layout,
      role: slide.role,
      colori: coloriDelBrand(b, (b.genome as { palette?: { accent?: string } } | null)?.palette?.accent),
      nome: String(b.nome_business || "Studio"),
      logo,
      foto: foto?.src ?? null,
      etichetta,
      titolo: evidenziaAuto(slide.title || ""),
      testo: slide.body || "",
      numero: slide.number,
      indice: slide.index,
      totale,
    });
    const path = `${userId}/${rowId}/slide_${slide.index + 1}_${Date.now()}.png`;
    const { error: upErr } = await supabase.storage
      .from(OUTPUT_BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) return fallita(upErr.message);
    return { ...slide, path, error: null, status: "done" };
  } catch (e) {
    console.error("disegno slide fallito:", e);
    return fallita((e as Error).message || "disegno fallito");
  }
}

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);
    const userId = auth.userId;

    const supabase = adminClient();
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return jsonResponse(req, { error: "Body non valido" }, 400);

    const action = String(body.action || "generate");
    const brandId = String(body.brandId || "");
    const slides = Array.isArray(body.slides) ? (body.slides as SlideInput[]) : [];
    const colors = (body.colors ?? null) as PaletteColors | null;

    if (!brandId) return jsonResponse(req, { error: "brandId obbligatorio" }, 400);

    // ─── DISEGNA_SLIDE: chiamata dal lavoro in background, una slide ───
    // Niente AI: fuori dal rate limit.
    if (action === "disegna_slide") {
      const own = await assertBrandOwnership(supabase, userId, brandId);
      if (!own.ok) return jsonResponse(req, { error: own.error }, own.status);
      const rowId = String(body.carouselId || "");
      const slide = body.slide as SlideInput | undefined;
      const { data: row } = await supabase
        .from("produced_carousels")
        .select("id, user_id, total")
        .eq("id", rowId)
        .maybeSingle();
      const r0 = row as { user_id: string; total: number } | null;
      if (!r0 || r0.user_id !== userId || !slide) return jsonResponse(req, { error: "Carosello non trovato" }, 404);
      const result = await disegnaSlideLayout(supabase, userId, brandId, rowId, slide, r0.total || 1);
      await patchSlide(supabase, rowId, result);
      return result.path ? jsonResponse(req, { path: result.path }) : jsonResponse(req, { error: result.error }, 500);
    }

    if (slides.length === 0 || slides.length > 12) {
      return jsonResponse(req, { error: "slides: da 1 a 12" }, 400);
    }
    if (!colors?.bg_color || !colors.title_color || !colors.body_color) {
      return jsonResponse(req, { error: "colors {bg_color,title_color,body_color} obbligatori" }, 400);
    }

    const own = await assertBrandOwnership(supabase, userId, brandId);
    if (!own.ok) return jsonResponse(req, { error: own.error }, own.status);

    const rl = await requireWithinRateLimit(supabase, userId, "generate-carousel-slides", 20, 60);
    if (!rl.ok) return jsonResponse(req, { error: rl.error }, rl.status);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return jsonResponse(req, { error: "GEMINI_API_KEY non configurata" }, 500);

    // Template approvati del brand. Fino al 07/11/2026 senza i 3 ruoli la
    // produzione si fermava qui (409 template_not_locked) e chi non aveva
    // logo né template non vedeva mai una slide: ora si disegna col layout
    // di base (vedi disegnaSlideLayout), il template resta un di più.
    const { data: variants, error: varErr } = await supabase
      .from("template_variants")
      .select("slide_role, storage_bucket, storage_path, prompt_skeleton, genome")
      .eq("brand_id", brandId);
    if (varErr) return jsonResponse(req, { error: varErr.message }, 500);
    const byRole = new Map<SlideRole, VariantRow>();
    for (const v of (variants || []) as VariantRow[]) byRole.set(v.slide_role, v);
    const templateCompleto = byRole.has("cover") && byRole.has("content") && byRole.has("cta");

    // Template a layout (o nessun template): le slide le disegna il server (4:5, testo esatto).
    const aLayout = !templateCompleto || isLayoutId(byRole.get("content")!.genome?.layout);

    // Formato dal genoma congelato del template (default 1:1 per i vecchi NB2).
    const format = aLayout || byRole.get("content")!.genome?.format === "4:5" ? "4:5" : "1:1";

    // Modello scelto dallo studio (brands.image_model, card impostazioni) e
    // professione del brand: il suo kicker (es. NUTRIZIONE) sostituisce
    // {{kicker}} nello skeleton della cover.
    const { data: brandPrefs } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .maybeSingle();
    const modelKey = String((brandPrefs as { image_model?: string } | null)?.image_model || "nano-2");
    const models = MODEL_CASCADES[modelKey] || MODEL_CASCADES["nano-2"];
    const kicker = resolveProfession(brandPrefs as unknown as ProfessionBrandLike | null).kicker;
    // Il colore del kit comanda sul template: un centro blu non pubblica viola.
    const brandPrimary = coloreSceltoDalKit((brandPrefs as Record<string, unknown> | null)?.colore_primario);
    const brandSecondary = coloreSceltoDalKit((brandPrefs as Record<string, unknown> | null)?.colore_secondario);
    console.log("Produzione:", templateCompleto ? (aLayout ? "template a layout" : "template NB2 " + models.join(" -> ")) : "layout di base (nessun template)", "| kicker:", kicker, "| colore kit:", brandPrimary || "(default)");

    // Scarica le 3 reference una volta sola (solo per i template NB2).
    const refCache = new Map<SlideRole, string>();
    for (const role of (aLayout ? [] : ["cover", "content", "cta"]) as SlideRole[]) {
      const v = byRole.get(role)!;
      const b64 = await downloadAsBase64(supabase, v.storage_bucket, v.storage_path);
      if (!b64) return jsonResponse(req, { error: `Reference ${role} non scaricabile` }, 500);
      refCache.set(role, b64);
    }

    const produceOne = async (
      rowId: string,
      slide: SlideInput,
    ): Promise<SlideRecord> => {
      const variant = byRole.get(slide.role)!;
      let prompt = resolveSkeleton(variant.prompt_skeleton, slide, colors, kicker);
      // Colori del brand sopra quelli cotti nel template master.
      if (brandPrimary) {
        prompt += "\nBRAND COLOR RULE: the brand primary color is " + brandPrimary +
          (brandSecondary ? " and the secondary is " + brandSecondary : "") +
          ". Every accent and decorative element (shapes, lines, highlighted words, index badge, buttons, underlines) " +
          "must use the brand primary color, NOT the accent color of the reference image. " +
          "Keep the background and text colors specified above.";
      }
      // Niente pallini di posizione finti: disegnati a caso confondono e basta.
      prompt += "\nRender every piece of text exactly once: never duplicate, overlap or truncate the headline. " +
        "If the reference image contains carousel position dots or page indicator dots, REMOVE them completely.";

      let bytes: Uint8Array | null = null;
      let problema: string | null = null;
      for (let tentativo = 0; tentativo < 2; tentativo++) {
        const promptTentativo = tentativo === 0 || !problema
          ? prompt
          : prompt + "\nPREVIOUS ATTEMPT FAILED: " + problema +
            ". Render the headline exactly once, complete, with no overlapping text.";
        bytes = await generateSlide(GEMINI_API_KEY, refCache.get(slide.role)!, promptTentativo, format, models);
        if (!bytes) continue;
        problema = await problemaTestoRenderizzato(GEMINI_API_KEY, bytes, slide.title || "");
        if (!problema) break;
        console.warn(`Slide ${slide.index}: ${problema} (tentativo ${tentativo + 1})`);
      }
      if (!bytes) {
        return { ...slide, path: null, error: "nessuna immagine dal modello", status: "failed" };
      }
      if (problema) {
        // Due tentativi col testo rotto: meglio un errore chiaro col Riprova
        // che pubblicare un titolo doppio o troncato.
        return { ...slide, path: null, error: problema + ": riprova o accorcia il titolo", status: "failed" };
      }
      const path = `${userId}/${rowId}/slide_${slide.index + 1}_${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from(OUTPUT_BUCKET)
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (upErr) return { ...slide, path: null, error: upErr.message, status: "failed" };
      return { ...slide, path, error: null, status: "done" };
    };

    // ─── REGENERATE: una slide di una riga esistente, sincrona ───
    if (action === "regenerate") {
      const rowId = String(body.carouselId || "");
      if (!rowId) return jsonResponse(req, { error: "carouselId obbligatorio" }, 400);
      const { data: row } = await supabase
        .from("produced_carousels")
        .select("id, user_id, total")
        .eq("id", rowId)
        .maybeSingle();
      if (!row || (row as { user_id: string }).user_id !== userId) {
        return jsonResponse(req, { error: "Carosello non trovato" }, 404);
      }
      const totaleRiga = (row as { total?: number }).total || slides[0].index + 1;

      const result = aLayout
        ? await disegnaSlideLayout(supabase, userId, brandId, rowId, slides[0], totaleRiga)
        : await produceOne(rowId, slides[0]);
      await patchSlide(supabase, rowId, result);
      await logGeneration({
        userId, brandId, type: "carousel",
        status: result.path ? "success" : "failed",
        title: "Rigenerazione slide " + (slides[0].index + 1),
        metadata: { phase: "regenerate-slide", carouselId: rowId, layout: aLayout, template: templateCompleto ? "scelto" : "base", estimated_cost_usd: result.path && !aLayout ? COST_NB2_IMAGE_1K : 0 },
      });
      if (!result.path) return jsonResponse(req, { error: result.error || "generazione fallita" }, 502);
      return jsonResponse(req, { bucket: OUTPUT_BUCKET, path: result.path, index: result.index });
    }

    // ─── GENERATE: riga persistente + 202 + produzione in background ───
    const copy = (body.copy ?? null) as Record<string, unknown> | null;
    const title = String(body.title || copy?.titolo_carosello || "Carosello");

    const initialSlides: SlideRecord[] = slides.map((s) => ({
      ...s, path: null, error: null, status: "pending",
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("produced_carousels")
      .insert({
        user_id: userId,
        brand_id: brandId,
        title,
        copy: copy ?? {},
        slides: initialSlides,
        storage_bucket: OUTPUT_BUCKET,
        format,
        status: "producing",
        total: slides.length,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      return jsonResponse(req, { error: "Creazione run fallita: " + (insErr?.message || "") }, 500);
    }
    const rowId = (inserted as { id: string }).id;

    const job = async () => {
      try {
        const results = await runPool(
          slides.map((s) => async () => {
            if (aLayout) {
              // Una chiamata per slide: la slide la scrive nella riga lei stessa.
              const r = await chiamaDisegno("generate-carousel-slides", auth.authHeader, {
                action: "disegna_slide", brandId, carouselId: rowId, slide: s,
              });
              if (r.ok) return { ...s, path: "", error: null, status: "done" } as SlideRecord;
              const fallita: SlideRecord = { ...s, path: null, error: r.errore || "disegno fallito", status: "failed" };
              await patchSlide(supabase, rowId, fallita);
              return fallita;
            }
            const r = await produceOne(rowId, s);
            await patchSlide(supabase, rowId, r);
            return r;
          }),
          aLayout ? DISEGNI_IN_PARALLELO : CONCURRENCY,
        );
        const okCount = results.filter((r) => r.status === "done").length;
        const finalStatus = okCount === slides.length ? "ready" : okCount > 0 ? "partial" : "failed";
        await supabase
          .from("produced_carousels")
          .update({ status: finalStatus, ok_count: okCount, updated_at: new Date().toISOString() })
          .eq("id", rowId);

        await logGeneration({
          userId, brandId, type: "carousel",
          status: finalStatus === "ready" ? "success" : finalStatus === "partial" ? "partial" : "failed",
          title: "Produzione carosello (" + okCount + "/" + slides.length + " slide)",
          metadata: { phase: "produce-slides", carouselId: rowId, format, layout: aLayout, template: templateCompleto ? "scelto" : "base", estimated_cost_usd: aLayout ? 0 : okCount * COST_NB2_IMAGE_1K },
        });
      } catch (e) {
        console.error("Produzione background fallita:", e);
        await supabase
          .from("produced_carousels")
          .update({ status: "failed", error: (e as Error).message, updated_at: new Date().toISOString() })
          .eq("id", rowId);
      }
    };

    // @ts-ignore EdgeRuntime disponibile nell'ambiente Supabase
    EdgeRuntime.waitUntil(job());

    return jsonResponse(req, {
      carouselId: rowId,
      bucket: OUTPUT_BUCKET,
      format,
      total: slides.length,
    }, 202);
  } catch (e) {
    console.error("generate-carousel-slides error:", e);
    return jsonResponse(req, { error: (e as Error).message || "Errore interno" }, 500);
  }
});
