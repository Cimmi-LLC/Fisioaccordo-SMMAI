import { supabase } from '@/integrations/supabase/client';

// Archivio contenuti: ogni cosa generata finisce qui.
// is_published = false  -> scheda 'Non pubblicato'
// is_published = true   -> scheda 'Pubblicato' (con data e ora)

export type ArchiveKind = 'post' | 'carosello' | 'storia' | 'reel';

export interface ArchiveInput {
  title: string;
  contentText: string;
  topic?: string | null;
  kind: ArchiveKind;
  images?: string[];
  platform?: string;
  id?: string | null;
}

export interface ArchiveRow {
  id: string;
  title: string;
  content_text: string;
  topic: string | null;
  post_type: string | null;
  images: any;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

const LS_LAST = 'fisioaccordo:last_archive_id';

function cleanTitle(input: ArchiveInput): string {
  const raw = (input.title || input.topic || 'Contenuto senza titolo').replace(/\s+/g, ' ').trim();
  return raw.slice(0, 200);
}

/** Salva un contenuto appena generato come NON pubblicato. Ritorna l id. */
export async function archiveContent(input: ArchiveInput): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return null;
    const { data, error } = await supabase
      .from('generated_contents')
      .insert({
        user_id: user.id,
        title: cleanTitle(input),
        content_text: input.contentText || '',
        topic: input.topic || null,
        post_type: input.kind,
        platform: input.platform || 'instagram',
        images: (input.images || []) as any,
        is_published: false,
      } as any)
      .select('id')
      .single();
    if (error) { console.warn('[archivio] salvataggio fallito:', error.message); return null; }
    const id = (data as any)?.id || null;
    if (id && typeof window !== 'undefined') localStorage.setItem(LS_LAST, id);
    return id;
  } catch (e) {
    console.warn('[archivio] errore:', e);
    return null;
  }
}

/** Sposta un contenuto in PUBBLICATO con data e ora. Se non esiste, lo crea gia pubblicato. */
export async function markPublished(input: ArchiveInput): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;
    const now = new Date().toISOString();
    let targetId: string | null = input.id || null;
    if (!targetId && input.contentText) {
      const { data } = await supabase
        .from('generated_contents')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_published', false)
        .eq('content_text', input.contentText)
        .order('created_at', { ascending: false })
        .limit(1);
      targetId = (data && (data as any)[0] && (data as any)[0].id) || null;
    }
    if (targetId) {
      const patch: any = { is_published: true, published_at: now, updated_at: now };
      if (input.images && input.images.length > 0) patch.images = input.images;
      await supabase.from('generated_contents').update(patch).eq('id', targetId);
      return;
    }
    await supabase.from('generated_contents').insert({
      user_id: user.id,
      title: cleanTitle(input),
      content_text: input.contentText || '',
      topic: input.topic || null,
      post_type: input.kind,
      platform: input.platform || 'instagram',
      images: (input.images || []) as any,
      is_published: true,
      published_at: now,
    } as any);
  } catch (e) {
    console.warn('[archivio] spostamento in pubblicati fallito:', e);
  }
}

/** Legge una delle due schede dell archivio. */
export async function listArchive(published: boolean): Promise<ArchiveRow[]> {
  const { data, error } = await supabase
    .from('generated_contents')
    .select('id,title,content_text,topic,post_type,images,is_published,published_at,created_at')
    .eq('is_published', published)
    .order(published ? 'published_at' : 'created_at', { ascending: false })
    .limit(300);
  if (error) { console.warn('[archivio] lettura fallita:', error.message); return []; }
  return ((data as any) || []) as ArchiveRow[];
}

export async function deleteArchived(id: string): Promise<boolean> {
  const { error } = await supabase.from('generated_contents').delete().eq('id', id);
  return !error;
}

/**
 * Allinea l archivio con i post PROGRAMMATI che il sistema ha gia pubblicato.
 * Cosi anche le pubblicazioni automatiche finiscono in 'Pubblicato' con data e ora.
 */
export async function syncPublishedFromScheduler(): Promise<number> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return 0;
    const { data: posts } = await supabase
      .from('published_posts')
      .select('content, updated_at, scheduled_for, status')
      .eq('status', 'published')
      .limit(200);
    if (!posts || posts.length === 0) return 0;
    const { data: pending } = await supabase
      .from('generated_contents')
      .select('id, content_text')
      .eq('user_id', user.id)
      .eq('is_published', false)
      .limit(300);
    if (!pending || pending.length === 0) return 0;
    let moved = 0;
    for (const p of posts as any[]) {
      const text = (p.content || '').trim();
      if (!text) continue;
      const match = (pending as any[]).find(g => (g.content_text || '').trim() === text);
      if (!match) continue;
      const when = p.updated_at || p.scheduled_for || new Date().toISOString();
      await supabase.from('generated_contents').update({ is_published: true, published_at: when, updated_at: when } as any).eq('id', match.id);
      moved++;
    }
    return moved;
  } catch (e) {
    console.warn('[archivio] sync programmati fallito:', e);
    return 0;
  }
}
