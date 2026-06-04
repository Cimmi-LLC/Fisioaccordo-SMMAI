import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, requireWithinRateLimit } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Search Instagram for real reels by hashtag using Apify
 */
async function searchReelsByHashtag(hashtag: string, apifyToken: string): Promise<any[]> {
  try {
    const cleanTag = hashtag.replace(/^#/, "").trim();
    console.log("Searching reels for hashtag:", cleanTag);

    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=30`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashtags: [cleanTag],
          resultsType: "posts",
          resultsLimit: 5,
          searchType: "hashtag",
        }),
      }
    );

    if (!response.ok) {
      console.error("Apify hashtag search error:", response.status);
      return [];
    }

    const items = await response.json();
    if (!items || !Array.isArray(items)) return [];

    return items
      .filter((p: any) => !p.error && p.url)
      .map((p: any) => ({
        url: p.url,
        caption: (p.caption || "").substring(0, 150),
        likes: p.likesCount || 0,
        comments: p.commentsCount || 0,
        type: p.type || "unknown",
        thumbnail: p.displayUrl || p.thumbnailUrl || p.previewUrl || null,
        ownerUsername: p.ownerUsername || null,
      }));
  } catch (err) {
    console.error("Apify hashtag search error:", err);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth + rate limit: trend search is expensive (Apify), 10/min per user
    const auth = await requireAuth(req);
    if (auth.ok) {
      const supabaseAdmin = adminClient();
      const rl = await requireWithinRateLimit(supabaseAdmin, auth.userId, "find-trends", 10, 60);
      if (!rl.ok) {
        return new Response(JSON.stringify({ error: rl.error }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter ?? 60) },
        });
      }
    }

    const { niche, platform, count, excludeTopics } = await req.json();
    if (!niche) {
      return new Response(JSON.stringify({ error: "Specifica una nicchia" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    const today = new Date().toISOString().split("T")[0];

    const numTrends = count || 10;
    const excludeBlock = excludeTopics?.length > 0 ? `\n\nIMPORTANTE: NON includere questi trend che sono già stati generati:\n${excludeTopics.map((t: string) => `- ${t}`).join('\n')}\nGenera trend DIVERSI da quelli sopra.\n` : '';

    const prompt = `Sei un trend analyst esperto. Oggi è ${today}.

Trova esattamente ${numTrends} trend ATTUALI per la nicchia "${niche}" sulla piattaforma ${platform || "Instagram"}.${excludeBlock}

I trend devono essere:
- REALI e attuali (non inventati)
- Specifici per la nicchia indicata
- Applicabili per creare contenuti social
- Tutti DIVERSI tra loro

Rispondi SOLO con JSON valido:
{
  "trends": [
    {
      "topic": "nome del trend",
      "trend_score": 85,
      "why_trending": "perché è trend adesso (1 frase)",
      "content_idea": "idea concreta per un post su questo trend",
      "suggested_format": "carosello|reel|foto|video",
      "search_hashtags": ["hashtag1", "hashtag2"]
    }
  ]
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: "Sei un esperto di trend social media. Conosci i trend attuali di ogni piattaforma e nicchia. Rispondi SOLO con JSON valido." }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) throw new Error(`Gemini API error: ${geminiResponse.status}`);

    const geminiData = await geminiResponse.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      parsed = { trends: [] };
    }

    const trends = parsed.trends || [];

    // Step 2: If Apify is available, search real reels for each trend
    if (APIFY_API_TOKEN && trends.length > 0) {
      // Collect unique hashtags from all trends (max 5 to avoid timeout)
      const allHashtags: string[] = [];
      for (const trend of trends) {
        if (trend.search_hashtags) {
          for (const tag of trend.search_hashtags) {
            if (!allHashtags.includes(tag) && allHashtags.length < 5) {
              allHashtags.push(tag);
            }
          }
        }
      }

      // Search reels for each hashtag
      const hashtagResults: Record<string, any[]> = {};
      for (const tag of allHashtags) {
        const reels = await searchReelsByHashtag(tag, APIFY_API_TOKEN);
        if (reels.length > 0) {
          hashtagResults[tag] = reels;
        }
      }

      // Attach real reel links to each trend
      for (const trend of trends) {
        trend.real_reels = [];
        if (trend.search_hashtags) {
          for (const tag of trend.search_hashtags) {
            const reels = hashtagResults[tag] || [];
            for (const reel of reels) {
              if (trend.real_reels.length < 3 && !trend.real_reels.some((r: any) => r.url === reel.url)) {
                trend.real_reels.push(reel);
              }
            }
          }
        }
        // Clean up - don't send search_hashtags to frontend
        delete trend.search_hashtags;
      }
    }

    return new Response(JSON.stringify({ trends }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("find-trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
