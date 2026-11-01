// Video virali: raccoglie i video degli account da copiare (Reel Instagram
// e TikTok, Italia e USA) e le inserzioni video che restano accese da
// settimane nella Libreria inserzioni di Meta.
//
// Modi di chiamata:
//   cron {azione:'avvia'}      → il 2 del mese: mette in coda i giri del mese
//   cron {azione:'raccogli'}   → ogni 10 minuti: avvia i giri in coda (3 alla
//                                 volta) e salva quelli finiti
//   admin {azione:'avvia'}     → come il cron, dal pulsante «Aggiorna la libreria»
//   utente {azione:'account', accountId} → un solo account, subito: serve per
//                                 i competitor appena aggiunti
//   admin/cron {azione:'conto'}  → di chi è il conto Apify, quanto ha speso nel
//                                 mese e qual è il tetto (la chiave resta qui)
//   admin/cron {azione:'classifica'} → Gemini mette le inserzioni senza
//                                 categoria fra studi, prodotti e fuori tema
//                                 (lo fa anche ogni 'raccogli')
//
// Su Apify i giri durano minuti: si avviano senza aspettarli e si leggono
// al giro dopo. Il punteggio outlier si ricalcola su tutto lo storico del
// canale salvato qui, non solo sui video dell'ultimo giro.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, requireCronSecret, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";
import {
  SISTEMA_CATEGORIE,
  engagement,
  handleInErrore,
  leggiCategorie,
  leggiInserzione,
  leggiReelInstagram,
  leggiVideoTiktok,
  medieCanale,
  outlier,
  promptCategorie,
  urlRicercaInserzioni,
  type CategoriaInserzione,
  type InserzioneDaClassificare,
  type InserzioneLetta,
  type Paese,
  type Piattaforma,
  type VideoLetto,
} from "../_shared/brand/virali.ts";

type Admin = ReturnType<typeof adminClient>;
type Grezzo = Record<string, unknown>;

const APIFY = "https://api.apify.com/v2";
const ATTORI = {
  instagram: "apify~instagram-reel-scraper",
  tiktok: "clockworks~tiktok-scraper",
  inserzioni: "apify~facebook-ads-scraper",
} as const;

// Si sta dentro la quota gratuita di Apify (5 $ al mese, Attilio 01/11/2026:
// «non spendere neanche un euro»): un giro al mese, pochi video per canale.
// Primo giro: abbastanza video per la media del canale. Dopo: solo l'ultimo
// mese, per i video nuovi e i numeri di quelli giovani.
const VIDEO_PRIMO_GIRO = 15;
const VIDEO_GIRI_DOPO = 10;
const INSERZIONI_PER_RICERCA = 15;
// La quota è condivisa con la sync delle statistiche dei clienti (~0,6 $ al
// mese): i giri dei video virali si fermano prima, lasciando questo margine.
const RISERVA_STATISTICHE_USD = 1;
const ACCOUNT_PER_GIRO = 40;
const GIRI_INSIEME = 3;
// Copertine salvate per canale (8×8 di Kallaway) più tutti gli outlier forti.
const COPERTINE_PER_CANALE = 8;
const OUTLIER_COPERTINA = 3;
const INSERZIONE_GIORNI_COPERTINA = 30;
const BUCKET = "virali";
// Classificazione delle inserzioni: testo soltanto, frazioni di centesimo.
const MODELLO_CATEGORIE = "gemini-2.5-flash";
const CATEGORIE_PER_CHIAMATA = 40;
const CATEGORIE_PER_GIRO = 200;
// La funzione ha 400 secondi: dopo 240 non si apre un altro giro.
const TEMPO_MASSIMO_MS = 240_000;

type AccountRiga = {
  id: string;
  piattaforma: Piattaforma;
  handle: string;
  paese: Paese;
  professione: string;
  brand_id: string | null;
  user_id: string | null;
  ultimo_giro: string | null;
};

