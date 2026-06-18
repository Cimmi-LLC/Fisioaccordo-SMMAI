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
    const { topic, numSlides, postType, brandId } = await req.json();

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
            const persona = brand.persona_scrittura === "io" ? "prima persona singolare (io / il mio studio)" : "prima persona plurale (noi / nel nostro studio)";
            const cta = (brand.cta_suggerite || []).filter(Boolean);
            const vantaggi = (brand.vantaggi_competitivi || []).filter(Boolean);
            const paroleEvitare = (brand.parole_da_evitare || []).filter(Boolean);
            const temi = (brand.temi_chiave || []).filter(Boolean);
            const servizi = (brand.servizi || []).filter(Boolean);

            brandContext = `

=== BRAND: ${brand.nome_business || "Studio"} ===
${brand.descrizione ? `Descrizione: ${brand.descrizione}` : ""}
${brand.mission ? `Mission: ${brand.mission}` : ""}
${brand.identita_core ? `Identità: ${brand.identita_core}` : ""}

=== TARGET PAZIENTI (a chi stai parlando in OGNI slide) ===
${brand.target_pazienti || "pubblico generale"}
→ Ogni hook, esempio, scenario DEVE risuonare con questo target. Mai parlare a "tutti".

=== VOCE OBBLIGATORIA ===
Tono: ${brand.tono_voce || "professionale"}
Persona: ${persona}
${persona.includes("singolare") ? "→ Usa 'io', 'il mio studio', 'nel mio lavoro vedo…'. MAI 'noi' o 'il nostro team'." : "→ Usa 'noi', 'nel nostro studio', 'i nostri pazienti'. MAI 'io' o 'il mio lavoro'."}

=== SERVIZI DEL BRAND (riferisciti SOLO a questi) ===
${servizi.length > 0 ? servizi.join(" · ") : "(generici)"}
→ La CTA finale e gli esempi di servizio devono riferirsi a UNO di questi, mai inventare servizi diversi.

${vantaggi.length > 0 ? `=== VANTAGGI COMPETITIVI (cita almeno UNO in una slide content) ===
${vantaggi.map((v: string, i: number) => `${i + 1}. ${v}`).join("\n")}
→ Almeno una slide deve trasformare uno di questi vantaggi in un beneficio concreto per il paziente.
` : ""}
${cta.length > 0 ? `=== CTA APPROVATE DAL BRAND (scegline UNA per cta_finale / bottone_cta) ===
${cta.map((c: string) => `• ${c}`).join("\n")}
→ Non inventare CTA fuori da questa lista. Adatta il fraseggio al topic ma resta nel set.
` : ""}
${temi.length > 0 ? `=== TEMI CHIAVE del brand: ${temi.join(", ")}
→ Se il topic ne tocca uno, sfruttalo per creare connessione col brand.
` : ""}
${paroleEvitare.length > 0 ? `=== PAROLE/ESPRESSIONI BANDITE (output rifiutato se le usi) ===
${paroleEvitare.map((p: string) => `❌ ${p}`).join("\n")}
` : ""}
${brand.categorie?.length ? `Categorie cliniche: ${brand.categorie.join(", ")}` : ""}
COLORI BRAND: primario ${brand.colore_primario || "#554697"}, secondario ${brand.colore_secondario || "#E6007E"}

REGOLA FONDAMENTALE: il contenuto deve sembrare scritto DA "${brand.nome_business || "lo studio"}", non da un'agenzia generica. Se rileggendo il copy non si capisce CHE È IL BRAND a parlare (vs. qualsiasi altro studio), riscrivilo.`;
          }

        }
      } catch (err) {
        console.error("Error loading brand:", err);
      }
    }

    const brandName = brandData?.nome_business || "Studio";
    const brandColor = brandData?.colore_primario || "#554697";

    const systemPrompt = `Sei un copywriter d'élite specializzato in contenuti social per il settore sanitario (fisioterapia, osteopatia, poliambulatori). Formazione: $100M Playbook di Alex Hormozi.
${brandContext}

=== FRAMEWORK HOOK ===
Usa i 7 tipi di hook di Hormozi:
1) LABELS - Chiama direttamente il target
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
- Numeri concreti, fatti reali (NO statistiche inventate o non verificabili)
- Parla direttamente al lettore con "tu"
- CTA scelta dalla lista approvata del brand (mai inventata)
- NO emoji nel titolo e testo delle slide (solo nella caption Instagram)
- NO frasi fatte generiche
- Usa CONTRASTO drammatico (prima/dopo)
- Stile conversazionale e diretto
- Cliffhanger tra una slide e l'altra

=== HOOK / FRASI BANDITE (output rifiutato se le usi) ===
Sono tutte sentite mille volte, indeboliscono il messaggio:
❌ "Il tuo corpo ti sta parlando"
❌ "Sapevi che…?"
❌ "X cose che non sai su…"
❌ "Non sottovalutare…"
❌ "La verità su…"
❌ "Attenzione!"
❌ "Devi assolutamente…"
❌ "X consigli/segreti per…"
❌ "Il modo migliore per…"
❌ "Ecco perché…"
❌ "Continua a leggere per scoprire…"
❌ Domande retoriche generiche tipo "Mai capitato che…?"
USA INVECE: scenari concreti ("Ieri in studio…"), numeri specifici ("3 settimane dopo l'infortunio…"),
contrasti netti ("Pensavi fosse stress. Era il diaframma."), label sul target ("A te che corri 30 km a settimana:").

=== ANTI-GENERICO (banned) ===
❌ "milioni di persone soffrono di…"
❌ "ognuno di noi ha vissuto…"
❌ "in un mondo in cui…"
❌ "la salute è importante"
❌ "prendersi cura di sé"
❌ "il benessere è la chiave"
Sono frasi vuote. Sostituisci con casi concreti, persone reali del target.

=== STRUTTURA CAROSELLO ===
- Slide 1 (tipo "cover"): HOOK ad alta tensione che identifica il target o lo scenario specifico.
  Campi: hook (max 5 parole, niente domande generiche), sottotitolo (≤10 parole), keywords_stock.
- Slide 2 (tipo "content"): PROBLEMA in scena concreta — un caso/scenario riconoscibile dal target.
  Niente "molte persone soffrono di X". Sì "se hai dolore alla schiena dopo 30 minuti seduto…".
- Slide 3 (tipo "content"): CAUSA NON OVVIA — l'insight che cambia prospettiva.
  Tipo: "Non è la postura. È che il diaframma non si espande." Differenzia dal banale.
- Slide 4..N-1 (tipo "content"): SOLUZIONE con step misurabili / proof concreta.
  Cita un servizio del brand quando ha senso. Includi tempo/numero ("in 3 sessioni…", "il 70% dei pazienti…")
  SOLO se il brand l'ha fornito nei vantaggi competitivi; altrimenti usa quantitativi generici verificabili.
- Ultima Slide (tipo "cta"): CTA dalla lista BRAND. Aggancia il valore al servizio specifico.
  Es. "Prenota la valutazione gratuita" → riferisce a un servizio reale del brand.

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
3. Scrivi dal punto di vista di "${brandName}", rispettando la VOCE OBBLIGATORIA (io/noi)
4. Testo: MASSIMO 2 frasi brevi
5. keywords_stock: 3-4 parole inglesi concrete per foto stock
6. Niente frasi BANDITE (vedi system prompt), niente PAROLE BANDITE del brand
7. La caption_instagram deve riferirsi al TARGET PAZIENTI del brand e chiudere con UNA CTA APPROVATA

=== SELF-CHECK PRIMA DI RISPONDERE ===
[ ] Il TARGET PAZIENTI si riconosce dal post?
[ ] Voce io/noi rispettata?
[ ] Nessuna frase/parola bandita?
[ ] CTA dalla lista approvata?
Se anche solo UNA è NO, riscrivi.`

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
10. L'ultima slide deve usare UNA delle CTA APPROVATE dal brand (vedi sezione CTA APPROVATE sopra). Niente CTA inventate.

=== SELF-CHECK PRIMA DI RISPONDERE ===
Rileggi mentalmente l'output e verifica:
[ ] Nessuna frase nella lista BANDITE è presente?
[ ] Il TARGET PAZIENTI si riconosce dal copy (non sembra scritto "per tutti")?
[ ] La VOCE OBBLIGATORIA è rispettata (io vs noi)?
[ ] Almeno una slide usa un VANTAGGIO COMPETITIVO del brand?
[ ] La CTA finale è una di quelle approvate?
[ ] Nessuna PAROLA BANDITA è presente?
Se anche solo UNA risposta è NO, riscrivi prima di rispondere.`;

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
