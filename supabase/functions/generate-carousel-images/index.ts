import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ImageResult {
  index: number;
  url: string | null;
  alternatives: string[];
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { slides, userId, carouselId, singleIndex, brandId, debug } = body;

    const FREEPIK_API_KEY = Deno.env.get("FREEPIK_API_KEY");
    if (!FREEPIK_API_KEY) throw new Error("FREEPIK_API_KEY not configured");

    // DEBUG MODE: return raw Freepik response without filtering
    if (debug && body.testQuery) {
      const params = new URLSearchParams({
        term: body.testQuery,
        'filters[content_type][photo]': '1',
        locale: body.testLocale || 'en',
        page: '1',
        limit: '5',
      });
      const r = await fetch(`https://api.freepik.com/v1/resources?${params}`, {
        headers: { 'x-freepik-api-key': FREEPIK_API_KEY, 'Accept-Language': body.testLocale || 'en' },
      });
      const status = r.status;
      const text = await r.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      return new Response(JSON.stringify({
        debug: true,
        status,
        rawTextSample: text.slice(0, 2000),
        dataCount: Array.isArray(parsed?.data) ? parsed.data.length : null,
        firstItem: parsed?.data?.[0] || null,
        meta: parsed?.meta || null,
        message: parsed?.message || null,
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return new Response(JSON.stringify({ error: "slides array is required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const storagePath = userId ? `carousels/${userId}/${carouselId || Date.now()}` : `carousels/anonymous/${Date.now()}`;

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

    const promises = slidesToProcess.map(({ slide, originalIndex }) => {
      const keywords: string[] = slide.keywords_stock || [];

      // 1) Try brand pool first
      if (brandPool.length > 0) {
        const brandPhoto = pickFromBrandPool(keywords, brandPool, usedBrandUrls);
        if (brandPhoto) {
          usedBrandUrls.add(brandPhoto);
          return Promise.resolve<ImageResult>({
            index: originalIndex,
            url: brandPhoto,
            alternatives: brandPool.filter(p => p.url !== brandPhoto).slice(0, 3).map(p => p.url),
            queryUsed: `brand_pool:${keywords.join(' ')}`,
            error: null,
          });
        }
      }

      // 2) Fallback Freepik. Keep LLM's keywords clean; only add context if the
      // query is empty/generic (helps fallback search find decent results).
      const hasKeywords = keywords.length > 0;
      const searchQuery = hasKeywords
        ? keywords.join(' ')
        : `${FALLBACK_QUERY} ${FALLBACK_CONTEXT}`.trim();
      return searchFreepikStock(searchQuery, FREEPIK_API_KEY, supabaseAdmin, storagePath, originalIndex);
    });

    const settled = await Promise.allSettled(promises);

    const results: ImageResult[] = settled.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        index: slidesToProcess[i].originalIndex,
        url: null,
        alternatives: [],
        queryUsed: '',
        error: 'promise_rejected',
      };
    });

    for (const r of results) {
      try {
        await supabaseAdmin.from("carousel_image_logs").insert({
          user_id: userId || null,
          carousel_id: carouselId || null,
          slide_index: r.index,
          prompt_used: r.queryUsed,
          image_url: r.url,
          error: r.error,
          provider: r.queryUsed.startsWith("brand_pool") ? "brand_pool" : "freepik_stock",
        } as any);
      } catch { /* non-blocking */ }
    }

    const successCount = results.filter(r => r.url).length;
    const fromPool = results.filter(r => r.queryUsed.startsWith("brand_pool")).length;
    console.log(`Image fetch complete: ${successCount}/${slidesToProcess.length} (${fromPool} from brand pool, ${successCount - fromPool} from Freepik)`);

    return new Response(JSON.stringify({ images: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-carousel-images error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

function pickImageUrl(item: any): string | null {
  return item?.image?.source?.url
    || item?.previews?.source?.url
    || item?.image?.source_url
    || item?.url
    || null;
}

/** Build a lowercase haystack from any text-bearing fields Freepik returns. */
function itemHaystack(item: any): string {
  const parts: string[] = [];
  if (item?.title) parts.push(String(item.title));
  if (item?.description) parts.push(String(item.description));
  if (Array.isArray(item?.keywords)) parts.push(...item.keywords.map(String));
  if (Array.isArray(item?.tags)) parts.push(...item.tags.map((t: any) => typeof t === 'string' ? t : t?.name || ''));
  if (Array.isArray(item?.categories)) parts.push(...item.categories.map((c: any) => c?.name || ''));
  if (Array.isArray(item?.related_keywords)) parts.push(...item.related_keywords.map(String));
  return parts.join(' ').toLowerCase();
}

/** Hard-reject if metadata clearly indicates off-topic content. */
function isHardReject(item: any): boolean {
  const hay = itemHaystack(item);
  if (!hay) return false; // no metadata → assume safe (don't filter blindly)
  for (const k of HARD_REJECT) if (hay.includes(k)) return true;
  return false;
}

/** Topic boost score: +1 per topic keyword found. 0 if no metadata. */
function topicScore(item: any): number {
  const hay = itemHaystack(item);
  if (!hay) return 0;
  let s = 0;
  for (const k of TOPIC_KEYWORDS) if (hay.includes(k)) s += 1;
  return s;
}

interface ScoredItem { url: string; score: number; }

// Module-level flag: set to true on first 429 so subsequent calls skip the API
// (avoids burning more requests when we're already rate-limited).
let freepikRateLimited = false;
let freepikRateLimitMessage = '';

async function freepikSearch(apiKey: string, query: string, page: number, limit: number): Promise<ScoredItem[]> {
  if (freepikRateLimited) {
    console.warn(`Freepik rate-limited, skipping query "${query}"`);
    return [];
  }
  // locale=en + Accept-Language=en — our queries are in ENGLISH (the LLM's
  // photoQuery is generated in English), so we need Freepik to search English
  // descriptions. Using locale=it before with English queries returned 0 hits
  // because Freepik searched Italian descriptions for English words.
  const params = new URLSearchParams({
    term: query,
    'filters[content_type][photo]': '1',
    locale: 'en',
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(`https://api.freepik.com/v1/resources?${params}`, {
    headers: { 'x-freepik-api-key': apiKey, 'Accept-Language': 'en-US' },
  });

  if (!response.ok) {
    console.warn(`Freepik HTTP ${response.status} for "${query}"`);
    if (response.status === 429) {
      try {
        const errBody = await response.text();
        freepikRateLimitMessage = errBody.slice(0, 200);
        console.error(`Freepik RATE LIMIT hit: ${freepikRateLimitMessage}`);
      } catch { /* ignore */ }
      freepikRateLimited = true;
    }
    return [];
  }

  const data = await response.json();
  const results = data?.data || [];

  // Log first item structure once per call (helps debug metadata fields)
  if (results.length > 0) {
    const first = results[0];
    console.log(`Freepik sample item for "${query}":`,
      JSON.stringify({
        title: first.title,
        keywords: first.keywords?.slice?.(0, 5),
        tags: Array.isArray(first.tags) ? first.tags.slice(0, 5) : first.tags,
        categories: first.categories,
      })
    );
  }

  const scored: ScoredItem[] = [];
  let rejected = 0;
  for (const item of results) {
    const url = pickImageUrl(item);
    if (!url) continue;
    if (isHardReject(item)) { rejected++; continue; }
    scored.push({ url, score: topicScore(item) });
  }
  console.log(`Freepik "${query}": ${results.length} raw → ${scored.length} kept, ${rejected} rejected`);
  return scored;
}

async function searchFreepikStock(
  query: string,
  apiKey: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  storagePath: string,
  index: number
): Promise<ImageResult> {
  try {
    console.log(`Slide ${index}: searching stock for "${query}"`);

    // 1) Try the original (anchored) query
    let scored = await freepikSearch(apiKey, query, 1, 24);
    let queryUsed = query;

    // 2) If empty, dedupe / strip restrictive words and retry
    if (scored.length === 0) {
      const stripped = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w, i, a) => w && a.indexOf(w) === i) // dedupe
        .filter(w => !['european','professional','clinic'].includes(w)) // drop restrictive
        .join(' ');
      if (stripped && stripped !== query.toLowerCase()) {
        console.log(`Slide ${index}: empty for "${query}", retry simplified "${stripped}"`);
        scored = await freepikSearch(apiKey, stripped, 1, 24);
        queryUsed = `${query} → ${stripped}`;
      }
    }

    // 3) Last resort: take only the FIRST 2 words of the original (most relevant)
    if (scored.length === 0) {
      const firstTwo = query.split(/\s+/).filter(Boolean).slice(0, 2).join(' ');
      if (firstTwo && firstTwo !== query) {
        console.log(`Slide ${index}: still empty, retry first 2 words "${firstTwo}"`);
        scored = await freepikSearch(apiKey, firstTwo, 1, 24);
        queryUsed = `${query} → ${firstTwo}`;
      }
    }

    // 4) Generic wellness fallback
    if (scored.length === 0) {
      console.log(`Slide ${index}: pure fallback`);
      scored = await freepikSearch(apiKey, FALLBACK_QUERY, 1, 24);
      queryUsed = `${query} → ${FALLBACK_QUERY}`;
    }

    if (scored.length === 0) {
      return {
        index,
        url: null,
        alternatives: [],
        queryUsed,
        error: freepikRateLimited ? "freepik_rate_limit" : "no_results_after_all_fallbacks",
      };
    }

    // Sort by topic score desc → topical hits float to top, neutrals follow
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    const top4 = sorted.slice(0, 4);
    const primary = top4[0].url;
    const alternatives = top4.slice(1).map(s => s.url);

    console.log(`Slide ${index}: picked top result (score ${top4[0].score}) from ${scored.length} candidates`);
    const savedUrl = await downloadAndSave(primary, supabaseAdmin, storagePath, index);

    return {
      index,
      url: savedUrl || primary,
      alternatives,
      queryUsed,
      error: null,
    };
  } catch (err) {
    console.error(`Exception searching stock for slide ${index}:`, err);
    return { index, url: null, alternatives: [], queryUsed: query, error: "exception" };
  }
}

async function downloadAndSave(
  imageUrl: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  storagePath: string,
  index: number
): Promise<string | null> {
  try {
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) return null;

    const arrayBuffer = await imgResponse.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
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