type Giro = {
  id: string;
  tipo: "instagram" | "tiktok" | "inserzioni";
  parametri: Grezzo;
  stato: string;
  apify_run_id: string | null;
  dataset_id: string | null;
  avviato_il: string | null;
};

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const inizio = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const azione = String(body?.azione || "");
    const token = Deno.env.get("APIFY_API_TOKEN");
    if (!token) return jsonResponse(req, { error: "APIFY_API_TOKEN non configurato" }, 500);
    const admin = adminClient();

    // ── Chiamate del cron ──
    if (req.headers.get("x-cron-secret")) {
      const cron = requireCronSecret(req);
      if (!cron.ok) return jsonResponse(req, { error: cron.error }, cron.status);
      if (azione === "avvia") return jsonResponse(req, await avvia(admin, token));
      if (azione === "raccogli") return jsonResponse(req, await raccogli(admin, token, inizio));
      if (azione === "conto") return jsonResponse(req, await contoApify(token));
      if (azione === "classifica") return jsonResponse(req, await classificaInserzioni(admin));
      return jsonResponse(req, { error: "azione sconosciuta" }, 400);
    }

    // ── Chiamate dall'app ──
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);
    const rl = await requireWithinRateLimit(admin, auth.userId, "virali-raccolta", 6, 60);
    if (!rl.ok) return jsonResponse(req, { error: rl.error }, 429);
    const eAdmin = await isAdmin(admin, auth.userId);

    if (azione === "avvia") {
      if (!eAdmin) return jsonResponse(req, { error: "Solo l'admin aggiorna la libreria comune" }, 403);
      return jsonResponse(req, await avvia(admin, token));
    }

    if (azione === "conto") {
      if (!eAdmin) return jsonResponse(req, { error: "Solo l'admin vede il conto Apify" }, 403);
      return jsonResponse(req, await contoApify(token));
    }

    if (azione === "classifica") {
      if (!eAdmin) return jsonResponse(req, { error: "Solo l'admin classifica le inserzioni" }, 403);
      return jsonResponse(req, await classificaInserzioni(admin));
    }

    if (azione === "account") {
      const accountId = String(body?.accountId || "");
      const { data: acc } = await admin.from("virali_account").select("*").eq("id", accountId).maybeSingle();
      const riga = acc as AccountRiga | null;
      if (!riga) return jsonResponse(req, { error: "Account non trovato" }, 404);
      const suo = riga.user_id === auth.userId || (riga.brand_id === null && eAdmin);
      if (!suo) return jsonResponse(req, { error: "Account non tuo" }, 403);
      return jsonResponse(req, await raccogliAccount(admin, token, riga));
    }

    return jsonResponse(req, { error: "azione sconosciuta" }, 400);
  } catch (e) {
    console.error("virali-raccolta:", e instanceof Error ? e.message : e);
    return jsonResponse(req, { error: e instanceof Error ? e.message : "Errore sconosciuto" }, 500);
  }
});

/** Di chi è il conto Apify, piano, spesa del mese e tetto. Senza la chiave. */
async function contoApify(token: string) {
  const leggi = async (percorso: string) => {
    const res = await fetch(`${APIFY}${percorso}?token=${token}`);
    return res.ok ? ((await res.json())?.data || null) : null;
  };
  const [utente, limiti] = await Promise.all([leggi("/users/me"), leggi("/users/me/limits")]);
  if (!utente) return { ok: false, error: "Apify non risponde con questa chiave" };
  return {
    ok: true,
    utente: utente.username || null,
    email: utente.email || null,
    piano: utente.plan?.id || utente.plan?.description || null,
    usato_usd: limiti?.current?.monthlyUsageUsd ?? null,
    tetto_usd: limiti?.limits?.maxMonthlyUsageUsd ?? null,
    ciclo_inizio: limiti?.monthlyUsageCycle?.startAt ?? null,
    ciclo_fine: limiti?.monthlyUsageCycle?.endAt ?? null,
  };
}

