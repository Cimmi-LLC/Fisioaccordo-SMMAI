// «Duplica questo video»: guarda il video originale con Gemini e lo smonta
// nei mattoncini di Kallaway (una volta sola per video: l'analisi resta
// salvata e serve a tutti), poi scrive il copione per il brand dell'utente.
//
//   {azione:'analizza', videoId | inserzioneId}
//   {azione:'copione',  videoId | inserzioneId, brandId, tipo:'esatta'|'vicina'}
//
// Il video si legge con i permessi dell'utente (RLS): chi non vede un
// video nell'app non può nemmeno farselo duplicare.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient, assertBrandOwnership, requireAuth, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import { professionPromptBlock, resolveProfession, type ProfessionBrandLike } from "../_shared/brand/profession.ts";
import {
  SISTEMA_ANALISI,
  SISTEMA_COPIONE,
  leggiAnalisi,
  leggiCopione,
  leggiInserzione,
  paroleVietateIn,
  promptAnalisi,
  promptCopione,
  testoDelCopione,
  urlInserzione,
  type AnalisiVideo,
  type BrandPerCopione,
  type TipoCopia,
} from "../_shared/brand/virali.ts";

type Admin = ReturnType<typeof adminClient>;
type Grezzo = Record<string, unknown>;

const MODELLO = "gemini-2.5-flash";
const APIFY = "https://api.apify.com/v2";
// Gemini accetta fino a 20 MB per richiesta: il video in base64 pesa un terzo in più.
const MB_MASSIMI = 14;

type Origine = {
  tabella: "virali_video" | "virali_inserzioni";
  id: string;
  piattaforma: "instagram" | "tiktok" | "inserzione";
  handle: string;
  paese: string;
  views: number | null;
  url: string;
  didascalia: string;
  trascrizione: string | null;
  video_url: string | null;
  analisi: AnalisiVideo | null;
  ad_id?: string;
};

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);
    const admin = adminClient();
    const rl = await requireWithinRateLimit(admin, auth.userId, "duplica-video", 10, 60);
    if (!rl.ok) return jsonResponse(req, { error: rl.error }, 429);

    const body = await req.json().catch(() => ({}));
    const azione = String(body?.azione || "");
    const gemini = Deno.env.get("GEMINI_API_KEY");
    if (!gemini) return jsonResponse(req, { error: "GEMINI_API_KEY non configurata" }, 500);

    const origine = await caricaOrigine(auth.authHeader, body);
    if (!origine) return jsonResponse(req, { error: "Video non trovato" }, 404);

    const analisi = origine.analisi || (await analizza(admin, gemini, origine));

    if (azione === "analizza") return jsonResponse(req, { ok: true, analisi });

    if (azione === "copione") {
      const brandId = String(body?.brandId || "");
      const tipo: TipoCopia = body?.tipo === "vicina" ? "vicina" : "esatta";
      const own = await assertBrandOwnership(admin, auth.userId, brandId);
      if (!own.ok) return jsonResponse(req, { error: own.error }, own.status);
      const { data: brand } = await admin.from("brands").select("*").eq("id", brandId).maybeSingle();
      if (!brand) return jsonResponse(req, { error: "Brand non trovato" }, 404);

      const copione = await scriviCopione(gemini, analisi, tipo, brand as BrandPerCopione & Grezzo, origine);
      const { data: salvato, error } = await admin.from("virali_copioni").insert({
        user_id: auth.userId,
        brand_id: brandId,
        video_id: origine.tabella === "virali_video" ? origine.id : null,
        inserzione_id: origine.tabella === "virali_inserzioni" ? origine.id : null,
        tipo,
        copione,
      }).select("id, creato_il").single();
      if (error) console.error("Copione non salvato:", error.message);
      return jsonResponse(req, { ok: true, analisi, copione, copioneId: salvato?.id || null });
    }

    return jsonResponse(req, { error: "azione sconosciuta" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto";
    console.error("duplica-video:", msg);
    return jsonResponse(req, { error: msg }, 500);
  }
});

/** Legge il video o l'inserzione con i permessi dell'utente. */
async function caricaOrigine(authHeader: string, body: Grezzo): Promise<Origine | null> {
  const utente = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  if (body?.videoId) {
    const { data } = await utente.from("virali_video").select("*").eq("id", String(body.videoId)).maybeSingle();
    if (!data) return null;
    const v = data as Grezzo;
    return {
      tabella: "virali_video",
      id: String(v.id),
      piattaforma: v.piattaforma as "instagram" | "tiktok",
      handle: String(v.handle),
      paese: String(v.paese),
      views: (v.views as number | null) ?? null,
      url: String(v.url),
      didascalia: String(v.didascalia || ""),
      trascrizione: (v.trascrizione as string | null) ?? null,
      video_url: (v.video_url as string | null) ?? null,
      analisi: (v.analisi as AnalisiVideo | null) ?? null,
    };
  }
  if (body?.inserzioneId) {
    const { data } = await utente.from("virali_inserzioni").select("*").eq("id", String(body.inserzioneId)).maybeSingle();
    if (!data) return null;
    const a = data as Grezzo;
    return {
      tabella: "virali_inserzioni",
      id: String(a.id),
      piattaforma: "inserzione",
      handle: String(a.pagina),
      paese: String(a.paese),
      views: null,
      url: urlInserzione(String(a.ad_id)),
      didascalia: [a.titolo, a.testo].filter(Boolean).join("\n"),
      trascrizione: null,
      video_url: (a.video_url as string | null) ?? null,
      analisi: (a.analisi as AnalisiVideo | null) ?? null,
      ad_id: String(a.ad_id),
    };
  }
  return null;
}

