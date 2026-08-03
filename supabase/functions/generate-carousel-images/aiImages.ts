// Generazione immagini con AI (Gemini / Nano Banana / GPT Image).
//
// Recupero del lavoro dal branch backup/lovable-2026-07-20: le immagini
// delle slide vengono generate su misura dal contenuto e lo stock Pixabay
// resta come fallback. La cascata di modelli dipende da brands.image_model
// (listino crediti nella card impostazioni), lo stile del prompt da
// brands.slide_style.
//
// Differenze volute rispetto all'originale: codice riespanso e leggibile,
// e il registro degli errori non e piu una variabile globale di modulo
// (in Deno gli isolate vengono riusati tra richieste concorrenti: era una
// race condition che mischiava le diagnostiche di utenti diversi).

const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations";
const AI_IMAGE_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_MODELS_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

/** Cascate di modelli per valore di brands.image_model. */
export const AI_MODEL_SETS: Record<string, string[]> = {
  "stock": [],
  "nano-2": ["gemini-3.1-flash-image", "gemini-3-pro-image", "gemini-2.5-flash-image", "gpt-image-2", "gpt-image-1"],
  "nano-pro": ["gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image", "gpt-image-2", "gpt-image-1"],
  "gpt-2": ["gpt-image-2", "gpt-image-1", "gemini-3.1-flash-image", "gemini-2.5-flash-image"],
};

/** Diagnostica di un batch: locale alla richiesta, mai condivisa. */
export type AiErrorLog = string[];

