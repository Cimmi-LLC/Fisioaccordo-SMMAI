import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, requireWithinRateLimit } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIFY_RUN_TIMEOUT_SEC = 240;          // hard ceiling (Apify run TTL)
const APIFY_POLL_MAX_ATTEMPTS = 36;          // 36 * 5s = 3 min
const APIFY_POLL_DELAY_MS = 5000;
const MIN_STARS = 4;                          // filter negative reviews

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: scraping is expensive (Apify/external fetch), 5/min per user
    const auth = await requireAuth(req);
    if (auth.ok) {
      const supabaseAdmin = adminClient();
      const rl = await requireWithinRateLimit(supabaseAdmin, auth.userId, "scrape-reviews", 5, 60);
      if (!rl.ok) {
        return new Response(JSON.stringify({ error: rl.error }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter ?? 60) },
        });
      }
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL richiesto" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dispatch per dominio
    const lower = url.toLowerCase();
    let reviews: any[] = [];
    let totalSeen = 0;
    let filteredOut = 0;

    if (lower.includes("miodottore.it")) {
      // MioDottore: fetch HTML diretto + regex, NO Apify
      const r = await scrapeMiodottore("", url);
      totalSeen = r.totalSeen;
      filteredOut = r.filteredOut;
      reviews = r.reviews;
    } else if (lower.includes("google.com/maps") || lower.includes("maps.google") || lower.includes("g.page")) {
      // Google Maps: serve Apify (no API pubblica gratuita)
      const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
      if (!APIFY_API_TOKEN) throw new Error("APIFY_API_TOKEN not configured");
      const r = await scrapeGoogleMaps(url, APIFY_API_TOKEN);
      totalSeen = r.totalSeen;
      filteredOut = r.filteredOut;
      reviews = r.reviews;
    } else {
      return new Response(JSON.stringify({
        error: "Dominio non supportato. Sono supportati: Google Maps e MioDottore."
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`scrape-reviews: ${reviews.length} positive kept, ${filteredOut} filtered out (of ${totalSeen} total)`);

    return new Response(JSON.stringify({ reviews, total: totalSeen, filtered: filteredOut }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-reviews error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────
// Google Maps (existing flow, unchanged)
// ─────────────────────────────────────────────────────────────────────
async function scrapeGoogleMaps(url: string, apifyToken: string) {
  const startResponse = await fetch(
    `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${apifyToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxReviews: 250,
        language: "it",
        reviewsSort: "newest",
      }),
    }
  );
  if (!startResponse.ok) throw new Error(`Apify Google Maps start error: ${startResponse.status}`);
  const runData = await startResponse.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error("No run ID returned from Apify");

  const items = await pollForResults(runId, apifyToken);
  const reviews: any[] = [];
  let totalSeen = 0;
  let filteredOut = 0;
  for (const place of items) {
    if (!place.reviews) continue;
    for (const r of place.reviews) {
      totalSeen++;
      const stars = Number(r.stars ?? r.rating ?? 5);
      if (stars < MIN_STARS || !(r.text || r.reviewText)) {
        filteredOut++;
        continue;
      }
      reviews.push({
        name: r.name || r.reviewerName || "Anonimo",
        text: r.text || r.reviewText || "",
        stars,
        date: r.publishedAtDate || r.date || "",
        source: "google",
      });
    }
  }
  return { reviews, totalSeen, filteredOut };
}

// ─────────────────────────────────────────────────────────────────────
// MioDottore — fetch HTML diretto + parse regex sui blocchi schema.org
//
// Le recensioni sono server-side rendered nell'HTML iniziale (le prime ~10).
// Apify/Puppeteer è eccessivo (richiede approvazione + 3 minuti + spesso
// viene bloccato come headless). Un semplice fetch con User-Agent reale
// estrae 10 recensioni complete in 1-2 secondi.
//
// Trade-off accettato: 184 totali → 10 estraibili senza JS. Per il use case
// "stories da recensioni" 10 buone bastano abbondantemente.
// ─────────────────────────────────────────────────────────────────────
const REALISTIC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract a single review block field by itemprop name. */
function extractField(block: string, itemprop: string): string {
  // Prefer content="..." attribute when present (schema.org canonical form)
  const reContent = new RegExp(
    `itemprop=["']${itemprop}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const mc = block.match(reContent);
  if (mc) return mc[1].trim();

  // Fallback: text content between opening and closing tag
  const reText = new RegExp(
    `itemprop=["']${itemprop}["'][^>]*>([\\s\\S]*?)<\\/`,
    "i"
  );
  const mt = block.match(reText);
  if (mt) return decodeHtmlEntities(stripTags(mt[1]));
  return "";
}

/**
 * Extract the author name from a review block. MioDottore embeds both an
 * <span itemprop="name"> (the author) AND a <meta itemprop="name"
 * content="..."> later in the block for the reviewed service. A naive
 * "first content= match" picks the service. We isolate the author sub-block
 * first.
 */
function extractAuthorName(block: string): string {
  // Match `itemprop="author" ... itemprop="name">...</`
  const reAuthor = /itemprop=["']author["'][\s\S]*?itemprop=["']name["'][^>]*>([\s\S]*?)<\//i;
  const m = block.match(reAuthor);
  if (m) return decodeHtmlEntities(stripTags(m[1]));
  return "";
}

async function scrapeMiodottore(_apifyToken: string, url: string) {
  console.log(`scrapeMiodottore: fetching ${url}`);
  const resp = await fetch(url, {
    headers: {
      "User-Agent": REALISTIC_UA,
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.5",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!resp.ok) {
    throw new Error(`MioDottore HTTP ${resp.status}`);
  }
  const html = await resp.text();

  // Split by review blocks. Each block opens with `itemprop="review"` and we
  // capture up to the next opening of the same tag (or end of container).
  const blockRegex = /itemprop=["']review["'][\s\S]*?(?=itemprop=["']review["']|<\/ul>|<\/section>|<\/body>)/gi;
  const blocks = html.match(blockRegex) || [];
  console.log(`scrapeMiodottore: found ${blocks.length} review blocks`);

  const reviews: any[] = [];
  let totalSeen = 0;
  let filteredOut = 0;

  for (const block of blocks) {
    totalSeen++;
    const text = extractField(block, "reviewBody");
    const name = extractAuthorName(block);
    const date = extractField(block, "datePublished");
    const ratingRaw = extractField(block, "ratingValue");
    const stars = Number(ratingRaw) || 5;

    if (!text || text.length < 10) {
      filteredOut++;
      continue;
    }
    if (stars < MIN_STARS) {
      filteredOut++;
      continue;
    }

    reviews.push({
      name: name || "Paziente",
      text,
      stars,
      date,
      source: "miodottore",
    });
  }

  console.log(`scrapeMiodottore: ${reviews.length} kept, ${filteredOut} filtered from ${totalSeen}`);
  return { reviews, totalSeen, filteredOut };
}

// ─────────────────────────────────────────────────────────────────────
// Shared: poll Apify run + fetch dataset items
// ─────────────────────────────────────────────────────────────────────
async function pollForResults(runId: string, apifyToken: string): Promise<any[]> {
  for (let i = 0; i < APIFY_POLL_MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, APIFY_POLL_DELAY_MS));
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
    );
    const statusData = await statusResponse.json();
    const status = statusData.data?.status;

    if (status === "SUCCEEDED") {
      const datasetId = statusData.data?.defaultDatasetId;
      const itemsResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
      );
      return await itemsResponse.json();
    }
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status}`);
    }
  }
  throw new Error("Timeout: Apify run non completato in tempo");
}
