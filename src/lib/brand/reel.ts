// Reel Instagram: regole, ora italiana, errori in italiano e il flusso
// container → elaborazione → pubblicazione.
// File PURO, specchiato in supabase/functions/_shared/brand/reel.ts (vedi
// mirrorSync.test): niente import, gira uguale in Vite e in Deno.
//
// Il flusso non aspetta mai Instagram dentro una sola chiamata: avviaReel
// crea il container e torna subito; avanzaReel, chiamato dal cron ogni
// 2 minuti, controlla lo stato e pubblica quando è FINISHED.

export const REEL_BUCKET = 'reel-videos';

export const REEL_LIMITI = {
  maxByte: 100 * 1024 * 1024,
  minSecondi: 3,
  maxSecondi: 15 * 60,
  maxCopertinaByte: 8 * 1024 * 1024,
  maxDidascalia: 2200,
  maxHashtag: 30,
  /** Oltre questo tempo di elaborazione il container si considera bloccato. */
  attesaMaxMinuti: 30,
  tentativiMax: 3,
  /** Validità dell'URL firmato che Instagram usa per scaricare il video. */
  urlFirmatoSecondi: 2 * 60 * 60,
  /** Un claim di pubblicazione più vecchio di così si considera abbandonato. */
  claimScadeMinuti: 5,
} as const;

export const TIPI_VIDEO = ['video/mp4', 'video/quicktime'] as const;
export const TIPI_COPERTINA = ['image/jpeg', 'image/png'] as const;

const MB = 1024 * 1024;

// ── Controlli prima del caricamento ───────────────────────────────────────

export interface InfoVideo {
  tipo: string;
  byte: number;
  /** Secondi; null se il browser non è riuscito a leggerli. */
  durata: number | null;
  larghezza: number | null;
  altezza: number | null;
}

export interface Verifica {
  errori: string[];
  avvisi: string[];
}

export function validaVideo(v: InfoVideo): Verifica {
  const errori: string[] = [];
  const avvisi: string[] = [];
  const tipo = (v.tipo || '').toLowerCase();
  if (!(TIPI_VIDEO as readonly string[]).includes(tipo)) {
    errori.push('Il video deve essere un file MP4 o MOV.');
  }
  if (v.byte > REEL_LIMITI.maxByte) {
    errori.push(`Il video pesa ${(v.byte / MB).toFixed(0)} MB: il massimo è ${REEL_LIMITI.maxByte / MB} MB. Esportalo di nuovo in 1080×1920.`);
  }
  if (v.durata !== null) {
    if (v.durata < REEL_LIMITI.minSecondi) errori.push('Il Reel deve durare almeno 3 secondi.');
    if (v.durata > REEL_LIMITI.maxSecondi) errori.push('Il Reel può durare al massimo 15 minuti.');
  } else {
    avvisi.push('Non riesco a leggere la durata del video: lo controllerà Instagram.');
  }
  if (v.larghezza && v.altezza) {
    const rapporto = v.larghezza / v.altezza;
    if (rapporto >= 1) {
      avvisi.push('Il video non è verticale: su Instagram si vedrà con le bande. Meglio 9:16 (1080×1920).');
    } else if (Math.abs(rapporto - 9 / 16) > 0.02) {
      avvisi.push('Il video non è 9:16: Instagram lo ritaglierà nella griglia. Meglio 1080×1920.');
    }
    if (v.larghezza > 1920 || v.altezza > 3840) {
      avvisi.push('Risoluzione molto alta: Instagram la ridurrà, il caricamento sarà più lento.');
    }
  }
  return { errori, avvisi };
}

export function validaCopertina(c: { tipo: string; byte: number }): Verifica {
  const errori: string[] = [];
  if (!(TIPI_COPERTINA as readonly string[]).includes((c.tipo || '').toLowerCase())) {
    errori.push('La copertina deve essere un\'immagine JPG o PNG.');
  }
  if (c.byte > REEL_LIMITI.maxCopertinaByte) {
    errori.push('La copertina pesa più di 8 MB.');
  }
  return { errori, avvisi: [] };
}

