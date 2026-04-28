import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Try to extract OG tags from a URL (works for LinkedIn, blogs, Facebook, etc.)
 * Does NOT work for Instagram/TikTok which require auth.
 */
async function fetchOgContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1",
        "Accept": "text/html",
      },
      redirect: "follow",
    });
    if (!response.ok) return "";

    const html = await response.text();
    const extracted: string[] = [];

    for (const tag of ["og:title", "og:description", "twitter:description"]) {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${tag}["'][^>]*content=["']([^"']*?)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*?)["'][^>]*(?:property|name)=["']${tag}["']`, "i"));
      if (match?.[1] && match[1].length > 10) {
        extracted.push(match[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\\n/g, "\n"));
      }
    }

    // JSON-LD
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) {
      try {
        const items = [].concat(JSON.parse(m[1]));
        for (const item of items) {
          if (item.caption) extracted.push("Caption: " + item.caption);
          if (item.articleBody) extracted.push(item.articleBody);
          if (item.description && item.description.length > 20) extracted.push(item.description);
        }
      } catch { /* skip */ }
    }

    return [...new Set(extracted.filter(e => e.trim().length > 10))].join("\n\n");
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, text, platform, postType } = await req.json();
    if (!url && !text) {
      return new Response(JSON.stringify({ error: "Inserisci un URL o il testo del post" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Try to fetch content from URL (only works for open platforms)
    let fetchedContent = "";
    const isClosedPlatform = url && (url.includes("instagram.com") || url.includes("tiktok.com"));

    if (url && !isClosedPlatform) {
      fetchedContent = await fetchOgContent(url);
    }

    // If only URL provided (no text) and we couldn't fetch content, ask for text
    if (!text && !fetchedContent) {
      return new Response(JSON.stringify({
        error: "Instagram/TikTok bloccano la lettura automatica. Incolla la caption del post nel campo di testo per analizzarlo.",
        requires_text: true
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context
    let postContext = "";
    if (text) postContext = `TESTO/CAPTION DEL POST:\n${text}`;
    if (fetchedContent) postContext += `${postContext ? "\n\n" : ""}CONTENUTO DALLA PAGINA:\n${fetchedContent}`;
    if (url) postContext += `\n\nURL: ${url}`;

    const prompt = `Analizza questo ${postType || 'post'} da ${platform || 'social media'} e trova i pattern che lo rendono virale.

${postContext}

ISTRUZIONI:
- Analizza ESCLUSIVAMENTE il contenuto fornito sopra.
- NON inventare o assumere contenuti non presenti.
- Cita frasi, parole chiave ed elementi concreti dal post reale.
- Analizza la strategia di copy, hook, struttura narrativa e CTA.

Rispondi SOLO con un JSON valido:
{
  "patterns": {
    "hook_type": "tipo di hook usato (domanda, statistica, provocazione, storia, lista)",
    "structure": ["lista dei passaggi narrativi del post"],
    "cta_style": "tipo di call to action",
    "emotional_triggers": ["lista trigger emotivi usati"],
    "formatting": ["pattern di formattazione (emoji, spazi, lunghezza frasi)"],
    "hashtag_strategy": "strategia hashtag usata"
  },
  "analysis": "analisi completa in 3-5 frasi del perché questo post funziona, con citazioni dal testo reale",
  "score": 75,
  "takeaways": ["3-5 lezioni concrete da applicare ai propri post"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: "Sei un esperto analista di contenuti social virali. Analizzi post e trovi i pattern che li rendono virali. Basa la tua analisi SOLO sul contenuto reale fornito. Rispondi SOLO con JSON valido." }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      parsed = { patterns: {}, analysis: raw, score: 50, takeaways: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-viral-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
