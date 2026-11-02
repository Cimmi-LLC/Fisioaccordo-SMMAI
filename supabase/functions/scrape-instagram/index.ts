// Onboarding da Instagram: per chi non ha un sito (o non lo vuole dare).
// Legge il profilo pubblico con Apify (instagram-scraper, scheda "details":
// bio, categoria, link in bio, foto profilo, ultimi post con didascalie) e
// restituisce gli stessi campi di scrape-website, cosi analyze-brand
// funziona uguale. In piu:
//   - logoDataUrl: la foto profilo come data URL (i link del CDN di
//     Instagram scadono dopo pochi giorni, il logo deve restare);
//   - cssColors: i colori ricorrenti di foto profilo e post, letti da
//     Gemini sulle immagini (su Instagram non c'e un CSS da cui prenderli).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { safeFetch } from "../_shared/ssrf.ts";
import { nomeUtenteInstagram, profiloDaInstagram, type InstagramDettagli } from "../_shared/brand/instagramProfile.ts";

const APIFY_DETAILS = "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items";
const HEX = /^#[0-9a-f]{6}$/i;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

async function scaricaImmagine(url: string): Promise<{ data: string; mime: string } | null> {
  const r = await safeFetch(url, { maxBytes: 5 * 1024 * 1024, timeoutMs: 12_000 });
  if (!r.ok) return null;
  const mime = r.contentType.split(";")[0].trim().toLowerCase();
  if (!/^image\/(png|jpeg|jpg|webp)$/.test(mime)) return null;
  return { data: toBase64(r.bytes), mime };
}

/** Colori ricorrenti del brand nelle immagini (foto profilo + post). */
async function coloriDalleImmagini(
  immagini: Array<{ data: string; mime: string }>,
  apiKey: string,
): Promise<string[]> {
  if (immagini.length === 0) return [];
  const result = await callGeminiWithRetry({
    apiKey,
    model: "gemini-2.5-flash",
    maxRetries: 2,
    body: {
      contents: [{
        role: "user",
        parts: [
          ...immagini.map((im) => ({ inline_data: { mime_type: im.mime, data: im.data } })),
          {
            text: "Queste sono la foto profilo e gli ultimi post Instagram di un brand. " +
              "Trova i colori del brand: quelli che ritornano nelle grafiche, nei testi, negli sfondi e nel logo. " +
              "Ignora i colori delle foto (pelle, cielo, pareti) che non sono scelte grafiche. " +
              "Dal piu importante al meno importante, da 3 a 6 colori. " +
              'Rispondi solo con JSON: {"colori": ["#rrggbb", ...]}',
          },
        ],
      }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    },
  });
  if (!result.ok) {
    console.warn("colori da Gemini non disponibili:", result.status, (result.errorBody || "").slice(0, 200));
    return [];
  }
  try {
    const raw = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    const colori: string[] = Array.isArray(parsed?.colori) ? parsed.colori : [];
    return [...new Set(colori.map((c) => String(c).trim().toLowerCase()).filter((c) => HEX.test(c)))].slice(0, 6);
  } catch {
    return [];
  }
}

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);

    // Ogni lettura costa una corsa Apify: 10 l'ora per utente bastano.
    const rl = await requireWithinRateLimit(adminClient(), auth.userId, "scrape-instagram", 10, 3600);
    if (!rl.ok) return jsonResponse(req, { success: false, error: "rate_limited" });

    const body = await req.json().catch(() => null);
    const nomeUtente = nomeUtenteInstagram(String(body?.instagram || ""));
    if (!nomeUtente) return jsonResponse(req, { success: false, error: "invalid_handle" });

    const token = Deno.env.get("APIFY_API_TOKEN");
    if (!token) return jsonResponse(req, { success: false, error: "not_configured" });

    console.log("Leggo il profilo Instagram:", nomeUtente);
    const res = await fetch(`${APIFY_DETAILS}?token=${encodeURIComponent(token)}&timeout=90`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${nomeUtente}/`],
        resultsType: "details",
        resultsLimit: 1,
      }),
    });
    if (!res.ok) {
      console.warn("Apify details HTTP", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return jsonResponse(req, { success: false, error: "unreachable" });
    }
    const items = await res.json().catch(() => []);
    const dettagli = (Array.isArray(items) ? items[0] : null) as (InstagramDettagli & { error?: string }) | null;
    if (!dettagli || dettagli.error || !dettagli.username) {
      return jsonResponse(req, { success: false, error: "not_found" });
    }
    if (dettagli.private) return jsonResponse(req, { success: false, error: "private" });

    const profilo = profiloDaInstagram(dettagli, nomeUtente);

    // Foto profilo + fino a 5 post: logo e colori.
    const [fotoProfilo, ...post] = await Promise.all([
      profilo.logoUrl ? scaricaImmagine(profilo.logoUrl) : Promise.resolve(null),
      ...profilo.postImages.slice(0, 5).map(scaricaImmagine),
    ]);
    const immagini = [fotoProfilo, ...post].filter((x): x is { data: string; mime: string } => !!x);

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    let cssColors: string[] = [];
    try {
      cssColors = geminiKey ? await coloriDalleImmagini(immagini, geminiKey) : [];
    } catch (e) {
      console.warn("colori dalle immagini falliti, continuo senza:", e);
    }

    return jsonResponse(req, {
      success: true,
      source: "instagram",
      instagramHandle: nomeUtente,
      title: profilo.title,
      description: profilo.description,
      headings: profilo.headings,
      bodyText: profilo.bodyText,
      externalUrl: profilo.externalUrl,
      logoUrl: null,
      logoDataUrl: fotoProfilo ? `data:${fotoProfilo.mime};base64,${fotoProfilo.data}` : null,
      cssColors,
      cssColorCounts: [],
      jsonLd: [],
      phone: null,
      email: null,
      address: null,
    });
  } catch (e) {
    console.error("scrape-instagram error:", e);
    return jsonResponse(req, { success: false, error: "unreachable" });
  }
});
