import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function stripHtml(html: string): string {
  // Remove scripts, styles, nav, footer
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  html = html.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  html = html.replace(/<header[\s\S]*?<\/header>/gi, "");
  // Remove all tags, keep text
  html = html.replace(/<[^>]+>/g, " ");
  // Clean whitespace
  html = html.replace(/\s+/g, " ").trim();
  return html;
}

function extractMeta(html: string, name: string): string {
  const match = html.match(new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*?)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*(?:name|property)=["']${name}["']`, "i"));
  return match?.[1] || "";
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() || "";
}

/**
 * Try to find a logo URL in the HTML. Priority:
 *  1. <img> with class/id/alt containing "logo" (most reliable)
 *  2. JSON-LD Organization.logo
 *  3. Apple touch icon (usually high-res)
 *  4. Standard favicon
 * Returns absolute URL, or empty string.
 */
function extractLogo(html: string, baseUrl: string): string {
  const candidates: string[] = [];

  // 1. <img> tags with "logo" in class, id, or alt
  const imgMatches = html.matchAll(/<img\s+[^>]*?(?:class|id|alt)\s*=\s*["'][^"']*logo[^"']*["'][^>]*?>/gi);
  for (const m of imgMatches) {
    const srcMatch = m[0].match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcMatch?.[1]) candidates.push(srcMatch[1]);
  }

  // 2. JSON-LD organization logo
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const obj = JSON.parse(m[1].trim());
      const logo = obj?.logo?.url || (typeof obj?.logo === 'string' ? obj.logo : null);
      if (logo) candidates.push(logo);
    } catch { /* skip */ }
  }

  // 3. Apple touch icon (often higher-res than favicon)
  const appleMatch = html.match(/<link[^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*href=["']([^"']+)["']/i);
  if (appleMatch?.[1]) candidates.push(appleMatch[1]);

  // 4. Standard favicon
  const iconMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i);
  if (iconMatch?.[1]) candidates.push(iconMatch[1]);

  if (candidates.length === 0) return "";

  // Resolve to absolute URL
  try {
    return new URL(candidates[0], baseUrl).toString();
  } catch {
    return candidates[0];
  }
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const matches = html.matchAll(/<h[1-6][^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/h[1-6]>/gi);
  for (const m of matches) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 3 && text.length < 200) headings.push(text);
  }
  return headings.slice(0, 20);
}

/**
 * Jina Reader fallback (r.jina.ai) — free service that renders the page in a
 * real browser and returns Markdown. Bypasses datacenter-IP blocks like
 * SiteGround's sgcaptcha (which serve an empty captcha page to Deno fetch).
 * Rate limit without API key: ~20 rpm per IP — fine for onboarding traffic.
 *
 * Returns a SYNTHETIC HTML document (title + body text wrapped in tags) so the
 * downstream extractors (title/headings/bodyText) keep working unchanged.
 */
