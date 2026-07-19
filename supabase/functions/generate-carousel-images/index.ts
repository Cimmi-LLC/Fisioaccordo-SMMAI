function findImagePayload(node: any, depth = 0): { data: string; mime: string } | null { if (!node || depth > 10) return null; if (Array.isArray(node)) { for (const c of node) { const r = findImagePayload(c, depth + 1); if (r) return r; } return null; } if (typeof node !== "object") return null; const n = node as any; const mime = String(n.mime_type || n.mimeType || ""); const data = n.data || n.bytesBase64Encoded || n.b64_json; if (typeof data === "string" && data.length > 500 && mime.indexOf("image/") === 0) return { data, mime }; for (const k of Object.keys(n)) { const r = findImagePayload(n[k], depth + 1); if (r) return r; } return null; }
function findAnyBase64(node: any, depth = 0): string | null { if (!node || depth > 10) return null; if (Array.isArray(node)) { for (const c of node) { const r = findAnyBase64(c, depth + 1); if (r) return r; } return null; } if (typeof node !== "object") return null; const n = node as any; for (const k of Object.keys(n)) { const v = n[k]; if (typeof v === "string" && v.length > 5000 && /^[A-Za-z0-9+\/=]+$/.test(v.slice(0, 200))) return v; const r = findAnyBase64(v, depth + 1); if (r) return r; } return null; }
function b64ToBytes(b64: string): Uint8Array | null { try { const clean = b64.indexOf(",") >= 0 ? String(b64.split(",").pop()) : b64; const bin = atob(clean.replace(/\s/g, "")); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; } catch { return null; } }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient, assertBrandOwnership, requireAuth, requireWithinRateLimit } from "../_shared/auth.ts";
import { corsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { safeFetch } from "../_shared/ssrf.ts";
// ===== GENERAZIONE IMMAGINI CON AI (Gemini / Nano Banana) =====
const AI_MODEL_SETS: Record<string, string[]> = { "stock": [], "nano-2": ["gemini-3.1-flash-image", "gemini-3-pro-image", "gemini-2.5-flash-image", "gpt-image-2", "gpt-image-1"], "nano-pro": ["gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image", "gpt-image-2", "gpt-image-1"], "gpt-2": ["gpt-image-2", "gpt-image-1", "gemini-3.1-flash-image", "gemini-2.5-flash-image"] };
const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations";
const AI_IMAGE_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
function buildAiPrompt(slide: any, isCover: boolean): string { const subject = [slide?.titolo, slide?.hook, slide?.sottotitolo, slide?.testo].filter(Boolean).join(". ").slice(0, 320); const kw = Array.isArray(slide?.keywords_stock) ? slide.keywords_stock.join(", ") : ""; const parts = ["Fotografia editoriale professionale per un centro di fisioterapia e riabilitazione in Italia.", subject ? ("Scena da rappresentare: " + subject + ".") : "", kw ? ("Elementi chiave: " + kw + ".") : "", "Stile: fotografia reale scattata con obiettivo 50mm, luce naturale morbida e diffusa, ambiente clinico moderno pulito e accogliente, palette calda e neutra (bianco, beige, legno chiaro, tocchi di verde salvia), profondita di campo cinematografica, altissimo dettaglio, aspetto autentico e non artefatto.", "Persone: adulti europei realistici, corporatura normale, espressione serena e credibile, abbigliamento sportivo neutro o divisa sanitaria semplice. Mani e volti anatomicamente corretti.", isCover ? "Inquadratura di grande impatto con soggetto centrale e ampio spazio negativo in alto e in basso per inserire del testo." : "Inquadratura naturale con spazio negativo laterale per inserire del testo.", "VIETATO nella immagine: qualunque testo, lettera, numero, scritta, logo, filigrana, watermark, interfaccia grafica, collage, bordi o cornici. Niente stile 3D, cartoon, illustrazione o rendering. Niente arti o dita deformate."]; return parts.filter(Boolean).join(" "); }
let AI_ERRORS: string[] = [];
async function generateAiImage(prompt: string, apiKey: string, aspectRatio: string, models: string[], openaiKey: string): Promise<{ bytes: Uint8Array; contentType: string } | null> { const base = "https://generativelanguage.googleapis.com/v1beta/models/"; for (const model of models) { const isGpt = model.indexOf("gpt-image") === 0; const tries: any[] = isGpt ? (openaiKey ? [{ u: OPENAI_IMAGE_ENDPOINT, h: { "Authorization": "Bearer " + openaiKey, "Content-Type": "application/json" }, b: { model, prompt, size: "1024x1536", quality: "high", n: 1 } }] : []) : [{ u: AI_IMAGE_ENDPOINT, h: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, b: { model, input: [{ type: "text", text: prompt }], response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: aspectRatio, image_size: "2K" } } }, { u: base + model + ":generateContent", h: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, b: { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } } }, { u: base + model + "-preview:generateContent", h: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, b: { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } } }]; for (const t of tries) { try { const res = await fetch(t.u, { method: "POST", headers: t.h, body: JSON.stringify(t.b) }); if (!res.ok) { const txt = await res.text(); AI_ERRORS.push(model + " HTTP " + res.status + " :: " + txt.slice(0, 220)); continue; } const json = await res.json(); const found = findImagePayload(json); const raw = found ? found.data : findAnyBase64(json); if (!raw) { AI_ERRORS.push(model + " nessuna immagine :: " + JSON.stringify(json).slice(0, 220)); continue; } const bytes = b64ToBytes(raw); if (!bytes || bytes.length < 2000) { AI_ERRORS.push(model + " payload piccolo"); continue; } AI_ERRORS.push("OK " + model); return { bytes, contentType: found && found.mime ? found.mime : "image/jpeg" }; } catch (e) { AI_ERRORS.push(model + " eccezione :: " + String(e).slice(0, 180)); } } } return null; }
async function saveAiBytes(bytes: Uint8Array, contentType: string, supabaseAdmin: any, storagePath: string, index: number): Promise<string | null> { try { const ext = contentType.indexOf("png") >= 0 ? "png" : "jpg"; const fileName = storagePath + "/ai_slide_" + (index + 1) + "_" + Date.now() + "." + ext; const { error } = await supabaseAdmin.storage.from("carousel-images").upload(fileName, bytes, { contentType, upsert: true }); if (error) { console.error("AI upload error slide " + index + ":", error); return null; } const { data } = supabaseAdmin.storage.from("carousel-images").getPublicUrl(fileName); return data.publicUrl; } catch (e) { console.error("AI save error slide " + index + ":", e); return null; } }

