import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logGeneration } from "../_shared/historyLogger.ts";
import { requireWithinRateLimit } from "../_shared/auth.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { resolveProfession, professionPromptBlock, type ResolvedProfession } from "../_shared/brand/profession.ts";

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
    let prof: ResolvedProfession = resolveProfession(null, topic);
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

          // Rate limit: max 20 scripts/min (each call generates one script;
          // the UI may parallelize up to 10 in a batch → leaves headroom)
          const rl = await requireWithinRateLimit(supabase, user.id, "generate-reel-script", 20, 60);
          if (!rl.ok) {
            return new Response(JSON.stringify({ error: rl.error }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter ?? 60) },
            });
          }

          let brandQuery = supabase.from("brands").select("*").eq("user_id", user.id);
          if (brandId) brandQuery = brandQuery.eq("id", brandId);
          const { data: brand } = await brandQuery.limit(1).maybeSingle();
          if (brand) {
            resolvedBrandId = brand.id;
            prof = resolveProfession(brand, topic);
            const isPlural = brand.persona_scrittura === "noi";
            brandCta = (brand.cta_suggerite || [])[0] || "Prenota ora";
            const frasiPazienti = (Array.isArray(brand.frasi_pazienti) ? brand.frasi_pazienti : []).filter(Boolean);
            const convinzione = typeof brand.convinzione_da_ribaltare === "string" ? brand.convinzione_da_ribaltare.trim() : "";
            brandContext = `
DATI DEL PROFESSIONISTA:
Nome/Studio: ${brand.nome_business || "Studio"}
Professione: ${prof.label}
Specializzazione: ${(brand.categorie || []).join(", ") || prof.profile.settore}
Servizi principali: ${(brand.servizi || []).join(", ")}
Target: ${brand.target_pazienti || "pubblico generale"}
Tone of voice: ${brand.tono_voce || "professionale"}
CTA preferita: ${brandCta}
Persona: ${isPlural ? "PLURALE (noi, offriamo, aiutiamo)" : "SINGOLARE (io, offro, aiuto)"}
${frasiPazienti.length > 0 ? `Frasi testuali dei pazienti (usa QUESTE parole, non le tue): ${frasiPazienti.map((f: string) => `«${f}»`).join(" · ")}` : ""}
${convinzione ? `Convinzione del settore da ribaltare quando il tema lo permette: «${convinzione}»` : ""}

REGOLA: Usa SEMPRE la persona ${isPlural ? "plurale" : "singolare"} in tutto lo script.`;
          }
        }
      } catch (e) { console.error("Brand load error:", e); }
    }

    const systemPrompt = `Scrivi script per video brevi (Reels/TikTok) col metodo Short Form Academy: ogni frase deve tenere lo spettatore fino alla successiva, e il copione deve poter essere DETTO AD ALTA VOCE da un professionista sanitario davanti al telefono.

PARLATO NATURALE (la regola più importante):
- Scrivi come si PARLA, non come si titola. Frasi intorno alle 8 parole, ma legate tra loro: una conversazione con UNA persona («tu»), non slogan staccati.
- VIETATO il ritmo a stacchi di 3-4 parole. Esempio SBAGLIATO: "Non la causa. Io cerco l'origine. Valuto il tuo corpo." Esempio GIUSTO: "Io non mi fermo al punto dove ti fa male: cerco da dove parte, e per farlo valuto come si muove tutto il corpo."
- Prova del nove: leggi lo script ad alta voce nella tua testa. Se suona da spot o da trailer, riscrivilo.
- Niente subordinate lunghe né incisi; livello prima media; ogni punto chiave detto due volte (nome + esempio o metafora).

CONTENUTO:
- Hook: nella PRIMA frase si capisce per chi è il video (la persona o il suo problema), poi il contrasto con quello che crede (contrarian take). Testo a schermo, parlato e immagine dicono la stessa cosa.
- Per i temi clinici (cervicale, schiena, ginocchio...): spiega il MECCANISMO in parole semplici (cosa succede nel corpo e perché) e indica nell'inquadratura il supporto visivo che lo mostra (schema, mano sul punto, movimento da fare). È il meccanismo che convince, non il ritmo.
- Valore vero entro i primi 5 secondi e almeno un consiglio applicabile subito, con numeri o tempi concreti (mai statistiche inventate).
- UNA SOLA CTA, alla fine, naturale come estensione del video. Mai CTA in mezzo.
- Zero gergo tecnico non spiegato, mai linguaggio aziendale, tono diretto e personale.
- Totale parole script: 130-150 (60 secondi di parlato).
${brandContext}

${professionPromptBlock(prof)}

Rispondi SOLO con JSON valido.`;

    const userPrompt = `TEMA DEL REEL: "${topic.trim()}"
DURATA: 60 secondi (circa 130-150 parole totali)

Scrivi la sceneggiatura con questa struttura:

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
  "caption_instagram": "Hook\\n\\nParagrafo 1\\n\\nParagrafo 2\\n\\n👉 CTA (niente hashtag qui: vanno solo in hashtag_suggeriti)",
  "hashtag_suggeriti": ["hashtag1", "hashtag2", "hashtag3"]
}`;

    const geminiResult = await callGeminiWithRetry({
      apiKey: GEMINI_API_KEY,
      body: {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.85, responseMimeType: "application/json" },
      },
    });

    if (!geminiResult.ok) {
      const userMsg = geminiResult.status === 503
        ? "Gemini è temporaneamente sovraccarico. Riprova tra 30 secondi."
        : geminiResult.status === 429
        ? "Quota Gemini superata. Riprova tra qualche minuto."
        : `Gemini API error: ${geminiResult.status}`;
      return new Response(JSON.stringify({ error: userMsg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = geminiResult.data;
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
        metadata: { professione: prof.id, professione_source: prof.source },
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
