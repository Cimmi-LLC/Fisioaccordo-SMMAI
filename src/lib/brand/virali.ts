// Video virali da copiare: lettura dei dati di Apify (Reel Instagram, TikTok,
// Libreria inserzioni Meta), punteggio outlier e regole del copione
// «Duplica questo video».
//
// Metodo: Short Form Academy di Kallaway (vault Generale,
// wiki/concepts/metodo-contenuti-organici-kallaway.md):
//   - outlier = visualizzazioni ÷ media del canale negli ultimi 3 mesi;
//     da studiare sopra 5x, il sistema a batch cerca il 10x;
//   - le probabili sponsorizzate (engagement sotto un terzo di quello tipico
//     del canale) si nascondono: lo calcola la vista virali_video_vista;
//   - copia esatta = cambia 1 mattoncino, copia vicina = ne cambia 2-3.
// Per i soldi: un'inserzione che resta accesa per settimane sta vendendo,
// nessuno paga per mesi un video che non rende. Le ricerche per parola chiave
// portano anche prodotti e pagine fuori tema: Gemini le classifica e l'app
// mostra di serie solo studi e professionisti.
//
// File specchio: identico in supabase/functions/_shared/brand/virali.ts
// (lo controlla mirrorSync.test.ts). Niente import: serve a Vite e a Deno.

export type Piattaforma = 'instagram' | 'tiktok';
export type Paese = 'IT' | 'US' | 'ALTRO';
export type TipoCopia = 'esatta' | 'vicina';

export const PAESI: Array<{ id: Paese; label: string }> = [
  { id: 'IT', label: 'Italia' },
  { id: 'US', label: 'USA' },
  { id: 'ALTRO', label: 'Altro' },
];

/** Outlier da studiare (Kallaway 2.4) e outlier forte (sistema a batch). */
export const OUTLIER_DA_STUDIARE = 5;
export const OUTLIER_FORTE = 10;
/** Giorni della media mobile del canale. */
export const GIORNI_MEDIA = 90;
/** Sotto questi video negli ultimi 90 giorni la media usa tutti quelli letti. */
const MINIMO_VIDEO_MEDIA = 5;

export type VideoLetto = {
  piattaforma: Piattaforma;
  handle: string;
  external_id: string;
  shortcode: string | null;
  url: string;
  didascalia: string;
  pubblicato_il: string | null;
  durata_s: number | null;
  views: number | null;
  likes: number | null;
  commenti: number | null;
  condivisioni: number | null;
  salvataggi: number | null;
  copertina_url: string | null;
  video_url: string | null;
  follower: number | null;
  trascrizione: string | null;
};

export type InserzioneLetta = {
  ad_id: string;
  pagina: string;
  pagina_id: string | null;
  iniziata_il: string | null;
  finita_il: string | null;
  attiva: boolean;
  giorni: number | null;
  varianti: number;
  testo: string;
  titolo: string;
  link: string | null;
  cta: string | null;
  piattaforme: string[];
  video_url: string | null;
  copertina_url: string | null;
};

// ── Handle e link ───────────────────────────────────────────────────────

/** Riconosce la piattaforma da un link incollato. */
export function piattaformaDaLink(raw: string): Piattaforma | null {
  const s = raw.trim().toLowerCase();
  if (s.includes('tiktok.com')) return 'tiktok';
  if (s.includes('instagram.com')) return 'instagram';
  return null;
}

