import { supabase } from '@/integrations/supabase/client';
import type { SocialPlatform, TikTokOptions, YouTubeOptions } from '@/lib/social/socialCore';

export interface SocialConnectionData {
  id: string;
  user_id: string;
  brand_id: string | null;
  platform: SocialPlatform;
  external_account_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_error: string | null;
  created_at: string;
}

export interface SocialConnectResult {
  success: boolean;
  platform: SocialPlatform;
  brandId?: string | null;
  name?: string | null;
  error?: string;
}

export interface CreatorInfo {
  creator_nickname: string | null;
  creator_username: string | null;
  creator_avatar_url: string | null;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number | null;
}

export interface PublishInput {
  connectionId: string;
  kind: 'video' | 'photos';
  videoPath?: string;
  photoPaths?: string[];
  caption: string;
  tiktok?: TikTokOptions;
  youtube?: YouTubeOptions;
  scheduledFor?: Date | null;
}

export const VIDEO_BUCKET = 'social-video';
export const PHOTO_BUCKET = 'social-pubblici';
export const MAX_VIDEO_MB = 200;

const RESULT_KEY = 'fisioaccordo:social_connect_result';

/** Il messaggio vero: con status non 2xx l'SDK lo mette in data.error. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- risposte JSON delle edge function
async function invoke<T = any>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (data && data.success === false) throw new Error(data.error || 'Errore');
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx && typeof ctx.json === 'function') {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch { /* resta il messaggio dell'SDK */ }
    throw new Error(msg);
  }
  return data as T;
}

export class SocialService {
  /** Quali piattaforme hanno l'app sviluppatore configurata sul server. */
  static async status(): Promise<Record<SocialPlatform, boolean>> {
    try {
      const d = await invoke('social-auth', { action: 'status' });
      return { tiktok: !!d.platforms?.tiktok, youtube: !!d.platforms?.youtube };
    } catch {
      return { tiktok: false, youtube: false };
    }
  }

  /** Porta l'utente su TikTok/Google; al ritorno si arriva a /auth/social/:platform/callback. */
  static async connect(platform: SocialPlatform, brandId?: string | null): Promise<void> {
    const d = await invoke('social-auth', {
      action: 'start',
      platform,
      brand_id: brandId || undefined,
      return_to: window.location.pathname,
      origin: window.location.origin,
    });
    if (!d.url) throw new Error('Indirizzo di collegamento mancante');
    window.location.href = d.url;
  }

  static async finishConnect(platform: SocialPlatform, code: string, state: string): Promise<{ result: SocialConnectResult; returnTo: string }> {
    try {
      const d = await invoke('social-auth', { action: 'callback', platform, code, state });
      return {
        result: { success: true, platform, brandId: d.brand_id ?? null, name: d.username || d.display_name || null },
        returnTo: d.return_to || '/settings',
      };
    } catch (e) {
      return {
        result: { success: false, platform, error: e instanceof Error ? e.message : 'Errore sconosciuto' },
        returnTo: '/settings',
      };
    }
  }

  static async getConnections(): Promise<SocialConnectionData[]> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return [];
    // social_connections non è ancora nei tipi generati
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('social_connections')
      .select('id, user_id, brand_id, platform, external_account_id, username, display_name, avatar_url, is_active, last_error, created_at')
      .eq('user_id', u.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Errore caricamento account TikTok/YouTube:', error);
      return [];
    }
    return (data || []) as SocialConnectionData[];
  }

  static async disconnect(connectionId: string): Promise<void> {
    await invoke('social-auth', { action: 'disconnect', connection_id: connectionId });
  }

  static async creatorInfo(connectionId: string): Promise<CreatorInfo | null> {
    const d = await invoke('social-publish', { action: 'creator_info', connection_id: connectionId });
    return d.info ?? null;
  }

  /** Carica il video nello Storage (cartella dell'utente) e restituisce il percorso. */
  static async uploadVideo(file: File): Promise<string> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error('Utente non autenticato');
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Il video supera ${MAX_VIDEO_MB} MB: esportalo più leggero (1080p basta).`);
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
    const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, {
      contentType: file.type || 'video/mp4',
      upsert: false,
    });
    if (error) throw new Error('Caricamento del video non riuscito: ' + error.message);
    return path;
  }

  /**
   * TikTok accetta solo foto JPEG/WebP fino a 1080 px, scaricate da un
   * indirizzo pubblico verificato: le slide si convertono qui e si copiano
   * nella cartella dell'utente in social-pubblici.
   */
  static async prepareTikTokPhotos(bucket: string, paths: string[]): Promise<string[]> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error('Utente non autenticato');
    const folder = `${u.user.id}/${crypto.randomUUID()}`;
    const out: string[] = [];
    for (let i = 0; i < paths.length; i++) {
      const { data: blob, error } = await supabase.storage.from(bucket).download(paths[i]);
      if (error || !blob) throw new Error('Slide non trovata: ' + (error?.message || paths[i]));
      const jpeg = await toJpeg(blob, 1080);
      const path = `${folder}/${String(i + 1).padStart(2, '0')}.jpg`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg' });
      if (upErr) throw new Error('Preparazione foto non riuscita: ' + upErr.message);
      out.push(path);
    }
    return out;
  }

  static async publish(input: PublishInput): Promise<{ scheduled?: boolean; status?: string; url?: string | null }> {
    return await invoke('social-publish', {
      action: 'publish',
      connection_id: input.connectionId,
      kind: input.kind,
      video_path: input.videoPath,
      photo_paths: input.photoPaths,
      caption: input.caption,
      tiktok: input.tiktok,
      youtube: input.youtube,
      scheduled_for: input.scheduledFor ? input.scheduledFor.toISOString() : undefined,
    });
  }

  static async syncNow(platform: SocialPlatform, brandId?: string | null): Promise<{ processed: number; totalPostsSynced: number }> {
    const d = await invoke('sync-social-metrics', { platform, brand_id: brandId || undefined });
    return { processed: d.processed ?? 0, totalPostsSynced: d.totalPostsSynced ?? 0 };
  }

  static saveConnectResult(r: SocialConnectResult): void {
    try { sessionStorage.setItem(RESULT_KEY, JSON.stringify(r)); } catch { /* solo il toast */ }
  }

  /** Esito del collegamento appena tornato da TikTok/Google (senza cancellarlo). */
  static peekConnectResult(): SocialConnectResult | null {
    try {
      const raw = sessionStorage.getItem(RESULT_KEY);
      return raw ? (JSON.parse(raw) as SocialConnectResult) : null;
    } catch {
      return null;
    }
  }

  /** Va chiamato dopo averlo mostrato: l'esito si vede una volta sola. */
  static clearConnectResult(): void {
    try { sessionStorage.removeItem(RESULT_KEY); } catch { /* niente da fare */ }
  }
}

async function toJpeg(blob: Blob, maxSide: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Conversione immagine non disponibile in questo browser');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversione JPEG fallita'))), 'image/jpeg', 0.92),
  );
}