interface ImageResult {
  index: number;
  url: string | null;          // PUBLIC URL to use (Supabase Storage after rehost)
  sourceId: number | null;     // Pixabay numeric ID — used for cross-slide dedup
  alternatives: string[];      // raw Pixabay URLs (for UI preview only)
  alternativeIds: number[];    // Pixabay IDs of alternatives (for dedup)
  queryUsed: string;
  error: string | null;
}

// Generalist fallback — kept short and broad so Freepik always returns
// SOMETHING in the wellness/health space. Avoid restrictive geo terms
// (european/italian) or business terms (professional/clinic) that limit
// matches without improving relevance.
const FALLBACK_QUERY = 'health wellness people';

// Topic vocabulary — used to BOOST relevance (positive score per match).
const TOPIC_KEYWORDS = [
  'medical','medicine','health','healthcare','doctor','physician','nurse','clinic','hospital','patient',
  'physiotherapy','physio','physical therapy','rehabilitation','rehab','therapy','massage','chiropractic',
  'osteopathy','osteopath','wellness','wellbeing','fitness','exercise','workout','training','sport','sports',
  'yoga','stretching','pilates','meditation','breathing','mindfulness','relaxation',
  'body','anatomy','muscle','muscles','spine','back','neck','shoulder','knee','joint','posture','postural',
  'pain','injury','treatment','recovery','prevention','session','consultation','assessment',
  'human','person','people','adult','elderly','senior','woman','man',
  'office','desk','workplace','ergonomic','sitting','standing','walking','running',
  // Italian variants (Freepik returns Italian metadata when locale=it)
  'medico','medicina','salute','dottore','infermiere','clinica','ospedale','paziente',
  'fisioterapia','riabilitazione','massaggio','benessere','allenamento','esercizio',
  'postura','schiena','collo','spalla','ginocchio','muscolo','dolore','trattamento',
  'corpo','anatomia','persona','adulto','anziano','donna','uomo','sport','yoga'
];

// HARD-REJECT vocabulary — only the unmistakably off-topic categories.
// Pruned aggressive Italian terms (`città`, `architettura`, `edificio`,
// `montagna`, `spiaggia`) that appear in legitimate medical descriptions
// (e.g. "studio fisioterapia in città di Milano" was being rejected).
const HARD_REJECT = [
  // Wildlife (specific, no overlap with medical contexts)
  'wolf','wolves','tiger','lion','fox','bear','deer','elephant','giraffe','zebra',
  'wildlife','wild animal',
  'lupo','lupi','tigre','leone','volpe','fauna selvatica',
  // Pure landscape / nature scenery (no people)
  'cityscape','skyline','skyscraper','urban landscape',
  'mountain range','dense forest','desert dune','jungle scenery',
  'galaxy','planet','astronomy','outer space',
  'paesaggio naturale','catena montuosa'
];

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    // ── Require JWT — anonymous calls were used to enumerate other users' brand pools
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);
    const verifiedUserId = auth.userId;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse(req, { error: "Body invalido" }, 400);
    }
    // Note: client-supplied `userId` is IGNORED. We always use verifiedUserId.
    const { slides, carouselId, singleIndex, brandId, debug, excludeIds: clientExcludeIds } = body as Record<string, any>;
    // Client passes excludeIds as array of numbers (used by regenerate flow)
    const excludeSet = new Set<number>(
      Array.isArray(clientExcludeIds)
        ? clientExcludeIds.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n))
        : []
    );

    const PIXABAY_API_KEY = Deno.env.get("PIXABAY_API_KEY");
    if (!PIXABAY_API_KEY) {
      return jsonResponse(req, { error: "PIXABAY_API_KEY non configurato" }, 500);
    }

    // DEBUG MODE: return raw Pixabay response without filtering. Admin-only.
    if (debug && body.testQuery) {
      const adminList = (Deno.env.get("ADMIN_EMAILS") || "").split(",").map(s => s.trim()).filter(Boolean);
      const supabaseAdmin = adminClient();
      const { data: { user: fullUser } } = await supabaseAdmin.auth.admin.getUserById(verifiedUserId);
      if (!fullUser?.email || !adminList.includes(fullUser.email)) {
        return jsonResponse(req, { error: "Modalità debug riservata agli admin" }, 403);
      }
      const params = new URLSearchParams({
        key: PIXABAY_API_KEY,
        q: String(body.testQuery).slice(0, 100),
        image_type: 'photo',
        safesearch: 'true',
        per_page: '5',
        lang: body.testLocale || 'en',
      });
      const r = await fetch(`https://pixabay.com/api/?${params}`);
      const status = r.status;
      const text = await r.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      return jsonResponse(req, {
        debug: true,
        status,
        rawTextSample: text.slice(0, 2000),
        total: parsed?.total ?? null,
        totalHits: parsed?.totalHits ?? null,
        hitsCount: Array.isArray(parsed?.hits) ? parsed.hits.length : null,
        firstHit: parsed?.hits?.[0] || null,
      });
    }

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return jsonResponse(req, { error: "slides array obbligatorio" }, 400);
    }
    if (slides.length > 20) {
      return jsonResponse(req, { error: "Troppi slides (max 20)" }, 400);
    }

    const supabaseAdmin = adminClient();
    const GEMINI_IMG_KEY = Deno.env.get("GEMINI_API_KEY") || ""; const OPENAI_IMG_KEY = Deno.env.get("OPENAI_API_KEY") || ""; const aiAspect = typeof (body as any).aspectRatio === "string" ? (body as any).aspectRatio : "4:5";
