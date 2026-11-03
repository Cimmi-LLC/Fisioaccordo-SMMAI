// Regole pure (senza rete) del collegamento e della pubblicazione su TikTok
// e YouTube. Il file è specchiato byte per byte in
// supabase/functions/_shared/social/socialCore.ts (lo usa Deno): se lo
// cambi, ricopialo. Il test socialCore.test.ts controlla che siano uguali.

export type SocialPlatform = 'tiktok' | 'youtube';

export const SOCIAL_PLATFORMS: SocialPlatform[] = ['tiktok', 'youtube'];

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

/** Permessi chiesti all'utente al collegamento. */
export const TIKTOK_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'user.info.stats',
  'video.list',
  'video.publish',
];

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

export function isSocialPlatform(v: unknown): v is SocialPlatform {
  return v === 'tiktok' || v === 'youtube';
}

/** Indirizzo a cui TikTok/Google rimandano dopo il consenso. */
export function socialRedirectUri(appOrigin: string, platform: SocialPlatform): string {
  return `${appOrigin.replace(/\/$/, '')}/auth/social/${platform}/callback`;
}

export function buildAuthUrl(
  platform: SocialPlatform,
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  if (platform === 'tiktok') {
    const q = new URLSearchParams({
      client_key: clientId,
      scope: TIKTOK_SCOPES.join(','),
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${q.toString()}`;
  }
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES.join(' '),
    // offline + consent: Google restituisce sempre il refresh token
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
}

/** La pagina a cui tornare: solo percorsi interni dell'app. */
export function safeReturnTo(returnTo: unknown): string {
  if (typeof returnTo !== 'string') return '/settings';
  if (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.startsWith('/auth/')) return '/settings';
  return returnTo;
}

// ── Caricamento a pezzi su TikTok ──────────────────────────────────
// Regole TikTok: pezzi da 5 a 64 MB, l'ultimo assorbe il resto (fino a
// 128 MB); sotto i 64 MB si manda tutto in un pezzo solo.
const MB = 1024 * 1024;
export const TIKTOK_SINGLE_CHUNK_MAX = 64 * MB;
export const TIKTOK_CHUNK_SIZE = 10 * MB;

export interface ChunkPlan {
  chunkSize: number;
  totalChunks: number;
  /** [inizio, fine) di ogni pezzo, in byte */
  ranges: Array<[number, number]>;
}

export function tiktokChunkPlan(videoSize: number): ChunkPlan {
  if (!Number.isFinite(videoSize) || videoSize <= 0) throw new Error('Dimensione del video non valida');
  if (videoSize <= TIKTOK_SINGLE_CHUNK_MAX) {
    return { chunkSize: videoSize, totalChunks: 1, ranges: [[0, videoSize]] };
  }
  const chunkSize = TIKTOK_CHUNK_SIZE;
  const totalChunks = Math.floor(videoSize / chunkSize);
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = i === totalChunks - 1 ? videoSize : start + chunkSize;
    ranges.push([start, end]);
  }
  return { chunkSize, totalChunks, ranges };
}

// ── Opzioni di pubblicazione TikTok ────────────────────────────────
// Le linee guida di TikTok per la pubblicazione diretta chiedono che
// l'utente scelga lui la visibilità (nessuna preimpostata), possa
// spegnere commenti/duetti/stitch e dichiari i contenuti promozionali.
export type TikTokPrivacy =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY';

export const TIKTOK_PRIVACY_LABEL: Record<TikTokPrivacy, string> = {
  PUBLIC_TO_EVERYONE: 'Tutti',
  MUTUAL_FOLLOW_FRIENDS: 'Amici',
  FOLLOWER_OF_CREATOR: 'Solo follower',
  SELF_ONLY: 'Solo io',
};

export interface TikTokOptions {
  privacy_level: TikTokPrivacy | '';
  allow_comment: boolean;
  allow_duet: boolean;
  allow_stitch: boolean;
  /** Contenuto promozionale acceso */
  commercial: boolean;
  /** Promuove il proprio studio */
  brand_organic: boolean;
  /** Promuove un altro marchio (sponsorizzato) */
  brand_content: boolean;
}

export interface YouTubeOptions {
  title: string;
  privacy_status: 'public' | 'unlisted' | 'private';
}

export function validateTikTokOptions(o: TikTokOptions, allowed?: string[]): string | null {
  if (!o.privacy_level) return 'Scegli chi può vedere il contenuto su TikTok.';
  if (allowed && allowed.length > 0 && !allowed.includes(o.privacy_level)) {
    return 'Questa visibilità non è disponibile per il tuo profilo TikTok.';
  }
  if (o.commercial && !o.brand_organic && !o.brand_content) {
    return 'Hai segnato il contenuto come promozionale: scegli se promuove il tuo studio o un altro marchio.';
  }
  if (o.brand_content && o.privacy_level === 'SELF_ONLY') {
    return 'I contenuti sponsorizzati non possono essere visibili solo a te.';
  }
  return null;
}

/** Frase di consenso da mostrare sopra il pulsante (richiesta da TikTok). */
export function tiktokConsentText(o: Pick<TikTokOptions, 'commercial' | 'brand_content'>): string {
  if (o.commercial && o.brand_content) {
    return "Pubblicando accetti la Branded Content Policy e la Music Usage Confirmation di TikTok.";
  }
  return 'Pubblicando accetti la Music Usage Confirmation di TikTok.';
}

export function tiktokPostInfo(o: TikTokOptions, title: string, isPhoto: boolean): Record<string, unknown> {
  const info: Record<string, unknown> = {
    title: isPhoto ? title.slice(0, 90) : title.slice(0, 2200),
    privacy_level: o.privacy_level,
    disable_comment: !o.allow_comment,
    brand_content_toggle: o.commercial && o.brand_content,
    brand_organic_toggle: o.commercial && o.brand_organic,
  };
  if (isPhoto) {
    info.auto_add_music = true;
  } else {
    info.disable_duet = !o.allow_duet;
    info.disable_stitch = !o.allow_stitch;
  }
  return info;
}

/** Titolo YouTube: massimo 100 caratteri, senza < >; i corti verticali vanno in Shorts. */
export function youtubeTitle(raw: string): string {
  const clean = (raw || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  const base = clean || 'Nuovo video';
  return base.length > 100 ? base.slice(0, 97).trimEnd() + '…' : base;
}

export function youtubeDescription(raw: string): string {
  return (raw || '').replace(/[<>]/g, '').slice(0, 5000);
}

// ── Statistiche ────────────────────────────────────────────────────
// post_metrics viene sommata sul periodo dalla dashboard: per TikTok e
// YouTube ci scriviamo l'aumento del giorno (totale di oggi meno quello
// già visto), così la somma su 7/28/90 giorni è la crescita del periodo.
export interface PostTotals {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  watch_minutes?: number | null;
}

export function dailyIncrement(today: PostTotals, before: PostTotals | null): Required<{
  [K in keyof PostTotals]: number | null;
}> {
  const d = (k: keyof PostTotals) => {
    const t = today[k];
    if (t == null) return null;
    const b = before?.[k];
    return Math.max(0, Number(t) - (b == null ? 0 : Number(b)));
  };
  return { views: d('views'), likes: d('likes'), comments: d('comments'), shares: d('shares'), watch_minutes: d('watch_minutes') };
}

/** Il token va rinnovato se scade entro `marginSec` secondi (o non si sa quando). */
export function needsRefresh(expiresAt: string | null | undefined, nowMs: number, marginSec = 300): boolean {
  if (!expiresAt) return true;
  return Date.parse(expiresAt) - nowMs < marginSec * 1000;
}

/** Errori tecnici di TikTok/Google detti in chiaro. */
export function explainSocialError(platform: SocialPlatform, error?: string | null): string {
  const e = error || '';
  const name = PLATFORM_LABEL[platform];
  if (/non configurat|not configured/i.test(e)) {
    return `Il collegamento con ${name} non è ancora attivo: manca l'app sviluppatore. Riprova tra qualche giorno.`;
  }
  if (/access_denied|cancel|annullat/i.test(e)) return `Collegamento annullato: su ${name} non hai dato il permesso. Riprova dal pulsante.`;
  if (/scadut|expired|invalid_grant|code.*used/i.test(e)) return 'Il collegamento è scaduto a metà strada. Riprova dal pulsante.';
  if (/redirect_uri|redirect uri/i.test(e)) return `Indirizzo di ritorno non accettato da ${name}: va controllata la configurazione dell'app.`;
  if (/youtubeSignupRequired|nessun canale|no channel/i.test(e)) return 'Questo account Google non ha un canale YouTube. Crealo su youtube.com e riprova.';
  if (/unaudited_client_can_only_post_to_private_accounts/i.test(e)) {
    return "Finché TikTok non approva l'app si può pubblicare solo con visibilità «Solo io» su profili privati.";
  }
  if (/spam_risk|too_many|rate.?limit|quota/i.test(e)) return `${name} ha raggiunto il limite di pubblicazioni per oggi. Riprova domani.`;
  return e || 'Errore sconosciuto';
}

export interface StoredPost {
  totals: PostTotals;
  base: PostTotals | null;
  totals_date: string | null;
}

/**
 * Riga del giorno per post_metrics. Primo avvistamento: i numeri finora
 * vanno sul giorno di pubblicazione (così un video vecchio non gonfia
 * «oggi»). Poi ogni giorno l'aumento rispetto ai totali di fine ieri;
 * più giri nello stesso giorno riscrivono la stessa riga.
 */
export function planPostSnapshot(
  stored: StoredPost | null,
  totals: PostTotals,
  publishedDate: string | null,
  today: string,
): { snapshotDate: string; increment: ReturnType<typeof dailyIncrement>; base: PostTotals; totalsDate: string } {
  if (!stored) {
    const day = publishedDate && publishedDate < today ? publishedDate : today;
    return {
      snapshotDate: day,
      increment: dailyIncrement(totals, null),
      // pubblicato oggi: la base resta zero e la riga di oggi tiene il totale
      base: day === today ? {} : totals,
      totalsDate: today,
    };
  }
  const base = stored.totals_date === today ? (stored.base ?? {}) : stored.totals;
  return { snapshotDate: today, increment: dailyIncrement(totals, base), base, totalsDate: today };
}