async function tryJinaFallback(url: string): Promise<string | null> {
  try {
    console.log("Trying Jina Reader fallback for:", url);
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`https://r.jina.ai/${url}`, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) {
      console.warn("Jina fallback HTTP", res.status);
      return null;
    }
    const md = await res.text();
    if (!md || md.length < 300) return null;

    // Parse the Jina envelope: "Title: …\nURL Source: …\nMarkdown Content:\n…"
    const titleMatch = md.match(/^Title:\s*(.+)$/m);
    const title = titleMatch?.[1]?.trim() ?? "";
    const contentIdx = md.indexOf("Markdown Content:");
    const body = contentIdx >= 0 ? md.slice(contentIdx + "Markdown Content:".length) : md;

    // Strip markdown syntax noise (links, images) but keep the text.
    const text = body
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")       // images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")     // links → keep label
      .replace(/[#>*_`~-]{1,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 200) return null;

    // Headings from markdown (## Foo) BEFORE we stripped them — re-extract from raw body
    const headings = Array.from(body.matchAll(/^#{1,4}\s+(.{4,120})$/gm)).map((m) => m[1].trim());

    // Synthetic HTML so the existing extractors work as-is
    const headingTags = headings.slice(0, 20).map((h) => `<h2>${h}</h2>`).join("\n");
    return `<html><head><title>${title}</title></head><body>${headingTags}<p>${text}</p></body></html>`;
  } catch (err) {
    console.error("Jina fallback exception:", err);
    return null;
  }
}

async function tryApifyFallback(url: string): Promise<string | null> {
  const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
  if (!APIFY_API_TOKEN) return null;
  try {
    console.log("Trying Apify fallback for:", url);
    // cheerio crawler (raw HTTP, ~5-15s vs playwright's 45s+) routed through
    // Apify RESIDENTIAL proxy — sites like SiteGround/Aruba block datacenter
    // IPs (ours AND Apify's default pool), residential exits bypass that.
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}&timeout=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxCrawlPages: 1,
          maxResults: 1,
          crawlerType: "cheerio",
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"],
          },
        }),
      }
    );
    if (!response.ok) {
      console.error("Apify fallback failed:", response.status, (await response.text().catch(() => "")).slice(0, 150));
      return null;
    }
    const items = await response.json();
    if (!items || items.length === 0) return null;
    const item = items[0];
    if (item.html) return item.html;
    // text/markdown → wrap in synthetic HTML so downstream extractors work
    const text = (item.text || item.markdown || "").replace(/\s+/g, " ").trim();
    if (text.length < 200) return null;
    const title = item.metadata?.title || item.title || "";
    return `<html><head><title>${title}</title></head><body><p>${text}</p></body></html>`;
  } catch (err) {
    console.error("Apify fallback exception:", err);
    return null;
  }
}

// ── Colori del brand ────────────────────────────────────────────────
// Colori che compaiono nel codice di quasi ogni sito ma non sono del brand:
// editor e admin di WordPress, palette predefinita di Gutenberg, default di
// Elementor e Bootstrap. Esempio reale: resetposturale.it risultava viola
// (#7a00df = --wp-block-synced-color) e blu (#007cba = --wp-admin-theme-color)
// mentre il sito e giallo #feca57 e corallo #ff6b6b.
const FRAMEWORK_COLORS = new Set([
  // WordPress editor/admin
  "#7a00df", "#007cba", "#006ba1", "#005a87", "#3858e9", "#2271b1", "#135e96", "#32373c", "#1e1e1e", "#757575", "#cc1818", "#4ab866", "#f0b849", "#d94f4f",
  // Palette e gradienti predefiniti di Gutenberg
  "#abb8c3", "#f78da7", "#cf2e2e", "#ff6900", "#fcb900", "#7bdcb5", "#00d084", "#8ed1fc", "#0693e3", "#9b51e0",
  "#7adcb4", "#00d082", "#ffcb70", "#c751c0", "#4158d0", "#caf880", "#71ce7e", "#020381", "#2874fc", "#4aeadc", "#9778d1", "#cf2aba", "#ee2c82", "#fb6962", "#fef84c",
  "#ffceec", "#9896f0", "#fecda5", "#fe2d2d", "#6b003e", "#fff5cb", "#b6e3d4", "#33a7b5", "#a9b8c3", "#34e2e4", "#4721fb", "#ab1dfe", "#faaca8", "#fad0c4",
  // Elementor (colori globali di default, se il sito non li ha cambiati)
  "#6ec1e4", "#54595f", "#7a7a7a", "#61ce70",
  // Bootstrap 4/5 (variabili --bs-* e componenti di default)
  "#007bff", "#6c757d", "#28a745", "#dc3545", "#ffc107", "#17a2b8", "#343a40", "#f8f9fa", "#0d6efd", "#6610f2", "#6f42c1", "#d63384", "#fd7e14", "#198754", "#20c997", "#0dcaf0", "#adb5bd", "#495057", "#212529", "#e9ecef", "#dee2e6", "#ced4da",
]);

function normHex(raw: string): string | null {
  let h = raw.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  if (/^[0-9a-f]{8}$/.test(h)) h = h.slice(0, 6); // ignora l'alpha
  return /^[0-9a-f]{6}$/.test(h) ? "#" + h : null;
}

function hexInfo(hex: string): { lum: number; sat: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const sat = max === min ? 0 : (l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min));
  return { lum: 0.2126 * r + 0.7152 * g + 0.0722 * b, sat };
}

