// Un video caricato una volta e pubblicato (o programmato) su Instagram come
// Reel, su YouTube come Short e su TikTok, con testo e titolo per piattaforma.
// Qui solo i controlli: nessun import di rete, si prova con vitest.

import { REEL_LIMITI, validaDidascalia, validaVideo, type InfoVideo, type Verifica } from '@/lib/brand/reel';
import type { SocialPlatform, TikTokOptions } from '@/lib/social/socialCore';

export type Destinazione = 'instagram' | SocialPlatform;

export const DESTINAZIONI: Destinazione[] = ['instagram', 'youtube', 'tiktok'];

export const NOME_DESTINAZIONE: Record<Destinazione, string> = {
  instagram: 'Instagram Reel',
  youtube: 'YouTube Shorts',
  tiktok: 'TikTok',
};

const MB = 1024 * 1024;

/** Peso massimo per piattaforma: Instagram 100 MB (caricamento diretto), TikTok e YouTube 200 MB (memoria della funzione). */
export const MAX_BYTE: Record<Destinazione, number> = {
  instagram: REEL_LIMITI.maxByte,
  youtube: 200 * MB,
  tiktok: 200 * MB,
};

/** Oltre questa durata YouTube lo mette fra i video normali, non negli Shorts. */
export const SHORTS_MAX_SECONDI = 180;

export const MAX_TESTO: Record<Destinazione, number> = {
  instagram: REEL_LIMITI.maxDidascalia,
  tiktok: 2200,
  youtube: 5000,
};

export const MAX_TITOLO_YOUTUBE = 100;

/** Scelte TikTok di partenza: la visibilità la sceglie sempre l'utente (regola TikTok). */
export const EMPTY_TIKTOK: TikTokOptions = {
  privacy_level: '',
  allow_comment: false,
  allow_duet: false,
  allow_stitch: false,
  commercial: false,
  brand_organic: false,
  brand_content: false,
};

const TIPI_SOCIAL = ['video/mp4', 'video/quicktime', 'video/webm'];

export function maxByteVideo(destinazioni: Destinazione[]): number {
  return destinazioni.length === 0 ? MAX_BYTE.tiktok : Math.min(...destinazioni.map((d) => MAX_BYTE[d]));
}

/**
 * Controlla il video per tutte le destinazioni scelte. Gli errori bloccano
 * la pubblicazione; gli avvisi dicono cosa succederà (es. niente Shorts).
 * `tiktokMaxSecondi` è il limite del profilo letto da TikTok (creator_info).
 */
export function controllaVideo(
  v: InfoVideo,
  destinazioni: Destinazione[],
  tiktokMaxSecondi?: number | null,
): Verifica {
  const errori: string[] = [];
  const avvisi: string[] = [];
  const aggiungi = (lista: string[], testo: string) => { if (!lista.includes(testo)) lista.push(testo); };

  if (destinazioni.includes('instagram')) {
    const ig = validaVideo(v);
    ig.errori.forEach((e) => aggiungi(errori, e));
    ig.avvisi.forEach((a) => aggiungi(avvisi, a));
  } else {
    if (!TIPI_SOCIAL.includes((v.tipo || '').toLowerCase())) aggiungi(errori, 'Il video deve essere un file MP4, MOV o WebM.');
    const max = maxByteVideo(destinazioni);
    if (v.byte > max) {
      aggiungi(errori, `Il video pesa ${(v.byte / MB).toFixed(0)} MB: il massimo è ${max / MB} MB. Esportalo di nuovo in 1080×1920.`);
    }
  }

  const verticale = v.larghezza && v.altezza ? v.larghezza < v.altezza : null;
  if (destinazioni.includes('youtube')) {
    if (v.durata !== null && v.durata > SHORTS_MAX_SECONDI) {
      aggiungi(avvisi, 'Dura più di 3 minuti: su YouTube esce come video normale, non fra gli Shorts.');
    }
    if (verticale === false) aggiungi(avvisi, 'Non è verticale: su YouTube esce come video normale, non fra gli Shorts.');
  }
  if (destinazioni.includes('tiktok')) {
    if (tiktokMaxSecondi && v.durata !== null && v.durata > tiktokMaxSecondi) {
      aggiungi(errori, `Su questo profilo TikTok il video può durare al massimo ${tiktokMaxSecondi} secondi.`);
    }
    if (v.durata !== null && v.durata < 3) aggiungi(errori, 'Su TikTok il video deve durare almeno 3 secondi.');
  }
  return { errori, avvisi };
}

/** Il testo che va su una piattaforma: quello suo se scritto, altrimenti quello comune. */
export function testoPer(d: Destinazione, comune: string, propri: Partial<Record<Destinazione, string | null>>): string {
  const proprio = propri[d];
  return (proprio !== undefined && proprio !== null ? proprio : comune).trim();
}

/** Controlla testo (e titolo YouTube) di ogni destinazione scelta. */
export function controllaTesti(
  destinazioni: Destinazione[],
  comune: string,
  propri: Partial<Record<Destinazione, string | null>>,
  titoloYoutube: string,
): Verifica {
  const errori: string[] = [];
  for (const d of destinazioni) {
    const testo = testoPer(d, comune, propri);
    if (d === 'instagram') {
      if (!testo) errori.push('Scrivi la didascalia per Instagram.');
      validaDidascalia(testo).errori.forEach((e) => errori.push(e));
    } else if ([...testo].length > MAX_TESTO[d]) {
      errori.push(`Il testo per ${NOME_DESTINAZIONE[d]} supera ${MAX_TESTO[d]} caratteri.`);
    }
  }
  if (destinazioni.includes('youtube')) {
    const t = titoloYoutube.trim();
    if (!t) errori.push('Scrivi il titolo per YouTube.');
    else if ([...t].length > MAX_TITOLO_YOUTUBE) errori.push(`Il titolo per YouTube supera ${MAX_TITOLO_YOUTUBE} caratteri.`);
    if (/[<>]/.test(titoloYoutube)) errori.push('Nel titolo per YouTube non si possono usare i simboli < e >.');
  }
  return { errori, avvisi: [] };
}

export type StatoEsito = 'pubblicato' | 'in_elaborazione' | 'programmato' | 'fallito';

export interface EsitoDestinazione {
  destinazione: Destinazione;
  stato: StatoEsito;
  messaggio: string;
  url?: string | null;
  reelId?: string | null;
}

/** Titolo del riepilogo finale, a seconda di quante destinazioni sono andate. */
export function titoloEsiti(esiti: EsitoDestinazione[]): string {
  const falliti = esiti.filter((e) => e.stato === 'fallito').length;
  if (esiti.length === 0) return 'Niente da pubblicare';
  if (falliti === esiti.length) return 'Non è andato';
  if (falliti > 0) return 'Andato in parte';
  if (esiti.every((e) => e.stato === 'programmato')) return 'Programmato';
  if (esiti.some((e) => e.stato === 'in_elaborazione')) return 'Inviato, quasi fatto';
  return 'Fatto';
}
