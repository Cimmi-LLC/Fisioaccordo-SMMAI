// Reel Instagram dal browser: caricamento del video con avanzamento,
// «Pubblica ora» (meta-publish) e programmazione (schedule-post).
import { supabase } from '@/integrations/supabase/client';
import { REEL_BUCKET } from '@/lib/brand/reel';

export interface DatiReel {
  connectionId: string;
  content: string;
  hashtags?: string;
  videoPath: string;
  coverPath?: string | null;
  thumbOffsetMs?: number | null;
  shareToFeed: boolean;
}

export type StatoReel = 'scheduled' | 'processing' | 'published' | 'failed';

export interface RispostaReel {
  status: StatoReel;
  reelId?: string;
  message?: string;
}

function estensione(file: File): string {
  const dalNome = file.name.split('.').pop()?.toLowerCase();
  if (dalNome && /^[a-z0-9]{2,4}$/.test(dalNome)) return dalNome;
  return file.type === 'video/quicktime' ? 'mov' : file.type === 'image/png' ? 'png' : file.type.startsWith('image/') ? 'jpg' : 'mp4';
}

export function percorsoReel(userId: string, file: File, tipo: 'video' | 'copertina'): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/${id}${tipo === 'copertina' ? '-copertina' : ''}.${estensione(file)}`;
}

/**
 * Carica un file nel bucket dei reel con un URL firmato, così si vede
 * l'avanzamento (100 MB dal telefono richiedono tempo).
 */
export async function caricaFileReel(
  path: string,
  file: File,
  onProgress?: (percento: number) => void,
): Promise<void> {
  const api = supabase.storage.from(REEL_BUCKET);
  const { data, error } = await api.createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    throw new Error('Non riesco a preparare il caricamento: ' + (error?.message || 'errore'));
  }
  // Stesse intestazioni di uploadToSignedUrl (apikey e sessione), che però
  // non dà l'avanzamento: per quello serve XMLHttpRequest.
  const intestazioni = (api as unknown as { headers?: Record<string, string> }).headers || {};
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.signedUrl);
    for (const [k, v] of Object.entries(intestazioni)) {
      if (k.toLowerCase() !== 'content-type') xhr.setRequestHeader(k, v);
    }
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let dettaglio = '';
      try { dettaglio = JSON.parse(xhr.responseText)?.message || ''; } catch { /* risposta non JSON */ }
      if (xhr.status === 413 || /size|large/i.test(dettaglio)) {
        reject(new Error('Il file supera il limite di caricamento (100 MB).'));
      } else {
        reject(new Error(`Caricamento non riuscito (${xhr.status})${dettaglio ? ': ' + dettaglio : ''}`));
      }
    };
    xhr.onerror = () => reject(new Error('Connessione interrotta durante il caricamento: riprova.'));
    xhr.send(file);
  });
}

export async function eliminaFileReel(paths: (string | null | undefined)[]): Promise<void> {
  const validi = paths.filter((p): p is string => !!p);
  if (validi.length === 0) return;
  const { error } = await supabase.storage.from(REEL_BUCKET).remove(validi);
  if (error) console.warn('File del reel non eliminati:', error.message);
}

/**
 * Lo stesso video può servire a più righe (Reel, Short, TikTok, un nuovo
 * tentativo): i file si tolgono solo quando nessuna riga li usa più.
 */
export async function eliminaFileSeLiberi(paths: (string | null | undefined)[]): Promise<void> {
  const liberi: string[] = [];
  for (const p of paths) {
    if (!p) continue;
    const { data, error } = await supabase
      .from('published_posts')
      .select('id')
      .or(`video_path.eq."${p}",cover_path.eq."${p}"`)
      .limit(1);
    if (!error && (!data || data.length === 0)) liberi.push(p);
  }
  await eliminaFileReel(liberi);
}

/** Legge il messaggio d'errore anche quando la funzione risponde 4xx/5xx. */
async function erroreDaRisposta(error: unknown, data: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const corpo = await ctx.clone().json();
      if (corpo?.error) return String(corpo.error);
    } catch { /* corpo non JSON */ }
  }
  const dalCorpo = (data as { error?: string } | null)?.error;
  return dalCorpo || (error instanceof Error ? error.message : 'Errore sconosciuto');
}

export async function pubblicaReelOra(d: DatiReel): Promise<RispostaReel> {
  const { data, error } = await supabase.functions.invoke('meta-publish', {
    body: {
      connection_id: d.connectionId,
      platform: 'instagram',
      media_type: 'reel',
      content: d.content,
      hashtags: d.hashtags || undefined,
      video_path: d.videoPath,
      cover_path: d.coverPath || undefined,
      thumb_offset_ms: d.thumbOffsetMs ?? undefined,
      share_to_feed: d.shareToFeed,
    },
  });
  if (error || !data?.success) throw new Error(await erroreDaRisposta(error, data));
  return { status: data.status as StatoReel, reelId: data.reel_id, message: data.message };
}

export async function programmaReel(d: DatiReel & { scheduledFor: Date }): Promise<string | undefined> {
  const { data, error } = await supabase.functions.invoke('schedule-post', {
    body: {
      media_type: 'reel',
      content: d.content,
      hashtags: d.hashtags || undefined,
      video_path: d.videoPath,
      cover_path: d.coverPath || undefined,
      thumb_offset_ms: d.thumbOffsetMs ?? undefined,
      share_to_feed: d.shareToFeed,
      connection_id: d.connectionId,
      scheduled_for: d.scheduledFor.toISOString(),
    },
  });
  if (error || data?.error) throw new Error(await erroreDaRisposta(error, data));
  return data?.post?.id;
}

export async function leggiStatoReel(id: string): Promise<{ status: StatoReel; error_message: string | null } | null> {
  const { data } = await supabase
    .from('published_posts')
    .select('status, error_message')
    .eq('id', id)
    .maybeSingle();
  return (data as { status: StatoReel; error_message: string | null } | null) || null;
}
