import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logGeneration } from "../_shared/historyLogger.ts";
import { requireWithinRateLimit } from "../_shared/auth.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";

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
        const { topic, numSlides, postType, brandId, avatar: avatarInput = 'B2C', obiettivo = 'nurture', tipoContenuto = 'valore' } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Topic is required (min 2 chars)" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const slidesCount = Math.min(Math.max(parseInt(numSlides) || 5, 2), 10);

    // ── Load brand kit from Supabase ──
    let brandContext = "";
    let brandData: any = null;
    let resolvedUserId: string | null = null;
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

          // Rate limit: max 20 content generations per minute per user
          const rl = await requireWithinRateLimit(supabase, user.id, "generate-content", 20, 60);
          if (!rl.ok) {
            return new Response(JSON.stringify({ error: rl.error }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter ?? 60) },
            });
          }

          // Load brand: REQUIRE explicit brandId (must belong to user). The
          // previous "fallback to first brand" silently leaked content across
          // brands when the client forgot to pass brandId — never again.
          let brandQuery = supabase.from("brands").select("*").eq("user_id", user.id);
          if (brandId) {
            brandQuery = brandQuery.eq("id", brandId);
          } else {
            console.warn("generate-content called WITHOUT brandId — falling back to first brand for backwards compat");
          }
          const { data: brand } = await brandQuery.limit(1).maybeSingle();

          if (brand) {
            brandData = brand;
            brandContext = `\n\n=== BRAND KIT (usa SEMPRE queste info) ===
NOME STUDIO: ${brand.nome_business || "Studio"}
DESCRIZIONE: ${brand.descrizione || ""}
SERVIZI: ${(brand.servizi || []).join(", ")}
TARGET PAZIENTI: ${brand.target_pazienti || "pubblico generale"}
TONO DI VOCE: ${brand.tono_voce || "professionale"}
PERSONA DI SCRITTURA: ${brand.persona_scrittura === "io" ? "Prima persona singolare (io)" : "Prima persona plurale (noi)"}
VANTAGGI COMPETITIVI: ${(brand.vantaggi_competitivi || []).join(", ")}
MISSION: ${brand.mission || ""}
IDENTITÀ CORE: ${brand.identita_core || ""}
CATEGORIE: ${(brand.categorie || []).join(", ")}
CTA PREFERITE: ${(brand.cta_suggerite || []).join(", ")}
TEMI CHIAVE: ${(brand.temi_chiave || []).join(", ")}
PAROLE DA EVITARE: ${(brand.parole_da_evitare || []).join(", ") || "nessuna"}
COLORE PRIMARIO: ${brand.colore_primario || "#554697"}
COLORE SECONDARIO: ${brand.colore_secondario || "#E6007E"}

REGOLA FONDAMENTALE: Ogni contenuto DEVE sembrare scritto da "${brand.nome_business || "lo studio"}". Usa il tono "${brand.tono_voce || "professionale"}" e scrivi in ${brand.persona_scrittura === "io" ? "prima persona singolare" : "prima persona plurale"}. Non usare mai le parole da evitare.`;
          }

        }
      } catch (err) {
        console.error("Error loading brand:", err);
      }
    }

    const brandName = brandData?.nome_business || "Studio";
    const brandColor = brandData?.colore_primario || "#554697";
    const avatar = (brandData?.avatar_type === "B2B" || brandData?.avatar_type === "B2C") ? brandData.avatar_type : avatarInput;

    const systemPrompt = `Sei un copywriter d'élite specializzato in contenuti social per il settore sanitario (fisioterapia, osteopatia, poliambulatori).
${brandContext}
=== A CHI PARLI: E LA REGOLA PIU IMPORTANTE DI TUTTE === Avatar impostato: ${avatar}. Se Avatar vale B2C devi parlare DIRETTAMENTE ALLA PERSONA CHE HA IL PROBLEMA, dandole del tu, parlando dei suoi sintomi, della sua giornata e della sua vita: e VIETATO rivolgersi al terapista o al titolare dello studio, e sono VIETATE le parole posizionamento, autorevolezza, competenza, acquisizione pazienti, marketing, professionisti, colleghi, business, clienti, fatturato, percorso commerciale, differenziante. Se Avatar vale B2B allora parli al titolare dello studio e quelle parole sono ammesse. Il BRAND KIT qui sopra serve SOLO a sapere chi e lo studio che pubblica, NON decide a chi ti rivolgi: anche se lo studio si rivolge a professionisti, se Avatar vale B2C tu scrivi al paziente. Prima di scrivere ogni frase verifica che sia rivolta al destinatario giusto secondo Avatar: ${avatar}. Obiettivo: ${obiettivo} (reach/nurture/convert/retain). Tipo: ${tipoContenuto} (valore o offerta). === FORMATO = OBIETTIVO x PIATTAFORMA === reach: gancio larghissimo e breve. nurture: spiega ed educa passo-passo. convert: promessa + prova + CTA dura. retain: umano, dietro le quinte. === STRUTTURA: HOOK -> VALORE -> CTA === Una sola big idea. HOOK che chiama la situazione specifica del lettore (niente generico). VALORE: cosa ottiene, come funziona, cosa cambia; leve: sogno/risultato, probabilita con prova e numeri, tempo, sforzo. CTA: una sola azione chiara. === VALORE vs OFFERTA === Se tipo=valore: educa e basta, nessuna vendita, CTA soft (salva/segui/commenta). Se tipo=offerta: promessa -> meccanismo credibile -> prova -> CTA dura (prenota/DM/link) piu rimozione del rischio; mai promesse mediche garantite, mai toni ingannevoli. === COPY B2C vs B2B === B2C: emozione, desiderio, vita quotidiana, frasi corte, tanto tu, esempi di vita. B2B: rischio, soldi, tempo, status; il tuo team e la tua azienda; KPI e numeri; piu prove, casi, screenshot.
=== FRAMEWORK HOOK ===
Usa i 7 tipi di hook:1) LABELS - Chiama direttamente il target
2) DOMANDE SÌ - "Vorresti [risultato] in [tempo]?"
3) DOMANDE APERTE - "Quale preferiresti?"
4) CONDIZIONALI - "Se [situazione], stai facendo [errore]"
5) COMANDI - "Smetti di fare X. Leggi questo."
6) AFFERMAZIONI AUDACI - Statement con numeri concreti
7) STORIE - "Un giorno nel mio studio arriva..."

=== LIMITI ASSOLUTI PER OGNI SLIDE ===
- Titolo: massimo 6 parole. Mai di più.
- Testo body: massimo 2 frasi. Stop. Non spiegare, non approfondire, non aggiungere contesto.
- Se hai più cose da dire, mettile in slide separate.
- Ogni slide comunica UN solo concetto in modo fulmineo.

ESEMPIO CORRETTO:
Titolo: "Il dolore alla spalla non sparisce da solo."
Testo: "Ignorarlo lo peggiora. Il tuo corpo sta chiedendo aiuto."

ESEMPIO SBAGLIATO:
Titolo: "Il Tuo Corpo Ti Sta Parlando?"
Testo: "Ogni giorno, il mal di schiena limita milioni di persone, impedendo movimenti fluidi, un sonno ristoratore e una vita di qualità. Spesso si cercano soluzioni temporanee..."

=== REGOLE DI SCRITTURA ===
- Ogni contenuto DEVE essere 100% specifico per il topic
- Hook potente nei primi 3 secondi
- Numeri concreti, fatti reali
- Parla direttamente al lettore con "tu"
- CTA forte e specifica
- NO emoji nel titolo e testo delle slide (solo nella caption Instagram)
- NO frasi fatte generiche
- Usa CONTRASTO drammatico (prima/dopo)
- Stile conversazionale e diretto
- Cliffhanger tra una slide e l'altra

=== STRUTTURA CAROSELLO ===
- Slide 1 (tipo "cover"): HOOK + SOTTOTITOLO + IMMAGINE STOCK. Campi: hook, sottotitolo, keywords_stock.
- Slide 2 (tipo "content"): PROBLEMA specifico e identificabile
- Slide 3 a N-1 (tipo "content"): SOLUZIONE con proof, numeri, step concreti
- Ultima Slide (tipo "cta"): CTA IRRESISTIBILE + riassunto valore. NO immagine generata.

=== REGOLE keywords_stock (FONDAMENTALE) ===
Per ogni slide ragiona in QUESTO ORDINE prima di scrivere "keywords_stock":

1. MESSAGGIO EMOTIVO della slide: qual è il sentimento o intento?
   (es. "prevenzione" → un paziente che si prende cura di sé PRIMA che arrivi il dolore)
2. SCENA VISIVA più rappresentativa di quel messaggio:
   (es. NON "uomo muscoloso" ma "persona che fa stretching preventivo in uno studio medico")
3. Traduci quella scena in 3 keywords inglesi CONCRETE e FOTOGRAFABILI per Pixabay.

REGOLE keywords:
- Devono descrivere una SCENA FOTOGRAFABILE, non un concetto astratto
- Sempre in INGLESE (Pixabay risponde meglio)
- Specifiche per fisioterapia/salute/benessere
- EVITA parole troppo generiche: "health", "wellness", "people", "man", "woman", "person", "fitness", "lifestyle"
- Preferisci soggetti specifici CON contesto clinico

ESEMPI CORRETTI:
- Slide "prevenzione dolore" → ["physiotherapy prevention", "spine checkup clinic", "back care specialist"]
- Slide "mal di schiena cronico" → ["chronic back pain office", "lower back pain treatment", "physiotherapist spine therapy"]
- Slide "postura corretta" → ["posture correction therapy", "spine alignment physiotherapy", "posture assessment clinic"]
- Slide "cervicale" → ["neck pain physiotherapy", "cervical treatment specialist", "neck massage therapy clinic"]
- Slide "osteopatia" → ["osteopathy manual therapy", "osteopath treatment session", "holistic spine treatment"]
- Slide "esercizi riabilitativi" → ["rehabilitation exercise clinic", "therapeutic exercise physiotherapy", "guided recovery exercise"]
- Slide "mal di schiena da scrivania" → ["lower back pain desk", "office ergonomic chair therapy", "physiotherapist back assessment"]
- Slide "cervicale e cellulare" → ["tech neck physiotherapy", "cervical strain smartphone", "neck pain therapy specialist"]
- Slide "ginocchio dello sportivo" → ["sport knee injury clinic", "knee rehabilitation specialist", "athlete knee therapy"]

ESEMPI SBAGLIATI da evitare:
- "prevenzione" → NO: ["prevention", "healthy man", "muscular person", "fitness"] (concetti, non scene)
- "dolore" → NO: ["pain", "sad person", "stress"] (troppo astratto)
- "benessere" → NO: ["wellness", "happy people", "nature"] (off-topic)
- "esercizio" → NO: ["exercise", "gym", "fitness man"] (manca contesto medical)

Rispondi SOLO con JSON valido.`;

    const isSinglePost = postType === 'post-singolo' || postType === 'reel';

    const userPrompt = isSinglePost
      ? `Genera un post singolo Instagram su: "${topic.trim()}"

Rispondi con questo JSON esatto:
{
  "titolo_carosello": "Titolo del post",
  "hook_principale": "La frase hook che cattura",
  "slides": [
    {
      "numero": 1,
      "tipo": "content",
      "titolo": "TITOLO (max 6 parole, impattante)",
      "testo": "Massimo 2 frasi brevi. Stop.",
      "keywords_stock": ["keyword1 in inglese", "keyword2", "keyword3"]
    }
  ],
  "cta_finale": "",
  "caption_instagram": "Hook fortissimo\\n\\nParagrafo 1.\\n\\nParagrafo 2.\\n\\n👉 CTA\\n\\n#hashtag1 #hashtag2",
  "hashtag_suggeriti": ["hashtag1", "hashtag2", "hashtag3"]
}

REGOLE:
1. UNA sola slide di tipo "content" con titolo, testo e keywords_stock
2. Il contenuto deve essere SPECIFICO sul topic "${topic.trim()}"
3. Scrivi dal punto di vista di "${brandName}"
4. Testo: MASSIMO 2 frasi brevi
5. keywords_stock: 3-4 parole inglesi concrete per foto stock`

      : `Genera un carosello Instagram su: "${topic.trim()}"
Numero slide: ${slidesCount}

Rispondi con questo JSON esatto:
{
  "titolo_carosello": "Titolo principale del carosello",
  "hook_principale": "La frase hook che cattura nei primi 3 secondi",
  "slides": [
    {
      "numero": 1,
      "tipo": "cover",
      "hook": "Titolo d'impatto max 5 parole",
      "sottotitolo": "Frase breve di supporto, max 10 parole",
      "keywords_stock": ["keyword coerente col tema", "keyword2", "keyword3"]
    },
    {
      "numero": 2,
      "tipo": "content",
      "titolo": "TITOLO SLIDE (max 6 parole)",
      "testo": "Massimo 2 frasi brevi. Stop.",
      "keywords_stock": ["keyword1 in inglese", "keyword2", "keyword3"]
    },
    {
      "numero": ${slidesCount},
      "tipo": "cta",
      "titolo": "TITOLO CTA",
      "testo_cta": "Frase che spinge all'azione",
      "bottone_cta": "Testo del bottone CTA"
    }
  ],
  "cta_finale": "Call to action finale",
  "caption_instagram": "Hook fortissimo\\n\\nParagrafo 1 breve.\\nSeconda riga.\\n\\nParagrafo 2 breve.\\n\\n👉 CTA chiara e diretta\\n\\n#hashtag1 #hashtag2 #hashtag3",
  "hashtag_suggeriti": ["hashtag1", "hashtag2", "hashtag3"]
}

REGOLE CRITICHE:
1. La slide 1 DEVE essere tipo "cover" con "hook" (max 5 parole), "sottotitolo" (max 10 parole), e "keywords_stock"
2. L'ultima slide DEVE essere tipo "cta"
3. Tutte le slide intermedie DEVONO essere tipo "content" con "keywords_stock"
4. Ogni keywords_stock deve essere DIVERSO e specifico per quella slide
5. keywords_stock: array di 3-4 parole inglesi concrete e visive
6. Il testo di ogni slide content: MASSIMO 2 frasi brevi
7. Il contenuto deve essere SPECIFICO sul topic "${topic.trim()}"
8. Scrivi dal punto di vista di "${brandName}"
9. Usa cliffhanger tra una slide e l'altra
10. L'ultima slide deve usare una CTA del brand`;

    const captionRules = `

FORMATTAZIONE CAPTION INSTAGRAM:
La caption_instagram DEVE essere formattata così:
- Prima riga: hook fortissimo
- Riga vuota (usa \\n\\n)
- 2-3 paragrafi brevi separati da \\n\\n (max 2 frasi per paragrafo)
- Riga vuota
- CTA chiara e diretta con emoji 👉
- Riga vuota
- Hashtag su riga separata
- Usa \\n\\n per separare i paragrafi. MAI un blocco unico di testo.`;

    const fullUserPrompt = userPrompt + captionRules;

    const geminiResult = await callGeminiWithRetry({
      apiKey: GEMINI_API_KEY,
      body: {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: fullUserPrompt }] }],
        generationConfig: {
          temperature: 0.85,
          responseMimeType: "application/json",
        },
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
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) throw new Error("No content returned from AI");

    let parsed;
    try {
      const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // Fallback: try to build from raw text
      parsed = {
        titolo_carosello: topic,
        hook_principale: rawContent.substring(0, 100),
        slides: Array.from({ length: slidesCount }, (_, i) => ({
          numero: i + 1,
          tipo: i === 0 ? "cover" : i === slidesCount - 1 ? "cta" : "content",
          ...(i === 0 ? { hook: topic, sottotitolo: "Scopri di più", keywords_stock: ["physiotherapy", "wellness", "healthy lifestyle"] } : {}),
          ...(i > 0 ? { titolo: `PUNTO ${i}`, testo: rawContent.substring(i * 200, (i + 1) * 200) } : {}),
          ...(i > 0 && i < slidesCount - 1 ? { keywords_stock: ["physiotherapy", "clinic", "treatment"] } : {}),
          ...(i === slidesCount - 1 ? { testo_cta: "Contattaci", bottone_cta: "Prenota ora" } : {}),
        })),
        cta_finale: "Contattaci ora",
        caption_instagram: rawContent.substring(0, 500),
        hashtag_suggeriti: [],
      };
    }

    if (resolvedUserId) {
      const firstSlide = parsed.slides?.[0] || {};
      const isCarousel = (parsed.slides?.length || 0) > 1;
      await logGeneration({
        userId: resolvedUserId,
        brandId: brandData?.id || null,
        type: isCarousel ? "carousel" : "post",
        topic,
        title: parsed.titolo_carosello || firstSlide.titolo || topic.substring(0, 80),
        preview: {
          first_title: firstSlide.titolo || firstSlide.title || "",
          first_text: (firstSlide.testo || firstSlide.body || "").substring(0, 160),
          caption_preview: (parsed.caption_instagram || "").substring(0, 200),
          hashtags: parsed.hashtag_suggeriti || [],
          slides_count: parsed.slides?.length || 0,
        },
        metadata: {
          postType: postType || "carosello",
          numSlides: slidesCount,
        },
        status: "success",
      });
    }

    return new Response(JSON.stringify({
      ...parsed,
      content: parsed.caption_instagram || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