/** "@Nome", "https://www.instagram.com/nome/?hl=it", "tiktok.com/@nome" → "nome". */
export function normalizzaHandle(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^https?:\/\//i, '').replace(/^(www\.|m\.|vm\.)/i, '');
  s = s.replace(/^(instagram\.com|tiktok\.com)\/?/i, '');
  s = s.split(/[/?#\s]/)[0] || '';
  s = s.replace(/^@/, '');
  return s.toLowerCase();
}

export function handleValido(handle: string): boolean {
  return /^[a-z0-9._]{1,30}$/.test(handle);
}

/** Pagina del video sulla piattaforma, da incorporare nell'app. */
export function urlIncorporato(piattaforma: Piattaforma, externalId: string, shortcode: string | null): string | null {
  if (piattaforma === 'instagram') return shortcode ? `https://www.instagram.com/reel/${shortcode}/embed/` : null;
  return externalId ? `https://www.tiktok.com/embed/v2/${externalId}` : null;
}

export function urlProfilo(piattaforma: Piattaforma, handle: string): string {
  return piattaforma === 'instagram' ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`;
}

/** Ricerca nella Libreria inserzioni: solo inserzioni video attive. */
export function urlRicercaInserzioni(paese: Paese, ricerca: string): string {
  const p = new URLSearchParams({
    active_status: 'active',
    ad_type: 'all',
    country: paese === 'ALTRO' ? 'ALL' : paese,
    q: ricerca,
    search_type: 'keyword_unordered',
    media_type: 'video',
  });
  return `https://www.facebook.com/ads/library/?${p.toString()}`;
}

export function urlInserzione(adId: string): string {
  return `https://www.facebook.com/ads/library/?id=${encodeURIComponent(adId)}`;
}

// ── Lettura dei dati Apify ──────────────────────────────────────────────

type Grezzo = Record<string, unknown>;

function numero(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0) return Number(v);
  return null;
}

function testo(v: unknown, max = 2200): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function primo<T>(...valori: Array<T | null | undefined>): T | null {
  for (const v of valori) if (v !== null && v !== undefined) return v;
  return null;
}

function dataIso(v: unknown): string | null {
  if (typeof v === 'number' && v > 0) {
    // secondi (TikTok, Meta) o millisecondi
    const ms = v < 1e12 ? v * 1000 : v;
    return new Date(ms).toISOString();
  }
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/** Riga di apify~instagram-reel-scraper. null se non è un video leggibile. */
export function leggiReelInstagram(item: Grezzo): VideoLetto | null {
  if (!item || item.error) return null;
  const shortcode = typeof item.shortCode === 'string' ? item.shortCode : null;
  const id = typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id) : shortcode;
  const handle = typeof item.ownerUsername === 'string' ? item.ownerUsername.toLowerCase() : '';
  const eVideo = item.type === 'Video' || item.productType === 'clips' || !!item.videoUrl;
  if (!id || !handle || !eVideo) return null;
  const url = typeof item.url === 'string' && item.url
    ? item.url
    : shortcode ? `https://www.instagram.com/reel/${shortcode}/` : '';
  if (!url) return null;
  // videoPlayCount = il numero mostrato sul reel; videoViewCount è il vecchio conteggio.
  const views = primo(numero(item.videoPlayCount), numero(item.videoViewCount));
  return {
    piattaforma: 'instagram',
    handle,
    external_id: id,
    shortcode,
    url,
    didascalia: testo(item.caption),
    pubblicato_il: dataIso(item.timestamp),
    durata_s: numero(item.videoDuration),
    views,
    // Instagram dà -1 quando i like sono nascosti: numero() lo scarta.
    likes: numero(item.likesCount),
    commenti: numero(item.commentsCount),
    condivisioni: primo(numero(item.sharesCount), numero(item.reshareCount), numero(item.shareCount)),
    salvataggi: null,
    copertina_url: typeof item.displayUrl === 'string' ? item.displayUrl : null,
    video_url: typeof item.videoUrl === 'string' ? item.videoUrl : null,
    follower: null,
    trascrizione: typeof item.transcript === 'string' && item.transcript.trim() ? item.transcript.slice(0, 8000) : null,
  };
}

/** Riga di clockworks~tiktok-scraper. null per caroselli di foto e righe d'errore. */
export function leggiVideoTiktok(item: Grezzo): VideoLetto | null {
  if (!item || item.error || item.isSlideshow) return null;
  const id = typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id) : null;
  const autore = (item.authorMeta || {}) as Grezzo;
  const handle = typeof autore.name === 'string' ? autore.name.toLowerCase() : '';
  if (!id || !handle) return null;
  const meta = (item.videoMeta || {}) as Grezzo;
  const media = Array.isArray(item.mediaUrls) ? (item.mediaUrls as unknown[]).filter((u) => typeof u === 'string') as string[] : [];
  const url = typeof item.webVideoUrl === 'string' && item.webVideoUrl
    ? item.webVideoUrl
    : `https://www.tiktok.com/@${handle}/video/${id}`;
  return {
    piattaforma: 'tiktok',
    handle,
    external_id: id,
    shortcode: null,
    url,
    didascalia: testo(item.text),
    pubblicato_il: dataIso(item.createTimeISO) || dataIso(item.createTime),
    durata_s: numero(meta.duration),
    views: numero(item.playCount),
    likes: numero(item.diggCount),
    commenti: numero(item.commentCount),
    condivisioni: numero(item.shareCount),
    salvataggi: numero(item.collectCount),
    copertina_url: (typeof meta.coverUrl === 'string' && meta.coverUrl) || (typeof meta.originalCoverUrl === 'string' && meta.originalCoverUrl) || null,
    video_url: media[0] || (typeof meta.downloadAddr === 'string' ? meta.downloadAddr : null),
    follower: numero(autore.fans),
    trascrizione: null,
  };
}

/** Handle che Apify non ha trovato (profilo privato, sbagliato o chiuso). */
export function handleInErrore(items: Grezzo[]): string[] {
  const out = new Set<string>();
  for (const it of items) {
    if (!it || !it.error) continue;
    const grezzo = [it.username, it.inputUrl, it.url, it.input].find((v) => typeof v === 'string') as string | undefined;
    if (grezzo) {
      const h = normalizzaHandle(grezzo);
      if (handleValido(h)) out.add(h);
    }
  }
  return [...out];
}

