// Edge function di genesi del template.
//
// Actions:
//   analyze    → lettura semantica dei post caricati (gemini-2.5-flash vision)
//   generate   → art director sceglie il genoma + 9 immagini NB2 in background
//   regenerate → come generate ma con feedback prioritario e genome_version+1
//
// La risposta a generate/regenerate e un 202 immediato: le 9 immagini si
// generano in background (EdgeRuntime.waitUntil) con concorrenza 3, e il
// client segue il progresso via Realtime/polling su template_candidates.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, assertBrandOwnership, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { logGeneration } from "../_shared/historyLogger.ts";
import { buildArtDirectorPrompt, parseArtDirectorResponse } from "../_shared/brand/artDirector.ts";
import type { ArtDirectorBrandInfo, BrandSemantics } from "../_shared/brand/artDirector.ts";
import { buildGenesisPrompt } from "../_shared/brand/genesisPrompt.ts";
import type { GenesisBrandKit, GenesisPalette, GenesisVariant } from "../_shared/brand/genesisPrompt.ts";
import type { TemplateGenome } from "../_shared/brand/genome.ts";
import type { SlideRole } from "../_shared/brand/archetypes.ts";
import { estimateGenesisCost, COST_GEMINI_FLASH_CALL } from "../_shared/brand/costs.ts";
import { buildSemanticsPrompt, parseSemanticsResponse } from "./semantics.ts";

const IMAGE_MODEL = "gemini-3.1-flash-image";
const IMAGE_MODEL_FALLBACK = "nano-banana-pro-preview";
const TEXT_MODEL = "gemini-2.5-flash";
const BUCKET = "brand-assets";
const ROLES: SlideRole[] = ["cover", "content", "cta"];
const VARIANTS: GenesisVariant[] = [1, 2, 3];
const CONCURRENCY = 3;

type BrandRow = {
  id: string;
  user_id: string;
  nome_business: string | null;
  descrizione: string | null;
  categorie: string[] | null;
  servizi: string[] | null;
  tono_voce: string | null;
};

function brandInfo(b: BrandRow): ArtDirectorBrandInfo {
  return {
    nome_business: b.nome_business || "Studio",
    descrizione: b.descrizione || "",
    categorie: b.categorie || [],
    servizi: b.servizi || [],
    tono_voce: b.tono_voce || "professionale",
  };
}

async function downloadAsBase64(
  supabase: ReturnType<typeof adminClient>,
  bucket: string,
  path: string,
): Promise<{ data: string; mime: string } | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const buf = new Uint8Array(await data.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  const ext = path.split(".").pop()?.toLowerCase() || "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  return { data: btoa(bin), mime };
}

/** Genera una singola immagine template via NB2 (con fallback modello). */
async function generateOneImage(
  apiKey: string,
  prompt: string,
): Promise<Uint8Array | null> {
  for (const model of [IMAGE_MODEL, IMAGE_MODEL_FALLBACK]) {
    try {
      const result = await callGeminiWithRetry({
        apiKey,
        model,
        body: {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
          },
        },
      });
      const parts = result?.data?.candidates?.[0]?.content?.parts as Array<Record<string, unknown>> | undefined;
      const inline = parts?.find((p) => p.inlineData) as { inlineData?: { data?: string } } | undefined;
      const b64 = inline?.inlineData?.data;
      if (b64) {
        return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      }
      console.warn(`Nessun inlineData dal modello ${model}, provo fallback`);
    } catch (e) {
      console.warn(`Modello ${model} fallito:`, (e as Error).message);
    }
  }
  return null;
}

