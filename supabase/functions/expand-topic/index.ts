import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TopicIdea {
  titolo: string;
  hook: string;
  formato: string;
  focus: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, count } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: "topic obbligatorio (min 2 caratteri)" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const n = Math.max(2, Math.min(6, parseInt(String(count)) || 3));

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Optional brand context (lightweight, just for tone alignment)
    let brandHint = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") || "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: brand } = await supabase
            .from("brands")
            .select("nome_business, target_pazienti, categorie, temi_chiave")
            .eq("user_id", user.id)
            .maybeSingle();
          if (brand) {
            brandHint = `\n\nCONTESTO BRAND:
- Studio: ${brand.nome_business || "studio fisioterapico"}
- Target: ${brand.target_pazienti || "pubblico generale"}
- Categorie: ${(brand.categorie || []).join(", ") || "fisioterapia"}
- Temi chiave: ${(brand.temi_chiave || []).join(", ")}`;
          }
        }
      } catch { /* non-blocking */ }
    }

    const systemPrompt = `Sei un content strategist per studi di fisioterapia su Instagram. Devi proporre idee di post AUTONOME e COMPLETAMENTE DIVERSE tra loro, mai variazioni dello stesso angolo. Rispondi SOLO con JSON valido.`;

    const userPrompt = `Topic generale: "${topic}"

Genera ESATTAMENTE ${n} idee di post Instagram DIVERSE TRA LORO sul topic sopra. Ogni idea deve essere:
- AUTONOMA (un post completo, non parte di una serie)
- DIVERSA dalle altre per ANGOLO, FORMATO e FOCUS specifico
- ESEGUIBILE come post a sé stante

Mix obbligatorio di formati: educativo (lista numerata), mito da sfatare, segnali d'allarme, esercizi pratici, errori comuni, caso reale/storia, prevenzione, quando consultare uno specialista, miti vs realtà. Scegli ${n} formati DIVERSI.

Esempio per topic "mal di schiena":
[
  {"titolo": "3 segnali d'allarme che il tuo mal di schiena non è solo stanchezza", "hook": "Non tutti i dolori lombari sono uguali. Ecco quando devi preoccuparti.", "formato": "segnali_allarme", "focus": "red_flag clinici da non sottovalutare"},
  {"titolo": "2 esercizi che fanno sparire il dolore lombare in 5 minuti", "hook": "Provati su 200+ pazienti. Si fanno a casa, senza attrezzi.", "formato": "esercizi_pratici", "focus": "esercizi mobility lombare"},
  {"titolo": "Smettila di credere che il riposo guarisca il mal di schiena", "hook": "Il movimento controllato batte il riposo nel 90% dei casi. Ecco perché.", "formato": "mito_sfatato", "focus": "movimento vs riposo"},
  {"titolo": "I 4 errori che fai alla scrivania e che ti rovinano la schiena", "hook": "Postura, monitor, sedia, pause: il combo perfetto del disastro.", "formato": "errori_comuni", "focus": "ergonomia ufficio"}
]

Per il topic "${topic}", produci ${n} idee diverse seguendo questo schema esatto. ${brandHint}

Restituisci SOLO un array JSON, niente altro.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.95,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let ideas: TopicIdea[] = [];
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      ideas = Array.isArray(parsed) ? parsed : (parsed.ideas || parsed.posts || []);
    } catch (err) {
      console.error("Parse error:", err, "raw:", raw.substring(0, 300));
      throw new Error("Risposta Gemini non parsabile");
    }

    const valid = ideas
      .filter((i) => i && typeof i.titolo === "string" && i.titolo.trim().length > 3)
      .slice(0, n)
      .map((i) => ({
        titolo: i.titolo.trim(),
        hook: (i.hook || "").trim(),
        formato: (i.formato || "").trim(),
        focus: (i.focus || "").trim(),
      }));

    if (valid.length === 0) {
      throw new Error("Nessuna idea valida generata");
    }

    return new Response(JSON.stringify({ ideas: valid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expand-topic error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