/** Cerca ricorsivamente un payload immagine (inlineData e simili) nella risposta. */
export function findImagePayload(node: unknown, depth = 0): { data: string; mime: string } | null {
  if (!node || depth > 10) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findImagePayload(child, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;

  const obj = node as Record<string, unknown>;
  const mime = String(obj.mime_type || obj.mimeType || "");
  const data = obj.data || obj.bytesBase64Encoded || obj.b64_json;
  if (typeof data === "string" && data.length > 500 && mime.indexOf("image/") === 0) {
    return { data, mime };
  }
  for (const key of Object.keys(obj)) {
    const found = findImagePayload(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** Ultima spiaggia: una stringa base64 lunga ovunque nella risposta. */
export function findAnyBase64(node: unknown, depth = 0): string | null {
  if (!node || depth > 10) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findAnyBase64(child, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;

  const obj = node as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "string" && value.length > 5000 && /^[A-Za-z0-9+/=]+$/.test(value.slice(0, 200))) {
      return value;
    }
    const found = findAnyBase64(value, depth + 1);
    if (found) return found;
  }
  return null;
}

export function b64ToBytes(b64: string): Uint8Array | null {
  try {
    const clean = b64.indexOf(",") >= 0 ? String(b64.split(",").pop()) : b64;
    const bin = atob(clean.replace(/\s/g, ""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

type SlideLike = {
  theme?: string;
  topic?: string;
  title?: string;
  titolo?: string;
  hook?: string;
  body?: string;
  testo?: string;
  sottotitolo?: string;
  tipo?: string;
  keywords_stock?: string[];
};

/** Prompt immagine: ramo notturno neon oppure fotografia editoriale clinica. */
export function buildAiPrompt(slide: SlideLike | null, isCover: boolean, stile?: string): string {
  const tema = String(slide?.theme || slide?.topic || "").trim();
  const titolo = String(slide?.title || slide?.titolo || slide?.hook || "").trim();
  const corpo = String(slide?.body || slide?.testo || slide?.sottotitolo || "").trim();
  const keywords = Array.isArray(slide?.keywords_stock) ? slide!.keywords_stock!.join(", ") : "";

  if (stile === "neon") {
    return [
      "Immagine per social su fondo NERO ASSOLUTO.",
      tema
        ? "Soggetto: un solo oggetto reale e riconoscibile che rappresenta in modo simbolico " + tema + "."
        : "Soggetto: un solo oggetto reale legato alla cura del corpo.",
      titolo ? "Il messaggio da evocare e: " + titolo + "." : "",
      "Render 3D fotorealistico di quel singolo oggetto, completamente scontornato, sospeso al centro su fondo nero puro.",
      "Illuminazione al neon: alone turchese acceso attorno all oggetto; accenti rosso neon solo se il tema riguarda dolore, errore o problema.",
      "Superfici lucide con riflessi netti, altissimo dettaglio, resa premium da campagna pubblicitaria.",
      "VIETATO: qualunque testo, lettera, numero, logo, watermark, cornice, sfondo, pavimento, ombra a terra, persone o volti. Deve esserci solo l oggetto sul nero.",
    ].filter(Boolean).join(" ");
  }

  return [
    "Fotografia editoriale professionale per un centro di fisioterapia e riabilitazione in Italia.",
    tema
      ? "SOGGETTO CLINICO OBBLIGATORIO: la scena deve mostrare in modo riconoscibile il trattamento o la parte del corpo legata a: " + tema + ". Questo e il vincolo piu importante di tutti."
      : "",
    titolo ? "Contesto del messaggio: " + titolo + "." : "",
    corpo ? "Dettaglio: " + corpo.slice(0, 160) + "." : "",
    keywords ? "Elementi utili: " + keywords + "." : "",
    "Stile: fotografia reale scattata con obiettivo 50mm, luce naturale morbida e diffusa, ambiente clinico moderno pulito e accogliente, palette calda e neutra (bianco, beige, legno chiaro, tocchi di verde salvia), profondita di campo cinematografica, altissimo dettaglio, aspetto autentico e non artefatto.",
    "Persone: adulti europei realistici, corporatura normale, espressione serena e credibile, abbigliamento sportivo neutro o divisa sanitaria semplice. Mani e volti anatomicamente corretti.",
    isCover
      ? "Inquadratura di grande impatto con soggetto centrale e ampio spazio negativo in alto e in basso per inserire del testo."
      : "Inquadratura naturale con spazio negativo laterale per inserire del testo.",
    "VIETATO nella immagine: qualunque testo, lettera, numero, scritta, logo, filigrana, watermark, interfaccia grafica, collage, bordi o cornici. Niente stile 3D, cartoon, illustrazione o rendering. Niente arti o dita deformate.",
  ].filter(Boolean).join(" ");
}

type Attempt = {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

function attemptsForModel(
  model: string,
  prompt: string,
  apiKey: string,
  aspectRatio: string,
  openaiKey: string,
): Attempt[] {
  const isGpt = model.indexOf("gpt-image") === 0;

  if (isGpt) {
    if (!openaiKey) return [];
    return [{
      url: OPENAI_IMAGE_ENDPOINT,
      headers: { "Authorization": "Bearer " + openaiKey, "Content-Type": "application/json" },
      body: { model, prompt, size: "1024x1536", quality: "high", n: 1 },
    }];
  }

  const geminiHeaders = { "x-goog-api-key": apiKey, "Content-Type": "application/json" };
  const generateContentBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"] },
  };

  return [
    {
      url: AI_IMAGE_ENDPOINT,
      headers: geminiHeaders,
      body: {
        model,
        input: [{ type: "text", text: prompt }],
        response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: aspectRatio, image_size: "2K" },
      },
    },
    { url: GEMINI_MODELS_BASE + model + ":generateContent", headers: geminiHeaders, body: generateContentBody },
    { url: GEMINI_MODELS_BASE + model + "-preview:generateContent", headers: geminiHeaders, body: generateContentBody },
  ];
}

/** Prova la cascata di modelli finche una immagine non arriva. */
export async function generateAiImage(
  prompt: string,
  apiKey: string,
  aspectRatio: string,
  models: string[],
  openaiKey: string,
  errors: AiErrorLog,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  for (const model of models) {
    for (const attempt of attemptsForModel(model, prompt, apiKey, aspectRatio, openaiKey)) {
      try {
        const res = await fetch(attempt.url, {
          method: "POST",
          headers: attempt.headers,
          body: JSON.stringify(attempt.body),
        });
        if (!res.ok) {
          const txt = await res.text();
          errors.push(model + " HTTP " + res.status + " :: " + txt.slice(0, 220));
          continue;
        }
        const json = await res.json();
        const found = findImagePayload(json);
        const raw = found ? found.data : findAnyBase64(json);
        if (!raw) {
          errors.push(model + " nessuna immagine :: " + JSON.stringify(json).slice(0, 220));
          continue;
        }
        const bytes = b64ToBytes(raw);
        if (!bytes || bytes.length < 2000) {
          errors.push(model + " payload piccolo");
          continue;
        }
        errors.push("OK " + model);
        return { bytes, contentType: found && found.mime ? found.mime : "image/jpeg" };
      } catch (e) {
        errors.push(model + " eccezione :: " + String(e).slice(0, 180));
      }
    }
  }
  return null;
}

/**
 * Salva l'immagine generata su storage.
 * Ritorna {bucket, path}: il chiamante minta la signed URL quando serve
 * (regola del progetto: nel DB vanno bucket e path, non URL firmati).
 */
export async function saveAiBytes(
  bytes: Uint8Array,
  contentType: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  storagePath: string,
  index: number,
): Promise<{ bucket: string; path: string } | null> {
  try {
    const ext = contentType.indexOf("png") >= 0 ? "png" : "jpg";
    const fileName = storagePath + "/ai_slide_" + (index + 1) + "_" + Date.now() + "." + ext;
    const { error } = await supabaseAdmin.storage
      .from("carousel-images")
      .upload(fileName, bytes, { contentType, upsert: true });
    if (error) {
      console.error("AI upload error slide " + index + ":", error);
      return null;
    }
    return { bucket: "carousel-images", path: fileName };
  } catch (e) {
    console.error("AI save error slide " + index + ":", e);
    return null;
  }
}
