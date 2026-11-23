import { supabase } from '@/integrations/supabase/client';
import { copioneDaLeggere, type Copione } from '@/lib/brand/virali';
import { senzaMarkdown } from '@/lib/testoMarkdown';

// Archivio contenuti: post e caroselli (generated_contents), più storie,
// recensioni e copioni dei video virali letti dalle loro tabelle (in fondo).
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

// ── Storie, recensioni e copioni dei video virali ───────────────────────
// Non stanno in generated_contents ma nelle loro tabelle, già salvati per
// intero: l'archivio li legge e basta (niente «pubblicato», si copiano).
// Gli script dei reel invece non si salvano da nessuna parte (in
// generation_history resta solo un'anteprima di 200 caratteri), quindi
// in archivio non ci sono.

// Tabelle non ancora nei tipi generati: si passa da `any`.
const db = supabase as any;

export type ExtraKind = 'storie' | 'recensioni' | 'copione';

export interface ExtraRow {
  id: string;
  kind: ExtraKind;
  title: string;
  created_at: string;
  /** Testo intero, da copiare e da leggere in «Apri». */
  text: string;
  /** Solo per i copioni: il copione intero, per mostrarlo come in Video virali. */
  copione?: Copione;
}

function testoStorie(stories: any[], recensioni: boolean): string {
  return (Array.isArray(stories) ? stories : [])
    .map((s) => {
      if (!s || typeof s !== 'object') return '';
      if (recensioni) {
        const chi = [s.name, s.platform].filter(Boolean).join(', ');
        return `«${String(s.text || '').trim()}»${chi ? ` (${chi})` : ''}`;
      }
      return [s.headline, s.text].filter(Boolean).map((x: unknown) => String(x).trim()).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

/** Storie e recensioni salvate dalla pagina Storie (generated_story_batches). */
export async function listStoryBatches(): Promise<ExtraRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];
  const { data, error } = await db
    .from('generated_story_batches')
    .select('id, source_type, source_meta, stories, story_count, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) { console.warn('[archivio] storie non lette:', error.message); return []; }
  return ((data || []) as any[]).map((b) => {
    const recensioni = b.source_type !== 'topic';
    const quante = b.story_count || (Array.isArray(b.stories) ? b.stories.length : 0);
    return {
      id: b.id,
      kind: recensioni ? 'recensioni' : 'storie',
      title: (b.source_meta?.label as string) || `${quante} ${recensioni ? 'recensioni' : 'storie'}`,
      created_at: b.created_at,
      text: testoStorie(b.stories, recensioni),
    } as ExtraRow;
  });
}

/** Copioni scritti da «Duplica questo video» (virali_copioni). */
export async function listCopioni(): Promise<ExtraRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];
  const { data, error } = await db
    .from('virali_copioni')
    .select('id, copione, creato_il')
    .eq('user_id', auth.user.id)
    .order('creato_il', { ascending: false })
    .limit(100);
  if (error) { console.warn('[archivio] copioni non letti:', error.message); return []; }
  return ((data || []) as any[]).filter((c) => c.copione).map((c) => ({
    id: c.id,
    kind: 'copione',
    title: senzaMarkdown(c.copione.titolo || 'Copione'),
    created_at: c.creato_il,
    text: senzaMarkdown(copioneDaLeggere(c.copione as Copione)),
    copione: c.copione as Copione,
  }));
}
