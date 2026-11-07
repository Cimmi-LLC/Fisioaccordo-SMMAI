import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logGeneration } from "../_shared/historyLogger.ts";
import { requireWithinRateLimit } from "../_shared/auth.ts";
import { callGeminiWithRetry, type GeminiCallResult } from "../_shared/gemini.ts";
import { resolveProfession, professionPromptBlock, professionKeywordExamples, delLuogo, nelMioLuogo, ilCliente } from "../_shared/brand/profession.ts";
import {
  pubblicoDelBrand, formatoPerId, bloccoFormato, elencoFormati, regoleMetodo, SCHEMA_BRIEF,
  controlliMeccanici, promptGiudice, leggiGiudizio, type ContestoMetodo, type Giudizio,
} from "../_shared/brand/metodoCopy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Il corso chiede un modello forte per scrivere: pro per la stesura, flash
// se pro non risponde. Il giudice è flash, che basta per votare.
const MODELLI_STESURA = ["gemini-2.5-pro", "gemini-2.5-flash"];
const MODELLO_GIUDICE = "gemini-2.5-flash";
// Oltre questo tempo la riscrittura passa a flash, per stare nel limite
// della funzione.
const RISCRITTURA_PRO_ENTRO_MS = 55_000;

function testoRisposta(r: GeminiCallResult): string {
  return r.data?.candidates?.[0]?.content?.parts?.map((p: { text?: string; thought?: boolean }) => p.thought ? "" : (p.text || "")).join("") || "";
}