/** Toglie dal codice i blocchi di stile e le variabili di WordPress/Bootstrap che non sono del brand. */
function stripFrameworkCss(css: string): string {
  return css
    .replace(/<style[^>]*id=["'](?:wp-block-library|global-styles|wp-emoji-styles|classic-theme-styles|core-block-supports|wp-img-auto-sizes-contain|wp-block-[a-z-]+)[^"']*["'][^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/--(?:wp|bs)[-a-z0-9]*\s*:\s*[^;}]+/gi, " ");
}

/** Fogli di stile del tema (stesso dominio, niente core WordPress o plugin), max 3. */
async function fetchThemeCss(html: string, baseUrl: string): Promise<string> {
  const hrefs: string[] = [];
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)) {
    const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    let abs: URL;
    try { abs = new URL(href, baseUrl); } catch { continue; }
    if (abs.hostname !== new URL(baseUrl).hostname) continue;
    const path = abs.pathname;
    const isTheme = /\/wp-content\/themes\//.test(path) || /\/uploads\/elementor\/css\//.test(path) || !/\/wp-(?:includes|admin|content\/plugins)\//.test(path);
    if (isTheme && !hrefs.includes(abs.href)) hrefs.push(abs.href);
    if (hrefs.length >= 3) break;
  }
  const parts = await Promise.all(hrefs.map(async (u) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(u, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0" } });
      clearTimeout(t);
      if (!r.ok) return "";
      return (await r.text()).slice(0, 400_000);
    } catch { return ""; }
  }));
  return parts.join("\n");
}

type BrandColor = { hex: string; count: number; source: "dichiarato" | "frequenza" };

