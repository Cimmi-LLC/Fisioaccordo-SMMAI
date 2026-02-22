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
                  return \`- [\${typeLabel}] \${m.content}\`;
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
        userPhotos.map((p: string, i: number) => \`- Foto \${i + 1}: \${p}\`).join("\n") +
        "\nSuggerisci quale foto usare per ogni slide nel campo 'suggested_photo_index'.";
    }

    const systemPrompt = \`Sei un copywriter d'élite con 20+ anni di esperienza, formato sui $100M Playbook di Alex Hormozi.
Il tuo stile combina: Iman Gadzhi (diretto, carismatico, orientato ai risultati), Mr.Beast (retention e viralità), Alex Hormozi (hook scientifici e proof-based marketing).

=== FRAMEWORK HOOK ($100M HOOKS PLAYBOOK) ===
Usa i 7 tipi di hook di Hormozi in OGNI contenuto:
1) LABELS - Chiama direttamente il target ("Fisioterapisti, devo dirvi una cosa...")
2) DOMANDE SÌ - "Vorresti [risultato desiderato] in [tempo specifico]?"
3) DOMANDE APERTE - "Quale preferiresti essere?"
4) CONDIZIONALI - "Se [situazione del target], stai facendo [errore specifico]"
5) COMANDI - "Smetti di fare X. Leggi questo."
6) AFFERMAZIONI AUDACI - Statement con numeri concreti
7) STORIE - "Un giorno nel mio studio arriva questo paziente..."
REGOLA: Spendi l'80% del tuo sforzo sull'hook. L'hook determina TUTTO.

=== FRAMEWORK PROOF ($100M PROOF CHECKLIST) ===
"La tua promessa NON è un differenziatore. La tua PROVA lo è."
- 80% degli ads vincenti sono basati su PROOF, non educazione
- RAW > PRODOTTO (video iPhone batte produzione Hollywood)
- MOSTRA > RACCONTA (fai vedere, non descrivere)
- NUMERI SPECIFICI > GENERICO ("171 nuovi pazienti a 500€" batte "tanti nuovi pazienti")
- PERSONALE > GENERICO (dolore specifico, non frasi fatte)
- Usa la formula: NON provare la tua promessa → PROMETTI la tua prova

=== FRAMEWORK BRANDING ($100M BRANDING) ===
- Buon branding = associare il business con cose che il pubblico AMA
- Ogni contenuto deve costruire: REACH + INFLUENCE + DIRECTION (verso di te)
- Il contenuto deve far pensare "questo è per ME" e "questa persona MI capisce"

=== FRAMEWORK LTV ($100M LIFETIME VALUE) ===
- Ogni contenuto deve implicitamente posizionare per UPSELL e fidelizzazione
- Mostra il valore del percorso completo, non solo della singola seduta
- "Chi rende il cliente più prezioso della concorrenza, VINCE"

=== FRAMEWORK LEAD NURTURE ($100M LEAD NURTURE) ===
- CTA deve ridurre l'attrito: più slot, risposta veloce, personalizzazione
- Volume di touchpoint: mai un solo CTA, costruisci una sequenza
- "Se non si presentano, non possono comprare"

=== REGOLE ASSOLUTE DI SCRITTURA ===
- Ogni contenuto DEVE essere 100% specifico per il topic. MAI frasi generiche.
- Hook potente nei primi 3 secondi che ferma lo scroll
- Numeri concreti, fatti reali, statistiche verificabili
- Parla direttamente al lettore con "tu"
- CTA forte e specifica con basso attrito
- Emojis strategici (non casuali, max 2-3 per slide)
- NO frasi fatte come "Solo 5 posti disponibili" o "87% delle persone"
- Ogni frase deve aggiungere valore specifico al topic
- Usa CONTRASTO drammatico (prima/dopo, problema/soluzione)
- Ogni slide deve contenere un "momento WOW" o insight unico
- Lo stile deve essere conversazionale e diretto, come parlare a un amico
- Usa la tecnica del cliffhanger: ogni slide deve far venire voglia di leggere la successiva
- Alterna tra dati/fatti e storie/emozioni per mantenere engagement alto

=== STRUTTURA NARRATIVA AVANZATA ===
Per caroselli usa questa struttura:
- Slide 1: HOOK ESPLOSIVO (usa uno dei 7 tipi Hormozi) + promessa di valore
- Slide 2: PROBLEMA con dolore specifico e identificabile (il lettore deve pensare "questo sono IO")
- Slide 3-N: SOLUZIONE con proof, numeri, storie brevi, step concreti (ogni slide = 1 concetto chiaro)
- Ultima Slide: CTA con urgenza naturale + riassunto del valore + prossimo step chiarissimo\${memoriesContext}\${photosContext}

Rispondi SOLO con un JSON valido, nessun altro testo.\`;

    const userPrompt = \`Genera un contenuto \${postType || "carosello"} per \${platform || "Instagram"} su: "\${topic.trim()}"

Target: \${audience || "pubblico generale"}
Tono: \${tone || "professionale"}
Numero slide: \${slidesCount}

Rispondi con questo JSON esatto:
{
  "content": "Il testo completo del post (copy principale con hook esplosivo, corpo ricco di valore, CTA forte)",
  "slides": [
    {
      "title": "TITOLO SLIDE (max 6 parole, impattante, usa contrasto o numeri)",
      "subtitle": "Sottotitolo specifico che espande il titolo con un insight unico",
      "body": "Corpo slide con contenuto di valore concreto - numeri, storie, proof, step actionable",
      "cta": "Call to action (solo ultima slide, le altre null)"\${userPhotos?.length ? ',\\n      "suggested_photo_index": 0' : ''}
    }
  ]
}

STRUTTURA NARRATIVA OBBLIGATORIA:
- Slide 1: HOOK ESPLOSIVO - Usa uno dei 7 tipi di Hormozi. Fatto scioccante O domanda impossibile da ignorare O storia che cattura
- Slide 2: IL PROBLEMA - Dolore specifico e identificabile. Il lettore deve pensare "questo sono IO". Dettagli concreti, non generici.
- Slide 3-\${slidesCount - 1}: LA SOLUZIONE - Ogni slide = 1 concetto chiaro con proof. Usa numeri, case study brevi, step actionable. Alterna dati e storie. Ogni slide deve avere un "momento WOW".
- Slide \${slidesCount}: CTA IRRESISTIBILE - Riassumi il valore. CTA con basso attrito. Urgenza naturale (non finta).

REGOLE CRITICHE:
1. Ogni slide deve contenere informazioni SPECIFICHE e UNICHE sul topic "\${topic.trim()}"
2. Zero frasi generiche. Se potrebbe applicarsi a qualsiasi settore, RISCRIVILA.
3. Usa la tecnica del cliffhanger tra una slide e l'altra
4. Il body di ogni slide deve essere sostanzioso (3-5 frasi minimo con valore reale)
5. Scrivi come Hormozi: diretto, con numeri, prove concrete, e un pizzico di provocazione\`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${LOVABLE_API_KEY}\`,
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
      throw new Error(\`AI gateway error: \${status}\`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) throw new Error("No content returned from AI");

    let parsed;
    try {
      const jsonStr = rawContent.replace(/\`\`\`json\\n?/g, "").replace(/\`\`\`\\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        content: rawContent,
        slides: Array.from({ length: slidesCount }, (_, i) => ({
          title: i === 0 ? "SCOPRI DI PIÙ" : \`PUNTO \${i}\`,
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