export function contaHashtag(testo: string): number {
  return (testo.match(/(^|\s)#[^\s#]+/gu) || []).length;
}

export function validaDidascalia(testo: string): Verifica {
  const errori: string[] = [];
  const caratteri = [...(testo || '')].length;
  if (caratteri > REEL_LIMITI.maxDidascalia) {
    errori.push(`La didascalia ha ${caratteri} caratteri: il massimo su Instagram è ${REEL_LIMITI.maxDidascalia}.`);
  }
  const hashtag = contaHashtag(testo || '');
  if (hashtag > REEL_LIMITI.maxHashtag) {
    errori.push(`Ci sono ${hashtag} hashtag: Instagram ne accetta al massimo ${REEL_LIMITI.maxHashtag}.`);
  }
  return { errori, avvisi: [] };
}

// ── Ora italiana ──────────────────────────────────────────────────────────
// La data scelta è sempre l'ora di Roma, qualunque sia il fuso del computer
// (Attilio programma da Dubai, i pazienti sono in Italia).

const FUSO = 'Europe/Rome';

function partiNelFuso(d: Date): { a: number; m: number; g: number; h: number; min: number } {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { a: n('year'), m: n('month'), g: n('day'), h: n('hour'), min: n('minute') };
}

function scartoRoma(d: Date): number {
  const p = partiNelFuso(d);
  return Date.UTC(p.a, p.m - 1, p.g, p.h, p.min) - Math.floor(d.getTime() / 60000) * 60000;
}

/** «2026-11-08» + «17:00» ora di Roma → istante UTC. null se non valido. */
export function oraRomaInUtc(data: string, ora: string): Date | null {
  const md = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data || '');
  const mo = /^(\d{1,2}):(\d{2})$/.exec(ora || '');
  if (!md || !mo) return null;
  const [a, m, g, h, min] = [+md[1], +md[2], +md[3], +mo[1], +mo[2]];
  if (m < 1 || m > 12 || g < 1 || g > 31 || h > 23 || min > 59) return null;
  const comeUtc = Date.UTC(a, m - 1, g, h, min);
  let istante = comeUtc - scartoRoma(new Date(comeUtc));
  // Secondo passaggio per i giorni del cambio d'ora.
  istante = comeUtc - scartoRoma(new Date(istante));
  const ris = new Date(istante);
  const verifica = partiNelFuso(ris);
  if (verifica.g !== g || verifica.m !== m) return null; // es. 31 febbraio
  return ris;
}

/** Istante → { data: «AAAA-MM-GG», ora: «HH:MM» } nell'ora di Roma. */
export function partiRoma(d: Date): { data: string; ora: string } {
  const p = partiNelFuso(d);
  const z = (x: number) => String(x).padStart(2, '0');
  return { data: `${p.a}-${z(p.m)}-${z(p.g)}`, ora: `${z(p.h)}:${z(p.min)}` };
}

/** «sab 8 nov, 17:00» nell'ora di Roma. */
export function formatoRoma(d: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: FUSO, weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

// ── Errori di Instagram in italiano ───────────────────────────────────────

export interface IgErrore {
  code?: number;
  error_subcode?: number;
  message?: string;
  error_user_msg?: string;
}

export interface ErroreTradotto {
  messaggio: string;
  /** true = ha senso riprovare (rete, server di Instagram, video non ancora pronto). */
  temporaneo: boolean;
}

const PER_SOTTOCODICE: Record<number, ErroreTradotto> = {
  2207001: { messaggio: 'Instagram ha avuto un problema interno.', temporaneo: true },
  2207003: { messaggio: 'Instagram non è riuscito a scaricare il video in tempo.', temporaneo: true },
  2207008: { messaggio: 'Instagram ha avuto un problema temporaneo nella pubblicazione.', temporaneo: true },
  2207020: { messaggio: 'Il video caricato su Instagram è scaduto prima della pubblicazione.', temporaneo: true },
  2207027: { messaggio: 'Instagram sta ancora elaborando il video.', temporaneo: true },
  2207032: { messaggio: 'Instagram non è riuscito a preparare il video.', temporaneo: true },
  2207052: { messaggio: 'Instagram non è riuscito a scaricare il video dal nostro archivio.', temporaneo: true },
  2207053: { messaggio: 'Errore sconosciuto nel caricamento del video su Instagram.', temporaneo: true },
  2207010: { messaggio: 'La didascalia è troppo lunga (massimo 2.200 caratteri).', temporaneo: false },
  2207026: { messaggio: 'Formato video non accettato da Instagram: serve MP4 o MOV con video H.264 e audio AAC, da 3 secondi a 15 minuti. Esportalo di nuovo in 1080×1920.', temporaneo: false },
  2207042: { messaggio: 'Il profilo ha raggiunto il limite di pubblicazioni via app nelle ultime 24 ore. Riprova domani.', temporaneo: false },
  2207050: { messaggio: 'Il profilo Instagram è limitato o non attivo: controlla l\'app Instagram.', temporaneo: false },
  2207051: { messaggio: 'Instagram ha bloccato la pubblicazione come possibile spam: controlla l\'app Instagram.', temporaneo: false },
  2207057: { messaggio: 'Il fotogramma scelto per la copertina è oltre la fine del video.', temporaneo: false },
};

export function erroreInstagram(e: IgErrore | string | null | undefined): ErroreTradotto {
  if (!e) return { messaggio: 'Errore sconosciuto da Instagram.', temporaneo: true };
  if (typeof e === 'string') {
    const cod = codiceDaStato(e);
    if (cod && PER_SOTTOCODICE[cod]) return PER_SOTTOCODICE[cod];
    return { messaggio: `Instagram ha rifiutato il video: ${e}`, temporaneo: false };
  }
  if (e.error_subcode && PER_SOTTOCODICE[e.error_subcode]) return PER_SOTTOCODICE[e.error_subcode];
  switch (e.code) {
    case 190:
      return { messaggio: 'Il collegamento con Instagram è scaduto: ricollega il profilo da Impostazioni.', temporaneo: false };
    case 10:
    case 200:
      return { messaggio: 'Instagram non dà il permesso di pubblicare: ricollega il profilo da Impostazioni e accetta tutti i permessi.', temporaneo: false };
    case 4:
    case 17:
    case 32:
    case 613:
      return { messaggio: 'Troppe richieste a Instagram in poco tempo: riprovo tra qualche minuto.', temporaneo: true };
    case 1:
    case 2:
      return { messaggio: 'Instagram non risponde in questo momento.', temporaneo: true };
    case 9004:
      return { messaggio: 'Instagram non è riuscito a scaricare il video dal nostro archivio.', temporaneo: true };
    case 36003:
      return { messaggio: 'Proporzioni del video non accettate da Instagram: usa 9:16 (1080×1920).', temporaneo: false };
  }
  const dettaglio = e.error_user_msg || e.message;
  return {
    messaggio: dettaglio ? `Instagram ha rifiutato il video: ${dettaglio}` : 'Errore sconosciuto da Instagram.',
    temporaneo: false,
  };
}

/** «Error: Media upload has failed with error code 2207026» → 2207026. */
export function codiceDaStato(stato: string | null | undefined): number | null {
  const m = /(\d{4,7})/.exec(stato || '');
  return m ? Number(m[1]) : null;
}

// ── Flusso ────────────────────────────────────────────────────────────────

export interface ReelRiga {
  id: string;
  content: string;
  hashtags: string | null;
  video_path: string | null;
  cover_path: string | null;
  thumb_offset_ms: number | null;
  share_to_feed: boolean | null;
  attempts: number | null;
  status: string | null;
  ig_container_id: string | null;
  container_created_at: string | null;
}

export interface ReelIO {
  ora(): Date;
  urlFirmato(path: string, secondi: number): Promise<string>;
  creaContainer(parametri: Record<string, unknown>): Promise<{ id?: string; error?: IgErrore }>;
  statoContainer(id: string): Promise<{ status_code?: string; status?: string; error?: IgErrore }>;
  pubblica(id: string): Promise<{ id?: string; error?: IgErrore }>;
  /**
   * Aggiorna la riga. Con `seStato` aggiorna solo se lo stato è ancora quello
   * (claim atomico); con `claimLiberoPrimaDi` solo se publish_claimed_at è
   * vuoto o più vecchio. Restituisce true se la riga è stata aggiornata.
   */
  aggiorna(
    campi: Record<string, unknown>,
    condizioni?: { seStato?: string; claimLiberoPrimaDi?: string },
  ): Promise<boolean>;
}

export type Esito =
  | { esito: 'in_elaborazione' }
  | { esito: 'pubblicato'; mediaId: string | null }
  | { esito: 'riprova'; errore: string }
  | { esito: 'fallito'; errore: string }
  | { esito: 'saltato' };

export function didascaliaCompleta(riga: Pick<ReelRiga, 'content' | 'hashtags'>): string {
  return riga.hashtags ? `${riga.content}\n\n${riga.hashtags}` : riga.content;
}

export function parametriContainer(riga: ReelRiga, videoUrl: string, coverUrl: string | null): Record<string, unknown> {
  const p: Record<string, unknown> = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption: didascaliaCompleta(riga),
    share_to_feed: riga.share_to_feed !== false,
  };
  if (coverUrl) p.cover_url = coverUrl;
  else if (typeof riga.thumb_offset_ms === 'number' && riga.thumb_offset_ms > 0) {
    p.thumb_offset = Math.round(riga.thumb_offset_ms);
  }
  return p;
}

async function ritentaOFallisci(riga: ReelRiga, io: ReelIO, tentativi: number, errore: ErroreTradotto): Promise<Esito> {
  if (errore.temporaneo && tentativi < REEL_LIMITI.tentativiMax) {
    await io.aggiorna({
      status: 'scheduled',
      ig_container_id: null,
      container_created_at: null,
      publish_claimed_at: null,
      error_message: `${errore.messaggio} Nuovo tentativo tra pochi minuti.`,
      updated_at: io.ora().toISOString(),
    });
    return { esito: 'riprova', errore: errore.messaggio };
  }
  await io.aggiorna({
    status: 'failed',
    publish_claimed_at: null,
    error_message: errore.messaggio,
    updated_at: io.ora().toISOString(),
  });
  return { esito: 'fallito', errore: errore.messaggio };
}

/** Riga 'scheduled' arrivata all'ora: crea il container su Instagram. */
export async function avviaReel(riga: ReelRiga, io: ReelIO): Promise<Esito> {
  const tentativi = (riga.attempts || 0) + 1;
  const adesso = io.ora().toISOString();
  const preso = await io.aggiorna(
    {
      status: 'processing',
      attempts: tentativi,
      ig_container_id: null,
      container_created_at: adesso,
      publish_claimed_at: null,
      updated_at: adesso,
    },
    { seStato: 'scheduled' },
  );
  if (!preso) return { esito: 'saltato' };

  if (!riga.video_path) {
    return ritentaOFallisci(riga, io, tentativi, { messaggio: 'Manca il video del Reel.', temporaneo: false });
  }

  let videoUrl: string;
  let coverUrl: string | null = null;
  try {
    videoUrl = await io.urlFirmato(riga.video_path, REEL_LIMITI.urlFirmatoSecondi);
    if (riga.cover_path) coverUrl = await io.urlFirmato(riga.cover_path, REEL_LIMITI.urlFirmatoSecondi);
  } catch {
    return ritentaOFallisci(riga, io, tentativi, {
      messaggio: 'Non trovo il video nel nostro archivio: caricalo di nuovo.',
      temporaneo: false,
    });
  }

  const creato = await io.creaContainer(parametriContainer(riga, videoUrl, coverUrl));
  if (creato.error || !creato.id) {
    return ritentaOFallisci(riga, io, tentativi, erroreInstagram(creato.error));
  }
  await io.aggiorna({ ig_container_id: creato.id, error_message: null, updated_at: io.ora().toISOString() });
  return { esito: 'in_elaborazione' };
}

/** Riga 'processing': controlla il container e pubblica quando è pronto. */
export async function avanzaReel(riga: ReelRiga, io: ReelIO): Promise<Esito> {
  const tentativi = riga.attempts || 1;
  if (!riga.ig_container_id) {
    // Il giro precedente si è fermato fra il claim e la creazione del container.
    const avviato = riga.container_created_at ? Date.parse(riga.container_created_at) : 0;
    if (io.ora().getTime() - avviato < 5 * 60 * 1000) return { esito: 'in_elaborazione' };
    return ritentaOFallisci(riga, io, tentativi, {
      messaggio: 'Il caricamento su Instagram si è interrotto.',
      temporaneo: true,
    });
  }

  const stato = await io.statoContainer(riga.ig_container_id);
  if (stato.error) {
    const e = erroreInstagram(stato.error);
    // Un problema di rete o di Instagram non fa perdere il container: si
    // riprova al prossimo giro finché non scade l'attesa massima.
    if (e.temporaneo && !scaduto(riga, io)) return { esito: 'in_elaborazione' };
    return ritentaOFallisci(riga, io, tentativi, e);
  }

  switch (stato.status_code) {
    case 'FINISHED':
      return pubblicaPronto(riga, io, tentativi);
    case 'PUBLISHED':
      await io.aggiorna({
        status: 'published',
        published_at: io.ora().toISOString(),
        publish_claimed_at: null,
        error_message: null,
        updated_at: io.ora().toISOString(),
      });
      return { esito: 'pubblicato', mediaId: null };
    case 'ERROR':
      return ritentaOFallisci(riga, io, tentativi, erroreInstagram(stato.status || 'ERROR'));
    case 'EXPIRED':
      return ritentaOFallisci(riga, io, tentativi, PER_SOTTOCODICE[2207020]);
    default: // IN_PROGRESS o vuoto
      if (scaduto(riga, io)) {
        return ritentaOFallisci(riga, io, tentativi, {
          messaggio: `Instagram non ha finito di elaborare il video in ${REEL_LIMITI.attesaMaxMinuti} minuti.`,
          temporaneo: true,
        });
      }
      return { esito: 'in_elaborazione' };
  }
}

function scaduto(riga: ReelRiga, io: ReelIO): boolean {
  if (!riga.container_created_at) return false;
  const minuti = (io.ora().getTime() - Date.parse(riga.container_created_at)) / 60000;
  return minuti > REEL_LIMITI.attesaMaxMinuti;
}

async function pubblicaPronto(riga: ReelRiga, io: ReelIO, tentativi: number): Promise<Esito> {
  const adesso = io.ora();
  const preso = await io.aggiorna(
    { publish_claimed_at: adesso.toISOString(), updated_at: adesso.toISOString() },
    {
      seStato: 'processing',
      claimLiberoPrimaDi: new Date(adesso.getTime() - REEL_LIMITI.claimScadeMinuti * 60000).toISOString(),
    },
  );
  if (!preso) return { esito: 'saltato' };

  const pubblicato = await io.pubblica(riga.ig_container_id as string);
  if (pubblicato.error || !pubblicato.id) {
    const e = erroreInstagram(pubblicato.error);
    if (e.temporaneo && !scaduto(riga, io)) {
      // Il container è ancora buono: si libera il claim e si riprova al giro dopo.
      await io.aggiorna({ publish_claimed_at: null, error_message: e.messaggio, updated_at: io.ora().toISOString() });
      return { esito: 'in_elaborazione' };
    }
    return ritentaOFallisci(riga, io, tentativi, e);
  }

  await io.aggiorna({
    status: 'published',
    published_at: io.ora().toISOString(),
    blotato_post_id: pubblicato.id,
    publish_claimed_at: null,
    error_message: null,
    updated_at: io.ora().toISOString(),
  });
  return { esito: 'pubblicato', mediaId: pubblicato.id };
}