let aiModels: string[] = AI_MODEL_SETS["nano-2"]; if (brandId) { try { const { data: bm } = await supabaseAdmin.from("brands").select("image_model").eq("id", brandId).maybeSingle(); const mk = String((bm as any)?.image_model || "nano-2"); if (AI_MODEL_SETS[mk]) aiModels = AI_MODEL_SETS[mk]; console.log("Generatore immagini scelto: " + mk); } catch (e) { console.warn("image_model non letto:", e); } } const aiEnabled = (body as any).useAi !== false && aiModels.length > 0 && (Boolean(GEMINI_IMG_KEY) || Boolean(OPENAI_IMG_KEY));

    // Rate limit: max 40 batches per minute (a batch can be 1-20 slides)
    const rl = await requireWithinRateLimit(supabaseAdmin, verifiedUserId, "generate-carousel-images", 40, 60);
    if (!rl.ok) return jsonResponse(req, { error: rl.error }, rl.status);

    // ── Validate brand ownership BEFORE loading the pool (IDOR protection)
    if (brandId) {
      const own = await assertBrandOwnership(supabaseAdmin, verifiedUserId, String(brandId));
      if (!own.ok) return jsonResponse(req, { error: own.error }, own.status);
    }

    // Sanitize carouselId for path (prevents path traversal)
    const safeCarouselId = (typeof carouselId === "string" || typeof carouselId === "number")
      ? String(carouselId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || `c_${Date.now()}`
      : `c_${Date.now()}`;
    const storagePath = `carousels/${verifiedUserId}/${safeCarouselId}`;

    // ── BRAND POOL: pre-load brand-uploaded photos for this brand
    // If pool exists, we'll prefer those over Freepik for each slide.
    let brandPool: Array<{ url: string; tags: string[]; caption: string | null }> = [];
    if (brandId) {
      try {
        const { data, error } = await supabaseAdmin
          .from("brand_photos")
          .select("url, tags, caption")
          .eq("brand_id", brandId);
        if (!error && Array.isArray(data)) {
          brandPool = data.map((r: any) => ({
            url: r.url,
            tags: Array.isArray(r.tags) ? r.tags : [],
            caption: r.caption || null,
          }));
        }
      } catch (e) {
        console.warn("brand pool load failed:", e);
      }
    }
    const usedBrandUrls = new Set<string>(); // avoid repeating same brand photo across slides

    const contentSlides = slides
      .map((s: any, i: number) => ({ slide: s, originalIndex: i }))
      .filter(({ slide }: any) => slide.tipo === "content" || slide.tipo === "cover");

    const slidesToProcess = typeof singleIndex === "number"
      ? [{ slide: slides[singleIndex], originalIndex: singleIndex }]
      : contentSlides;

    // SEQUENTIAL processing so each slide adds its picked Pixabay ID
    // (+ alternatives) to a cumulative exclude set — guarantees NO duplicate
    // image across slides in the same carousel batch.
    // We use IDs (numeric) NOT URLs because Pixabay rotates URLs per request.
    const runUsedIds = new Set<number>(excludeSet);
    const results: ImageResult[] = [];
console.log("AI decisione: enabled=" + aiEnabled + " | modelli=" + aiModels.join(",") + " | gemini=" + (GEMINI_IMG_KEY ? "presente" : "MANCANTE") + " | openai=" + (OPENAI_IMG_KEY ? "presente" : "assente") + " | brandId=" + String(brandId) + " | slides=" + slidesToProcess.length);
        const aiMap = new Map<number, string>(); if (aiEnabled) { const aiJobs = slidesToProcess.map(async (item: any) => { try { const gen = await generateAiImage(buildAiPrompt(item.slide, item.slide?.tipo === "cover"), GEMINI_IMG_KEY, aiAspect, aiModels, OPENAI_IMG_KEY); if (!gen) { console.log("AI: nessuna immagine per slide " + item.originalIndex); return; } const savedAi = await saveAiBytes(gen.bytes, gen.contentType, supabaseAdmin, storagePath, item.originalIndex); if (savedAi) aiMap.set(item.originalIndex, savedAi); else console.log("AI: salvataggio su storage fallito per slide " + item.originalIndex); } catch (e) { console.log("AI ECCEZIONE slide " + item.originalIndex + ": " + String(e)); } }); await Promise.allSettled(aiJobs); console.log("Immagini AI generate: " + aiMap.size + " su " + slidesToProcess.length); }

    for (const { slide, originalIndex } of slidesToProcess) {
      const keywords: string[] = slide.keywords_stock || [];
      const slideText = [
        slide.titolo, slide.testo, slide.hook, slide.sottotitolo,
        ...keywords,
      ].filter(Boolean).join(" ");
      const slideContext = extractContextWords(slideText);
      const bodyPart = detectBodyPart(slideText);
      const isCover = slide.tipo === "cover";

      // 1) Brand pool first
      if (brandPool.length > 0) {
        const brandPhoto = pickFromBrandPool([...keywords, ...slideContext], brandPool, usedBrandUrls);
        if (brandPhoto) {
          usedBrandUrls.add(brandPhoto);
          results.push({
            index: originalIndex,
            url: brandPhoto,
            sourceId: null, // brand pool photos don't have Pixabay ID
            alternatives: brandPool.filter(p => p.url !== brandPhoto).slice(0, 3).map(p => p.url),
            alternativeIds: [],
            queryUsed: `brand_pool:${keywords.join(' ')}`,
            error: null,
          });
          continue;
        }
      }
      const aiReady = aiMap.get(originalIndex); if (aiReady) { results.push({ index: originalIndex, url: aiReady, sourceId: null, alternatives: [], alternativeIds: [], queryUsed: "ai_gemini", error: null }); continue; }

      // 2) Pixabay search with body-part hard filter + cumulative dedup BY ID
      const hasKeywords = keywords.length > 0;
      const searchQuery = hasKeywords ? keywords.join(' ') : FALLBACK_QUERY;
      let result: ImageResult;
      try {
        result = await searchPixabayStock(
          searchQuery, PIXABAY_API_KEY, supabaseAdmin, storagePath,
          originalIndex, slideContext, bodyPart?.required ?? null,
          runUsedIds,   // ← cumulative IDs from previous slides
          isCover,
          bodyPart?.italianPhrase ?? null,
        );
      } catch (e) {
        console.error(`Slide ${originalIndex} search exception:`, e);
        result = { index: originalIndex, url: null, sourceId: null, alternatives: [], alternativeIds: [], queryUsed: searchQuery, error: "exception" };
      }
      results.push(result);
      // Add picked Pixabay ID + alternative IDs to cumulative exclude set.
      if (result.sourceId) runUsedIds.add(result.sourceId);
      for (const altId of result.alternativeIds || []) runUsedIds.add(altId);
      console.log(`Slide ${originalIndex} done. Cumulative runUsedIds size: ${runUsedIds.size}`);
    }

    for (const r of results) {
      try {
        await supabaseAdmin.from("carousel_image_logs").insert({
          user_id: verifiedUserId,
          carousel_id: safeCarouselId,
          slide_index: r.index,
          prompt_used: r.queryUsed,
          image_url: r.url,
          error: r.error,
          provider: r.queryUsed.startsWith("brand_pool") ? "brand_pool" : "pixabay_stock",
        } as any);
      } catch { /* non-blocking */ }
    }

    const successCount = results.filter(r => r.url).length;
    const fromPool = results.filter(r => r.queryUsed.startsWith("brand_pool")).length;
    console.log(`Image fetch complete: ${successCount}/${slidesToProcess.length} (${fromPool} from brand pool, ${successCount - fromPool} from Pixabay)`);

    return jsonResponse(req, { images: results });
  } catch (e) {
    console.error("generate-carousel-images error:", e);
    return jsonResponse(req, { error: "Errore interno" }, 500);
  }
});

