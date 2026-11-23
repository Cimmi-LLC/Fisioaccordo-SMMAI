import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { scrapeInstagramPosts, scrapeInstagramProfile } from "./apify.ts";
import { computeMetrics, InsufficientDataError } from "./metrics.ts";
import { buildLegacyContext, LEGACY_SYSTEM_PROMPT, buildLegacyUserPrompt, filterMostUsedAgainstObserved, pulisciSuggeriti, type AnalysisOwner } from "./prompt.ts";
import { callGemini } from "./llm.ts";
import { adminClient, requireAuth, requireWithinRateLimit } from "../_shared/auth.ts";
import { resolveProfession } from "../_shared/brand/profession.ts";
import { frequenzaDaDate, togliNonDeducibili } from "../_shared/brand/analisiCompetitor.ts";

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

    const { username, platform, manualInfo, brandId } = await req.json();

    // Chi chiede l'analisi: il brand attivo (nome e professione). Senza
    // brand l'analisi resta generica sul settore salute.
    let owner: AnalysisOwner | null = null;
    if (auth.ok && brandId) {
      try {
        const supabaseAdmin = adminClient();
        const { data: brand } = await supabaseAdmin
          .from("brands")
          .select("*")
          .eq("id", String(brandId))
          .eq("user_id", auth.userId)
          .maybeSingle();
        if (brand) {
          owner = { nome: (brand as { nome_business?: string }).nome_business || "il brand", prof: resolveProfession(brand) };
        }
      } catch (e) {
        console.warn("Brand non caricato per l'analisi competitor:", e);
      }
    }

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
    let [scrapedData, profile] = await Promise.all([
      username && APIFY_API_TOKEN && isInstagram
        ? scrapeInstagramPosts(username, APIFY_API_TOKEN)
        : Promise.resolve(null),
      username && APIFY_API_TOKEN && isInstagram
        ? scrapeInstagramProfile(username, APIFY_API_TOKEN)
        : Promise.resolve(null),
    ]);

    // 1b. Se lo scraping non ha portato post, i contenuti possono già essere
    // nella libreria «Video virali» (stesse tabelle del team): si analizzano
    // quelli, che hanno views, didascalie e trascrizioni vere.
    let fonteDati: "instagram" | "virali" | null = scrapedData && scrapedData.posts.length > 0 ? "instagram" : null;
    // Frequenza di pubblicazione: si calcola dalle date vere, non la stima il
    // modello (il 18/11 scriveva «non deducibile dai dati forniti»).
    let frequenza: string | null = fonteDati === "instagram" ? frequenzaDaDate(scrapedData!.posts.map((p) => p.timestamp), "post") : null;
    if (!fonteDati && username) {
      try {
        const handle = String(username).trim().toLowerCase().replace(/^@/, "").split(/[/?#\s]/)[0];
        const { data: rows } = await adminClient()
          .from("virali_video")
          .select("didascalia, views, likes, commenti, condivisioni, trascrizione, piattaforma, pubblicato_il, url")
          .eq("handle", handle)
          .order("views", { ascending: false, nullsFirst: false })
          .limit(12);
        const virali = (rows || []) as Array<Record<string, unknown>>;
        if (virali.length > 0) {
          const posts = virali.map((v) => ({
            caption: [
              v.views ? `[${Number(v.views).toLocaleString("it-IT")} visualizzazioni] ` : "",
              String(v.didascalia || ""),
              v.trascrizione ? `\nTrascrizione: ${String(v.trascrizione).slice(0, 800)}` : "",
            ].join(""),
            likes: Number(v.likes || 0),
            comments: Number(v.commenti || 0),
            views: v.views === null || v.views === undefined ? null : Number(v.views),
            type: String(v.piattaforma || "video"),
            timestamp: String(v.pubblicato_il || ""),
            hashtags: [] as string[],
            url: String(v.url || ""),
          }));
          const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
          const totalComments = posts.reduce((s, p) => s + p.comments, 0);
          scrapedData = {
            username: handle,
            postsCount: posts.length,
            posts,
            totalLikes,
            totalComments,
            avgLikes: Math.round(totalLikes / posts.length),
            avgComments: Math.round(totalComments / posts.length),
          };
          fonteDati = "virali";
          console.log(`analyze-competitors: uso ${posts.length} video dalla libreria virali per @${handle}`);
          // I 12 video sopra sono i più visti, non gli ultimi: per la
          // frequenza servono le date degli ultimi video in libreria, di una
          // piattaforma sola (lo stesso video può stare su Instagram e TikTok).
          const { data: recenti } = await adminClient()
            .from("virali_video")
            .select("piattaforma, pubblicato_il")
            .eq("handle", handle)
            .not("pubblicato_il", "is", null)
            .order("pubblicato_il", { ascending: false })
            .limit(60);
          const perPiattaforma = new Map<string, string[]>();
          for (const r of (recenti || []) as Array<{ piattaforma: string; pubblicato_il: string }>) {
            perPiattaforma.set(r.piattaforma, [...(perPiattaforma.get(r.piattaforma) || []), r.pubblicato_il]);
          }
          const date = [...perPiattaforma.values()].sort((a, b) => b.length - a.length)[0] || [];
          frequenza = frequenzaDaDate(date.slice(0, 30), "video");
        }
      } catch (e) {
        console.warn("lettura libreria virali fallita:", e);
      }
    }

    // 1c. Niente dati, niente analisi: prima qui partiva comunque un'analisi
    // «dalla conoscenza generale» con punteggi inventati e campi
    // «non determinabile» (revisione 03/11). Meglio dirlo chiaro.
    if (!fonteDati && !manualInfo) {
      return new Response(JSON.stringify({
        error: `Non sono riuscito a leggere i contenuti di @${username}: senza i post veri non do punteggi né analisi. ` +
          `Riprova tra qualche minuto, controlla che il profilo sia pubblico e scritto giusto, ` +
          `oppure aggiungilo agli «Account seguiti» in Video virali: al prossimo giro di raccolta l'analisi userà quei dati.`,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Compute extended metrics (deterministic, no LLM)
    let extendedMetrics = null;
    const warnings: string[] = [];
    if (fonteDati === "virali") {
      warnings.push("Analisi basata sui video già raccolti nella libreria Video virali (con visualizzazioni e trascrizioni), non su uno scraping fresco del profilo.");
    }
    if (scrapedData) {
      try {
        extendedMetrics = computeMetrics(scrapedData, profile);
      } catch (err) {
        if (err instanceof InsufficientDataError) {
          warnings.push(`Ho letto solo ${err.postsFound} post: prendi l'analisi come indicativa.`);
          // Don't fail — let LLM generate something based on what we have
        } else {
          console.error("Metrics computation error:", err);
        }
      }
    }

    // 3. Build legacy prompt context (v1 schema preserved)
    const competitorContext = buildLegacyContext(scrapedData, manualInfo, username, platform, owner?.prof.profile.settore);
    const userPrompt = buildLegacyUserPrompt(competitorContext, owner);

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

    // 5a. Strip hallucinated hashtags from "most_used" — keep only those actually observed
    filterMostUsedAgainstObserved(parsed, scrapedData);
    pulisciSuggeriti(parsed);

    // 5a-bis. Frequenza dalle date vere; senza date la riga non c'è. Poi via
    // ogni campo in cui il modello dice che il dato manca: davanti al
    // cliente niente «non deducibile» o «non determinabile».
    if (parsed?.content_strategy && typeof parsed.content_strategy === "object") {
      if (frequenza) parsed.content_strategy.posting_frequency = frequenza;
      else delete parsed.content_strategy.posting_frequency;
    }
    parsed = togliNonDeducibili(parsed);

    // 5b. Attach v1 scraped_metrics (compat) + new extended metrics (additive)
    if (scrapedData) {
      parsed.scraped_metrics = {
        posts_analyzed: scrapedData.postsCount,
        avg_likes: scrapedData.avgLikes,
        avg_comments: scrapedData.avgComments,
      };
    }

    // Additive new fields — UI v1 ignores them, UI v2 will use them
    parsed.schema_version = 1.5;
    parsed.data_source = fonteDati || "manual";
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