/** Giorni fra due date (YYYY-MM-DD o ISO), estremi compresi. */
export function giorniFra(inizio: string, fine: string): number {
  const a = Date.parse(inizio.slice(0, 10) + 'T00:00:00Z');
  const b = Date.parse(fine.slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

/** Riga di apify~facebook-ads-scraper. null se l'inserzione non ha un video. */
export function leggiInserzione(item: Grezzo, oggi: Date): InserzioneLetta | null {
  if (!item || item.error) return null;
  const adId = primo(
    typeof item.adArchiveID === 'string' || typeof item.adArchiveID === 'number' ? String(item.adArchiveID) : null,
    typeof item.adArchiveId === 'string' || typeof item.adArchiveId === 'number' ? String(item.adArchiveId) : null,
  );
  if (!adId) return null;
  const snap = (item.snapshot || {}) as Grezzo;
  const carte = Array.isArray(snap.cards) ? (snap.cards as Grezzo[]) : [];
  const video = [...(Array.isArray(snap.videos) ? (snap.videos as Grezzo[]) : []), ...carte]
    .find((v) => v && (v.videoSdUrl || v.videoHdUrl));
  if (!video) return null;

  const inizio = dataIso(item.startDate) || dataIso(item.startDateFormatted);
  const fine = dataIso(item.endDate) || dataIso(item.endDateFormatted);
  const attiva = item.isActive === true || item.isActive === 'true';
  const oggiIso = oggi.toISOString();
  // Meta mette come fine la data di oggi per le inserzioni ancora accese.
  const termine = attiva ? oggiIso : (fine || oggiIso);
  const giorni = inizio ? giorniFra(inizio, termine) : null;
  const corpo = (snap.body || {}) as Grezzo;
  const primaCarta = carte[0] || {};

  return {
    ad_id: adId,
    pagina: testo(item.pageName || snap.pageName, 200) || 'Pagina sconosciuta',
    pagina_id: primo(
      typeof item.pageID === 'string' || typeof item.pageID === 'number' ? String(item.pageID) : null,
      typeof item.pageId === 'string' || typeof item.pageId === 'number' ? String(item.pageId) : null,
    ),
    iniziata_il: inizio ? inizio.slice(0, 10) : null,
    finita_il: attiva ? null : (fine ? fine.slice(0, 10) : null),
    attiva,
    giorni,
    varianti: Math.max(1, numero(item.collationCount) ?? 1),
    testo: senzaSegnaposto(testo(corpo.text)) || senzaSegnaposto(testo((primaCarta as Grezzo).body)),
    titolo: senzaSegnaposto(testo(snap.title, 300)) || senzaSegnaposto(testo((primaCarta as Grezzo).title, 300)),
    link: (typeof snap.linkUrl === 'string' && snap.linkUrl) || (typeof (primaCarta as Grezzo).linkUrl === 'string' ? (primaCarta as Grezzo).linkUrl as string : null),
    cta: (typeof snap.ctaText === 'string' && snap.ctaText) || null,
    piattaforme: Array.isArray(item.publisherPlatform) ? (item.publisherPlatform as unknown[]).map(String) : [],
    // Per guardarlo con l'AI basta la qualità bassa: pesa meno.
    video_url: (video.videoSdUrl as string) || (video.videoHdUrl as string) || null,
    copertina_url: typeof video.videoPreviewImageUrl === 'string' ? video.videoPreviewImageUrl : null,
  };
}

/** Le inserzioni di catalogo hanno «{{product.brand}}» al posto del testo: si toglie. */
export function senzaSegnaposto(s: string): string {
  return s.replace(/\{\{[^}]*\}\}/g, '').replace(/[ \t]{2,}/g, ' ').trim();
}

// ── Inserzioni: studi, prodotti, fuori tema ─────────────────────────────

export type CategoriaInserzione = 'studio' | 'prodotto' | 'fuori_tema';
const CATEGORIE: CategoriaInserzione[] = ['studio', 'prodotto', 'fuori_tema'];

export type InserzioneDaClassificare = {
  pagina: string;
  testo: string;
  titolo: string;
  link: string | null;
  professione: string;
};

export const SISTEMA_CATEGORIE = `Classifichi inserzioni della Libreria inserzioni di Meta. Servono a fisioterapisti, osteopati e nutrizionisti per copiare le inserzioni che portano pazienti: tieni come "studio" solo quelle che un professionista sanitario potrebbe rifare per il suo studio. Rispondi solo con JSON valido.`;

export function promptCategorie(lista: InserzioneDaClassificare[]): string {
  const righe = lista.map((a, i) => {
    let dominio = '';
    try { dominio = a.link ? new URL(a.link).hostname.replace(/^www\./, '') : ''; } catch { /* link non valido */ }
    const corpo = [a.titolo, a.testo].filter(Boolean).join(' · ').replace(/\s+/g, ' ').slice(0, 500);
    return `${i + 1}. Pagina: ${a.pagina} | Ricerca per: ${a.professione}${dominio ? ` | Sito: ${dominio}` : ''} | Testo: ${corpo || '(nessun testo)'}`;
  });
  return `Per ogni inserzione scegli una categoria.

"studio": la pubblica uno studio, un centro, una clinica, un poliambulatorio, una palestra riabilitativa o un singolo professionista della salute o del movimento (fisioterapista, osteopata, chiropratico, nutrizionista, dietista, medico, posturologo, chinesiologo, personal trainer) per portare pazienti o clienti ai propri servizi: visite, sedute, percorsi, programmi, consulenze anche online, o per farsi seguire sui social.
"prodotto": vende un oggetto o un prodotto per la salute, il dolore o il peso senza un professionista che offre il proprio servizio: creme, integratori, solette, tutori, cuscini, materassi, dispositivi, app, farmaci da banco, pasti.
"fuori_tema": tutto il resto: non parla di salute, dolore, movimento o alimentazione (animali, religione, bevande, abbigliamento, corsi su altro), oppure si rivolge ai professionisti invece che ai pazienti (formazione, corsi ECM, software, attrezzature per studi).

Nel dubbio fra "studio" e "prodotto" scegli "prodotto". Se il testo manca, decidi dal nome della pagina e dal sito.

${righe.join('\n')}

Rispondi con questo JSON, una voce per ogni inserzione, nello stesso ordine:
{"risposte": [{"n": 1, "categoria": "studio"}]}`;
}

/** Una categoria per inserzione, nello stesso ordine; null dove la risposta manca o non è valida. */
export function leggiCategorie(raw: string, quante: number): Array<CategoriaInserzione | null> {
  const j = estraiJson(raw) as Grezzo;
  const risposte = Array.isArray(j.risposte) ? (j.risposte as Grezzo[]) : [];
  const esito: Array<CategoriaInserzione | null> = Array.from({ length: quante }, () => null);
  for (const r of risposte) {
    const n = numero(r?.n);
    const c = typeof r?.categoria === 'string' ? (r.categoria.trim().toLowerCase().replace(/[\s-]+/g, '_') as CategoriaInserzione) : null;
    if (n === null || !Number.isInteger(n) || n < 1 || n > quante || !c || !CATEGORIE.includes(c)) continue;
    esito[n - 1] = c;
  }
  return esito;
}

// ── Punteggi ────────────────────────────────────────────────────────────

export type PerMedia = { handle: string; views: number | null; pubblicato_il: string | null };

/**
 * Media delle visualizzazioni per canale: video degli ultimi 90 giorni; se
 * sono meno di 5, tutti i video letti (il canale pubblica poco).
 */
export function medieCanale(video: PerMedia[], oggi: Date): Map<string, number> {
  const limite = oggi.getTime() - GIORNI_MEDIA * 86400000;
  const perHandle = new Map<string, PerMedia[]>();
  for (const v of video) {
    if (v.views === null || v.views === undefined) continue;
    const lista = perHandle.get(v.handle) || [];
    lista.push(v);
    perHandle.set(v.handle, lista);
  }
  const medie = new Map<string, number>();
  for (const [handle, lista] of perHandle) {
    const recenti = lista.filter((v) => v.pubblicato_il && Date.parse(v.pubblicato_il) >= limite);
    const base = recenti.length >= MINIMO_VIDEO_MEDIA ? recenti : lista;
    const somma = base.reduce((s, v) => s + (v.views as number), 0);
    const media = somma / base.length;
    if (media > 0) medie.set(handle, media);
  }
  return medie;
}

export function outlier(views: number | null, media: number | undefined): number | null {
  if (views === null || !media || media <= 0) return null;
  return Math.round((views / media) * 10) / 10;
}

/** (like + commenti + condivisioni + salvataggi) ÷ visualizzazioni. */
export function engagement(v: Pick<VideoLetto, 'views' | 'likes' | 'commenti' | 'condivisioni' | 'salvataggi'>): number | null {
  if (!v.views) return null;
  const parti = [v.likes, v.commenti, v.condivisioni, v.salvataggi].filter((n): n is number => typeof n === 'number');
  if (parti.length === 0) return null;
  return Math.round((parti.reduce((s, n) => s + n, 0) / v.views) * 10000) / 10000;
}

export type LivelloSoldi = 'forte' | 'buono' | 'prova';

/** Quanto «fa soldi» un'inserzione, da quanto resta accesa e da quante varianti ha. */
export function livelloSoldi(giorni: number | null, varianti: number): LivelloSoldi {
  if ((giorni ?? 0) >= 90 || varianti >= 5) return 'forte';
  if ((giorni ?? 0) >= 30) return 'buono';
  return 'prova';
}

export const ETICHETTA_SOLDI: Record<LivelloSoldi, string> = {
  forte: 'Fa soldi da mesi',
  buono: 'Fa soldi',
  prova: 'In prova',
};

/** 1.234.567 → "1,2 Mln", 45.300 → "45,3 mila", 980 → "980". */
export function numeroBreve(n: number | null | undefined): string {
  if (n === null || n === undefined) return '–';
  const f = (x: number) => (Math.round(x * 10) / 10).toString().replace('.', ',');
  if (n >= 1_000_000) return `${f(n / 1_000_000)} Mln`;
  if (n >= 10_000) return `${f(n / 1000)} mila`;
  return Math.round(n).toLocaleString('it-IT');
}

// ── Analisi del video (mattoncini di Kallaway) ──────────────────────────

export const FORMAT_KALLAWAY = [
  'Breakdown / explainer', 'Case study', 'Problema-soluzione', 'Errore / trappola', 'Tutorial',
  'Listicle', 'Scenario ipotetico', 'A vs B', 'Q&A / clip d\'intervista', 'Classifica / tier list',
  'Livelli (3 livelli)', 'Reaction', 'Sketch', 'Hero\'s journey', 'Lezione personale',
  'Day in the life', 'Aggiornamento personale', 'About me', 'Serie a episodi', 'Challenge',
];

export const SPOKEN_HOOK_KALLAWAY = [
  'secret reveal', 'case study', 'problema', 'controcorrente', 'negativo', 'educativo', 'lista',
  'scenario', 'confronto', 'domanda', 'classifica', 'autorità', 'esperienza personale',
];

export type AnalisiVideo = {
  lingua: string;
  durata_s: number | null;
  trascrizione: Array<{ t: string; testo: string; it: string }>;
  testi_a_schermo: Array<{ t: string; testo: string }>;
  format: string;
  topic: string;
  seed: string;
  contrarian_take: string;
  hook: { parlato: string; testo: string; visivo: string; tipo_parlato: string };
  struttura: string[];
  cta: { testo: string; tipo: string };
  layout: string;
  inquadratura: string;
  elementi: string[];
  perche_funziona: string[];
  semplice: boolean;
  cosa_serve: string[];
};

export const SISTEMA_ANALISI = `Sei l'analista dei video brevi di FisioAccordo e usi il metodo Short Form Academy di Kallaway.
Guardi il video intero (immagini, audio, testo a schermo) e lo smonti nei suoi mattoncini: format, topic, seed, contrarian take, hook parlato, hook visivo, testo dell'hook, struttura, CTA, layout, elementi.
Descrivi solo quello che c'è davvero nel video. Scrivi in italiano; la trascrizione resta nella lingua del video, con la traduzione italiana accanto se il video non è in italiano.
Rispondi solo con JSON valido.`;

export function promptAnalisi(contesto: { piattaforma: string; handle: string; didascalia: string; trascrizione?: string | null }): string {
  return `Video ${contesto.piattaforma} di @${contesto.handle}.
Didascalia: ${contesto.didascalia ? contesto.didascalia.slice(0, 1200) : '(nessuna)'}
${contesto.trascrizione ? `Trascrizione automatica (può avere errori, il video vale di più): ${contesto.trascrizione.slice(0, 4000)}\n` : ''}
Format possibili (scegline uno, il nome esatto): ${FORMAT_KALLAWAY.join(' · ')}.
Tipi di hook parlato: ${SPOKEN_HOOK_KALLAWAY.join(' · ')}.

"semplice" è true solo se il video si rifà da soli col telefono parlando in camera (al massimo testo a schermo), senza altre persone, senza oggetti particolari e senza b-roll da girare apposta.

JSON:
{
  "lingua": "it | en | ...",
  "durata_s": 0,
  "trascrizione": [{ "t": "0:00", "testo": "frase come detta nel video", "it": "traduzione italiana, vuoto se è già italiano" }],
  "testi_a_schermo": [{ "t": "0:00", "testo": "..." }],
  "format": "uno dei 20 format",
  "topic": "2-3 parole",
  "seed": "la premessa del video in una riga",
  "contrarian_take": "la convinzione comune che il video smonta, in una riga",
  "hook": { "parlato": "prima frase detta", "testo": "testo a schermo nei primi secondi", "visivo": "cosa si vede e cosa fa chi parla nei primi 3 secondi", "tipo_parlato": "uno dei 13 tipi" },
  "struttura": ["passaggio 1 con cosa succede", "passaggio 2", "..."],
  "cta": { "testo": "la CTA come detta o scritta", "tipo": "follow | engagement | lead | nessuna" },
  "layout": "es. talking head in primo piano, voce fuori campo con b-roll, green screen, due persone",
  "inquadratura": "inquadratura, camera fissa o a mano, luce, ambiente",
  "elementi": ["grafiche, oggetti, musica, effetti sonori, sottotitoli..."],
  "perche_funziona": ["3 motivi concreti, citando frasi o momenti del video"],
  "semplice": true,
  "cosa_serve": ["cosa serve per rifarlo"]
}`;
}

function stringhe(v: unknown, max = 30): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, max).map((x) => (x as string).trim()) : [];
}

