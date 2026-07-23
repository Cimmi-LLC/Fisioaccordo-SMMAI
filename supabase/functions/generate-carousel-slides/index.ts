// Pipeline di PRODUZIONE caroselli (sostituisce SlideTemplate DOM + Pixabay).
//
// Per ogni slide del copy: reference image = template_variants del ruolo,
// prompt = prompt_skeleton con i placeholder risolti, NB2 genera la slide
// finale 1080x1080. Concorrenza 3, retry via callGeminiWithRetry, una slide
// fallita non uccide il job.
//
// Actions:
//   generate    → tutte le slide del carosello (202 + background)
//   regenerate  → una singola slide (sincrona: il client aspetta ~5-10s)

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
const CONCURRENCY = 3;
const OUTPUT_BUCKET = "carousel-images";

type SlideInput = {
  index: number;
  role: SlideRole;
  title: string;
  body?: string;
  number?: string;
};

type VariantRow = {
  slide_role: SlideRole;
  storage_bucket: string;
  storage_path: string;
  prompt_skeleton: string;
  genome: { archetype?: string } | null;
};

type PaletteColors = { bg_color: string; title_color: string; body_color: string };

function resolveSkeleton(skeleton: string, slide: SlideInput, colors: PaletteColors): string {
  return sanitize(
    skeleton
      .replaceAll("{{title}}", slide.title || "")
      .replaceAll("{{body}}", slide.body || "")
      .replaceAll("{{number}}", slide.number || String(slide.index + 1).padStart(2, "0"))
      .replaceAll("{{bg_color}}", colors.bg_color)
      .replaceAll("{{title_color}}", colors.title_color)
      .replaceAll("{{body_color}}", colors.body_color)
  );
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
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
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
    const carouselId = String(body.carouselId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || `c_${Date.now()}`;
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

    // Scarica le 3 reference una volta sola.
    const refCache = new Map<SlideRole, string>();
    for (const role of ["cover", "content", "cta"] as SlideRole[]) {
      const v = byRole.get(role)!;
      const b64 = await downloadAsBase64(supabase, v.storage_bucket, v.storage_path);
      if (!b64) return jsonResponse(req, { error: `Reference ${role} non scaricabile` }, 500);
      refCache.set(role, b64);
    }

    const produceOne = async (slide: SlideInput): Promise<{ index: number; path: string | null; error: string | null }> => {
      const variant = byRole.get(slide.role)!;
      const prompt = resolveSkeleton(variant.prompt_skeleton, slide, colors);
      const bytes = await generateSlide(GEMINI_API_KEY, refCache.get(slide.role)!, prompt);
      if (!bytes) return { index: slide.index, path: null, error: "nessuna immagine dal modello" };
      const path = `${userId}/${carouselId}/slide_${slide.index + 1}_${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from(OUTPUT_BUCKET)
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (upErr) return { index: slide.index, path: null, error: upErr.message };
      return { index: slide.index, path, error: null };
    };

    // regenerate: 1 slide, risposta sincrona.
    if (action === "regenerate") {
      const result = await produceOne(slides[0]);
      await logGeneration({
        userId, brandId, type: "carousel",
        status: result.path ? "success" : "failed",
        title: "Rigenerazione slide " + (slides[0].index + 1),
        metadata: { phase: "regenerate-slide", estimated_cost_usd: result.path ? COST_NB2_IMAGE_1K : 0 },
      });
      if (!result.path) return jsonResponse(req, { error: result.error || "generazione fallita" }, 502);
      return jsonResponse(req, { bucket: OUTPUT_BUCKET, path: result.path, index: result.index });
    }

    // generate: tutte le slide, risposta sincrona (il client mostra progresso
    // ottimistico; 6 slide a concorrenza 3 = ~2 batch, tipicamente 15-30s).
    const results = await runPool(slides.map((s) => () => produceOne(s)), CONCURRENCY);
    const okCount = results.filter((r) => r.path).length;

    await logGeneration({
      userId, brandId, type: "carousel",
      status: okCount === slides.length ? "success" : okCount > 0 ? "partial" : "failed",
      title: "Produzione carosello (" + okCount + "/" + slides.length + " slide)",
      metadata: { phase: "produce-slides", carouselId, estimated_cost_usd: okCount * COST_NB2_IMAGE_1K },
    });

    return jsonResponse(req, {
      bucket: OUTPUT_BUCKET,
      slides: results,
      ok: okCount,
      failed: slides.length - okCount,
    });
  } catch (e) {
    console.error("generate-carousel-slides error:", e);
    return jsonResponse(req, { error: (e as Error).message || "Errore interno" }, 500);
  }
});