/**
 * Pick a brand photo for the given slide keywords.
 * Prefers photos whose tags/caption overlap with keywords. Falls back to a
 * random pool photo. Skips photos already used in this batch (when possible).
 */
function pickFromBrandPool(
  keywords: string[],
  pool: Array<{ url: string; tags: string[]; caption: string | null }>,
  used: Set<string>,
): string | null {
  if (pool.length === 0) return null;
  const available = pool.filter(p => !used.has(p.url));
  const candidates = available.length > 0 ? available : pool; // re-allow used if pool exhausted

  const lowerKw = keywords.map(k => k.toLowerCase());
  const scored = candidates.map(p => {
    const haystack = [...p.tags, p.caption || ""].join(" ").toLowerCase();
    let score = 0;
    for (const kw of lowerKw) if (kw && haystack.includes(kw)) score++;
    return { url: p.url, score };
  });

  // Pick highest score; if all 0, pick random
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best.score > 0) return best.url;
  return candidates[Math.floor(Math.random() * candidates.length)].url;
}

/**
 * Pixabay returns image URLs in:
 *   - largeImageURL: ~1280px, high quality (preferred)
 *   - webformatURL: ~640px, lower quality
 *   - previewURL:   thumbnail (avoid)
 * largeImageURL is temporary (24h cache) but we re-host via downloadAndSave.
 */
function pickImageUrl(item: any): string | null {
  return item?.largeImageURL || item?.webformatURL || item?.previewURL || null;
}

/** Build a lowercase haystack from text-bearing fields Pixabay returns.
 *  Pixabay puts everything in `tags` as a comma-separated string. */
function itemHaystack(item: any): string {
  const parts: string[] = [];
  if (item?.tags) parts.push(String(item.tags));
  if (item?.user) parts.push(String(item.user));
  if (item?.type) parts.push(String(item.type));
  return parts.join(' ').toLowerCase();
}

/** Hard-reject if metadata clearly indicates off-topic content. */
function isHardReject(item: any): boolean {
  const hay = itemHaystack(item);
  if (!hay) return false; // no metadata → assume safe (don't filter blindly)
  for (const k of HARD_REJECT) if (hay.includes(k)) return true;
  return false;
}

/**
 * MEDICAL WHITELIST — every Pixabay image MUST have at least one of these
 * tags. Without this, queries returned eagles, tattoos, gym models, landscapes.
 * Broad enough to cover physiotherapy/wellness/anatomy, narrow enough to
 * reject obvious off-topic noise.
 */
const MEDICAL_WHITELIST = [
  'physiotherapy', 'physical therapy', 'physiotherapist',
  'osteopathy', 'osteopath', 'chiropractic',
  'rehabilitation', 'rehab',
  'doctor', 'physician', 'medical', 'clinic', 'hospital',
  'nurse', 'healthcare', 'health care',
  'patient', 'treatment', 'therapy',
  'spine', 'back', 'neck', 'shoulder', 'knee', 'muscle',
  'anatomy', 'skeleton', 'x-ray', 'xray',
  'massage', 'manual therapy',
  'exercise', 'stretching', 'posture',
  'pain', 'injury', 'recovery',
  // Italian variants
  'fisioterapia', 'fisioterapista',
  'osteopatia', 'riabilitazione',
  'medico', 'clinica', 'terapia', 'dolore',
];

function isMedicalImage(item: any): boolean {
  const hay = itemHaystack(item);
  if (!hay) return false;
  return MEDICAL_WHITELIST.some(t => hay.includes(t));
}

/**
 * HARD BLACKLIST — always reject. Catches noise that managed to match a
 * medical tag incidentally (tattoo with "back" tag, bird with "wing back",
 * etc.) or pure unrelated categories.
 */
const BLACKLIST = [
  // Animals & wildlife
  'bird','eagle','hawk','falcon','owl','parrot','pigeon','crow','raven',
  'animal','wildlife','pet','dog','cat','horse','reptile','snake','fish',
  // Nature / landscape
  'nature','landscape','mountain','beach','forest','sky','sunset','sunrise',
  // Body art
  'tattoo','piercing',
  // Fitness influencer / extreme
  'bodybuilder','muscular','fitness model','gym selfie','crossfit',
  // Other off-topic
  'food','cooking','recipe','restaurant',
  'travel','tourism','vacation',
  'architecture','building',
  'car','vehicle','transport',
  'technology','computer screen','smartphone screen',
  'business meeting','office generic',
  'wedding','party','birthday',
];

