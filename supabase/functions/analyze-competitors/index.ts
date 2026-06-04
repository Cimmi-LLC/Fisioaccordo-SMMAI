import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { scrapeInstagramPosts, scrapeInstagramProfile } from "./apify.ts";
import { computeMetrics, InsufficientDataError } from "./metrics.ts";
import { buildLegacyContext, LEGACY_SYSTEM_PROMPT, buildLegacyUserPrompt } from "./prompt.ts";
import { callGemini } from "./llm.ts";
import { adminClient, requireAuth, requireWithinRateLimit } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit: competitor analysis is very expensive (multiple Apify runs),
    // 5/min per user
    const auth = await requireAuth(req);
    if (auth.ok) {
      const supabaseAdmin = adminClient();
      const rl = await requireWithinRateLimit(supabaseAdmin, auth.userId, "analyze-competitors", 5, 60);
      if (!rl.ok) {
        return new Response(JSON.stringify({ error: rl.error }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter ?? 60) },
        });
      }
    }

    const { username, platform, manualInfo } = await req.json();

    if (!username && !manualInfo) {
      return new Response(JSON.stringify({ error: "Inserisci un username o informazioni sul competitor" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY non configurata" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");

    // 1. Scrape posts + profile in parallel
    const isInstagram = platform === "instagram" || !platform;
    const [scrapedData, profile] = await Promise.all([
      username && APIFY_API_TOKEN && isInstagram
        ? scrapeInstagramPosts(username, APIFY_API_TOKEN)
        : Promise.resolve(null),
      username && APIFY_API_TOKEN && isInstagram
        ? scrapeInstagramProfile(username, APIFY_API_TOKEN)
        : Promise.resolve(null),
    ]);

    // 2. Compute extended metrics (deterministic, no LLM)
    let extendedMetrics = null;
    const warnings: string[] = [];
    if (scrapedData) {
      try {
        extendedMetrics = computeMetrics(scrapedData, profile);
        if (extendedMetrics.engagement_rate === null && profile === null) {
          warnings.push("engagement_rate non calcolabile: dati profilo non disponibili");
        }
      } catch (err) {
        if (err instanceof InsufficientDataError) {
          warnings.push(`Profilo con dati insufficienti: ${err.postsFound} post estratti`);
          // Don't fail — let LLM generate something based on what we have
        } else {
          console.error("Metrics computation error:", err);
        }
      }
    }

    // 3. Build legacy prompt context (v1 schema preserved)
    const competitorContext = buildLegacyContext(scrapedData, manualInfo, username, platform);
    const userPrompt = buildLegacyUserPrompt(competitorContext);

    // 4. Call Gemini
    let parsed;
    try {
      parsed = await callGemini(GEMINI_API_KEY, LEGACY_SYSTEM_PROMPT, userPrompt);
    } catch (e) {
      console.error("Gemini call failed:", e);
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Gemini error" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Attach v1 scraped_metrics (compat) + new extended metrics (additive)
    if (scrapedData) {
      parsed.scraped_metrics = {
        posts_analyzed: scrapedData.postsCount,
        avg_likes: scrapedData.avgLikes,
        avg_comments: scrapedData.avgComments,
      };
    }

    // Additive new fields — UI v1 ignores them, UI v2 will use them
    parsed.schema_version = 1.5;
    if (extendedMetrics) {
      parsed.scraped = extendedMetrics;
    }
    if (warnings.length > 0) {
      parsed.warnings = warnings;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-competitors error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
