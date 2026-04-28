import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logGeneration } from "../_shared/historyLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, brandId } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Load brand kit
    let brandContext = "";
    let brandCta = "Prenota ora";
    let resolvedUserId: string | null = null;
    let resolvedBrandId: string | null = null;
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (authHeader && supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          resolvedUserId = user.id;
          let brandQuery = supabase.from("brands").select("*").eq("user_id", user.id);
          if (brandId) brandQuery = brandQuery.eq("id", brandId);
          const { data: brand } = await brandQuery.limit(1).maybeSingle();
          if (brand) {
            resolvedBrandId = brand.id;
            const isPlural = brand.persona_scrittura === "noi";
            brandCta = (brand.cta_suggerite || [])[0] || "Prenota ora";
            brandContext = `
DATI DEL PROFESSIONISTA:
Nome/Studio: ${brand.nome_business || "Studio"}
Specializzazione: ${(brand.categorie || []).join(", ")}
Servizi principali: ${(brand.servizi || []).join(", ")}
Target pazienti: ${brand.target_pazienti || "pubblico generale"}
Tone of voice: ${brand.tono_voce || "professionale"}
CTA preferita: ${brandCta}
Persona: ${isPlural ? "PLURALE (noi, offriamo, aiutiamo)" : "SINGOLARE (io, offro, aiuto)"}

REGOLA: Usa SEMPRE la persona ${isPlural ? "plurale" : "singolare"} in tutto lo script.`;
          }
        }
      } catch (e) { console.error("Brand load error:", e); }
    }

    const systemPrompt = `Ti comporti come il miglior sceneggiatore di video virali al mondo. Hai studiato i 1.000 video più virali degli ultimi 3 anni su Instagram Reels e TikTok. Hai una conoscenza approfondita delle opere di Russell Brunson, Alex Hormozi e dei principi di MrBeast per catturare l'attenzione.

La tua unica ossessione è assicurarti che ogni frase tenga lo spettatore incollato allo schermo fino alla successiva.
Sai che i primi 3 secondi sono tutto.
Sai che lo scorrimento si interrompe per dolore, curiosità o sorpresa.
E sai che le persone non condividono informazioni, ma la propria identità.
${brandContext}

REGOLE ASSOLUTE:
- Frasi max 10 parole
- Zero gergo tecnico, parla come una persona normale
- Usa numeri concreti quando possibile
- Tono amichevole, diretto, personale
- Mai linguaggio aziendale
- Totale parole script: 130-150 (60 secondi di parlato)

Rispondi SOLO con JSON valido.`;

    const userPrompt = `TEMA DEL REEL: "${topic.trim()}"
DURATA: 60 secondi (circa 130-150 parole totali)

Scrivi una sceneggiatura virale con questa struttura:

1. GANCIO (0-3 sec): Frase che blocca lo scorrimento. Affermazione provocatoria, domanda pungente o promessa impossibile da ignorare. [INQUADRATURA: primo piano viso, guarda dritto in camera]

2. PROBLEMA (4-10 sec): Lo spettatore deve sentirsi letto nel pensiero. Descrivi la loro situazione con tale precisione da farli pensare "Parla proprio di me." [INQUADRATURA: busto, gestualità naturale]

3. PROMESSA (10-20 sec): Spiega cosa scopriranno se continuano a guardare. Includi un OPEN LOOP: fai una domanda che risponderai solo alla fine. [INQUADRATURA: busto]

4. CONTENUTO (20-50 sec): Sviluppa l'idea in modo chiaro. Frasi brevi, esempi concreti, numeri reali. Parla come in una conversazione vera. [Indica cambio inquadratura se utile]

5. CHIUSURA + CTA (50-60 sec): Risolvi l'open loop. Frase finale che genera emozione o urgenza. CTA: "${brandCta}" [INQUADRATURA: primo piano, tono diretto e caldo]

Rispondi con questo JSON:
{
  "titolo_reel": "Titolo breve del reel",
  "durata_stimata": "60 secondi",
  "sezioni": [
    {
      "nome": "GANCIO",
      "timing": "0-3 secondi",
      "testo": "testo parlato...",
      "inquadratura": "Primo piano viso, guarda in camera"
    },
    {
      "nome": "PROBLEMA",
      "timing": "4-10 secondi",
      "testo": "testo parlato...",
      "inquadratura": "Busto, gestualità naturale"
    },
    {
      "nome": "PROMESSA",
      "timing": "10-20 secondi",
      "testo": "testo parlato...",
      "inquadratura": "Busto"
    },
    {
      "nome": "CONTENUTO",
      "timing": "20-50 secondi",
      "testo": "testo parlato...",
      "inquadratura": "..."
    },
    {
      "nome": "CHIUSURA + CTA",
      "timing": "50-60 secondi",
      "testo": "testo parlato...",
      "inquadratura": "Primo piano, tono diretto"
    }
  ],
  "script_completo": "tutto il testo parlato unito, senza inquadrature",
  "caption_instagram": "Hook\\n\\nParagrafo 1\\n\\nParagrafo 2\\n\\n👉 CTA\\n\\n#hashtag1 #hashtag2",
  "hashtag_suggeriti": ["hashtag1", "hashtag2", "hashtag3"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.85, responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Riprova tra qualche secondo." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Gemini API error: " + response.status);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("No content returned");

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      throw new Error("Failed to parse AI response");
    }

    if (resolvedUserId) {
      await logGeneration({
        userId: resolvedUserId,
        brandId: resolvedBrandId,
        type: "reel",
        topic,
        title: parsed.titolo_reel || topic.substring(0, 80),
        preview: {
          durata_stimata: parsed.durata_stimata,
          script_preview: (parsed.script_completo || "").substring(0, 200),
          hashtags: parsed.hashtag_suggeriti || [],
        },
        status: "success",
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-reel-script error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