function sezioneTesto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Toglie i ```json ... ``` attorno alla risposta, se ci sono. */
export function estraiJson(raw: string): unknown {
  const pulito = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const inizio = pulito.indexOf('{');
  const fine = pulito.lastIndexOf('}');
  if (inizio < 0 || fine <= inizio) throw new Error('Risposta senza JSON');
  return JSON.parse(pulito.slice(inizio, fine + 1));
}

export function leggiAnalisi(raw: string): AnalisiVideo {
  const j = estraiJson(raw) as Grezzo;
  const hook = (j.hook || {}) as Grezzo;
  const cta = (j.cta || {}) as Grezzo;
  const righe = Array.isArray(j.trascrizione) ? (j.trascrizione as Grezzo[]) : [];
  const schermo = Array.isArray(j.testi_a_schermo) ? (j.testi_a_schermo as Grezzo[]) : [];
  const analisi: AnalisiVideo = {
    lingua: sezioneTesto(j.lingua) || 'it',
    durata_s: numero(j.durata_s),
    trascrizione: righe
      .filter((r) => r && typeof r.testo === 'string' && r.testo.trim())
      .slice(0, 120)
      .map((r) => ({ t: sezioneTesto(r.t), testo: sezioneTesto(r.testo), it: sezioneTesto(r.it) })),
    testi_a_schermo: schermo
      .filter((r) => r && typeof r.testo === 'string' && r.testo.trim())
      .slice(0, 60)
      .map((r) => ({ t: sezioneTesto(r.t), testo: sezioneTesto(r.testo) })),
    format: sezioneTesto(j.format),
    topic: sezioneTesto(j.topic),
    seed: sezioneTesto(j.seed),
    contrarian_take: sezioneTesto(j.contrarian_take),
    hook: {
      parlato: sezioneTesto(hook.parlato),
      testo: sezioneTesto(hook.testo),
      visivo: sezioneTesto(hook.visivo),
      tipo_parlato: sezioneTesto(hook.tipo_parlato),
    },
    struttura: stringhe(j.struttura, 20),
    cta: { testo: sezioneTesto(cta.testo), tipo: sezioneTesto(cta.tipo) },
    layout: sezioneTesto(j.layout),
    inquadratura: sezioneTesto(j.inquadratura),
    elementi: stringhe(j.elementi, 20),
    perche_funziona: stringhe(j.perche_funziona, 6),
    semplice: j.semplice === true,
    cosa_serve: stringhe(j.cosa_serve, 10),
  };
  if (analisi.trascrizione.length === 0 && !analisi.hook.parlato && analisi.struttura.length === 0) {
    throw new Error('Analisi vuota: il video non è stato letto');
  }
  return analisi;
}

