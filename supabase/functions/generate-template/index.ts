// Edge function di genesi del template.
//
// Actions:
//   analyze           → lettura semantica dei post caricati (gemini-2.5-flash vision)
//   generate          → i 3 layout × 3 slide, testi di prova da Gemini, in background
//   regenerate        → come generate ma con feedback prioritario e genome_version+1
//   disegna_candidato → interna: disegna UNA slide a layout (limite di CPU)
//   riprova_candidato → ridisegna una variante fallita
//
// La risposta a generate/regenerate e un 202 immediato: le 9 slide si
// disegnano in background (EdgeRuntime.waitUntil), una per chiamata, e il
// client segue il progresso via Realtime/polling su template_candidates.
//
// Fino al 06/11/2026 l'art director sceglieva un archetipo e NB2 disegnava
// tutta la slide, testo compreso: clipart piatte e decorazioni senza senso,
// «nessuno li pubblicherebbe» (Attilio). Il vecchio percorso resta solo per
// riprovare i candidati generati prima.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, assertBrandOwnership, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { logGeneration } from "../_shared/historyLogger.ts";
import type { GenesisPalette } from "../_shared/brand/genesisPrompt.ts";
import { genomaPerLayout } from "../_shared/brand/genome.ts";
import type { SlideRole } from "../_shared/brand/archetypes.ts";
import { LAYOUT_IDS, layoutConsigliato, vuoleFoto, type LayoutId } from "../_shared/brand/layouts.ts";
import { leggiTestiProva, promptTestiProva, testiDaSegnaposto } from "../_shared/brand/layoutCopy.ts";
import {
  DISEGNI_IN_PARALLELO, caricaFoto, chiamaDisegno, coloriDelBrand, disegnaLayout, fotoDelBrand, leggiSpec, logoDelBrand,
  type RifFoto, type SpecLayout,
} from "../_shared/layoutRender.ts";
import { estimateGenesisCost, COST_GEMINI_FLASH_CALL } from "../_shared/brand/costs.ts";
import { buildSemanticsPrompt, parseSemanticsResponse } from "./semantics.ts";
import { resolveProfession, placeholderCopyFor } from "../_shared/brand/profession.ts";

const IMAGE_MODEL = "gemini-3.1-flash-image";
const IMAGE_MODEL_FALLBACK = "nano-banana-pro-preview";
const TEXT_MODEL = "gemini-2.5-flash";
const BUCKET = "brand-assets";
const ROLES: SlideRole[] = ["cover", "content", "cta"];

type BrandRow = {
  id: string;
  user_id: string;
  nome_business: string | null;
  descrizione: string | null;
  categorie: string[] | null;
  servizi: string[] | null;
  tono_voce: string | null;
  mission: string | null;
  identita_core: string | null;
  vantaggi_competitivi: string[] | null;
  temi_chiave: string[] | null;
  font_intestazioni: string | null;
  font_body: string | null;
  location_photos: string[] | null;
  gallery_photos: string[] | null;
  professione?: string | null;
  professione_custom?: string | null;
  raw_analysis?: { professione?: unknown } | null;
  target_pazienti?: string | null;
};

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
  aspectRatio: string,
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
            imageConfig: { aspectRatio, imageSize: "1K" },
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

/** Foto per il layout B quando lo studio non ne ha: posto vero, nessun testo. */
function promptFotoLayout(b: BrandRow): string {
  return [
    `Editorial photograph for the Instagram carousel of ${b.nome_business || "a healthcare studio"} (${resolveProfession(b).label}).`,
    b.descrizione ? `About the business: ${String(b.descrizione).slice(0, 300)}` : "",
    "Show a real, bright, tidy place where this work happens, for example a treatment room or a studio reception, " +
      "natural window light, shallow depth of field, calm and warm, shot on a full-frame camera. Vertical 4:5.",
    "Absolutely no text, letters, numbers, logos or signs. No computer screens or documents with readable data. " +
      "If people appear they are seen from behind or out of focus.",
  ].filter(Boolean).join("\n");
}

