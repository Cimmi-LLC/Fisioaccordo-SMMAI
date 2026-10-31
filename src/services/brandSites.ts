// Siti collegati a un brand. Il sito principale resta copiato in
// brands.website_url, che e quello che usano onboarding e generazione.
import { supabase } from '@/integrations/supabase/client';
import { cleanWebsiteUrl } from '@/utils/url';

export type BrandSite = {
  id: string;
  brand_id: string;
  url: string;
  label: string;
  is_primary: boolean;
  last_analyzed_at: string | null;
  last_colors: string[];
  created_at: string;
};

const db = () => supabase as any;

export async function listSites(brandId: string): Promise<BrandSite[]> {
  const { data, error } = await db().from('brand_sites').select('*').eq('brand_id', brandId)
    .order('is_primary', { ascending: false }).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as BrandSite[];
}

/** Aggiunge un sito; il primo diventa automaticamente il principale. */
export async function addSite(brandId: string, userId: string, rawUrl: string, label = ''): Promise<BrandSite> {
  const url = cleanWebsiteUrl(rawUrl);
  try { new URL(url); } catch { throw new Error('Indirizzo non valido. Esempio: https://www.tuostudio.it'); }
  const existing = await listSites(brandId);
  if (existing.some((s) => s.url.toLowerCase() === url.toLowerCase())) throw new Error('Questo sito è già collegato.');
  const isPrimary = existing.length === 0;
  const { data, error } = await db().from('brand_sites')
    .insert({ brand_id: brandId, user_id: userId, url, label: label.trim().slice(0, 60), is_primary: isPrimary })
    .select('*').single();
  if (error) throw new Error(error.message);
  if (isPrimary) await syncPrimaryToBrand(brandId, url);
  return data as BrandSite;
}

async function syncPrimaryToBrand(brandId: string, url: string | null) {
  const { error } = await db().from('brands').update({ website_url: url }).eq('id', brandId);
  if (error) throw new Error(error.message);
}

/** Cambia il sito principale (uno solo per brand, garantito anche dal database). */
export async function setPrimary(brandId: string, siteId: string): Promise<string> {
  const sites = await listSites(brandId);
  const target = sites.find((s) => s.id === siteId);
  if (!target) throw new Error('Sito non trovato.');
  const { error: e1 } = await db().from('brand_sites').update({ is_primary: false }).eq('brand_id', brandId).eq('is_primary', true);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await db().from('brand_sites').update({ is_primary: true }).eq('id', siteId);
  if (e2) throw new Error(e2.message);
  await syncPrimaryToBrand(brandId, target.url);
  return target.url;
}

/** Rimuove un sito; se era il principale, il successivo prende il suo posto. Ritorna il nuovo principale (o null). */
export async function removeSite(brandId: string, siteId: string): Promise<string | null> {
  const sites = await listSites(brandId);
  const target = sites.find((s) => s.id === siteId);
  if (!target) return sites.find((s) => s.is_primary)?.url ?? null;
  const { error } = await db().from('brand_sites').delete().eq('id', siteId);
  if (error) throw new Error(error.message);
  if (!target.is_primary) return sites.find((s) => s.is_primary)?.url ?? null;
  const next = sites.find((s) => s.id !== siteId);
  if (next) return setPrimary(brandId, next.id);
  await syncPrimaryToBrand(brandId, null);
  return null;
}

export async function renameSite(siteId: string, label: string) {
  const { error } = await db().from('brand_sites').update({ label: label.trim().slice(0, 60) }).eq('id', siteId);
  if (error) throw new Error(error.message);
}

export async function markAnalyzed(siteId: string, colors: string[]) {
  await db().from('brand_sites').update({ last_analyzed_at: new Date().toISOString(), last_colors: colors.slice(0, 8) }).eq('id', siteId);
}
