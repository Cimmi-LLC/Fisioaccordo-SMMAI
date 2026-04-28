import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL richiesto" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_API_TOKEN) throw new Error("APIFY_API_TOKEN not configured");

    // Dispatch per dominio
    const lower = url.toLowerCase();
    let reviews: any[] = [];
    let totalSeen = 0;
    let filteredOut = 0;

    if (lower.includes("miodottore.it")) {
      const r = await scrapeMiodottore(url, APIFY_API_TOKEN);
      totalSeen = r.totalSeen;
      filteredOut = r.filteredOut;
      reviews = r.reviews;
    } else if (lower.includes("google.com/maps") || lower.includes("maps.google") || lower.includes("g.page")) {
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
// MioDottore (Puppeteer via apify/web-scraper, scrolla per caricare tutto)
// ─────────────────────────────────────────────────────────────────────
const MIODOTTORE_PAGE_FUNCTION = `
async function pageFunction(context) {
  const { page, log } = context;

  // Aspetta che le prime recensioni siano caricate
  try { await page.waitForSelector('[itemprop="reviewBody"]', { timeout: 20000 }); }
  catch { return { reviews: [] }; }

  // Scroll progressivo per caricare tutte le recensioni (infinite scroll)
  const seenStable = { value: 0, prev: 0 };
  for (let i = 0; i < 40; i++) {
    const count = await page.$$eval('[itemprop="reviewBody"]', els => els.length);
    if (count === seenStable.prev) {
      seenStable.value++;
      if (seenStable.value >= 4) break; // 4 cicli senza nuove → stop
    } else {
      seenStable.value = 0;
      seenStable.prev = count;
    }
    // Try clicking "Mostra altre" / "Mostra altre recensioni" if present
    try {
      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const target = btns.find(b => /mostra\\s+altr[ie]|carica\\s+altr[ie]|altre\\s+recensioni|opinions/i.test(b.innerText || ''));
        if (target) { target.click(); return true; }
        return false;
      });
      if (clicked) await page.waitForTimeout(2000);
    } catch {}
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
  }

  // Estrai tutte le recensioni
  const reviews = await page.evaluate(() => {
    const results = [];
    const blocks = Array.from(document.querySelectorAll('[itemprop="reviewBody"]'));
    blocks.forEach(p => {
      const text = (p.innerText || p.textContent || '').trim();
      if (!text) return;

      // Cerca il rating risalendo nei nodi parent
      let parent = p;
      let ratingValue = 5;
      let dateStr = '';
      for (let depth = 0; depth < 8 && parent; depth++) {
        parent = parent.parentElement;
        if (!parent) break;
        const ratingEl = parent.querySelector('[itemprop="ratingValue"]');
        if (ratingEl && ratingValue === 5) {
          const v = ratingEl.getAttribute('content') || ratingEl.getAttribute('data-score') || ratingEl.textContent;
          const n = parseFloat(v || '5');
          if (!isNaN(n)) ratingValue = n;
        }
        const timeEl = parent.querySelector('[itemprop="datePublished"]');
        if (timeEl && !dateStr) {
          dateStr = timeEl.getAttribute('datetime') || timeEl.textContent || '';
        }
        if (ratingValue !== 5 && dateStr) break;
      }

      results.push({ text, stars: ratingValue, date: dateStr });
    });
    return results;
  });

  return { reviews };
}
`.trim();

async function scrapeMiodottore(url: string, apifyToken: string) {
  const startResponse = await fetch(
    `https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${apifyToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url }],
        pageFunction: MIODOTTORE_PAGE_FUNCTION,
        proxyConfiguration: { useApifyProxy: true },
        maxRequestsPerCrawl: 1,
        maxPagesPerCrawl: 1,
        runMode: "PRODUCTION",
        waitUntil: ["networkidle2"],
      }),
    }
  );
  if (!startResponse.ok) {
    const errText = await startResponse.text();
    console.error("Apify MioDottore start error:", startResponse.status, errText);
    throw new Error(`Apify MioDottore start error: ${startResponse.status}`);
  }
  const runData = await startResponse.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error("No run ID returned from Apify");

  const items = await pollForResults(runId, apifyToken);

  const reviews: any[] = [];
  let totalSeen = 0;
  let filteredOut = 0;

  for (const item of items) {
    const list = Array.isArray(item.reviews) ? item.reviews : [];
    for (const r of list) {
      totalSeen++;
      const stars = Number(r.stars ?? r.rating ?? 5);
      const text = (r.text || "").trim();
      if (stars < MIN_STARS || !text) {
        filteredOut++;
        continue;
      }
      reviews.push({
        name: "Recensione presente su MioDottore",
        text,
        stars,
        date: r.date || "",
        source: "miodottore",
      });
    }
  }
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
