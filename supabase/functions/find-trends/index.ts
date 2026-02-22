import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche, platform } = await req.json();
    if (!niche) {
      return new Response(JSON.stringify({ error: "Specifica una nicchia" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toISOString().split("T")[0];

    const prompt = `Sei un trend analyst esperto. Oggi è ${today}.

Trova 5-7 trend ATTUALI per la nicchia "${niche}" sulla piattaforma ${platform || "Instagram"}.

I trend devono essere:
- REALI e attuali (non inventati)
- Specifici per la nicchia indicata
- Applicabili per creare contenuti social

Rispondi SOLO con JSON valido:
{
  "trends": [
    {
      "topic": "nome del trend",
      "trend_score": 85,
      "why_trending": "perché è trend adesso (1 frase)",
      "content_idea": "idea concreta per un post su questo trend",
      "suggested_format": "carosello|reel|foto|video"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Sei un esperto di trend social media. Conosci i trend attuali di ogni piattaforma e nicchia. Rispondi SOLO con JSON valido." },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      parsed = { trends: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("find-trends error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
