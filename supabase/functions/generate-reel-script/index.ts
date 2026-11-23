import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logGeneration } from "../_shared/historyLogger.ts";
import { requireWithinRateLimit } from "../_shared/auth.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { resolveProfession, professionPromptBlock, type ResolvedProfession } from "../_shared/brand/profession.ts";
import { REGOLA_CLAIM, daRivedere, regolaCoseDelBrand } from "../_shared/brand/metodoCopy.ts";
import {
  PAROLE_AL_SECONDO, SECONDI_GANCIO_MAX, contaParole, frasiInsicure, gancioPerVariante, hashtagControllati,
  parolePerDurata, tempiDaParole,
} from "../_shared/brand/copioneReel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, brandId, durata: durataChiesta, variante, totale } = await req.json();
    // Durata a scelta (30, 45 o 60 secondi). Le parole si contano a 2,5 al
    // secondo e i tempi delle sezioni si calcolano dopo, dalle parole
    // (note del reparto social, 18/11/2026: i tempi scritti dal modello non
    // corrispondevano alle parole).
    const durata = [30, 45, 60].includes(Number(durataChiesta)) ? Number(durataChiesta) : 45;
    const P = parolePerDurata(durata);
    const gancio = gancioPerVariante(variante);
    const quanti = Math.max(1, Math.min(10, Number(totale) || 1));

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Load brand kit
    let brandContext = "";
    let isPlural = false;
    let paroleBrand: string[] = [];
    let coseDaNonDire: string[] = [];
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
            isPlural = brand.persona_scrittura === "noi";
            // La CTA del Kit NON entra più: chiudeva un reel sul mal di testa
            // con «Hai vertigini? Scopri il nostro trattamento…» (18/11/2026).
            // La CTA si scrive sul tema del video.
            coseDaNonDire = (brand.parole_da_evitare || []).filter(Boolean);
            paroleBrand = [brand.nome_business, ...(brand.categorie || []), ...(brand.servizi || []), brand.citta]
              .filter((x: unknown): x is string => typeof x === "string" && x.length > 0);
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
Persona: ${isPlural ? "PLURALE (noi, offriamo, aiutiamo)" : "SINGOLARE (io, offro, aiuto)"}
${frasiPazienti.length > 0 ? `Frasi testuali dei pazienti (usa QUESTE parole, non le tue): ${frasiPazienti.map((f: string) => `«${f}»`).join(" · ")}` : ""}
${convinzione ? `Convinzione del settore da ribaltare quando il tema lo permette: «${convinzione}»` : ""}

REGOLA: Usa SEMPRE la persona ${isPlural ? "plurale" : "singolare"} in tutto lo script.
La specializzazione e i servizi dicono CHI parla, non DI COSA si parla: il video resta sul tema chiesto e non devia verso la nicchia dello studio.`;
          }
        }
      } catch (e) { console.error("Brand load error:", e); }
    }

    const systemPrompt = `Scrivi script per video brevi (Reels/TikTok) col metodo Short Form Academy: ogni frase deve tenere lo spettatore fino alla successiva, e il copione deve poter essere DETTO AD ALTA VOCE da un professionista sanitario davanti al telefono.

PARLATO NATURALE:
- Scrivi come si PARLA, non come si titola. Frasi intorno alle 8-12 parole, legate tra loro: una conversazione con UNA persona («tu»), non slogan staccati.
- VIETATO il ritmo a stacchi di 3-4 parole. Esempio SBAGLIATO: "Non la causa. Io cerco l'origine. Valuto il tuo corpo." Esempio GIUSTO: "Io non mi fermo al punto dove ti fa male: cerco da dove parte, e per farlo guardo come si muove tutto il corpo."
- Livello prima media, zero gergo non spiegato, mai linguaggio aziendale.
- Chi parla è sicuro di quello che dice: VIETATE le frasi di permesso o di comprensione come «Forse ci dici», «Magari senti», «Magari ti capita», «Noi capiamo bene», «Sappiamo quanto sia», «Non preoccuparti». Si dice la cosa e basta.

LUNGHEZZA (si misura, non si stima):
- Si parla a ${PAROLE_AL_SECONDO} parole al secondo: ${durata} secondi sono TRA ${P.min} E ${P.max} PAROLE TOTALI, non di più. Conta le parole prima di rispondere.
- Il GANCIO sta in al massimo ${Math.round(SECONDI_GANCIO_MAX * PAROLE_AL_SECONDO)} parole: il contenuto vero parte entro il quinto secondo.