// ── Copione «Duplica questo video» ──────────────────────────────────────

export type BrandPerCopione = {
  nome_business?: string | null;
  citta?: string | null;
  target_pazienti?: string | null;
  tono_voce?: string | null;
  persona_scrittura?: string | null;
  servizi?: string[] | null;
  temi_chiave?: string[] | null;
  cta_suggerite?: string[] | null;
  parole_da_evitare?: string[] | null;
};

export type Copione = {
  titolo: string;
  tipo: TipoCopia;
  mattoncini_cambiati: string[];
  testo_in_alto: string;
  hook_parlato: string;
  hook_visivo: string;
  frasi: string[];
  cta: string;
  parola_chiave: string;
  lead_magnet: string;
  testi_a_schermo: Array<{ quando: string; testo: string }>;
  come_girarlo: string[];
  didascalia: string;
  durata_stimata_s: number | null;
  semplice: boolean;
  cosa_serve: string[];
};

/** Parole che non si usano mai nei contenuti FisioAccordo (preferenze di Attilio). */
const RADICI_VIETATE: Array<{ radice: RegExp; parola: string }> = [
  // «I pazienti non si sbloccano»: si dice aiutare, risolvere in meno tempo.
  { radice: /\bsblocc\w*/i, parola: 'sbloccare' },
  { radice: /\bguarigione garantita\b/i, parola: 'guarigione garantita' },
  { radice: /\bmiracol\w*/i, parola: 'miracolo' },
];