function isBlacklisted(item: any): boolean {
  const hay = itemHaystack(item);
  if (!hay) return false;
  return BLACKLIST.some(t => hay.includes(t));
}

/** Topic boost score: +1 per topic keyword found. 0 if no metadata. */
function topicScore(item: any): number {
  const hay = itemHaystack(item);
  if (!hay) return 0;
  let s = 0;
  for (const k of TOPIC_KEYWORDS) if (hay.includes(k)) s += 1;
  return s;
}

/**
 * Body-part / anatomy targets. Each entry maps an Italian/English concept to
 * the SET of synonyms that MUST appear in the Pixabay tags for the image to
 * be considered topical. If a slide is detected as targeting a specific body
 * part, images that don't contain ANY of these synonyms are HARD-REJECTED.
 *
 * This prevents the classic stock-photo trap: query "back pain physiotherapy"
 * returns photos of elbows/knees/cervical because they all contain
 * "physiotherapy" — and Pixabay does partial keyword matching.
 */
const BODY_PART_TARGETS: { triggers: string[]; required: string[] }[] = [
  // SCHIENA / SPINA / LOMBARE
  { triggers: ["schiena","lombare","lombalgia","colonna vertebrale","dorsale","mal di schiena","back","spine","lumbar","lower back","dorsal"],
    required: ["back","spine","lumbar","spinal","schiena","lombare","colonna"] },
  // CERVICALE / COLLO
  { triggers: ["cervicale","collo","neck","cervical","tech neck","torcicollo"],
    required: ["neck","cervical","collo","cervicale"] },
  // SPALLA
  { triggers: ["spalla","spalle","shoulder","shoulders","cuffia rotatori"],
    required: ["shoulder","spalla","spalle"] },
  // GINOCCHIO
  { triggers: ["ginocchio","ginocchia","knee","knees","menisco","crociato"],
    required: ["knee","knees","ginocchio","menisco"] },
  // ANCA
  { triggers: ["anca","fianco","hip","hips"],
    required: ["hip","hips","anca","fianco"] },
  // CAVIGLIA / PIEDE
  { triggers: ["caviglia","piede","ankle","foot","feet","distorsione"],
    required: ["ankle","foot","feet","piede","caviglia"] },
  // GOMITO / POLSO
  { triggers: ["gomito","epicondilite","elbow","tennis elbow"],
    required: ["elbow","gomito"] },
  { triggers: ["polso","mano","carpale","wrist","hand","carpal tunnel","tunnel carpale"],
    required: ["wrist","hand","polso","mano","carpal"] },
  // POSTURA / ERGONOMIA (più ampio)
  { triggers: ["postura","posturale","ergonomia","posture","ergonomic","ergonomy"],
    required: ["posture","postural","sitting","ergonomic","postura","seduto"] },
  // GRAVIDANZA
  { triggers: ["gravidanza","pregnancy","pregnant","incinta"],
    required: ["pregnancy","pregnant","gravidanza","incinta","maternity"] },
  // SPORT / RUNNING
  { triggers: ["running","corsa","podista","runner","podismo"],
    required: ["running","runner","jogging","corsa","podista"] },
];

/** Italian phrase used for lang=it Pixabay queries.
 *  Italian search returns much better "raggi x" anatomical illustrations
 *  for medical content than the English equivalent. */
const ITALIAN_BODY_PHRASES: Record<string, string> = {
  "mal di schiena": "mal di schiena",
  "schiena": "mal di schiena",
  "lombare": "mal di schiena lombare",
  "lombalgia": "lombalgia",
  "colonna vertebrale": "colonna vertebrale",
  "dorsale": "dorsale schiena",
  "cervicale": "cervicale dolore",
  "collo": "cervicale dolore",
  "torcicollo": "cervicale dolore",
  "spalla": "spalla dolore",
  "spalle": "spalla dolore",
  "ginocchio": "ginocchio dolore",
  "ginocchia": "ginocchio dolore",
  "menisco": "ginocchio menisco",
  "anca": "anca dolore",
  "fianco": "anca dolore",
  "caviglia": "caviglia dolore",
  "piede": "piede dolore",
  "gomito": "gomito dolore",
  "epicondilite": "gomito epicondilite",
  "polso": "polso dolore",
  "carpale": "tunnel carpale",
  "postura": "postura corretta",
  "posturale": "postura corretta",
  "gravidanza": "gravidanza",
  "incinta": "gravidanza",
  "corsa": "corsa",
};

/** Detect which body part the slide is talking about. Returns null if no clear target. */
function detectBodyPart(text: string): { required: string[]; trigger: string; italianPhrase: string | null } | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const target of BODY_PART_TARGETS) {
    for (const trigger of target.triggers) {
      if (lower.includes(trigger)) {
        // Pick the FIRST italian phrase present in text (priority match)
        let italianPhrase: string | null = null;
        for (const [it, phrase] of Object.entries(ITALIAN_BODY_PHRASES)) {
          if (lower.includes(it)) { italianPhrase = phrase; break; }
        }
        if (!italianPhrase) italianPhrase = ITALIAN_BODY_PHRASES[trigger] || null;
        return { required: target.required, trigger, italianPhrase };
      }
    }
  }
  return null;
}

/** Extract meaningful Italian + English noun-like tokens from slide text.
 *  Used to re-rank Pixabay results by relevance to the actual slide content. */
const STOPWORDS_IT_EN = new Set([
  "il","lo","la","i","gli","le","un","uno","una","del","dello","della","dei","degli","delle",
  "di","a","da","in","con","su","per","tra","fra","al","allo","alla","ai","agli","alle",
  "e","o","ma","se","che","è","sei","sono","ho","hai","ha","abbiamo","avete","hanno",
  "non","più","meno","molto","poco","come","cosa","quando","quanto","perché","dove",
  "questo","questa","quello","quella","mio","tuo","suo","nostro","vostro","loro",
  "the","a","an","of","to","in","for","on","with","at","by","from","is","are","was","were",
  "be","been","being","have","has","had","do","does","did","will","would","could","should",
  "and","or","but","not","no","yes","this","that","these","those","you","your","i","my",
  "we","our","they","their","it","its","here","there","when","what","why","how","who",
]);