STRUTTURA (5 sezioni, in quest'ordine):
1. GANCIO: per chi è il video e il suo problema, nella prima frase. Mai annunciare cosa dirai dopo («Oggi ti spiego…», «Resta fino alla fine»): la risposta arriva subito.
2. RISPOSTA: la cosa che la persona non sa, detta subito, in una o due frasi. Niente domande di fila senza informazione.
3. SPIEGAZIONE: il meccanismo in parole semplici (cosa succede nel corpo e perché), con un'immagine che resta in testa (es. «è un falso allarme: la testa fa male, ma il problema è sotto»). È il meccanismo che convince.
4. AZIONE: UNA cosa concreta che la persona può fare o provare da sola, oggi o domattina, con quando e come (es. «Prova questo domattina: prima di alzarti, gira piano la testa a destra e a sinistra…»). Deve essere sicura per chiunque: un test di movimento, un'abitudine, un segnale da notare, mai un esercizio rischioso o una cura. Non vale «senti la rigidità del collo»: serve un gesto da fare.
5. CTA: una sola, sul TEMA del video, con una parola chiave da scrivere nei commenti legata al tema (es. «Se ti riconosci, scrivi${isPlural ? "ci" : "mi"} COLLO nei commenti e ti dico cosa guardare»). Niente link, niente «contattaci ora», niente servizi dello studio che c'entrano con un altro tema.

TESTO A SCHERMO: la maggior parte guarda senza audio. Per ogni sezione scrivi il testo in sovrimpressione: massimo 7 parole, dice la stessa cosa del parlato (il gancio a schermo deve fermare anche senza audio).

INQUADRATURA: per ogni sezione cosa si vede (primo piano, mano sul punto, movimento mostrato, schema). Senza secondi: i tempi li calcola l'app dalle parole.
${brandContext}

${professionPromptBlock(prof)}
${prof.id !== "altro" ? "\n" + REGOLA_CLAIM + "\n" : ""}${regolaCoseDelBrand(coseDaNonDire) ? "\n" + regolaCoseDelBrand(coseDaNonDire) + "\n" : ""}
Rispondi SOLO con JSON valido.`;

    const userPrompt = `TEMA DEL REEL: "${topic.trim()}"
Resta su QUESTO tema dall'inizio alla fine, anche se lo studio si occupa di altro.
DURATA: ${durata} secondi = tra ${P.min} e ${P.max} parole in tutto.
TIPO DI GANCIO: ${gancio.nome}, cioè ${gancio.istruzione}.${quanti > 1 ? `
Questo è lo script ${Number(variante) + 1} di ${quanti}: gli altri usano altri tipi di gancio. Scegli anche un angolo tuo sul tema (una causa, un errore, un segnale, un falso mito), non il più ovvio.` : ""}

Rispondi con questo JSON (i valori sono esempi della forma, non da copiare):
{
  "titolo_reel": "Titolo breve del reel",
  "sezioni": [
    { "nome": "GANCIO", "testo": "parlato", "testo_a_schermo": "max 7 parole", "inquadratura": "Primo piano, guarda in camera" },
    { "nome": "RISPOSTA", "testo": "parlato", "testo_a_schermo": "max 7 parole", "inquadratura": "..." },
    { "nome": "SPIEGAZIONE", "testo": "parlato", "testo_a_schermo": "max 7 parole", "inquadratura": "..." },
    { "nome": "AZIONE", "testo": "parlato", "testo_a_schermo": "max 7 parole", "inquadratura": "mostra il gesto" },
    { "nome": "CTA", "testo": "parlato", "testo_a_schermo": "Scrivi PAROLA nei commenti", "inquadratura": "Primo piano, tono caldo" }
  ],
  "caption_instagram": "Gancio\\n\\nParagrafo breve\\n\\nL'azione da provare\\n\\n👉 la stessa CTA (niente hashtag qui)",
  "hashtag_suggeriti": ["5-8 hashtag in minuscolo, parole italiane scritte giuste, attaccate senza maiuscole: malditesta, cervicale"]
}`;

    const leggi = (r: any) => {
      const t = r?.ok ? r.data?.candidates?.[0]?.content?.parts?.[0]?.text : null;
      if (!t) return null;
      try {
        const j = JSON.parse(t.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        return j && Array.isArray(j.sezioni) && j.sezioni.length > 0 ? j : null;
      } catch { return null; }
    };

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

    let parsed: any = leggi(geminiResult);
    if (!parsed) throw new Error("Failed to parse AI response");

    // Controlli su quello che il modello non sa misurare da solo: promesse
    // sanitarie e voci del brand, frasi insicure, parole rispetto alla durata,
    // gancio troppo lungo, sezione AZIONE mancante. Una sola riscrittura con
    // tutti i problemi insieme; quello che resta lo vede chi registra.
    const sezioniDi = (p: any): any[] => (Array.isArray(p?.sezioni) ? p.sezioni : []);
    const parlato = (p: any) => sezioniDi(p).map((x: any) => String(x?.testo || "")).join(" ");
    const testoScript = (p: any) => [parlato(p), p?.caption_instagram, p?.titolo_reel]
      .filter((x) => typeof x === "string").join("\n");
    const problemi = (p: any) => {
      const fuori = daRivedere(testoScript(p), { sanitario: prof.id !== "altro", coseDaNonDire });
      for (const f of frasiInsicure(parlato(p))) fuori.push(`frase che fa sembrare insicuro chi parla: «${f}»`);
      const parole = contaParole(parlato(p));
      const correggi: string[] = [];
      if (parole > P.max * 1.1) correggi.push(`lo script ha ${parole} parole, ${Math.round(parole / PAROLE_AL_SECONDO)} secondi detti: accorcialo a ${P.min}-${P.max} parole togliendo frasi, non il senso`);
      if (parole < P.min * 0.85) correggi.push(`lo script ha solo ${parole} parole: allungalo a ${P.min}-${P.max} parole spiegando meglio il meccanismo`);
      const g = sezioniDi(p)[0];
      const paroleGancio = contaParole(g?.testo);
      if (paroleGancio > Math.round(SECONDI_GANCIO_MAX * PAROLE_AL_SECONDO) + 2) correggi.push(`il GANCIO ha ${paroleGancio} parole: deve starne al massimo ${Math.round(SECONDI_GANCIO_MAX * PAROLE_AL_SECONDO)}`);
      if (!sezioniDi(p).some((x: any) => String(x?.nome || "").toUpperCase().includes("AZIONE") && contaParole(x?.testo) >= 8)) correggi.push("manca la sezione AZIONE: una cosa concreta che la persona può provare da sola");
      return { fuori, correggi };
    };
    let esito = problemi(parsed);
    if (esito.fuori.length + esito.correggi.length > 0) {
      const riscrittura = await callGeminiWithRetry({
        apiKey: GEMINI_API_KEY,
        maxRetries: 2,
        body: {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: `${userPrompt}

Hai già scritto questo script:
${JSON.stringify(parsed)}

Riscrivilo, stesso JSON, stesso gancio e stessa idea, correggendo SOLO questo:
${[...esito.correggi, ...esito.fuori.map((a) => `togli: ${a} (al posto di una promessa di' cosa fai, per chi e come)`)].map((a) => `- ${a}`).join("\n")}` }] }],
          generationConfig: { temperature: 0.6, responseMimeType: "application/json" },
        },
      });
      const secondo = leggi(riscrittura);
      if (secondo) {
        const esito2 = problemi(secondo);
        // Si tiene la riscrittura se non peggiora le cose da non dire.
        if (esito2.fuori.length <= esito.fuori.length) { parsed = secondo; esito = esito2; }
      }
    }

    // Tempi, durata e script completo si ricavano dalle parole vere.
    const sezioni = sezioniDi(parsed).map((x: any) => ({
      nome: String(x?.nome || "").toUpperCase().trim() || "CONTENUTO",
      testo: String(x?.testo || "").trim(),
      testo_a_schermo: String(x?.testo_a_schermo || "").trim(),
      inquadratura: String(x?.inquadratura || "").trim(),
    }));
    const { tempi, secondi } = tempiDaParole(sezioni.map((x) => x.testo));
    parsed.sezioni = sezioni.map((x, i) => ({ ...x, timing: `${tempi[i]} s` }));
    parsed.durata_stimata = `${secondi} secondi detti (${contaParole(parlato(parsed))} parole)`;
    parsed.script_completo = sezioni.map((x) => x.testo).join("\n\n");
    parsed.tipo_gancio = gancio.nome;
    parsed.da_rivedere = [
      ...esito.fuori,
      ...(secondi > durata * 1.15 ? [`dura circa ${secondi} secondi detti, più dei ${durata} scelti: taglia qualche frase`] : []),
    ];
    parsed.hashtag_suggeriti = hashtagControllati(
      parsed.hashtag_suggeriti,
      [topic, parsed.script_completo, parsed.caption_instagram, prof.label, ...paroleBrand],
      { tema: topic },
    );

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
