import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, text, platform, postType } = await req.json();
    if (!url && !text) {
      return new Response(JSON.stringify({ error: "Inserisci un URL o il testo del post" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Analizza questo ${postType || 'post'} da ${platform || 'social media'} e trova i pattern che lo rendono virale.

${url ? `URL: ${url}` : ''}
${text ? `TESTO DEL POST:\n${text}` : ''}

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
  "analysis": "analisi completa in 3-5 frasi del perchè questo post funziona",
  "score": 75,
  "takeaways": ["3-5 lezioni concrete da applicare ai propri post"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Sei un esperto analista di contenuti social virali. Analizzi post e trovi i pattern comuni che li rendono virali. Rispondi SOLO con JSON valido." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
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
