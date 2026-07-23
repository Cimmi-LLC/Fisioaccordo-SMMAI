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
//   generate    → crea la riga, risponde 202, produce in background
//   regenerate  → una singola slide di una riga esistente (sincrona)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, assertBrandOwnership, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { logGeneration } from "../_shared/historyLogger.ts";
import { sanitize } from "../_shared/brand/genesisPrompt.ts";
import type { SlideRole } from "../_shared/brand/archetypes.ts";
import { COST_NB2_IMAGE_1K } from "../_shared/brand/costs.ts";

const IMAGE_MODEL = "gemini-3.1-flash-image";
const IMAGE_MODEL_FALLBACK = "nano-banana-pro-preview";
// 6 in parallelo: un carosello tipico (5-6 slide) parte in un'unica ondata,
// eventuali 429 li assorbe callGeminiWithRetry.
const CONCURRENCY = 6;
const OUTPUT_BUCKET = "carousel-images";

type SlideInput = {
  index: number;
  role: SlideRole;
  title: string;
  body?: string;
  number?: string;
  illustration?: string;
};

type SlideRecord = SlideInput & {
  path: string | null;
  error: string | null;
  status: "pending" | "done" | "failed";
};

type VariantRow = {
  slide_role: SlideRole;
  storage_bucket: string;
  storage_path: string;
  prompt_skeleton: string;
  genome: { archetype?: string; format?: string } | null;
};

type PaletteColors = { bg_color: string; title_color: string; body_color: string };

function resolveSkeleton(skeleton: string, slide: SlideInput, colors: PaletteColors): string {
  let prompt = skeleton
    .replaceAll("{{title}}", slide.title || "")
    .replaceAll("{{body}}", slide.body || "")
    .replaceAll("{{number}}", slide.number || String(slide.index + 1).padStart(2, "0"))
    .replaceAll("{{illustration}}", slide.illustration || slide.title || "")
    .replaceAll("{{bg_color}}", colors.bg_color)
    .replaceAll("{{title_color}}", colors.title_color)
    .replaceAll("{{body_color}}", colors.body_color);

  // Alcuni archetipi hanno un piccolo label accanto al numero: nei template
  // generati prima del fix il segnaposto era la parola letterale "Label".
  // Istruzione globale: mai copiarla, sostituirla con una parola vera.
  if (slide.role === "content") {
    prompt +=
      "\nIf the layout includes a short label next to the index number, write there ONE real Italian word " +
      "that categorizes this slide content (for example Postura, Metodo, Consiglio). " +
      "Never write placeholder words such as Label, Testo or Categoria." +
      "\nAny image or illustration on this slide must be a CUTOUT: subject isolated along its own silhouette " +
      "directly on the flat background, like a sticker. Never place images inside rectangles: " +
      "no straight photo edges, no frames, no photo boxes.";
  }

  return sanitize(prompt);
}

async function downloadAsBase64(
  supabase: ReturnType<typeof adminClient>,
  bucket: string,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const buf = new Uint8Array(await data.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

async function generateSlide(
  apiKey: string,
  referenceB64: string,
  prompt: string,
  aspectRatio: string,
): Promise<Uint8Array | null> {
  for (const model of [IMAGE_MODEL, IMAGE_MODEL_FALLBACK]) {
    try {
      const result = await callGeminiWithRetry({
        apiKey,
        model,
        body: {
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: "image/png", data: referenceB64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio, imageSize: "1K" },
          },
        },
      });
      const parts = result?.data?.candidates?.[0]?.content?.parts as Array<Record<string, unknown>> | undefined;
      const inline = parts?.find((p) => p.inlineData) as { inlineData?: { data?: string } } | undefined;
      const b64 = inline?.inlineData?.data;
      if (b64) return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } catch (e) {
      console.warn(`Slide gen con ${model} fallita:`, (e as Error).message);
    }
  }
  return null;
}

async function runPool<T>(jobs: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  async function worker() {
    while (idx < jobs.length) {
      const my = idx++;
      results[my] = await jobs[my]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return results;
}

/** Aggiorna una slide nel jsonb della riga (riletto per non perdere update concorrenti). */
async function patchSlide(
  supabase: ReturnType<typeof adminClient>,
  rowId: string,
  slide: SlideRecord,
): Promise<void> {
  const { data } = await supabase
    .from("produced_carousels")
    .select("slides")
    .eq("id", rowId)
    .single();
  const slides = ((data as { slides?: SlideRecord[] } | null)?.slides || []) as SlideRecord[];
  const next = slides.map((s) => (s.index === slide.index ? slide : s));
  const okCount = next.filter((s) => s.status === "done").length;
  await supabase
    .from("produced_carousels")
    .update({ slides: next, ok_count: okCount, updated_at: new Date().toISOString() })
    .eq("id", rowId);
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

    // Template approvati del brand (gate: senza template niente produzione).
    const { data: variants, error: varErr } = await supabase
      .from("template_variants")
      .select("slide_role, storage_bucket, storage_path, prompt_skeleton, genome")
      .eq("brand_id", brandId);
    if (varErr) return jsonResponse(req, { error: varErr.message }, 500);
    const byRole = new Map<SlideRole, VariantRow>();
    for (const v of (variants || []) as VariantRow[]) byRole.set(v.slide_role, v);
    if (!byRole.has("cover") || !byRole.has("content") || !byRole.has("cta")) {
      return jsonResponse(req, {
        error: "template_not_locked",
        message: "Il brand non ha un template approvato. Completa prima il Template Genesis.",
      }, 409);
    }

    // Formato dal genoma congelato del template (default 1:1 per i vecchi).
    const format = byRole.get("content")!.genome?.format === "4:5" ? "4:5" : "1:1";

    // Scarica le 3 reference una volta sola.
    const refCache = new Map<SlideRole, string>();
    for (const role of ["cover", "content", "cta"] as SlideRole[]) {
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
      const prompt = resolveSkeleton(variant.prompt_skeleton, slide, colors);
      const bytes = await generateSlide(GEMINI_API_KEY, refCache.get(slide.role)!, prompt, format);
      if (!bytes) {
        return { ...slide, path: null, error: "nessuna immagine dal modello", status: "failed" };
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
        .select("id, user_id")
        .eq("id", rowId)
        .maybeSingle();
      if (!row || (row as { user_id: string }).user_id !== userId) {
        return jsonResponse(req, { error: "Carosello non trovato" }, 404);
      }

      const result = await produceOne(rowId, slides[0]);
      await patchSlide(supabase, rowId, result);
      await logGeneration({
        userId, brandId, type: "carousel",
        status: result.path ? "success" : "failed",
        title: "Rigenerazione slide " + (slides[0].index + 1),
        metadata: { phase: "regenerate-slide", carouselId: rowId, estimated_cost_usd: result.path ? COST_NB2_IMAGE_1K : 0 },
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
            const r = await produceOne(rowId, s);
            await patchSlide(supabase, rowId, r);
            return r;
          }),
          CONCURRENCY,
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
          metadata: { phase: "produce-slides", carouselId: rowId, format, estimated_cost_usd: okCount * COST_NB2_IMAGE_1K },
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
