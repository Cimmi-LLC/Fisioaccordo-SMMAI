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

    // Extract CSS colors from inline styles and style tags
    const cssColors: string[] = [];
    const colorMatches = html.matchAll(/(?:color|background-color|background|border-color)\s*:\s*(#[0-9a-fA-F]{3,8})/gi);
    for (const m of colorMatches) {
      const c = m[1].toLowerCase();
      if (c !== "#fff" && c !== "#ffffff" && c !== "#000" && c !== "#000000" && c !== "#333" && c !== "#ccc" && c !== "#eee" && c !== "#ddd" && !cssColors.includes(c)) {
        cssColors.push(c);
      }
    }
    // Also check for rgb colors
    const rgbMatches = html.matchAll(/(?:color|background-color|background)\s*:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/gi);
    for (const m of rgbMatches) {
      const hex = "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("");
      if (!cssColors.includes(hex) && hex !== "#ffffff" && hex !== "#000000") {
        cssColors.push(hex);
      }
    }

    const result = {
      success: true,
      cssColors: cssColors.slice(0, 10),
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