/** Disegna un candidato a layout e lo carica: una slide, dentro il limite di CPU. */
async function disegnaCandidato(
  supabase: ReturnType<typeof adminClient>,
  userId: string,
  brandId: string,
  candidateId: string,
): Promise<{ ok: true; path: string } | { ok: false; errore: string }> {
  const { data: cand } = await supabase
    .from("template_candidates")
    .select("id, user_id, brand_id, genesis_prompt, slide_role, variant_index, genome_version")
    .eq("id", candidateId)
    .maybeSingle();
  const c = cand as {
    id: string; user_id: string; brand_id: string; genesis_prompt: string;
    slide_role: string; variant_index: number; genome_version: number;
  } | null;
  if (!c || c.user_id !== userId || c.brand_id !== brandId) return { ok: false, errore: "Variante non trovata" };
  const spec = leggiSpec(c.genesis_prompt);
  if (!spec) return { ok: false, errore: "Variante senza layout" };

  const segna = (patch: Record<string, unknown>) => supabase.from("template_candidates")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", c.id);
  await segna({ status: "generating", error: null });
  try {
    const { data: brand } = await supabase
      .from("brands")
      .select("nome_business, colore_primario, colore_secondario, logo_url, genome")
      .eq("id", brandId)
      .single();
    const b = (brand || {}) as Record<string, unknown>;
    const [logo, foto] = await Promise.all([
      logoDelBrand(supabase, brandId, b.logo_url),
      vuoleFoto(spec.layout, spec.role) === "no" ? null : caricaFoto(supabase, spec.foto),
    ]);
    // Il template mostra copertina, contenuto e chiusura di un carosello da 5.
    const t = spec.testi;
    const pezzo = spec.role === "cover"
      ? { titolo: t.copertina.titolo, testo: t.copertina.sotto, indice: 0 }
      : spec.role === "content"
      ? { titolo: t.contenuto.titolo, testo: t.contenuto.testo, indice: 1 }
      : { titolo: t.chiusura.titolo, testo: t.chiusura.testo, indice: 4 };
    const bytes = await disegnaLayout({
      layout: spec.layout,
      role: spec.role,
      colori: coloriDelBrand(b, (b.genome as { palette?: { accent?: string } } | null)?.palette?.accent),
      nome: String(b.nome_business || "Studio"),
      logo,
      foto: foto?.src ?? null,
      etichetta: t.etichetta,
      ...pezzo,
      totale: 5,
    });
    const path = `${userId}/${brandId}/candidates/v${c.genome_version}/${c.slide_role}_${c.variant_index}.png`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) {
      await segna({ status: "failed", error: "upload fallito: " + upErr.message });
      return { ok: false, errore: "Upload fallito: " + upErr.message };
    }
    await segna({ status: "done", storage_bucket: BUCKET, storage_path: path, error: null });
    return { ok: true, path };
  } catch (e) {
    const msg = (e as Error).message || "disegno fallito";
    console.error("disegno candidato fallito:", msg);
    await segna({ status: "failed", error: msg.slice(0, 300) });
    return { ok: false, errore: msg };
  }
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

    // ─── IMPORT_LOGO ──────────────────────────────────────────
    // Il logo del kit (brands.logo_url) puo stare su un dominio esterno che
    // blocca il fetch dal browser (CORS): lo scarichiamo qui server-side e lo
    // portiamo in brand-assets come sorgente del genesis. Nessuna chiamata AI,
    // quindi fuori dal rate limit.
    if (action === "import_logo") {
      const { data: b } = await supabase
        .from("brands")
        .select("logo_url")
        .eq("id", brandId)
        .single();
      const logoUrl = (b as { logo_url?: string } | null)?.logo_url || "";
      if (!logoUrl) return jsonResponse(req, { error: "Il brand non ha un logo salvato" }, 404);

      let res: Response;
      try {
        res = await fetch(logoUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
        });
      } catch {
        return jsonResponse(req, { error: "Logo non scaricabile dall'URL salvato" }, 502);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !contentType.startsWith("image/")) {
        return jsonResponse(req, { error: "L'URL del logo non restituisce un'immagine" }, 502);
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
        return jsonResponse(req, { error: "Logo vuoto o troppo grande" }, 502);
      }
      const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
      const path = `${userId}/${brandId}/sources/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType, upsert: true });
      if (upErr) return jsonResponse(req, { error: "Upload logo fallito: " + upErr.message }, 500);

      await supabase.from("brand_sources").delete().eq("brand_id", brandId).eq("kind", "logo");
      await supabase.from("brand_sources").insert({
        brand_id: brandId,
        user_id: userId,
        kind: "logo",
        storage_bucket: BUCKET,
        storage_path: path,
      });

      return jsonResponse(req, { bucket: BUCKET, path });
    }

    // ─── DISEGNA_CANDIDATO ────────────────────────────────────
    // Chiamata dal lavoro in background di generate, una slide per volta:
    // niente AI, quindi fuori dal rate limit.
    if (action === "disegna_candidato") {
      const r = await disegnaCandidato(supabase, userId, brandId, String(body.candidateId || ""));
      return r.ok ? jsonResponse(req, { ok: true, path: r.path }) : jsonResponse(req, { error: r.errore }, 500);
    }

    // ─── RIPROVA_CANDIDATO ────────────────────────────────────
    // Rigenera UNA variante fallita (revisione 03/11: «un modo per
    // rigenerarla», non solo «Rigenera tutto» che rifà 9 immagini).
    // Costa 1 immagine: rate limit suo, fuori dal 6/ora del genesis intero.
    if (action === "riprova_candidato") {
      const rlRetry = await requireWithinRateLimit(supabase, userId, "generate-template-riprova", 12, 3600);
      if (!rlRetry.ok) return jsonResponse(req, { error: rlRetry.error }, rlRetry.status);
      const GEMINI_RETRY_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_RETRY_KEY) return jsonResponse(req, { error: "GEMINI_API_KEY non configurata" }, 500);

      const candidateId = String(body.candidateId || "");
      if (!candidateId) return jsonResponse(req, { error: "candidateId obbligatorio" }, 400);
      const { data: cand } = await supabase
        .from("template_candidates")
        .select("id, user_id, brand_id, genesis_prompt, genome, slide_role, variant_index, genome_version")
        .eq("id", candidateId)
        .maybeSingle();
      const c = cand as {
        id: string; user_id: string; brand_id: string; genesis_prompt: string;
        genome: { format?: string } | null; slide_role: string; variant_index: number; genome_version: number;
      } | null;
      if (!c || c.user_id !== userId || c.brand_id !== brandId || !c.genesis_prompt) {
        return jsonResponse(req, { error: "Variante non trovata" }, 404);
      }
      // Variante a layout: si ridisegna, niente modello delle immagini.
      if (leggiSpec(c.genesis_prompt)) {
        const r = await disegnaCandidato(supabase, userId, brandId, c.id);
        if (!r.ok) return jsonResponse(req, { error: "La variante non è uscita: " + r.errore }, 502);
        return jsonResponse(req, { ok: true, candidateId: c.id, path: r.path });
      }

      await supabase.from("template_candidates")
        .update({ status: "generating", error: null, updated_at: new Date().toISOString() })
        .eq("id", c.id);
      const aspect = c.genome?.format === "4:5" ? "4:5" : "1:1";
      const bytes = await generateOneImage(GEMINI_RETRY_KEY, c.genesis_prompt, aspect);
      if (!bytes) {
        await supabase.from("template_candidates")
          .update({ status: "failed", error: "nessuna immagine dal modello", updated_at: new Date().toISOString() })
          .eq("id", c.id);
        return jsonResponse(req, { error: "La variante non è uscita neanche stavolta: riprova tra poco" }, 502);
      }
      const path = `${userId}/${brandId}/candidates/v${c.genome_version}/${c.slide_role}_${c.variant_index}.png`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (upErr) {
        await supabase.from("template_candidates")
          .update({ status: "failed", error: "upload fallito: " + upErr.message, updated_at: new Date().toISOString() })
          .eq("id", c.id);
        return jsonResponse(req, { error: "Upload fallito: " + upErr.message }, 500);
      }
      await supabase.from("template_candidates")
        .update({ status: "done", storage_bucket: BUCKET, storage_path: path, error: null, updated_at: new Date().toISOString() })
        .eq("id", c.id);
      await logGeneration({
        userId, brandId, type: "template_genesis", status: "success",
        title: `Riprova variante ${c.slide_role} ${c.variant_index}`,
        metadata: { phase: "riprova_candidato", candidateId: c.id, estimated_cost_usd: estimateGenesisCost(1, 2) },
      });
      return jsonResponse(req, { ok: true, candidateId: c.id, path });
    }

    const rl = await requireWithinRateLimit(supabase, userId, "generate-template", 6, 3600);
    if (!rl.ok) return jsonResponse(req, { error: rl.error }, rl.status);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return jsonResponse(req, { error: "GEMINI_API_KEY non configurata" }, 500);

    const { data: brand, error: brandErr } = await supabase
      .from("brands")
      .select("*")
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

      const rows = (sources || []) as Array<{ kind: string; storage_bucket: string; storage_path: string }>;
      const hasPosts = rows.some((s) => s.kind === "post");
      const b = brand as BrandRow;

      const parts: Array<Record<string, unknown>> = [{
        text: buildSemanticsPrompt(hasPosts, {
          nome_business: b.nome_business,
          descrizione: b.descrizione,
          servizi: b.servizi,
          mission: b.mission,
          identita_core: b.identita_core,
          vantaggi_competitivi: b.vantaggi_competitivi,
          temi_chiave: b.temi_chiave,
          tono_voce: b.tono_voce,
        }),
      }];

      let imagesLoaded = 0;
      for (const s of rows) {
        const img = await downloadAsBase64(supabase, s.storage_bucket, s.storage_path);
        if (img) {
          parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
          imagesLoaded++;
        }
      }

      // Senza post caricati si guardano anche le foto dello studio del brand
      // kit: sono materiale reale che aiuta a leggere ambiente e atmosfera.
      if (!hasPosts) {
        const premises = [...(b.location_photos || []), ...(b.gallery_photos || [])].slice(0, 4);
        for (const url of premises) {
          try {
            const res = await fetch(url);
            const contentType = res.headers.get("content-type") || "";
            if (!res.ok || !contentType.startsWith("image/")) continue;
            const bytes = new Uint8Array(await res.arrayBuffer());
            if (bytes.length === 0 || bytes.length > 6 * 1024 * 1024) continue;
            let bin = "";
            for (let i = 0; i < bytes.length; i += 0x8000) {
              bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            }
            parts.push({ inline_data: { mime_type: contentType, data: btoa(bin) } });
            imagesLoaded++;
          } catch {
            // foto non raggiungibile: si prosegue con quello che c'e
          }
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
    // I 3 layout (A colore del brand, B foto editoriale, C carta clinica),
    // ognuno con copertina, contenuto e chiusura: 9 slide disegnate dal
    // server col testo esatto. Lo studio sceglie un layout intero.
    if (action === "generate" || action === "regenerate") {
      const palette = body.palette as GenesisPalette | undefined;
      const feedback = typeof body.feedback === "string" ? body.feedback : undefined;
      if (!palette || !palette.bg_a || !palette.bg_b || !palette.accent) {
        return jsonResponse(req, { error: "palette mancante o incompleta" }, 400);
      }
      const b = brand as BrandRow & Record<string, unknown>;

      // Versione genoma: +1 a ogni giro.
      const { data: maxRow } = await supabase
        .from("template_candidates")
        .select("genome_version")
        .eq("brand_id", brandId)
        .order("genome_version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const genomeVersion = (((maxRow as { genome_version?: number } | null)?.genome_version) || 0) + 1;

      // Chi ha foto vere parte dalla foto editoriale, gli altri dal colore.
      const fotoBrand = await fotoDelBrand(supabase, brandId, b);
      const genome = genomaPerLayout(layoutConsigliato(fotoBrand.length > 0), "");

      // La palette resta nel jsonb accanto al genoma, come prima.
      await supabase.from("brands")
        .update({ genome: { ...genome, palette }, genesis_status: "generating" })
        .eq("id", brandId);

      // Testi di riserva subito nei record: Gemini li sostituisce in background.
      const riserva = testiDaSegnaposto(placeholderCopyFor(resolveProfession(b)));
      const candidates: Array<{ id: string; layout: LayoutId; role: SlideRole; variant: number }> = [];
      for (const layout of LAYOUT_IDS) {
        const variant = LAYOUT_IDS.indexOf(layout) + 1;
        for (const role of ROLES) {
          const spec: SpecLayout = { tipo: "layout", layout, role, testi: riserva, foto: null };
          const { data: row, error: insErr } = await supabase
            .from("template_candidates")
            .insert({
              brand_id: brandId,
              user_id: userId,
              genome_version: genomeVersion,
              slide_role: role,
              variant_index: variant,
              genome: genomaPerLayout(layout, riserva.etichetta),
              genesis_prompt: JSON.stringify(spec),
              status: "pending",
            })
            .select("id")
            .single();
          if (insErr || !row) {
            console.error("insert candidate fallito:", insErr?.message);
            continue;
          }
          candidates.push({ id: (row as { id: string }).id, layout, role, variant });
        }
      }

      const lavoro = async () => {
        let testiDaGemini = false;
        let fotoGenerata = false;
        try {
          // 1. Testi di prova rivolti al pubblico vero del brand.
          let testi = riserva;
          try {
            const r = await callGeminiWithRetry({
              apiKey: GEMINI_API_KEY,
              model: TEXT_MODEL,
              body: {
                contents: [{ role: "user", parts: [{ text: promptTestiProva({
                  nome_business: b.nome_business,
                  professione: resolveProfession(b).label,
                  descrizione: b.descrizione,
                  target_pazienti: b.target_pazienti,
                  servizi: b.servizi,
                  vantaggi_competitivi: b.vantaggi_competitivi,
                  cta_suggerite: b.cta_suggerite as string[] | null,
                  frasi_pazienti: b.frasi_pazienti as string[] | null,
                  convinzione_da_ribaltare: b.convinzione_da_ribaltare as string | null,
                }, feedback) }] }],
                generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
              },
            });
            const letti = leggiTestiProva(r?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "");
            if (letti) {
              testi = { ...letti, etichetta: letti.etichetta || riserva.etichetta };
              testiDaGemini = true;
            }
          } catch (e) {
            console.warn("testi di prova da Gemini saltati:", (e as Error).message);
          }

          // 2. Foto: quelle dello studio; il layout B senza foto ne riceve una generata.
          let fotoCopertina: RifFoto | null = fotoBrand[0] ?? null;
          let fotoChiusura: RifFoto | null = fotoBrand[1] ?? fotoBrand[0] ?? null;
          if (!fotoCopertina) {
            const bytes = await generateOneImage(GEMINI_API_KEY, promptFotoLayout(b), "4:5");
            if (bytes) {
              const path = `${userId}/${brandId}/candidates/v${genomeVersion}/foto_layout.png`;
              const { error: upErr } = await supabase.storage
                .from(BUCKET)
                .upload(path, bytes, { contentType: "image/png", upsert: true });
              if (!upErr) {
                fotoCopertina = fotoChiusura = { bucket: BUCKET, path };
                fotoGenerata = true;
              }
            }
          }

          // 3. Record definitivi.
          for (const c of candidates) {
            const vuole = vuoleFoto(c.layout, c.role);
            const foto = vuole === "no" || (vuole === "se_c_e" && fotoBrand.length === 0)
              ? null
              : c.role === "cta" ? fotoChiusura : fotoCopertina;
            const spec: SpecLayout = { tipo: "layout", layout: c.layout, role: c.role, testi, foto };
            await supabase.from("template_candidates")
              .update({ genesis_prompt: JSON.stringify(spec), genome: genomaPerLayout(c.layout, testi.etichetta) })
              .eq("id", c.id);
          }

          // 4. Una slide per chiamata (limite di CPU), una alla volta.
          await runPool(candidates.map((c) => async () => {
            const r = await chiamaDisegno("generate-template", auth.authHeader, {
              action: "disegna_candidato", brandId, candidateId: c.id,
            });
            if (!r.ok) {
              await supabase.from("template_candidates")
                .update({ status: "failed", error: r.errore || "disegno fallito", updated_at: new Date().toISOString() })
                .eq("id", c.id)
                .neq("status", "done");
            }
          }), DISEGNI_IN_PARALLELO);
        } catch (e) {
          console.error("genesi layout fallita:", e);
        }

        const { count } = await supabase
          .from("template_candidates")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", brandId)
          .eq("genome_version", genomeVersion)
          .eq("status", "done");
        const okCount = count || 0;
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
            layout: true,
            testi_da_gemini: testiDaGemini,
            foto_generata: fotoGenerata,
            ok: okCount,
            failed: candidates.length - okCount,
            estimated_cost_usd: estimateGenesisCost(fotoGenerata ? 1 : 0, 1),
          },
        });
      };

      // waitUntil se disponibile, altrimenti fire-and-forget.
      const runtime = (globalThis as Record<string, unknown>).EdgeRuntime as
        | { waitUntil?: (p: Promise<unknown>) => void }
        | undefined;
      if (runtime?.waitUntil) runtime.waitUntil(lavoro());
      else lavoro();

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