export function paroleVietateIn(testoDaControllare: string, extra: string[] = []): string[] {
  const trovate = RADICI_VIETATE.filter((r) => r.radice.test(testoDaControllare)).map((r) => r.parola);
  const basso = testoDaControllare.toLowerCase();
  for (const p of extra) {
    const w = p.trim().toLowerCase();
    if (w.length >= 3 && basso.includes(w)) trovate.push(p.trim());
  }
  return [...new Set(trovate)];
}

export function testoDelCopione(c: Copione): string {
  return [c.testo_in_alto, c.hook_parlato, ...c.frasi, c.cta, c.didascalia, ...c.testi_a_schermo.map((t) => t.testo)].join('\n');
}

export const SISTEMA_COPIONE = `Sei l'autore dei video brevi di FisioAccordo. Rifai video che hanno già funzionato (outlier) per un professionista sanitario italiano, col metodo Short Form Academy di Kallaway: si copia il video, cambiando solo i mattoncini richiesti.
Scrivi in italiano parlato, come si parla a una persona sola davanti a te: frasi di circa 8 parole, niente subordinate né incisi, livello prima media, «tu» e non «io».
Rispondi solo con JSON valido.`;

export function promptCopione(input: {
  analisi: AnalisiVideo;
  tipo: TipoCopia;
  brand: BrandPerCopione;
  bloccoProfessione: string;
  origine: { piattaforma: string; handle: string; paese: string; views: number | null };
}): string {
  const { analisi, tipo, brand, origine } = input;
  const parlato = analisi.trascrizione.map((r) => (r.it ? `${r.testo} [${r.it}]` : r.testo)).join('\n');
  const regolaCopia = tipo === 'esatta'
    ? `COPIA ESATTA: cambi UN solo mattoncino, il topic, portandolo sulla professione e sui servizi del brand. Tieni uguali format, struttura frase per frase (a ogni frase dell'originale corrisponde una frase nuova con la stessa funzione: hook, contrasto, perché, passo 1, passo 2...), tipo di hook parlato, hook visivo, layout, lunghezza (più o meno 10%) e tipo di CTA. mattoncini_cambiati = ["topic"].`
    : `COPIA VICINA: cambi 2 o 3 mattoncini (topic, contrarian take, e hook oppure CTA) e tieni format, struttura, layout e lunghezza. Scrivi in mattoncini_cambiati quali hai cambiato.`;
  const lista = (v?: string[] | null) => (v && v.length ? v.join(', ') : '(non indicato)');
  return `VIDEO ORIGINALE (${origine.piattaforma}, @${origine.handle}, ${origine.paese === 'US' ? 'americano' : origine.paese === 'IT' ? 'italiano' : 'estero'}${origine.views ? `, ${origine.views} visualizzazioni` : ''})
Format: ${analisi.format}
Topic: ${analisi.topic} · Seed: ${analisi.seed}
Contrarian take: ${analisi.contrarian_take}
Hook parlato (${analisi.hook.tipo_parlato}): ${analisi.hook.parlato}
Testo dell'hook: ${analisi.hook.testo}
Hook visivo: ${analisi.hook.visivo}
Struttura: ${analisi.struttura.join(' → ')}
CTA (${analisi.cta.tipo}): ${analisi.cta.testo}
Layout: ${analisi.layout} · Inquadratura: ${analisi.inquadratura}
Elementi: ${analisi.elementi.join(', ')}${analisi.durata_s ? `\nDurata: ${Math.round(analisi.durata_s)} secondi` : ''}
Parlato:
${parlato}

PER CHI È IL NUOVO VIDEO
Brand: ${brand.nome_business || '(senza nome)'}${brand.citta ? `, ${brand.citta}` : ''}
${input.bloccoProfessione}
Pazienti/clienti: ${brand.target_pazienti || '(non indicato)'}
Servizi: ${lista(brand.servizi)}
Temi: ${lista(brand.temi_chiave)}
Tono: ${brand.tono_voce || 'diretto e chiaro'}${brand.persona_scrittura ? ` · scrive in ${brand.persona_scrittura}` : ''}
CTA del brand: ${lista(brand.cta_suggerite)}
Parole da evitare: ${lista(brand.parole_da_evitare)}

REGOLE
- ${regolaCopia}
- Il target si richiama da subito: la prima frase detta e il testo in alto dicono chi è la persona o il suo problema (es. «Hai male alla spalla quando alzi il braccio?»), prima del concetto. Mai parole generiche che non dicono con chi parli. Testo in alto, prima frase e resto del video parlano dello stesso problema (se apri sul collo, non passi alla schiena).
- Hook allineato: parlato, testo in alto e visivo dicono la stessa cosa nello stesso momento. Testo in alto al massimo 6 parole, grande, mai in basso.
- Valore entro 5 secondi e almeno un consiglio pratico che si applica subito, concreto come nell'originale: numeri, tempi, posizioni, ripetizioni (es. «dieci respiri lenti da sdraiato», non «fai esercizi di stabilità»). Ogni frase deve valere: se non la pagheresti 100 dollari, toglila.
- Nel corpo del video solo valore: niente frasi che presentano lo studio o il professionista («noi ti guidiamo…», «nel nostro studio…»). Lo studio compare solo nella CTA.
- Una sola CTA, nativa, estensione del video: meglio un lead magnet legato al video con una parola chiave da scrivere nei commenti. Mai «scrivimi in DM» automatico ai nuovi follower.
- ${origine.paese === 'IT' ? 'Il video è italiano: non riusare le sue frasi, riscrivile con parole tue.' : 'Il video è straniero: non tradurre, adatta al pubblico italiano (modi di dire, sistema sanitario, esempi).'}
- Niente nomi, marchi o prodotti del video originale. Niente diagnosi, niente promesse di guarigione. Mai la parola «sbloccare»: si dice aiutare, risolvere in meno tempo, più risultati.
- "frasi" contiene tutto il parlato, dall'hook alla CTA compresi, una frase per riga, nell'ordine in cui si dice.
- "semplice" è true solo se si registra da soli col telefono parlando in camera, senza altre persone, oggetti particolari o b-roll da girare.
- "durata_stimata_s" è la durata dell'originale, più o meno 10%. "come_girarlo" dà solo indicazioni utili (inquadratura, luce, ritmo, cosa mostrare): niente dettagli dell'originale che non servono, come vestiti od oggetti a caso.

JSON:
{
  "titolo": "nome breve del video",
  "tipo": "${tipo}",
  "mattoncini_cambiati": ["topic"],
  "testo_in_alto": "max 6 parole",
  "hook_parlato": "prima frase detta",
  "hook_visivo": "cosa si vede e cosa fai nei primi 3 secondi",
  "frasi": ["una frase per riga"],
  "cta": "la CTA come la dici",
  "parola_chiave": "parola da commentare, o vuoto",
  "lead_magnet": "cosa riceve chi commenta, o vuoto",
  "testi_a_schermo": [{ "quando": "0-3 s", "testo": "..." }],
  "come_girarlo": ["inquadratura, luce, durata, cosa tenere in mano: come l'originale"],
  "didascalia": "prima frase del video + segui per... + 5 hashtag, senza @ né nomi di profili",
  "durata_stimata_s": 45,
  "semplice": true,
  "cosa_serve": ["solo telefono e voce"]
}`;
}

