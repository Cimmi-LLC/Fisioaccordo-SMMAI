import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, audience, platform, tone, postType, numSlides, userPhotos } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Topic is required (min 2 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const slidesCount = Math.min(Math.max(parseInt(numSlides) || 5, 2), 10);

    // Load user AI memories if auth token is present
    let memoriesContext = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const token = authHeader.replace("Bearer ", "");
          const { data: { user } } = await supabase.auth.getUser(token);
          
          if (user) {
            const { data: memories } = await supabase
              .from("user_ai_memory")
              .select("memory_type, content, importance")
              .eq("user_id", user.id)
              .order("importance", { ascending: false })
              .limit(20);

            if (memories && memories.length > 0) {
              memoriesContext = "\n\nMEMORIA UTENTE - Rispetta SEMPRE queste preferenze:\n" +
                memories.map((m: any) => {
                  const typeLabel = {
                    correction: "CORREZIONE",
                    preference: "PREFERENZA", 
                    style: "STILE",
                    brand_voice: "BRAND",
                    feedback: "FEEDBACK"
                  }[m.memory_type] || m.memory_type.toUpperCase();
                  return `- [${typeLabel}] ${m.content}`;
                }).join("\n");
            }
          }
        }
      } catch (memErr) {
        console.error("Error loading memories:", memErr);
      }
    }

    // Build photos context
    let photosContext = "";
    if (userPhotos && Array.isArray(userPhotos) && userPhotos.length > 0) {
      photosContext = "\n\nFOTO UTENTE DISPONIBILI:\n" +
        userPhotos.map((p: string, i: number) => `- Foto ${i + 1}: ${p}`).join("\n") +
        "\nSuggerisci quale foto usare per ogni slide nel campo 'suggested_photo_index'.";
    }

    const systemPrompt = `Sei un copywriter esperto con 20+ anni di esperienza, specializzato in contenuti social virali.
Il tuo stile è ispirato a Iman Gadzhi: diretto, carismatico, orientato ai risultati.
Usi le strategie di Mr.Beast per massimizzare engagement e viralità.

REGOLE ASSOLUTE:
- Ogni contenuto DEVE essere 100% specifico per il topic dato. MAI frasi generiche.
- Hook potente nei primi 3 secondi che ferma lo scroll
- Numeri concreti, fatti reali, statistiche verificabili
- Parla direttamente al lettore con "tu"
- CTA forte e specifica
- Emojis strategici (non casuali)
- NO frasi fatte come "Solo 5 posti disponibili" o "87% delle persone"
- Ogni frase deve aggiungere valore specifico al topic${memoriesContext}${photosContext}

Rispondi SOLO con un JSON valido, nessun altro testo.`;

    const userPrompt = `Genera un contenuto ${postType || "carosello"} per ${platform || "Instagram"} su: "${topic.trim()}"

Target: ${audience || "pubblico generale"}
Tono: ${tone || "professionale"}
Numero slide: ${slidesCount}

Rispondi con questo JSON esatto:
{
  "content": "Il testo completo del post (copy principale con hook, corpo, CTA)",
  "slides": [
    {
      "title": "TITOLO SLIDE (max 6 parole, impattante)",
      "subtitle": "Sottotitolo specifico per il topic",
      "body": "Corpo slide con contenuto di valore specifico",
      "cta": "Call to action (solo ultima slide, le altre null)"${userPhotos?.length ? ',\n      "suggested_photo_index": 0' : ''}
    }
  ]
}

Le slide devono seguire questa struttura narrativa:
- Slide 1: HOOK - Cattura attenzione con fatto scioccante specifico sul topic
- Slide 2: PROBLEMA - Descrivi il problema reale che il target vive
- Slide 3-${slidesCount - 1}: SOLUZIONE - Steps concreti, consigli pratici, prove
- Slide ${slidesCount}: CTA - Riassunto + call to action forte

IMPORTANTE: Ogni slide deve contenere informazioni SPECIFICHE e UNICHE sul topic "${topic.trim()}". Zero frasi generiche.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Riprova tra qualche secondo." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti. Aggiungi crediti al workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) throw new Error("No content returned from AI");

    let parsed;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        content: rawContent,
        slides: Array.from({ length: slidesCount }, (_, i) => ({
          title: i === 0 ? "SCOPRI DI PIÙ" : `PUNTO ${i}`,
          subtitle: topic,
          body: i === 0 ? rawContent.substring(0, 200) : "",
          cta: i === slidesCount - 1 ? "Contattaci ora" : null,
        })),
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
