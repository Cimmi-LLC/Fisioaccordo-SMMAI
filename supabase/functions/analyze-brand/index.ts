import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  allProfessionCategories,
  detectProfession,
  isProfessionId,
  professionListForPrompt,
} from "../_shared/brand/profession.ts";
import { senzaClaim } from "../_shared/brand/metodoCopy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scrapedData } = await req.json();

    if (!scrapedData || !scrapedData.bodyText) {
      return new Response(JSON.stringify({ error: "Dati del sito mancanti" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY non configurata" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from scraped data
    // Dal 02/11/2026 il profilo puo arrivare anche da Instagram (scrape-instagram).
    const daInstagram = scrapedData.source === "instagram";
    let websiteContent = "";
    if (scrapedData.title) websiteContent += `TITOLO SITO: ${scrapedData.title}\n`;
    if (scrapedData.description) websiteContent += `META DESCRIPTION: ${scrapedData.description}\n`;
    if (scrapedData.headings?.length > 0) websiteContent += `TITOLI PAGINA: ${scrapedData.headings.join(" | ")}\n`;
    if (scrapedData.phone) websiteContent += `TELEFONO: ${scrapedData.phone}\n`;
    if (scrapedData.email) websiteContent += `EMAIL: ${scrapedData.email}\n`;
    if (scrapedData.address) websiteContent += `INDIRIZZO: ${scrapedData.address}\n`;
    websiteContent += daInstagram
      ? `\nCONTENUTO DEL PROFILO INSTAGRAM:\n${scrapedData.bodyText}`
      : `\nCONTENUTO TESTUALE DEL SITO:\n${scrapedData.bodyText}`;

    // Add JSON-LD if available
    if (scrapedData.jsonLd?.length > 0) {
      websiteContent += `\n\nDATI STRUTTURATI (JSON-LD):\n${JSON.stringify(scrapedData.jsonLd).substring(0, 2000)}`;
    }

    // Add CSS colors found on the site
    if (scrapedData.cssColors?.length > 0) {
      websiteContent += daInstagram
        ? `\n\nCOLORI RICORRENTI NELLE IMMAGINI DEL PROFILO: ${scrapedData.cssColors.join(", ")}\nUsa questi colori come riferimento per determinare i colori del brand.`
        : `\n\nCOLORI CSS TROVATI NEL SITO: ${scrapedData.cssColors.join(", ")}\nUsa questi colori come riferimento per determinare i colori del brand.`;
    }

    // Add logo URL if scraped
    if (scrapedData.logoUrl) {
      websiteContent += `\n\nLOGO TROVATO NEL SITO: ${scrapedData.logoUrl}\nUsa questo URL come logo del brand.`;
    }

    const systemPrompt = `Sei un esperto di marketing per professionisti della salute (fisioterapisti, osteopati, poliambulatori, nutrizionisti, personal trainer, psicologi, dentisti e altre figure sanitarie) e anche per brand di altri settori, compresi i personal brand. Hai estratto il contenuto del sito web o del profilo Instagram (bio e didascalie dei post) di uno studio, di un professionista o di un brand. Il tuo compito è analizzare questo contenuto e costruire un profilo completo del brand.

Analizza attentamente e ricava:
- Il nome dello studio/brand come lo direbbe un paziente: corto, al massimo 40 caratteri, senza l'elenco dei servizi. Se il titolo del sito è «Studio di Fisioterapia Cervicale Vertigini del Dott. Mario Rossi», il nome è «Studio Dott. Mario Rossi»
- La professione di chi pubblica: scegli UNO slug tra [${professionListForPrompt()}]. Usa "altro" solo se nessuna voce descrive il mestiere, e in quel caso scrivi l'etichetta in "professione_label" (es. "Terapista occupazionale"). Se lo studio riunisce più specialisti scegli "poliambulatorio".
- Una descrizione breve e professionale (max 300 caratteri)
- I servizi offerti, con il lessico della professione (es. fisioterapia, piani alimentari, personal training, igiene orale, ecc.)
- Il target di pazienti o clienti (anziani, sportivi, bambini, donne in gravidanza, ecc.)
- Il tono di comunicazione percepito (professionale, empatico, informale, tecnico)
- I punti di forza e vantaggi competitivi: solo FATTI verificabili (specializzazione, formazione, anni di attività, strumenti, numero di recensioni). MAI promesse di risultato prese dal sito: niente «risoluzione duratura», «guarigione», «risultati garantiti», «senza farmaci», «meno sedute». Se il sito ha solo promesse, scrivi il fatto che c'è dietro (es. «si occupa solo di cervicale e vertigini») o lascia fuori la voce
- La mission o i valori del brand (se presenti)
- Suggerisci 5 temi chiave adatti per i post social, coerenti con la professione
- Suggerisci 3 call to action adatte: un'azione (prenota una valutazione, scrivici, chiama), mai una promessa di risultato («Risolvi i tuoi dolori»)
- La persona di scrittura: "io" se il sito presenta UNA sola persona (un nome e cognome, «Dott.», «il mio studio», una sola biografia), anche quando si chiama «Studio…»; "noi" solo se ci sono più professionisti o un centro con un team
- I colori principali del brand: scegli SOLO tra i colori della lista fornita sopra (COLORI CSS TROVATI NEL SITO, oppure COLORI RICORRENTI NELLE IMMAGINI DEL PROFILO se arriva da Instagram: sono i colori che il visitatore vede davvero). Il primario è quello più usato per bottoni, titoli e marchio. Restituisci 3 colori hex presi da quella lista. Se la lista manca o non basta, lascia stringa vuota nei campi che non puoi riempire: NON inventare MAI un colore e NON suggerire colori «di settore».
- Categorie: scegli tra [${allProfessionCategories().join(", ")}, altro], coerenti con la professione rilevata

Rispondi SOLO con JSON valido.`;

    const userPrompt = `Contenuto estratto dal sito web o dal profilo Instagram:

${websiteContent}

Rispondi con questo JSON esatto:
{
  "nome_business": "nome dello studio",
  "professione": "slug della professione (es. fisioterapista, nutrizionista, personal_trainer, altro)",
  "professione_label": "etichetta breve della professione, obbligatoria se professione vale altro, altrimenti stringa vuota",
  "descrizione": "descrizione breve max 300 caratteri",
  "categorie": ["categoria 1", "..."],
  "servizi": ["servizio 1", "servizio 2", "..."],
  "target_pazienti": "descrizione del target principale",
  "tono_voce": "professionale|empatico|informale|tecnico",
  "vantaggi_competitivi": ["vantaggio 1", "vantaggio 2", "..."],
  "mission": "mission o valori del brand",
  "temi_chiave": ["tema 1", "tema 2", "tema 3", "tema 4", "tema 5"],
  "cta_suggerite": ["cta 1", "cta 2", "cta 3"],
  "persona_scrittura": "io|noi",
  "colore_primario": "#hex preso dalla lista dei colori (sito o profilo), altrimenti stringa vuota",
  "colore_secondario": "#hex preso dalla lista dei colori (sito o profilo), altrimenti stringa vuota",
  "colore_terziario": "#hex preso dalla lista dei colori (sito o profilo), altrimenti stringa vuota",
  "logo_url": "URL del logo se trovato (passalo identico a quello fornito sopra), altrimenti stringa vuota"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.5,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      console.error("Failed to parse Gemini response:", raw.substring(0, 500));
      return new Response(JSON.stringify({ error: "Errore nell'analisi. Riprova o compila manualmente." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Le promesse del sito non entrano nel Brand Kit come vantaggi o CTA:
    // da lì passavano dritte nei post (revisione del reparto social, 09/11/2026).
    // Il controllo vale per i profili sanitari, cioè tutto tranne «altro».
    const profSlug = typeof parsed.professione === "string" ? parsed.professione.trim().toLowerCase() : "";
    if (profSlug !== "altro") {
      const vantaggi = senzaClaim(parsed.vantaggi_competitivi);
      const cta = senzaClaim(parsed.cta_suggerite);
      if (vantaggi.tolte.length || cta.tolte.length) {
        console.log("Promesse tolte dal kit:", [...vantaggi.tolte, ...cta.tolte].join(" | "));
      }
      parsed.vantaggi_competitivi = vantaggi.tenute;
      parsed.cta_suggerite = cta.tenute.length > 0 ? cta.tenute : ["Prenota una valutazione", "Scrivici per informazioni"];
    }

    // Fallback: if Gemini omitted logo_url but we have one from scraping, inject it
    if (!parsed.logo_url && scrapedData.logoUrl) {
      parsed.logo_url = scrapedData.logoUrl;
    }

    // Professione: lo slug del modello vale solo se e nella lista; altrimenti
    // si prova a riconoscerla dal testo del sito e dai campi appena estratti.
    // Un valore non riconoscibile resta null: il brand kit la rilevera da se.
    const modelSlug = typeof parsed.professione === "string" ? parsed.professione.trim().toLowerCase() : "";
    if (!isProfessionId(modelSlug)) {
      const detected = detectProfession({
        nome_business: parsed.nome_business,
        descrizione: [scrapedData.title, scrapedData.description, parsed.descrizione].filter(Boolean).join(" "),
        categorie: Array.isArray(parsed.categorie) ? parsed.categorie : [],
        servizi: Array.isArray(parsed.servizi) ? parsed.servizi : [],
        temi_chiave: Array.isArray(parsed.temi_chiave) ? parsed.temi_chiave : [],
        topic: String(scrapedData.bodyText || "").slice(0, 4000),
      });
      parsed.professione = detected ? detected.id : null;
    } else {
      parsed.professione = modelSlug;
    }
    parsed.professione_label = typeof parsed.professione_label === "string"
      ? parsed.professione_label.trim().slice(0, 60)
      : "";
    if (parsed.professione !== "altro") parsed.professione_label = "";

    return new Response(JSON.stringify({ success: true, brandProfile: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-brand error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