export function leggiCopione(raw: string, tipo: TipoCopia): Copione {
  const j = estraiJson(raw) as Grezzo;
  const schermo = Array.isArray(j.testi_a_schermo) ? (j.testi_a_schermo as Grezzo[]) : [];
  const copione: Copione = {
    titolo: sezioneTesto(j.titolo) || 'Video duplicato',
    tipo,
    mattoncini_cambiati: stringhe(j.mattoncini_cambiati, 6),
    testo_in_alto: sezioneTesto(j.testo_in_alto),
    hook_parlato: sezioneTesto(j.hook_parlato),
    hook_visivo: sezioneTesto(j.hook_visivo),
    frasi: stringhe(j.frasi, 60),
    cta: sezioneTesto(j.cta),
    parola_chiave: sezioneTesto(j.parola_chiave),
    lead_magnet: sezioneTesto(j.lead_magnet),
    testi_a_schermo: schermo
      .filter((r) => r && typeof r.testo === 'string' && r.testo.trim())
      .slice(0, 30)
      .map((r) => ({ quando: sezioneTesto(r.quando), testo: sezioneTesto(r.testo) })),
    come_girarlo: stringhe(j.come_girarlo, 10),
    didascalia: sezioneTesto(j.didascalia),
    durata_stimata_s: numero(j.durata_stimata_s),
    semplice: j.semplice === true,
    cosa_serve: stringhe(j.cosa_serve, 10),
  };
  if (copione.frasi.length < 3) throw new Error('Copione troppo corto');
  // L'hook è la prima frase detta: se il modello l'ha lasciato fuori da "frasi", va in testa.
  if (copione.hook_parlato && copione.frasi[0] !== copione.hook_parlato && !copione.frasi.includes(copione.hook_parlato)) {
    copione.frasi.unshift(copione.hook_parlato);
  }
  return copione;
}

/** Il copione da leggere o da dare al montaggio: una frase per riga. */
export function copioneDaLeggere(c: Copione): string {
  return c.frasi.join('\n');
}