function extractContextWords(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")  // strip punctuation, keep letters
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS_IT_EN.has(w));
  // Dedupe + cap at 8 most informative words
  return [...new Set(lower)].slice(0, 8);
}

/** Bonus score per match between Pixabay item tags and the slide's
 *  context words. Each match = +2 (heavier than the generic topic score). */
/**
 * Pixabay tags are comma-separated, ordered by relevance (first = most relevant).
 * This returns the first N tags as a lowercase array, used to detect
 * what the image is PRIMARILY about (vs just incidentally tagged).
 */
function topTags(item: any, n = 4): string[] {
  if (typeof item?.tags !== "string") return [];
  return item.tags.toLowerCase().split(",").map((t: string) => t.trim()).slice(0, n);
}

/**
 * Position-aware match: required body part appears in TOP tags = +20 bonus.
 * Forces images that are PRIMARILY about that body part to surface.
 */
function topMatchBonus(item: any, requiredBodyPart: string[] | null): number {
  if (!requiredBodyPart || requiredBodyPart.length === 0) return 0;
  const top = topTags(item, 4);
  for (const req of requiredBodyPart) {
    if (top.some(t => t.includes(req))) return 20;
  }
  return 0;
}

/**
 * Cross-pollution penalty: if a DIFFERENT body part is prominent (top 3 tags)
 * and the target is NOT prominent, penalize heavily. This kills images of
 * spine/back when the slide is about shoulder, even if "shoulder" appears
 * as a secondary tag.
 */
function crossPollutionPenalty(item: any, requiredBodyPart: string[] | null): number {
  if (!requiredBodyPart || requiredBodyPart.length === 0) return 0;
  const top = topTags(item, 3);
  const targetInTop = requiredBodyPart.some(req => top.some(t => t.includes(req)));
  if (targetInTop) return 0; // target IS prominent → no penalty
  // Target is NOT in top tags. Check if another body part is.
  const OTHER_BODY_WORDS = [
    "spine","lumbar","back","schiena","colonna","lombare",
    "neck","cervical","collo","cervicale",
    "shoulder","spalla","spalle",
    "knee","ginocchio","menisco",
    "hip","anca","fianco",
    "ankle","foot","piede","caviglia",
    "elbow","gomito",
    "wrist","hand","polso","mano",
  ];
  // Remove the target's own synonyms from OTHER_BODY_WORDS for this check
  const reqSet = new Set(requiredBodyPart);
  const otherBodyHits = top.filter(t =>
    OTHER_BODY_WORDS.some(w => t.includes(w) && !reqSet.has(w))
  );
  return otherBodyHits.length > 0 ? -25 : 0;
}

function slideMatchScore(item: any, contextWords: string[]): number {
  if (contextWords.length === 0) return 0;
  const hay = itemHaystack(item);
  if (!hay) return 0;
  let s = 0;
  for (const w of contextWords) if (hay.includes(w)) s += 2;
  return s;
}

interface ScoredItem {
  id: number;        // Pixabay numeric id — STABLE across calls (URLs are not!)
  url: string;       // largeImageURL — changes every call but we still need a URL to fetch
  tags: string[];    // lowercase Pixabay tags (used for primary↔alt coherence check)
  score: number;
}

// Module-level flag: set to true on first 429 so subsequent calls skip the API
let pixabayRateLimited = false;
let pixabayRateLimitMessage = '';

/**
 * Tag patterns that mark high-impact medical visuals.
 * Split in two tiers because user explicitly wants X-RAY style (red highlighted
 * pain area, like a clinical illustration) over generic 3D renders.
 */
const XRAY_TAGS = [           // Most-wanted: +10 each
  "x-ray","xray","x ray",
  "highlighted","pain spot","red","glow","glowing",
  "anatomy","anatomical","anatomy model","human body","medical illustration",
  "skeleton","skeletal","muscular system","nervous system",
  "infrared","thermography","thermal",
];
const RENDER_TAGS = [          // Acceptable but less wow: +3 each
  "3d","3d render","3d model","render","rendering","illustration","digital",
];

/**
 * @param coverBoost when true (e.g. slide.tipo === "cover"), multiply the
 *                   anatomy score by 2 — covers are where x-ray visuals
 *                   have the most impact.
 */
function anatomyVisualScore(item: any, coverBoost = false): number {
  const hay = itemHaystack(item);
  if (!hay) return 0;
  let s = 0;
  for (const k of XRAY_TAGS) if (hay.includes(k)) s += 10;
  for (const k of RENDER_TAGS) if (hay.includes(k)) s += 3;
  return coverBoost ? s * 2 : s;
}

/** Merge two scored lists, dedupe by Pixabay ID, boost anatomy-style results. */
function mergeScored(primary: ScoredItem[], anatomy: ScoredItem[]): ScoredItem[] {
  const map = new Map<number, ScoredItem>();
  for (const s of primary) map.set(s.id, s);
  for (const s of anatomy) {
    const existing = map.get(s.id);
    if (existing) {
      existing.score = Math.max(existing.score, s.score) + 4;
    } else {
      map.set(s.id, { id: s.id, url: s.url, tags: s.tags, score: s.score + 4 });
    }
  }
  return Array.from(map.values());
}