async function extractBrandColors(html: string, baseUrl: string): Promise<BrandColor[]> {
  const external = await fetchThemeCss(html, baseUrl);
  const pageCss = stripFrameworkCss(html);
  const themeCss = stripFrameworkCss(external);

  // Colori dichiarati come colori del brand (meta theme-color, colori globali
  // di Elementor, variabili --primary/--brand...): piccolo bonus, non priorita
  // assoluta, perche spesso sono i default del tema e il sito non li usa.
  const declared = new Set<string>();
  const themeColor = html.match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)["']/i)?.[1];
  if (themeColor) { const h = normHex(themeColor); if (h) declared.add(h); }
  const declPatterns = [
    /--e-global-color-[a-z0-9]+\s*:\s*(#[0-9a-fA-F]{3,8})/gi,
    /--(?:color-)?(?:primary|secondary|accent|brand|main)(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/gi,
  ];
  for (const re of declPatterns) for (const m of (pageCss + "\n" + themeCss).matchAll(re)) { const h = normHex(m[1]); if (h) declared.add(h); }

  // Frequenza: i colori scritti nella pagina (cio che il visitatore vede)
  // pesano 3, quelli dei fogli di stile del tema pesano 1.
  const score = new Map<string, number>();
  const uses = new Map<string, number>();
  const count = (text: string, weight: number) => {
    const add = (h: string | null) => {
      if (!h) return;
      score.set(h, (score.get(h) || 0) + weight);
      uses.set(h, (uses.get(h) || 0) + 1);
    };
    for (const m of text.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)) add(normHex(m[1]));
    for (const m of text.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
      add("#" + [m[1], m[2], m[3]].map((n) => Math.min(255, parseInt(n)).toString(16).padStart(2, "0")).join(""));
    }
  };
  count(pageCss, 3);
  count(themeCss, 1);
  for (const h of declared) if (!score.has(h)) { score.set(h, 0); uses.set(h, 0); }

  const usable = (h: string) => {
    if (FRAMEWORK_COLORS.has(h)) return false;
    const { lum } = hexInfo(h);
    return lum < 0.93 && lum > 0.02; // via bianchi e neri quasi puri
  };

  return [...score.entries()]
    .filter(([h]) => usable(h))
    // i grigi raramente sono il colore del brand: a parita di uso vincono i saturi
    .map(([h, sc]) => ({ hex: h, rank: sc + (declared.has(h) ? 4 : 0) + hexInfo(h).sat * 3 }))
    .sort((x, y) => y.rank - x.rank)
    .slice(0, 12)
    .map(({ hex }) => ({ hex, count: uses.get(hex) || 0, source: declared.has(hex) ? "dichiarato" as const : "frequenza" as const }));
}

function extractJsonLd(html: string): any[] {
  const results: any[] = [];
  const matches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of matches) {
    try {
      results.push(JSON.parse(m[1]));
    } catch { /* skip */ }
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ success: false, error: "url_required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : "https://" + url);
    } catch {
      return new Response(JSON.stringify({ success: false, error: "invalid_url" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Scraping website:", parsedUrl.href);

    // Fetch homepage
    let html = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(parsedUrl.href, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"macOS"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        // Blocked/unreachable via direct fetch. Fallback chain: Jina (fast,
        // real browser, bypasses datacenter-IP blocks) → Apify (slow, last resort).
        const fallback = await tryJinaFallback(parsedUrl.href) || await tryApifyFallback(parsedUrl.href);
        if (fallback) {
          html = fallback;
        } else {
          return new Response(JSON.stringify({ success: false, error: "unreachable" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        html = await response.text();
      }
    } catch (err: any) {
      const fallback = await tryJinaFallback(parsedUrl.href) || await tryApifyFallback(parsedUrl.href);
      if (fallback) {
        html = fallback;
      } else {
        const errorType = err.name === "AbortError" ? "timeout" : "unreachable";
        return new Response(JSON.stringify({ success: false, error: errorType }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Anti-bot pages often return 200 with a near-empty captcha shell
    // (e.g. SiteGround sgcaptcha meta-refresh, ~170 bytes). Detect and fall back.
    const looksLikeCaptcha = html.length < 600 || /sgcaptcha|__cf_chl|checking your browser/i.test(html);
    if (looksLikeCaptcha) {
      console.warn("Direct fetch returned captcha/empty shell, trying fallbacks");
      const fallback = await tryJinaFallback(parsedUrl.href) || await tryApifyFallback(parsedUrl.href);
      if (fallback) html = fallback;
    }

    if (!html || html.length < 100) {
      return new Response(JSON.stringify({ success: false, error: "empty" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract data
    const title = extractTitle(html);
    const description = extractMeta(html, "description");
    const ogTitle = extractMeta(html, "og:title");
    const ogDescription = extractMeta(html, "og:description");
    const ogImage = extractMeta(html, "og:image");
    const logoUrl = extractLogo(html, url);
    const headings = extractHeadings(html);
    const jsonLd = extractJsonLd(html);
    const bodyText = stripHtml(html).substring(0, 8000);

    // Try to extract contact info
    const phoneMatch = html.match(/(?:tel:|href="tel:)([+\d\s\-().]+)/i);
    const emailMatch = html.match(/(?:mailto:|href="mailto:)([^"'\s]+@[^"'\s]+)/i);
    const addressMatch = html.match(/(?:Via|Viale|Corso|Piazza|Largo|Strada)[^<,]{5,80}/i);

    // Colori del brand: ripuliti dai colori interni di WordPress/Elementor/
    // Bootstrap e ordinati per frequenza (prima venivano presi i primi 10 in
    // ordine di apparizione, cioe quelli dell'editor di WordPress).
    let brandColors: BrandColor[] = [];
    try {
      brandColors = await extractBrandColors(html, parsedUrl.href);
    } catch (err) {
      console.warn("estrazione colori fallita, continuo senza:", err);
    }
    const cssColors = brandColors.map((c) => c.hex);

    const result = {
      success: true,
      cssColors: cssColors.slice(0, 10),
      cssColorCounts: brandColors.slice(0, 10),
      title: ogTitle || title,
      description: ogDescription || description,
      headings,
      bodyText,
      ogImage,
      logoUrl,
      jsonLd,
      phone: phoneMatch?.[1]?.trim() || null,
      email: emailMatch?.[1]?.trim() || null,
      address: addressMatch?.[0]?.trim() || null,
    };

    console.log("Scraping complete. Text length:", bodyText.length, "Headings:", headings.length);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-website error:", e);
    return new Response(JSON.stringify({ success: false, error: "unreachable" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