/** Pool a concorrenza limitata. */
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

    const action = String(body.action || "");
    const brandId = String(body.brandId || "");
    if (!brandId) return jsonResponse(req, { error: "brandId obbligatorio" }, 400);

    const own = await assertBrandOwnership(supabase, userId, brandId);
    if (!own.ok) return jsonResponse(req, { error: own.error }, own.status);

    const rl = await requireWithinRateLimit(supabase, userId, "generate-template", 6, 3600);
    if (!rl.ok) return jsonResponse(req, { error: rl.error }, rl.status);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return jsonResponse(req, { error: "GEMINI_API_KEY non configurata" }, 500);

    const { data: brand, error: brandErr } = await supabase
      .from("brands")
      .select("id, user_id, nome_business, descrizione, categorie, servizi, tono_voce")
      .eq("id", brandId)
      .single();
    if (brandErr || !brand) return jsonResponse(req, { error: "Brand non trovato" }, 404);

    // ─── ANALYZE ──────────────────────────────────────────────
    if (action === "analyze") {
      const { data: sources } = await supabase
        .from("brand_sources")
        .select("kind, storage_bucket, storage_path")
        .eq("brand_id", brandId)
        .in("kind", ["logo", "post"]);

      const parts: Array<Record<string, unknown>> = [{ text: buildSemanticsPrompt() }];
      let imagesLoaded = 0;
      for (const s of (sources || []) as Array<{ kind: string; storage_bucket: string; storage_path: string }>) {
        const img = await downloadAsBase64(supabase, s.storage_bucket, s.storage_path);
        if (img) {
          parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
          imagesLoaded++;
        }
      }
      if (imagesLoaded === 0) {
        return jsonResponse(req, { error: "Nessuna immagine caricata da analizzare" }, 400);
      }

      await supabase.from("brands").update({ genesis_status: "analyzing" }).eq("id", brandId);

      const result = await callGeminiWithRetry({
        apiKey: GEMINI_API_KEY,
        model: TEXT_MODEL,
        body: {
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        },
      });
      const raw = result?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const semantics = parseSemanticsResponse(raw);
      if (!semantics) {
        return jsonResponse(req, { error: "Lettura semantica non riuscita, riprova" }, 502);
      }

      await logGeneration({
        userId,
        brandId,
        type: "template_genesis",
        status: "success",
        title: "Analisi semantica brand",
        metadata: { phase: "analyze", images: imagesLoaded, estimated_cost_usd: COST_GEMINI_FLASH_CALL },
      });

      return jsonResponse(req, { semantics });
    }

    // ─── GENERATE / REGENERATE ────────────────────────────────
    if (action === "generate" || action === "regenerate") {
      const palette = body.palette as GenesisPalette | undefined;
      const semantics = (body.semantics ?? null) as BrandSemantics | null;
      const feedback = typeof body.feedback === "string" ? body.feedback : undefined;
      if (!palette || !palette.bg_a || !palette.bg_b || !palette.accent) {
        return jsonResponse(req, { error: "palette mancante o incompleta" }, 400);
      }

      // Art director: 1 tentativo + 1 retry con gli errori appesi.
      let genome: TemplateGenome | null = null;
      let adErrors: string[] = [];
      for (let attempt = 0; attempt < 2 && !genome; attempt++) {
        const prompt = buildArtDirectorPrompt(
          brandInfo(brand as BrandRow),
          semantics,
          palette,
          feedback,
          attempt > 0 ? adErrors : undefined,
        );
        const result = await callGeminiWithRetry({
          apiKey: GEMINI_API_KEY,
          model: TEXT_MODEL,
          body: {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
          },
        });
        const raw = result?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = parseArtDirectorResponse(raw);
        if (parsed.ok) genome = parsed.genome;
        else adErrors = parsed.errors;
      }
      if (!genome) {
        await supabase.from("brands").update({ genesis_status: "failed" }).eq("id", brandId);
        return jsonResponse(req, { error: "Art director fallito: " + adErrors.join("; ") }, 502);
      }

      // Versione genoma: +1 su regenerate.
      const { data: maxRow } = await supabase
        .from("template_candidates")
        .select("genome_version")
        .eq("brand_id", brandId)
        .order("genome_version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const genomeVersion = action === "regenerate"
        ? (((maxRow as { genome_version?: number } | null)?.genome_version) || 0) + 1
        : (((maxRow as { genome_version?: number } | null)?.genome_version) || 0) + 1;

      // La palette entra nel jsonb accanto al genoma: serve alla pipeline di
      // produzione per risolvere {{bg_color}}/{{title_color}}/{{body_color}}.
      await supabase.from("brands")
        .update({ genome: { ...genome, palette }, genesis_status: "generating" })
        .eq("id", brandId);

      const kit: GenesisBrandKit = {
        nome_business: (brand as BrandRow).nome_business || "Studio",
        palette,
      };

      // Crea i 9 record pending.
      const candidates: Array<{ id: string; role: SlideRole; variant: GenesisVariant; prompt: string }> = [];
      for (const role of ROLES) {
        for (const variant of VARIANTS) {
          const prompt = buildGenesisPrompt(kit, genome, role, variant);
          const { data: row, error: insErr } = await supabase
            .from("template_candidates")
            .insert({
              brand_id: brandId,
              user_id: userId,
              genome_version: genomeVersion,
              slide_role: role,
              variant_index: variant,
              genome,
              genesis_prompt: prompt,
              status: "pending",
            })
            .select("id")
            .single();
          if (insErr || !row) {
            console.error("insert candidate fallito:", insErr?.message);
            continue;
          }
          candidates.push({ id: (row as { id: string }).id, role, variant, prompt });
        }
      }

      // Generazione in background: risposta immediata al client.
      const generateAll = async () => {
        let okCount = 0;
        const jobs = candidates.map((c) => async () => {
          await supabase.from("template_candidates")
            .update({ status: "generating", updated_at: new Date().toISOString() })
            .eq("id", c.id);
          const bytes = await generateOneImage(GEMINI_API_KEY, c.prompt);
          if (!bytes) {
            await supabase.from("template_candidates")
              .update({ status: "failed", error: "nessuna immagine dal modello", updated_at: new Date().toISOString() })
              .eq("id", c.id);
            return;
          }
          const path = `${userId}/${brandId}/candidates/v${genomeVersion}/${c.role}_${c.variant}.png`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, bytes, { contentType: "image/png", upsert: true });
          if (upErr) {
            await supabase.from("template_candidates")
              .update({ status: "failed", error: "upload fallito: " + upErr.message, updated_at: new Date().toISOString() })
              .eq("id", c.id);
            return;
          }
          await supabase.from("template_candidates")
            .update({ status: "done", storage_bucket: BUCKET, storage_path: path, updated_at: new Date().toISOString() })
            .eq("id", c.id);
          okCount++;
        });

        await runPool(jobs, CONCURRENCY);

        await supabase.from("brands")
          .update({ genesis_status: okCount === 0 ? "failed" : "awaiting_approval" })
          .eq("id", brandId);

        await logGeneration({
          userId,
          brandId,
          type: "template_genesis",
          status: okCount === candidates.length ? "success" : okCount > 0 ? "partial" : "failed",
          title: "Genesi template v" + genomeVersion,
          metadata: {
            phase: action,
            genomeVersion,
            ok: okCount,
            failed: candidates.length - okCount,
            estimated_cost_usd: estimateGenesisCost(okCount, 2),
          },
        });
      };

      // waitUntil se disponibile, altrimenti fire-and-forget.
      const runtime = (globalThis as Record<string, unknown>).EdgeRuntime as
        | { waitUntil?: (p: Promise<unknown>) => void }
        | undefined;
      if (runtime?.waitUntil) runtime.waitUntil(generateAll());
      else generateAll();

      return jsonResponse(req, {
        accepted: true,
        genome,
        genomeVersion,
        candidateIds: candidates.map((c) => c.id),
      }, 202);
    }

    return jsonResponse(req, { error: "action non riconosciuta" }, 400);
  } catch (e) {
    console.error("generate-template error:", e);
    return jsonResponse(req, { error: (e as Error).message || "Errore interno" }, 500);
  }
});
