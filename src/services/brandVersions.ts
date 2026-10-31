// Storico del Brand Kit: un'istantanea prima di ogni salvataggio, ripristinabile.
import { supabase } from '@/integrations/supabase/client';
import { pickSnapshot, type BrandSnapshot } from '@/lib/brandSnapshot';

export type BrandVersion = { id: string; brand_id: string; reason: string; snapshot: BrandSnapshot; created_at: string };

const KEEP = 30;
const db = () => supabase as any;

export async function listVersions(brandId: string): Promise<BrandVersion[]> {
  const { data, error } = await db().from('brand_versions').select('*').eq('brand_id', brandId)
    .order('created_at', { ascending: false }).limit(KEEP);
  if (error) throw new Error(error.message);
  return (data || []) as BrandVersion[];
}

/** Salva come versione lo stato ATTUALE del database (prima che venga sovrascritto). */
export async function snapshotFromDatabase(brandId: string, userId: string, reason: string): Promise<void> {
  const { data: row, error } = await db().from('brands').select('*').eq('id', brandId).single();
  if (error || !row) throw new Error(error?.message || 'Brand non trovato');
  const { error: insErr } = await db().from('brand_versions')
    .insert({ brand_id: brandId, user_id: userId, reason: reason.slice(0, 160), snapshot: pickSnapshot(row) });
  if (insErr) throw new Error(insErr.message);
  // Si tengono le ultime KEEP versioni.
  const { data: old } = await db().from('brand_versions').select('id').eq('brand_id', brandId)
    .order('created_at', { ascending: false }).range(KEEP, KEEP + 50);
  const ids = ((old || []) as Array<{ id: string }>).map((r) => r.id);
  if (ids.length) await db().from('brand_versions').delete().in('id', ids);
}

export async function deleteVersion(id: string) {
  const { error } = await db().from('brand_versions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
