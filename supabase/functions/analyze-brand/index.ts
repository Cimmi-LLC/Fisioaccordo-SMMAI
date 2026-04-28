import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    let websiteContent = "";
    if (scrapedData.title) websiteContent += `TITOLO SITO: ${scrapedData.title}\n`;
    if (scrapedData.description) websiteContent += `META DESCRIPTION: ${scrapedData.description}\n`;
    if (scrapedData.headings?.length > 0) websiteContent += `TITOLI PAGINA: ${scrapedData.headings.join(" | ")}\n`;
    if (scrapedData.phone) websiteContent += `TELEFONO: ${scrapedData.phone}\n`;
    if (scrapedData.email) websiteContent += `EMAIL: ${scrapedData.email}\n`;
    if (scrapedData.address) websiteContent += `INDIRIZZO: ${scrapedData.address}\n`;
    websiteContent += `\nCONTENUTO TESTUALE DEL SITO:\n${scrapedData.bodyText}`;

    // Add JSON-LD if available
    if (scrapedData.jsonLd?.length > 0) {
      websiteContent += `\n\nDATI STRUTTURATI (JSON-LD):\n${JSON.stringify(scrapedData.jsonLd).substring(0, 2000)}`;
    }

    // Add CSS colors found on the site
    if (scrapedData.cssColors?.length > 0) {
      websiteContent += `\n\nCOLORI CSS TROVATI NEL SITO: ${scrapedData.cssColors.join(", ")}\nUsa questi colori come riferimento per determinare i colori del brand.`;
    }

    // Add logo URL if scraped
    if (scrapedData.logoUrl) {
      websiteContent += `\n\nLOGO TROVATO NEL SITO: ${scrapedData.logoUrl}\nUsa questo URL come logo del brand.`;
    }

    const systemPrompt = `Sei un esperto di marketing per il settore sanitario (fisioterapia, osteopatia, poliambulatori). Hai estratto il contenuto testuale di un sito web di uno studio sanitario. Il tuo compito è analizzare questo contenuto e costruire un profilo completo del brand.

Analizza attentamente e ricava:
- Il nome esatto dello studio/brand
- Una descrizione breve e professionale (max 300 caratteri)
- I servizi offerti (fisioterapia, osteopatia, riabilitazione, ecc.)
- Il target di pazienti (anziani, sportivi, bambini, donne in gravidanza, ecc.)
- Il tono di comunicazione percepito (professionale, empatico, informale, tecnico)
- I punti di forza e vantaggi competitivi
- La mission o i valori del brand (se presenti)
- Suggerisci 5 temi chiave adatti per i post social
- Suggerisci 3 call to action adatte
- La persona di scrittura suggerita ("io" per professionista singolo, "noi" per studio/team)
- I colori principali del brand (analizza i colori CSS, i colori delle immagini, il logo se descritto). Restituisci 3 colori in formato hex: primario, secondario, terziario. Se non riesci a determinarli, suggerisci colori appropriati per il settore sanitario.
- Categorie: scegli tra [Fisioterapia, Osteopatia, Poliambulatorio, Riabilitazione, Medicina dello Sport, Fisioterapia Pediatrica, Fisioterapia in Gravidanza, Posturologia, altro]

Rispondi SOLO con JSON valido.`;

    const userPrompt = `Contenuto estratto dal sito web:

${websiteContent}

Rispondi con questo JSON esatto:
{
  "nome_business": "nome dello studio",
  "descrizione": "descrizione breve max 300 caratteri",
  "categorie": ["Fisioterapia", "..."],
  "servizi": ["servizio 1", "servizio 2", "..."],
  "target_pazienti": "descrizione del target principale",
  "tono_voce": "professionale|empatico|informale|tecnico",
  "vantaggi_competitivi": ["vantaggio 1", "vantaggio 2", "..."],
  "mission": "mission o valori del brand",
  "temi_chiave": ["tema 1", "tema 2", "tema 3", "tema 4", "tema 5"],
  "cta_suggerite": ["cta 1", "cta 2", "cta 3"],
  "persona_scrittura": "io|noi",
  "colore_primario": "#hex del colore principale del brand",
  "colore_secondario": "#hex del colore secondario",
  "colore_terziario": "#hex del colore terziario o di sfondo",
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

    // Fallback: if Gemini omitted logo_url but we have one from scraping, inject it
    if (!parsed.logo_url && scrapedData.logoUrl) {
      parsed.logo_url = scrapedData.logoUrl;
    }

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