function leggiJson(raw: string): any | null {
  try {
    return JSON.parse(String(raw || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    return null;
  }
}

function corpoRichiesta(system: string, user: string, model: string, temperature: number) {
  return {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
      ...(model.includes("pro") ? { thinkingConfig: { thinkingBudget: 4096 } } : {}),
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const inizio = Date.now();
  try {
    const {
      topic, numSlides, postType, brandId,
      avatar: avatarInput = "B2C",
      formato: formatoRichiesto,
      angolo,
    } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Topic is required (min 2 chars)" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const slidesCount = Math.min(Math.max(parseInt(numSlides) || 5, 2), 10);

    // ── Load brand kit from Supabase ──
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
          if (brand) brandData = brand;
        }
      } catch (err) {
        console.error("Error loading brand:", err);
      }
    }

    const brandName = brandData?.nome_business || "Studio";

    // Professione di chi pubblica: scelta nel brand kit, altrimenti rilevata
    // dal brand e dal topic. Decide lessico, esempi e immagini del prompt.
    const prof = resolveProfession(brandData, topic);
    const P = prof.profile;

    // A chi si parla: B2B scelto nel kit, oppure un target fatto solo di
    // professionisti (avatar_type resta B2C di default anche per GestioMed).
    const pubblico = pubblicoDelBrand(brandData, avatarInput);
    const target = String(brandData?.target_pazienti || "").trim();
    const metodo: ContestoMetodo = {
      pubblico,
      lettori: pubblico === "B2B" ? (target || "i titolari degli studi") : P.clientePlurale,
      sanitario: prof.id !== "altro",
    };
    const chiLegge = pubblico === "B2B" ? "il titolare che legge" : ilCliente(P);

    let brandContext = "";
    const cta: string[] = [];
    const paroleEvitare: string[] = [];
    if (brandData) {
      const brand = brandData;
      const luogo = P.luogo;
      const persona = brand.persona_scrittura === "io" ? `prima persona singolare (io / il mio ${luogo})` : `prima persona plurale (noi / ${nelMioLuogo(P, true)})`;
      cta.push(...(brand.cta_suggerite || []).filter(Boolean));
      paroleEvitare.push(...(brand.parole_da_evitare || []).filter(Boolean));
      const vantaggi = (brand.vantaggi_competitivi || []).filter(Boolean);
      const temi = (brand.temi_chiave || []).filter(Boolean);
      const servizi = (brand.servizi || []).filter(Boolean);
      // Campi del metodo (migrazione 20261103150000): se mancano in
      // produzione restano array/stringhe vuote e i blocchi non escono.
      const frasiPazienti = (Array.isArray(brand.frasi_pazienti) ? brand.frasi_pazienti : []).filter(Boolean);
      const convinzione = typeof brand.convinzione_da_ribaltare === "string" ? brand.convinzione_da_ribaltare.trim() : "";
      const profiloDetestato = typeof brand.profilo_detestato === "string" ? brand.profilo_detestato.trim() : "";

      brandContext = `
=== BRAND: ${brandName} ===
${brand.descrizione ? `Descrizione: ${brand.descrizione}` : ""}
${brand.mission ? `Mission: ${brand.mission}` : ""}
${brand.identita_core ? `Identità: ${brand.identita_core}` : ""}

=== TARGET (il lettore di OGNI slide) ===
${target || "pubblico generale"}

=== VOCE OBBLIGATORIA ===
Tono: ${brand.tono_voce || "professionale"}
Persona: ${persona}
${persona.includes("singolare") ? `→ Usa 'io', 'il mio ${luogo}'. MAI 'noi' o 'il nostro team'.` : `→ Usa 'noi', '${nelMioLuogo(P, true)}'. MAI 'io'.`}

=== SERVIZI DEL BRAND (riferisciti SOLO a questi) ===
${servizi.length > 0 ? servizi.join(" · ") : "(non indicati: non nominare servizi)"}

${vantaggi.length > 0 ? `=== VANTAGGI E PROVE DEL BRAND (le uniche prove che puoi citare) ===
${vantaggi.map((v: string, i: number) => `${i + 1}. ${v}`).join("\n")}
` : ""}
${cta.length > 0 ? `=== AZIONI APPROVATE DAL BRAND ===
${cta.map((c: string) => `• ${c}`).join("\n")}
→ La CTA porta a una di queste azioni, nella forma nativa del metodo (es. «Commenta SPALLA e ti spieghiamo come funziona la valutazione»). Mai promettere guide o materiali che il brand non ha.
` : ""}
${temi.length > 0 ? `=== TEMI CHIAVE del brand: ${temi.join(", ")}
` : ""}
${paroleEvitare.length > 0 ? `=== PAROLE/ESPRESSIONI BANDITE (output rifiutato se le usi) ===
${paroleEvitare.map((p: string) => `❌ ${p}`).join("\n")}
` : ""}
${frasiPazienti.length > 0 ? `=== LE PAROLE DEI CLIENTI (frasi testuali, come le dicono loro) ===
${frasiPazienti.map((f: string) => `«${f}»`).join("\n")}
→ Copertina, slide e caption usano QUESTE parole e questo registro, non il linguaggio da sito. La convinzione comune (A) si scrive come la direbbe uno di loro.
` : ""}
${convinzione ? `=== LA CONVINZIONE DA RIBALTARE, scelta dal brand ===
«${convinzione}»
→ Se il topic lo permette, è questa la convinzione comune (A) da ribaltare.
` : ""}
${profiloDetestato ? `=== COME NON SUONARE MAI ===
Il brand NON vuole somigliare a: ${profiloDetestato}.
` : ""}
=== VIETATO RIPETERE IL SITO ===
Descrizione e mission vengono dal sito: servono per CAPIRE chi parla, MAI da riscrivere.
❌ Vietate le frasi da sito vetrina: "percorsi personalizzati", "approccio su misura", "strumenti avanzati", "al centro del nostro lavoro", "valutazione mirata basata su evidenze".
→ Si parla di situazioni concrete ${delLuogo(P)} e della vita di ${chiLegge}, con le sue parole.`;
    }

    const isSinglePost = postType === "post-singolo" || postType === "reel";
    const formato = formatoPerId(formatoRichiesto);
    const nSlide = isSinglePost ? 1 : slidesCount;

    const sceltaFormato = formato
      ? bloccoFormato(formato, nSlide)
      : `=== FORMAT: SCEGLILO TU PER PRIMO ===
Scegli il format che porta il topic al contrasto più forte, e segui le sue parti in ordine (slide 1 = copertina, ultima = CTA):
${elencoFormati()}`;

    const systemPrompt = `Sei il copywriter di "${brandName}" (${prof.label}). Scrivi caroselli Instagram che si salvano e portano contatti, con il metodo della Short Form Academy di Kallaway.
${brandContext}

${professionPromptBlock(prof)}

${regoleMetodo(metodo)}

${sceltaFormato}

=== REGOLE keywords_stock ===
Per ogni slide: qual è il messaggio emotivo → quale scena fotografabile lo mostra, ambientata dove lavora chi pubblica (${P.imageScene}) → 3 keywords inglesi CONCRETE per Pixabay.
- Una scena, non un concetto. Sempre in inglese. ${P.imageSubject} deve essere riconoscibile.
- Vietate le parole generiche: "health", "wellness", "people", "man", "woman", "person", "lifestyle". Vietate le keywords di un altro mestiere.
Esempi corretti:
${professionKeywordExamples(prof)}

Rispondi SOLO con JSON valido.`;

    const angoloRichiesto = typeof angolo === "string" && angolo.trim() ? `\nAngolo già scelto (la contrarian take da sviluppare): «${angolo.trim()}»` : "";

    const userPrompt = isSinglePost
      ? `Scrivi un post singolo Instagram su: "${topic.trim()}"${angoloRichiesto}

Prima compila il brief, poi scrivi. Il post è UNA slide: il titolo è l'hook, il testo dà la contrarian take con la prova e il payoff; la caption porta il resto del corpo e la CTA.

Rispondi con questo JSON esatto:
{
  ${SCHEMA_BRIEF},
  "titolo_carosello": "Titolo del post",
  "hook_principale": "L'hook, uguale al titolo della slide",
  "slides": [
    {
      "numero": 1,
      "tipo": "content",
      "titolo": "L'hook, massimo 9 parole",
      "testo": "Massimo 4 frasi brevi, una per riga con \\n, massimo 40 parole",
      "keywords_stock": ["keyword1 in inglese", "keyword2", "keyword3"]
    }
  ],
  "cta_finale": "La CTA",
  "caption_instagram": "Hook\\n\\nParagrafo 1.\\n\\nParagrafo 2.\\n\\nCTA",
  "hashtag_suggeriti": ["5 hashtag pertinenti"]
}`
      : `Scrivi un carosello Instagram su: "${topic.trim()}"${angoloRichiesto}
Numero slide: ${slidesCount}

Prima compila il brief (format, convinzione comune, contrarian take, fatti, esempio, domanda dell'hook, 3 copertine alternative), poi scegli la copertina migliore e scrivi le slide seguendo le parti del format.

Rispondi con questo JSON esatto:
{
  ${SCHEMA_BRIEF},
  "titolo_carosello": "Titolo del carosello",
  "hook_principale": "L'hook della copertina",
  "slides": [
    {
      "numero": 1,
      "tipo": "cover",
      "hook": "Copertina: massimo 9 parole, dice il lettore o la sua situazione e apre la domanda",
      "sottotitolo": "Massimo 12 parole: promette cosa trova scorrendo",
      "keywords_stock": ["keyword coerente col tema", "keyword2", "keyword3"]
    },
    {
      "numero": 2,
      "tipo": "content",
      "titolo": "Massimo 8 parole: la verità non ovvia di questa slide",
      "testo": "Da 2 a 4 frasi brevi, una per riga con \\n, massimo 40 parole",
      "keywords_stock": ["keyword1 in inglese", "keyword2", "keyword3"]
    },
    {
      "numero": ${slidesCount},
      "tipo": "cta",
      "titolo": "Massimo 6 parole",
      "testo_cta": "Una frase che lega la CTA al valore appena dato",
      "bottone_cta": "L'azione, massimo 40 caratteri (es. «Commenta SPALLA»)"
    }
  ],
  "cta_finale": "La CTA",
  "caption_instagram": "Hook\\n\\nParagrafo 1 breve.\\n\\nParagrafo 2 breve.\\n\\nCTA",
  "hashtag_suggeriti": ["5 hashtag pertinenti"]
}

Regole di forma: la slide 1 è "cover", l'ultima è "cta", quelle in mezzo sono "content" con keywords_stock diverse per ogni slide. Niente hashtag dentro caption_instagram (l'app li aggiunge in coda). Paragrafi della caption separati da \\n\\n.`;

    // ── 1. Stesura ──
    let parsed: any = null;
    let modelloUsato = "";
    let ultimoErrore: GeminiCallResult | null = null;
    for (const model of MODELLI_STESURA) {
      const res = await callGeminiWithRetry({ apiKey: GEMINI_API_KEY, model, body: corpoRichiesta(systemPrompt, userPrompt, model, 0.8) });
      if (!res.ok) { ultimoErrore = res; continue; }
      const j = leggiJson(testoRisposta(res));
      if (j && Array.isArray(j.slides) && j.slides.length > 0) { parsed = j; modelloUsato = model; break; }
    }

    if (!parsed) {
      const status = ultimoErrore?.status;
      const userMsg = status === 503
        ? "Gemini è temporaneamente sovraccarico. Riprova tra 30 secondi."
        : status === 429
        ? "Quota Gemini superata. Riprova tra qualche minuto."
        : status
        ? `Gemini API error: ${status}`
        : "Il copy non è uscito in un formato leggibile. Riprova.";
      return new Response(JSON.stringify({ error: userMsg }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Controlli: meccanici e giudice ──
    // I numeri ammessi sono quelli scritti dal brand o dall'utente, non gli
    // id o i colori del record.
    const b = brandData || {};
    const fonti = [topic, angolo, b.descrizione, b.mission, b.identita_core, b.target_pazienti, b.convinzione_da_ribaltare,
      ...[b.vantaggi_competitivi, b.servizi, b.cta_suggerite, b.frasi_pazienti, b.temi_chiave].flatMap((v) => Array.isArray(v) ? v : [])]
      .filter((x) => typeof x === "string").join("\n");
    const daVotare = (c: any) => ({ brief: c.brief, slides: c.slides, caption_instagram: c.caption_instagram });
    let meccanici = controlliMeccanici(parsed, fonti, paroleEvitare);
    let giudizio: Giudizio | null = null;
    const giudica = async (c: any) => {
      const r = await callGeminiWithRetry({
        apiKey: GEMINI_API_KEY,
        model: MODELLO_GIUDICE,
        maxRetries: 2,
        body: { contents: [{ role: "user", parts: [{ text: promptGiudice(daVotare(c), metodo, topic) }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } },
      });
      return r.ok ? leggiGiudizio(testoRisposta(r)) : null;
    };
    giudizio = await giudica(parsed);

    // ── 3. Una riscrittura se qualcosa non va ──
    let riscritto = false;
    const problemi = [...meccanici, ...(giudizio && !giudizio.promosso ? giudizio.problemi : [])];
    if (problemi.length > 0) {
      const model = Date.now() - inizio < RISCRITTURA_PRO_ENTRO_MS ? MODELLI_STESURA[0] : MODELLI_STESURA[1];
      const richiesta = `${userPrompt}

=== LA TUA PRIMA VERSIONE ===
${JSON.stringify(parsed)}

=== COSA NON VA (correggi tutto, tieni quello che funziona) ===
${problemi.map((p) => `- ${p}`).join("\n")}

Riscrivi il JSON completo, stessa struttura.`;
      const res = await callGeminiWithRetry({ apiKey: GEMINI_API_KEY, model, maxRetries: 2, body: corpoRichiesta(systemPrompt, richiesta, model, 0.7) });
      const j = res.ok ? leggiJson(testoRisposta(res)) : null;
      if (j && Array.isArray(j.slides) && j.slides.length > 0) {
        parsed = j;
        riscritto = true;
        meccanici = controlliMeccanici(parsed, fonti, paroleEvitare);
      }
    }

    // Forma delle slide: copertina, contenuti, chiusura, numeri in fila.
    if (!isSinglePost && Array.isArray(parsed.slides)) {
      const tot = parsed.slides.length;
      parsed.slides = parsed.slides.map((s: any, i: number) => ({
        ...s,
        numero: i + 1,
        tipo: i === 0 ? "cover" : i === tot - 1 ? "cta" : "content",
      }));
    }

    const qualita = {
      modello: modelloUsato,
      riscritto,
      voti: giudizio?.voti ?? null,
      problemi_prima_versione: problemi,
      problemi_rimasti: meccanici,
      secondi: Math.round((Date.now() - inizio) / 1000),
    };

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
          first_title: firstSlide.hook || firstSlide.titolo || firstSlide.title || "",
          first_text: (firstSlide.sottotitolo || firstSlide.testo || firstSlide.body || "").substring(0, 160),
          caption_preview: (parsed.caption_instagram || "").substring(0, 200),
          hashtags: parsed.hashtag_suggeriti || [],
          slides_count: parsed.slides?.length || 0,
        },
        metadata: {
          postType: postType || "carosello",
          numSlides: slidesCount,
          professione: prof.id,
          professione_source: prof.source,
          pubblico,
          formato: parsed.brief?.formato || formato?.id || null,
          brief: parsed.brief || null,
          qualita,
        },
        status: "success",
      });
    }

    return new Response(JSON.stringify({
      ...parsed,
      qualita,
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