// ── Analisi del video ───────────────────────────────────────────────────

async function analizza(admin: Admin, gemini: string, o: Origine): Promise<AnalisiVideo> {
  let video = o.video_url ? await scarica(o.video_url) : null;
  if (!video) {
    // I link delle piattaforme scadono in pochi giorni: se ne chiede uno nuovo ad Apify.
    const nuovo = await linkFresco(o);
    if (nuovo) {
      await admin.from(o.tabella).update({ video_url: nuovo }).eq("id", o.id);
      video = await scarica(nuovo);
    }
  }
  if (!video) throw new Error("Non riesco a scaricare il video originale: aprilo sulla piattaforma e riprova più tardi.");

  const res = await callGeminiWithRetry({
    apiKey: gemini,
    model: MODELLO,
    body: {
      system_instruction: { parts: [{ text: SISTEMA_ANALISI }] },
      contents: [{
        role: "user",
        parts: [
          { text: promptAnalisi({ piattaforma: o.piattaforma, handle: o.handle, didascalia: o.didascalia, trascrizione: o.trascrizione }) },
          { inline_data: { mime_type: video.mime, data: video.base64 } },
        ],
      }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    },
  });
  if (!res.ok) throw new Error(`Gemini non ha guardato il video (${res.status})`);
  const analisi = leggiAnalisi(testoGemini(res.data));
  await admin.from(o.tabella).update({ analisi, analisi_il: new Date().toISOString() }).eq("id", o.id);
  return analisi;
}

function testoGemini(data: unknown): string {
  const parts = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("");
}

async function scarica(url: string): Promise<{ base64: string; mime: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const lunghezza = Number(res.headers.get("content-length") || 0);
    if (lunghezza > MB_MASSIMI * 1_000_000) throw new Error(`Video troppo pesante da guardare (${Math.round(lunghezza / 1_000_000)} MB)`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 10_000) return null;
    if (buf.byteLength > MB_MASSIMI * 1_000_000) throw new Error(`Video troppo pesante da guardare (${Math.round(buf.byteLength / 1_000_000)} MB)`);
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const tipo = res.headers.get("content-type") || "";
    return { base64: btoa(bin), mime: tipo.startsWith("video/") ? tipo.split(";")[0] : "video/mp4" };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Video troppo pesante")) throw e;
    return null;
  }
}

async function apifySync(attore: string, input: Grezzo): Promise<Grezzo[]> {
  const token = Deno.env.get("APIFY_API_TOKEN");
  if (!token) return [];
  const res = await fetch(`${APIFY}/acts/${attore}/run-sync-get-dataset-items?token=${token}&timeout=120`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return [];
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

async function linkFresco(o: Origine): Promise<string | null> {
  if (o.piattaforma === "instagram") {
    const [p] = await apifySync("apify~instagram-scraper", { directUrls: [o.url], resultsType: "posts", resultsLimit: 1, addParentData: false });
    return typeof p?.videoUrl === "string" ? p.videoUrl : null;
  }
  if (o.piattaforma === "tiktok") {
    const [p] = await apifySync("clockworks~tiktok-scraper", { postURLs: [o.url], resultsPerPage: 1, shouldDownloadVideos: true, shouldDownloadCovers: false });
    const media = Array.isArray(p?.mediaUrls) ? (p.mediaUrls as unknown[]).find((u) => typeof u === "string") as string | undefined : undefined;
    if (!media) return null;
    // I file scaricati da Apify stanno nel suo archivio: si leggono col token.
    const token = Deno.env.get("APIFY_API_TOKEN");
    return media.includes("api.apify.com") && token && !media.includes("token=")
      ? `${media}${media.includes("?") ? "&" : "?"}token=${token}`
      : media;
  }
  if (o.ad_id) {
    const [a] = await apifySync("apify~facebook-ads-scraper", { startUrls: [{ url: urlInserzione(o.ad_id) }], resultsLimit: 1 });
    return a ? leggiInserzione(a, new Date())?.video_url || null : null;
  }
  return null;
}

// ── Copione ─────────────────────────────────────────────────────────────

async function scriviCopione(gemini: string, analisi: AnalisiVideo, tipo: TipoCopia, brand: BrandPerCopione & Grezzo, o: Origine) {
  const prompt = promptCopione({
    analisi,
    tipo,
    brand,
    bloccoProfessione: professionPromptBlock(resolveProfession(brand as ProfessionBrandLike)),
    origine: { piattaforma: o.piattaforma === "inserzione" ? "inserzione Meta" : o.piattaforma, handle: o.handle, paese: o.paese, views: o.views },
  });
  const chiedi = async (testo: string) => {
    const res = await callGeminiWithRetry({
      apiKey: gemini,
      model: MODELLO,
      body: {
        system_instruction: { parts: [{ text: SISTEMA_COPIONE }] },
        contents: [{ role: "user", parts: [{ text: testo }] }],
        generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
      },
    });
    if (!res.ok) throw new Error(`Gemini non ha scritto il copione (${res.status})`);
    return leggiCopione(testoGemini(res.data), tipo);
  };

  let copione = await chiedi(prompt);
  const vietate = paroleVietateIn(testoDelCopione(copione), brand.parole_da_evitare || []);
  if (vietate.length) {
    // Una sola correzione: stesso copione senza le parole vietate.
    copione = await chiedi(`${prompt}\n\nHai già scritto questo copione:\n${JSON.stringify(copione)}\n\nRiscrivilo uguale togliendo queste parole, che non si usano mai: ${vietate.join(", ")}.`);
  }
  return copione;
}