async function isAdmin(admin: Admin, userId: string): Promise<boolean> {
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

// ── Avvio della settimana ───────────────────────────────────────────────

async function avvia(admin: Admin, token: string) {
  const seiOreFa = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { count: aperti } = await admin
    .from("virali_giri")
    .select("id", { count: "exact", head: true })
    .in("stato", ["in_coda", "in_corso"])
    .gte("creato_il", seiOreFa);
  if ((aperti ?? 0) > 0) return { ok: true, messaggio: "Raccolta già in corso", giri: 0 };

  const { data: accounts, error } = await admin
    .from("virali_account")
    .select("piattaforma, handle, ultimo_giro")
    .eq("attivo", true);
  if (error) throw new Error(error.message);

  // Lo stesso handle può essere in libreria e fra i competitor di più utenti: si legge una volta.
  const visti = new Map<string, { piattaforma: Piattaforma; handle: string; nuovo: boolean }>();
  for (const a of (accounts || []) as Array<{ piattaforma: Piattaforma; handle: string; ultimo_giro: string | null }>) {
    const k = `${a.piattaforma}:${a.handle}`;
    const prima = visti.get(k);
    visti.set(k, { piattaforma: a.piattaforma, handle: a.handle, nuovo: (prima?.nuovo ?? false) || !a.ultimo_giro });
  }

  const giri: Array<{ tipo: string; parametri: Grezzo }> = [];
  for (const piattaforma of ["instagram", "tiktok"] as const) {
    for (const nuovo of [true, false]) {
      const handles = [...visti.values()].filter((a) => a.piattaforma === piattaforma && a.nuovo === nuovo).map((a) => a.handle);
      for (let i = 0; i < handles.length; i += ACCOUNT_PER_GIRO) {
        giri.push({
          tipo: piattaforma,
          parametri: { handles: handles.slice(i, i + ACCOUNT_PER_GIRO), limite: nuovo ? VIDEO_PRIMO_GIRO : VIDEO_GIRI_DOPO, recenti: !nuovo },
        });
      }
    }
  }

  const { data: ricerche } = await admin.from("virali_ricerche").select("id, paese, professione, ricerca").eq("attiva", true);
  for (const r of (ricerche || []) as Array<{ id: string; paese: Paese; professione: string; ricerca: string }>) {
    giri.push({ tipo: "inserzioni", parametri: { ricerca_id: r.id, paese: r.paese, professione: r.professione, ricerca: r.ricerca, limite: INSERZIONI_PER_RICERCA } });
  }

  if (giri.length === 0) return { ok: true, messaggio: "Nessun account o ricerca attiva", giri: 0 };
  const { error: insErr } = await admin.from("virali_giri").insert(giri);
  if (insErr) throw new Error(insErr.message);
  const avviati = await avviaCoda(admin, token);
  return { ok: true, giri: giri.length, avviati };
}

function inputApify(giro: Pick<Giro, "tipo" | "parametri">): Grezzo {
  const p = giro.parametri;
  if (giro.tipo === "instagram") {
    return {
      username: p.handles,
      resultsLimit: p.limite,
      ...(p.recenti ? { onlyPostsNewerThan: "35 days" } : {}),
      // I video fissati in cima sono vecchi successi: costano e falsano l'outlier.
      skipPinnedPosts: true,
      includeSharesCount: true,
    };
  }
  if (giro.tipo === "tiktok") {
    return {
      profiles: p.handles,
      resultsPerPage: p.limite,
      profileScrapeSections: ["videos"],
      profileSorting: "latest",
      excludePinnedPosts: true,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    };
  }
  return {
    startUrls: [{ url: urlRicercaInserzioni(p.paese as Paese, String(p.ricerca)) }],
    resultsLimit: p.limite,
    isDetailsPerAd: false,
    onlyTotal: false,
    includeAboutPage: false,
  };
}

/** C'è ancora quota Apify per i video virali, tenendo il margine per le statistiche dei clienti? */
async function spazioApify(token: string): Promise<{ ok: boolean; usato?: number; tetto?: number }> {
  try {
    const res = await fetch(`${APIFY}/users/me/limits?token=${token}`);
    if (!res.ok) return { ok: true };
    const d = (await res.json())?.data;
    const usato = d?.current?.monthlyUsageUsd;
    const tetto = d?.limits?.maxMonthlyUsageUsd;
    if (typeof usato !== "number" || typeof tetto !== "number") return { ok: true };
    return { ok: usato < tetto - RISERVA_STATISTICHE_USD, usato, tetto };
  } catch {
    return { ok: true };
  }
}

/** Avvia i giri in coda finché ce ne sono al massimo 3 in corso e c'è quota. */
async function avviaCoda(admin: Admin, token: string): Promise<number> {
  const { count: inCoda } = await admin.from("virali_giri").select("id", { count: "exact", head: true }).eq("stato", "in_coda");
  if (!inCoda) return 0;
  const spazio = await spazioApify(token);
  if (!spazio.ok) {
    console.warn(`Quota Apify del mese quasi finita (${spazio.usato} $ su ${spazio.tetto} $): i giri restano in coda`);
    return 0;
  }
  const { count: inCorso } = await admin.from("virali_giri").select("id", { count: "exact", head: true }).eq("stato", "in_corso");
  let liberi = GIRI_INSIEME - (inCorso ?? 0);
  if (liberi <= 0) return 0;
  const { data: coda } = await admin.from("virali_giri").select("*").eq("stato", "in_coda").order("creato_il").limit(liberi);
  let avviati = 0;
  for (const giro of (coda || []) as Giro[]) {
    if (liberi <= 0) break;
    const res = await fetch(`${APIFY}/acts/${ATTORI[giro.tipo]}/runs?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputApify(giro)),
    });
    if (!res.ok) {
      const testo = (await res.text()).slice(0, 300);
      console.error(`Apify non avvia ${giro.tipo}: ${res.status} ${testo}`);
      // Memoria, giri contemporanei o tetto di spesa mensile di Apify: si riprova al prossimo giro.
      if (res.status === 402 || res.status === 429 || /memory|concurrent|limit exceeded|platform-feature-disabled/i.test(testo)) break;
      await admin.from("virali_giri").update({ stato: "errore", errore: `Avvio: ${res.status} ${testo}` }).eq("id", giro.id);
      continue;
    }
    const run = (await res.json())?.data;
    await admin.from("virali_giri").update({
      stato: "in_corso",
      apify_run_id: run?.id,
      dataset_id: run?.defaultDatasetId,
      avviato_il: new Date().toISOString(),
    }).eq("id", giro.id);
    avviati++;
    liberi--;
  }
  return avviati;
}

// ── Raccolta dei giri finiti ────────────────────────────────────────────

async function raccogli(admin: Admin, token: string, inizio: number) {
  const { data: giri } = await admin.from("virali_giri").select("*").eq("stato", "in_corso").order("avviato_il");
  const esiti: Array<Record<string, unknown>> = [];
  for (const giro of (giri || []) as Giro[]) {
    if (Date.now() - inizio > TEMPO_MASSIMO_MS) break;
    const res = await fetch(`${APIFY}/actor-runs/${giro.apify_run_id}?token=${token}`);
    if (!res.ok) { esiti.push({ giro: giro.id, stato: `lettura ${res.status}` }); continue; }
    const run = (await res.json())?.data || {};
    const stato = String(run.status || "");
    if (stato === "SUCCEEDED") {
      try {
        const items = await leggiDataset(token, giro.dataset_id || run.defaultDatasetId);
        const salvati = giro.tipo === "inserzioni"
          ? await salvaInserzioni(admin, items, giro.parametri)
          : await salvaVideo(admin, giro.tipo, items, (giro.parametri.handles as string[]) || []);
        await admin.from("virali_giri").update({
          stato: "raccolto",
          risultati: salvati,
          costo_usd: typeof run.usageTotalUsd === "number" ? run.usageTotalUsd : null,
          raccolto_il: new Date().toISOString(),
        }).eq("id", giro.id);
        esiti.push({ giro: giro.id, tipo: giro.tipo, salvati });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/^Dataset 40[23]$/.test(msg)) {
          // Il giro è finito ma Apify non dà i dati finché il conto è oltre il tetto mensile:
          // resta in corso e si rilegge al prossimo giro, senza pagarlo due volte.
          await admin.from("virali_giri").update({ errore: "Apify: tetto mensile superato, dataset da rileggere" }).eq("id", giro.id);
          esiti.push({ giro: giro.id, attesa: msg });
          continue;
        }
        await admin.from("virali_giri").update({ stato: "errore", errore: msg.slice(0, 500) }).eq("id", giro.id);
        esiti.push({ giro: giro.id, errore: msg });
      }
    } else if (["FAILED", "ABORTED", "TIMED-OUT"].includes(stato)) {
      await admin.from("virali_giri").update({ stato: "errore", errore: `Apify: ${stato}` }).eq("id", giro.id);
      esiti.push({ giro: giro.id, errore: stato });
    } else if (giro.avviato_il && Date.now() - Date.parse(giro.avviato_il) > 3 * 3600_000) {
      await admin.from("virali_giri").update({ stato: "errore", errore: `Apify: fermo da 3 ore (${stato})` }).eq("id", giro.id);
      esiti.push({ giro: giro.id, errore: "fermo" });
    }
  }
  const avviati = await avviaCoda(admin, token);
  // Inserzioni appena salvate (o rimaste indietro): studi, prodotti, fuori tema.
  const categorie = Date.now() - inizio < TEMPO_MASSIMO_MS
    ? await classificaInserzioni(admin).catch((e) => ({ ok: false, error: e instanceof Error ? e.message : String(e) }))
    : null;
  return { ok: true, raccolti: esiti, avviati, categorie };
}

async function leggiDataset(token: string, datasetId: string): Promise<Grezzo[]> {
  const tutti: Grezzo[] = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const res = await fetch(`${APIFY}/datasets/${datasetId}/items?token=${token}&clean=true&format=json&offset=${offset}&limit=1000`);
    if (!res.ok) throw new Error(`Dataset ${res.status}`);
    const pagina = await res.json();
    if (!Array.isArray(pagina) || pagina.length === 0) break;
    tutti.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return tutti;
}

/** Un solo account, subito (competitor appena aggiunto). */
async function raccogliAccount(admin: Admin, token: string, acc: AccountRiga) {
  const spazio = await spazioApify(token);
  if (!spazio.ok) {
    await admin.from("virali_account").update({ ultimo_errore: "Quota Apify del mese finita: si legge al prossimo giro" }).eq("id", acc.id);
    return { ok: false, error: "La quota Apify gratuita del mese è finita: il competitor si legge al prossimo giro." };
  }
  const giro = { tipo: acc.piattaforma, parametri: { handles: [acc.handle], limite: VIDEO_PRIMO_GIRO, recenti: false } } as const;
  const res = await fetch(`${APIFY}/acts/${ATTORI[acc.piattaforma]}/run-sync-get-dataset-items?token=${token}&timeout=150`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputApify(giro)),
  });
  if (!res.ok) {
    const testo = (await res.text()).slice(0, 200);
    await admin.from("virali_account").update({ ultimo_errore: `Lettura non riuscita (${res.status})` }).eq("id", acc.id);
    return { ok: false, error: `Apify ${res.status}: ${testo}` };
  }
  const items = await res.json();
  const salvati = await salvaVideo(admin, acc.piattaforma, Array.isArray(items) ? items : [], [acc.handle]);
  const { data: dopo } = await admin.from("virali_account").select("ultimo_errore").eq("id", acc.id).maybeSingle();
  return { ok: true, video: salvati, errore: (dopo as { ultimo_errore?: string | null } | null)?.ultimo_errore || null };
}

// ── Salvataggio dei video ───────────────────────────────────────────────

async function salvaVideo(admin: Admin, piattaforma: Piattaforma, items: Grezzo[], handles: string[]): Promise<number> {
  const oggi = new Date();
  const seguiti = new Set(handles);
  const leggi = piattaforma === "instagram" ? leggiReelInstagram : leggiVideoTiktok;
  // Si tengono solo i video degli account seguiti (non le collaborazioni pubblicate da altri).
  const letti = items.map((it) => leggi(it)).filter((v): v is VideoLetto => !!v && seguiti.has(v.handle));

  // Paese e professione vengono dall'account: prima la riga della libreria, poi quella di un utente.
  const { data: righe } = await admin
    .from("virali_account")
    .select("id, handle, paese, professione, brand_id")
    .eq("piattaforma", piattaforma)
    .in("handle", handles);
  const accounts = ((righe || []) as Array<{ id: string; handle: string; paese: string; professione: string; brand_id: string | null }>)
    .sort((a, b) => Number(a.brand_id !== null) - Number(b.brand_id !== null));
  const datiAccount = new Map<string, { paese: string; professione: string }>();
  for (const a of accounts) if (!datiAccount.has(a.handle)) datiAccount.set(a.handle, { paese: a.paese, professione: a.professione });

  const adesso = oggi.toISOString();
  const daSalvare = letti.map((v) => ({
    piattaforma,
    handle: v.handle,
    external_id: v.external_id,
    shortcode: v.shortcode,
    url: v.url,
    paese: datiAccount.get(v.handle)?.paese || "IT",
    professione: datiAccount.get(v.handle)?.professione || "fisioterapista",
    didascalia: v.didascalia,
    pubblicato_il: v.pubblicato_il,
    durata_s: v.durata_s,
    views: v.views,
    likes: v.likes,
    commenti: v.commenti,
    condivisioni: v.condivisioni,
    salvataggi: v.salvataggi,
    engagement: engagement(v),
    video_url: v.video_url,
    ...(v.trascrizione ? { trascrizione: v.trascrizione } : {}),
    aggiornato_il: adesso,
  }));
  for (let i = 0; i < daSalvare.length; i += 300) {
    const { error } = await admin.from("virali_video").upsert(daSalvare.slice(i, i + 300), { onConflict: "piattaforma,external_id" });
    if (error) throw new Error(`Salvataggio video: ${error.message}`);
  }

  // Outlier su tutto lo storico salvato del canale.
  const { data: storico } = await admin
    .from("virali_video")
    .select("id, piattaforma, handle, external_id, url, views, pubblicato_il, outlier, copertina")
    .eq("piattaforma", piattaforma)
    .in("handle", handles);
  type Storico = { id: string; piattaforma: string; handle: string; external_id: string; url: string; views: number | null; pubblicato_il: string | null; outlier: number | null; copertina: string | null };
  const tutti = (storico || []) as Storico[];
  const medie = medieCanale(tutti, oggi);
  const aggiornati = tutti.map((v) => ({ ...v, outlier: outlier(v.views, medie.get(v.handle)) }));
  const cambiati = aggiornati
    .filter((v, i) => v.outlier !== tutti[i].outlier)
    .map(({ id, piattaforma: p, handle, external_id, url, outlier: o }) => ({ id, piattaforma: p, handle, external_id, url, outlier: o }));
  for (let i = 0; i < cambiati.length; i += 300) {
    const { error } = await admin.from("virali_video").upsert(cambiati.slice(i, i + 300), { onConflict: "id" });
    if (error) console.error("Aggiornamento outlier:", error.message);
  }

  // Stato degli account: follower, media, errori.
  const errori = new Set(handleInErrore(items));
  const conVideo = new Set(letti.map((v) => v.handle));
  const follower = new Map<string, number>();
  for (const v of letti) if (v.follower !== null) follower.set(v.handle, v.follower);
  for (const handle of handles) {
    const errore = errori.has(handle)
      ? "Profilo non trovato o privato"
      : conVideo.has(handle) ? null : "Nessun video trovato nell'ultimo giro";
    const patch: Record<string, unknown> = { ultimo_giro: adesso, ultimo_errore: errore };
    if (medie.has(handle)) patch.media_views = Math.round(medie.get(handle)!);
    if (follower.has(handle)) patch.follower = follower.get(handle);
    await admin.from("virali_account").update(patch).eq("piattaforma", piattaforma).eq("handle", handle);
  }

  // Copertine: i link delle piattaforme scadono, si salvano subito le migliori di ogni canale.
  const fresche = new Map(letti.filter((v) => v.copertina_url).map((v) => [v.external_id, v.copertina_url as string]));
  const perCanale = new Map<string, typeof aggiornati>();
  for (const v of aggiornati) {
    if (!fresche.has(v.external_id)) continue;
    const lista = perCanale.get(v.handle) || [];
    lista.push(v);
    perCanale.set(v.handle, lista);
  }
  const daScaricare: Array<{ id: string; url: string; percorso: string }> = [];
  for (const lista of perCanale.values()) {
    lista.sort((a, b) => (b.outlier ?? 0) - (a.outlier ?? 0) || (b.views ?? 0) - (a.views ?? 0));
    lista.forEach((v, i) => {
      if (v.copertina) return;
      if (i < COPERTINE_PER_CANALE || (v.outlier ?? 0) >= OUTLIER_COPERTINA) {
        daScaricare.push({ id: v.id, url: fresche.get(v.external_id)!, percorso: `video/${piattaforma}/${v.external_id}.jpg` });
      }
    });
  }
  await salvaCopertine(admin, "virali_video", daScaricare);
  return daSalvare.length;
}

// ── Salvataggio delle inserzioni ────────────────────────────────────────

async function salvaInserzioni(admin: Admin, items: Grezzo[], parametri: Grezzo): Promise<number> {
  const oggi = new Date();
  const lette = items.map((it) => leggiInserzione(it, oggi)).filter((a): a is InserzioneLetta => !!a);
  // Stessa inserzione con più varianti nello stesso giro: una riga.
  const uniche = [...new Map(lette.map((a) => [a.ad_id, a])).values()];
  const adesso = oggi.toISOString();
  const righe = uniche.map(({ copertina_url: _c, ...a }) => ({
    ...a,
    paese: String(parametri.paese || "IT"),
    professione: String(parametri.professione || "fisioterapista"),
    ricerca: String(parametri.ricerca || ""),
    aggiornato_il: adesso,
  }));
  for (let i = 0; i < righe.length; i += 300) {
    const { error } = await admin.from("virali_inserzioni").upsert(righe.slice(i, i + 300), { onConflict: "ad_id" });
    if (error) throw new Error(`Salvataggio inserzioni: ${error.message}`);
  }

  const { data: salvate } = await admin
    .from("virali_inserzioni")
    .select("id, ad_id, copertina, giorni")
    .in("ad_id", uniche.map((a) => a.ad_id));
  const fresche = new Map(uniche.filter((a) => a.copertina_url).map((a) => [a.ad_id, a.copertina_url as string]));
  const daScaricare = ((salvate || []) as Array<{ id: string; ad_id: string; copertina: string | null; giorni: number | null }>)
    .filter((a) => !a.copertina && fresche.has(a.ad_id) && (a.giorni ?? 0) >= INSERZIONE_GIORNI_COPERTINA)
    .map((a) => ({ id: a.id, url: fresche.get(a.ad_id)!, percorso: `inserzioni/${a.ad_id}.jpg` }));
  await salvaCopertine(admin, "virali_inserzioni", daScaricare);
  return righe.length;
}

// ── Categorie delle inserzioni ──────────────────────────────────────────

/** Gemini mette le inserzioni accese senza categoria fra studi, prodotti e fuori tema. */
async function classificaInserzioni(admin: Admin) {
  const gemini = Deno.env.get("GEMINI_API_KEY");
  if (!gemini) return { ok: false, error: "GEMINI_API_KEY non configurata" };
  const { data, error } = await admin
    .from("virali_inserzioni")
    .select("id, pagina, testo, titolo, link, professione")
    .eq("attiva", true)
    .is("categoria", null)
    .order("giorni", { ascending: false, nullsFirst: false })
    .limit(CATEGORIE_PER_GIRO);
  if (error) throw new Error(error.message);
  const lista = (data || []) as Array<InserzioneDaClassificare & { id: string }>;
  const conteggio: Record<CategoriaInserzione, number> = { studio: 0, prodotto: 0, fuori_tema: 0 };
  let senzaRisposta = 0;
  for (let i = 0; i < lista.length; i += CATEGORIE_PER_CHIAMATA) {
    const blocco = lista.slice(i, i + CATEGORIE_PER_CHIAMATA);
    const res = await callGeminiWithRetry({
      apiKey: gemini,
      model: MODELLO_CATEGORIE,
      body: {
        system_instruction: { parts: [{ text: SISTEMA_CATEGORIE }] },
        contents: [{ role: "user", parts: [{ text: promptCategorie(blocco) }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      },
    });
    if (!res.ok) {
      console.error(`Categorie inserzioni: Gemini ${res.status}`);
      senzaRisposta += blocco.length;
      continue;
    }
    let categorie: Array<CategoriaInserzione | null>;
    try {
      categorie = leggiCategorie(testoGemini(res.data), blocco.length);
    } catch (e) {
      console.error("Categorie inserzioni: risposta illeggibile", e instanceof Error ? e.message : e);
      senzaRisposta += blocco.length;
      continue;
    }
    for (const categoria of ["studio", "prodotto", "fuori_tema"] as const) {
      const ids = blocco.filter((_, k) => categorie[k] === categoria).map((a) => a.id);
      if (ids.length === 0) continue;
      const { error: upErr } = await admin.from("virali_inserzioni").update({ categoria }).in("id", ids);
      if (upErr) throw new Error(`Categorie inserzioni: ${upErr.message}`);
      conteggio[categoria] += ids.length;
    }
    senzaRisposta += categorie.filter((c) => c === null).length;
  }
  return { ok: true, lette: lista.length, ...conteggio, senza_risposta: senzaRisposta };
}

function testoGemini(data: unknown): string {
  const parts = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("");
}

// ── Copertine ───────────────────────────────────────────────────────────

async function salvaCopertine(admin: Admin, tabella: "virali_video" | "virali_inserzioni", lista: Array<{ id: string; url: string; percorso: string }>) {
  let i = 0;
  const lavora = async () => {
    while (i < lista.length) {
      const c = lista[i++];
      try {
        const res = await fetch(c.url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) continue;
        const tipo = res.headers.get("content-type") || "image/jpeg";
        if (!tipo.startsWith("image/")) continue;
        const dati = new Uint8Array(await res.arrayBuffer());
        if (dati.byteLength > 3_000_000) continue;
        const { error } = await admin.storage.from(BUCKET).upload(c.percorso, dati, { contentType: tipo, upsert: true });
        if (error) { console.warn("Copertina non salvata:", error.message); continue; }
        await admin.from(tabella).update({ copertina: c.percorso }).eq("id", c.id);
      } catch {
        // link scaduto o lento: la card resta senza copertina
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, lista.length) }, lavora));
}
