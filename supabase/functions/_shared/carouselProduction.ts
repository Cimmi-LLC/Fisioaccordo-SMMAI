// Produzione delle slide di un carosello col template approvato del brand.
// Spostato da generate-carousel-slides (invariato) perche lo usa anche il
// pilota automatico scoperte-automatiche.

import { adminClient } from "./auth.ts";
import { callGeminiWithRetry } from "./gemini.ts";
import { sanitize } from "./brand/genesisPrompt.ts";
import type { SlideRole } from "./brand/archetypes.ts";

export const IMAGE_MODEL = "gemini-3.1-flash-image";
export const IMAGE_MODEL_FALLBACK = "nano-banana-pro-preview";

// Cascate modelli per brands.image_model (listino crediti in ImageModelCard).
// gpt-2 e stock ripiegano su nano-2: la produzione con reference image e
// supportata solo dai modelli Gemini (dichiarato nella card impostazioni).
export const MODEL_CASCADES: Record<string, string[]> = {
  "nano-2": [IMAGE_MODEL, IMAGE_MODEL_FALLBACK],
  "nano-pro": ["gemini-3-pro-image", IMAGE_MODEL_FALLBACK, IMAGE_MODEL],
  "gpt-2": [IMAGE_MODEL, IMAGE_MODEL_FALLBACK],
  "stock": [IMAGE_MODEL, IMAGE_MODEL_FALLBACK],
};
// 6 in parallelo: un carosello tipico (5-6 slide) parte in un'unica ondata,
// eventuali 429 li assorbe callGeminiWithRetry.
export const CONCURRENCY = 6;
export const OUTPUT_BUCKET = "carousel-images";

export type SlideInput = {
  index: number;
  role: SlideRole;
  title: string;
  body?: string;
  number?: string;
  illustration?: string;
};

export type SlideRecord = SlideInput & {
  path: string | null;
  error: string | null;
  status: "pending" | "done" | "failed";
};

export type VariantRow = {
  slide_role: SlideRole;
  storage_bucket: string;
  storage_path: string;
  prompt_skeleton: string;
  genome: { archetype?: string; format?: string } | null;
};

export type PaletteColors = { bg_color: string; title_color: string; body_color: string };

export function resolveSkeleton(skeleton: string, slide: SlideInput, colors: PaletteColors, kicker: string): string {
  let prompt = skeleton
    .replaceAll("{{kicker}}", kicker)
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

export async function downloadAsBase64(
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

export async function generateSlide(
  apiKey: string,
  referenceB64: string,
  prompt: string,
  aspectRatio: string,
  models: string[],
): Promise<Uint8Array | null> {
  for (const model of models) {
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

export async function runPool<T>(jobs: Array<() => Promise<T>>, limit: number): Promise<T[]> {
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
export async function patchSlide(
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