async function pixabaySearch(
  apiKey: string,
  query: string,
  page: number,
  perPage: number,
  contextWords: string[] = [],
  requiredBodyPart: string[] | null = null,
  excludeIds: Set<number> = new Set(),
  coverBoost: boolean = false,
  lang: "en" | "it" = "en",
): Promise<ScoredItem[]> {
  if (pixabayRateLimited) {
    console.warn(`Pixabay rate-limited, skipping query "${query}"`);
    return [];
  }
  // Pixabay max per_page is 200, min is 3. Default 20.
  const cappedPerPage = Math.max(3, Math.min(200, perPage));
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    image_type: 'photo',
    safesearch: 'true',
    per_page: String(cappedPerPage),
    page: String(page),
    lang,
    orientation: 'all',
  });

  const response = await fetch(`https://pixabay.com/api/?${params}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    console.warn(`Pixabay HTTP ${response.status} for "${query}"`);
    if (response.status === 429) {
      try {
        const errBody = await response.text();
        pixabayRateLimitMessage = errBody.slice(0, 200);
        console.error(`Pixabay RATE LIMIT hit: ${pixabayRateLimitMessage}`);
      } catch { /* ignore */ }
      pixabayRateLimited = true;
    }
    return [];
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch (e) {
    console.error(`Pixabay JSON parse failed for "${query}":`, e);
    return [];
  }
  const results = data?.hits || [];

  if (results.length > 0) {
    const first = results[0];
    console.log(`Pixabay sample item for "${query}":`,
      JSON.stringify({
        id: first.id,
        tags: first.tags,
        type: first.type,
        size: `${first.imageWidth}x${first.imageHeight}`,
      })
    );
  }

  const scored: ScoredItem[] = [];
  let rejected = 0;
  let rejectedByBodyPart = 0;
  let rejectedByExclude = 0;
  let rejectedByBlacklist = 0;
  let rejectedByWhitelist = 0;
  for (const item of results) {
    const id = Number(item?.id);
    const url = pickImageUrl(item);
    if (!id || !url) continue;

    // 1) HARD BLACKLIST — always reject (eagles, tattoos, food, etc.)
    if (isBlacklisted(item)) { rejectedByBlacklist++; continue; }

    // 2) WHITELIST — must have at least one medical/health tag (even when body
    //    part is detected, e.g. a "back tattoo" image has "back" tag but no
    //    medical context — we want it out)
    if (!isMedicalImage(item)) { rejectedByWhitelist++; continue; }

    // 3) DEDUP by Pixabay ID (URLs rotate per request)
    if (excludeIds.has(id)) { rejectedByExclude++; continue; }

    // 4) Legacy hard-reject (kept as belt-and-suspenders with blacklist)
    if (isHardReject(item)) { rejected++; continue; }

    // 5) BODY-PART filter (only when target is detected)
    if (requiredBodyPart && requiredBodyPart.length > 0) {
      const hay = itemHaystack(item);
      const matches = requiredBodyPart.some(req => hay.includes(req));
      if (!matches) { rejectedByBodyPart++; continue; }
    }

    // 6) SCORING
    const score =
      topicScore(item) +
      slideMatchScore(item, contextWords) +
      anatomyVisualScore(item, coverBoost) +
      topMatchBonus(item, requiredBodyPart) +
      crossPollutionPenalty(item, requiredBodyPart);
    if (score < -10) { rejectedByBodyPart++; continue; }
    const tags = typeof item?.tags === "string"
      ? item.tags.toLowerCase().split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];
    scored.push({ id, url, tags, score });
  }
  console.log(`Pixabay "${query}" (lang=${lang}): ${results.length} raw → ${scored.length} kept | rej: ${rejectedByBlacklist} bl, ${rejectedByWhitelist} wl, ${rejected} hard, ${rejectedByBodyPart} body, ${rejectedByExclude} dup (total: ${data?.totalHits ?? '?'})`);
  return scored;
}

async function searchPixabayStock(
  query: string,
  apiKey: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  storagePath: string,
  index: number,
  contextWords: string[] = [],
  requiredBodyPart: string[] | null = null,
  excludeIds: Set<number> = new Set(),
  isCover: boolean = false,
  italianPhrase: string | null = null,
): Promise<ImageResult> {
  try {
    console.log(`Slide ${index}: searching Pixabay for "${query}" (ctx: ${contextWords.length}, body: ${requiredBodyPart?.[0] ?? '-'}, italian: "${italianPhrase ?? '-'}", exclude: ${excludeIds.size}, cover: ${isCover})`);

    // PARALLEL SEARCH x4: when a body part is detected, fetch the main query
    // PLUS dedicated x-ray/anatomy variants in EN, PLUS an Italian variant
    // ("mal di schiena raggi x") with lang=it — Italian medical illustrations
    // tend to be the high-quality anatomical x-ray style the user prefers.
    const bodyTerm = requiredBodyPart && requiredBodyPart.length > 0 ? requiredBodyPart[0] : null;
    const settledSearches = await Promise.allSettled([
      pixabaySearch(apiKey, query, 1, 50, contextWords, requiredBodyPart, excludeIds, isCover, "en"),
      bodyTerm
        ? pixabaySearch(apiKey, `${bodyTerm} pain x-ray`, 1, 24, contextWords, requiredBodyPart, excludeIds, isCover, "en")
        : Promise.resolve([] as ScoredItem[]),
      bodyTerm
        ? pixabaySearch(apiKey, `${bodyTerm} anatomy human body`, 1, 24, contextWords, requiredBodyPart, excludeIds, isCover, "en")
        : Promise.resolve([] as ScoredItem[]),
      italianPhrase
        ? pixabaySearch(apiKey, `${italianPhrase} raggi x`, 1, 24, contextWords, requiredBodyPart, excludeIds, isCover, "it")
        : Promise.resolve([] as ScoredItem[]),
    ]);
    const primaryResults = settledSearches[0].status === "fulfilled" ? settledSearches[0].value : [];
    const xrayResults    = settledSearches[1].status === "fulfilled" ? settledSearches[1].value : [];
    const anatomyResults = settledSearches[2].status === "fulfilled" ? settledSearches[2].value : [];
    const italianResults = settledSearches[3].status === "fulfilled" ? settledSearches[3].value : [];
    settledSearches.forEach((r, i) => {
      if (r.status === "rejected") console.error(`Slide ${index}: search[${i}] rejected:`, r.reason);
    });
    // Merge all four lists. Italian results get the boost twice (appears in
    // both italian and merged), naturally surfacing on top.
    let scored = mergeScored(
      mergeScored(primaryResults, italianResults),
      mergeScored(xrayResults, anatomyResults),
    );
    let queryUsed = query;

    // 2) If empty, dedupe / strip restrictive words and retry
    if (scored.length === 0) {
      const stripped = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w, i, a) => w && a.indexOf(w) === i)
        .filter(w => !['european','professional','clinic'].includes(w))
        .join(' ');
      if (stripped && stripped !== query.toLowerCase()) {
        console.log(`Slide ${index}: empty for "${query}", retry simplified "${stripped}"`);
        scored = await pixabaySearch(apiKey, stripped, 1, 50, contextWords, requiredBodyPart, excludeIds, isCover);
        queryUsed = `${query} → ${stripped}`;
      }
    }

    // 3) If still empty AND body part is required, try a query made of
    //    just the body part synonyms (broader but topical)
    if (scored.length === 0 && requiredBodyPart && requiredBodyPart.length > 0) {
      const bodyQuery = requiredBodyPart.slice(0, 2).join(' ');
      console.log(`Slide ${index}: body-part-only query "${bodyQuery}"`);
      scored = await pixabaySearch(apiKey, bodyQuery, 1, 50, contextWords, requiredBodyPart, excludeIds, isCover);
      queryUsed = `${query} → ${bodyQuery}`;
    }

    // 4) Try page 2 of original query (more diverse results, helps regenerate flow)
    if (scored.length === 0) {
      console.log(`Slide ${index}: trying page 2 of "${query}"`);
      scored = await pixabaySearch(apiKey, query, 2, 50, contextWords, requiredBodyPart, excludeIds, isCover);
      queryUsed = `${query} → page 2`;
    }

    // 5) Last resort: only first 2 words of original
    if (scored.length === 0) {
      const firstTwo = query.split(/\s+/).filter(Boolean).slice(0, 2).join(' ');
      if (firstTwo && firstTwo !== query) {
        console.log(`Slide ${index}: still empty, retry first 2 words "${firstTwo}"`);
        scored = await pixabaySearch(apiKey, firstTwo, 1, 50, contextWords, requiredBodyPart, excludeIds, isCover);
        queryUsed = `${query} → ${firstTwo}`;
      }
    }

    // 6) Generic wellness fallback (no body-part filter, otherwise we get nothing)
    if (scored.length === 0) {
      console.log(`Slide ${index}: pure fallback (dropping body-part filter)`);
      scored = await pixabaySearch(apiKey, FALLBACK_QUERY, 1, 24, contextWords, null, excludeIds, isCover);
      queryUsed = `${query} → ${FALLBACK_QUERY} (no body filter)`;
    }

    // 7) LAST RESORT: pure "physiotherapy clinic patient" search, completely
    //    unfiltered. Guarantees we always return SOMETHING coherent rather
    //    than null. This is the safety net for very specific slides where
    //    every other query path returned 0.
    if (scored.length === 0) {
      console.log(`Slide ${index}: ULTIMATE fallback (physiotherapy clinic patient)`);
      scored = await pixabaySearch(apiKey, "physiotherapy clinic patient", 1, 24, contextWords, null, excludeIds, isCover);
      queryUsed = `${query} → physiotherapy clinic patient (last resort)`;
    }

    if (scored.length === 0) {
      return {
        index,
        url: null,
        sourceId: null,
        alternatives: [],
        alternativeIds: [],
        queryUsed,
        error: pixabayRateLimited ? "pixabay_rate_limit" : "no_results_after_all_fallbacks",
      };
    }

    // Sort by topic score desc → topical hits float to top, neutrals follow
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    // Pick primary, then build COHERENT alternatives.
    // An alt is "coherent" if it shares at least 1 meaningful tag with primary
    // (e.g. both about "back/spine"). Without this check, the popup may show
    // alts that pass filters but are tematically unrelated (e.g. primary is
    // a spine x-ray, alt is a yoga photo).
    const primary = sorted[0];
    const primaryTagSet = new Set(primary.tags.filter(t => t.length >= 4));
    const coherentAlts: ScoredItem[] = [];
    const looseAlts: ScoredItem[] = [];
    for (const cand of sorted.slice(1, 30)) {
      const overlap = cand.tags.filter(t => primaryTagSet.has(t)).length;
      if (overlap >= 1) coherentAlts.push(cand);
      else looseAlts.push(cand);
    }
    // Prefer coherent alts; fill the rest with loose alts if needed
    const altItems = [...coherentAlts, ...looseAlts].slice(0, 8);
    console.log(`Slide ${index}: picked top (id=${primary.id}, score=${primary.score}) from ${scored.length} candidates | alts: ${coherentAlts.length} coherent + ${looseAlts.length} loose → exposing ${altItems.length}`);
    const savedUrl = await downloadAndSave(primary.url, supabaseAdmin, storagePath, index);

    return {
      index,
      url: savedUrl || primary.url,
      sourceId: primary.id,                    // ← Pixabay ID for cross-slide dedup
      alternatives: altItems.map(s => s.url),  // for UI swap
      alternativeIds: altItems.map(s => s.id), // for dedup
      queryUsed,
      error: null,
    };
  } catch (err) {
    console.error(`Exception searching stock for slide ${index}:`, err);
    return { index, url: null, sourceId: null, alternatives: [], alternativeIds: [], queryUsed: query, error: "exception" };
  }
}

async function downloadAndSave(
  imageUrl: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  storagePath: string,
  index: number
): Promise<string | null> {
  try {
    // SSRF guard: only Pixabay / Supabase / trusted CDNs allowed
    const fetched = await safeFetch(imageUrl, { maxBytes: 10 * 1024 * 1024, timeoutMs: 15_000 });
    if (!fetched.ok) {
      console.warn(`Slide ${index}: rejected URL (${fetched.error})`);
      return null;
    }
    const imageBytes = fetched.bytes;
    const contentType = fetched.contentType;
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `${storagePath}/slide_${index + 1}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("carousel-images")
      .upload(fileName, imageBytes, { contentType, upsert: true });

    if (error) {
      console.error(`Upload error slide ${index}:`, error);
      return null;
    }

    const { data: urlData } = supabaseAdmin.storage.from("carousel-images").getPublicUrl(fileName);
    console.log(`Slide ${index}: saved to ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (err) {
    console.error(`Download/save error slide ${index}:`, err);
    return null;
  }
}
