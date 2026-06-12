import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { signedUrl } from '@/lib/storage';

export interface BrandPhoto {
  id: string;
  brand_id: string;
  user_id: string;
  /** Signed URL minted on read. `url` column in DB is legacy and kept null. */
  url: string;
  storage_path: string | null;
  caption: string | null;
  tags: string[];
  created_at: string;
}

// Reuse the existing `user-photos` bucket — it has working RLS and was created
// when useUserPhotos was introduced. Brand photos sit in a sub-prefix so they
// can be queried by brand_id from the DB row, regardless of storage path.
const BUCKET = 'user-photos';
const PREFIX = 'brand-pool';

export const useBrandPhotos = (brandId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<BrandPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user || !brandId) {
      setPhotos([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_photos')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Mint signed URLs for display from storage_path.
      const enriched = await Promise.all(
        ((data || []) as BrandPhoto[]).map(async (p) => ({
          ...p,
          url: p.storage_path ? await signedUrl(BUCKET, p.storage_path) : (p.url || ''),
        }))
      );
      setPhotos(enriched);
    } catch (e: any) {
      console.error('[useBrandPhotos] load failed:', e);
      toast({ title: 'Errore caricamento foto', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, brandId, toast]);

  useEffect(() => { load(); }, [load]);

  const addFromFile = useCallback(async (file: File, caption?: string, tags?: string[]) => {
    if (!user || !brandId) {
      console.warn('[useBrandPhotos] addFromFile: missing user or brandId', { user: !!user, brandId });
      toast({ title: 'Errore', description: 'Brand non selezionato. Salva prima il brand.', variant: 'destructive' });
      return null;
    }
    console.log('[useBrandPhotos] uploading', file.name, file.size, 'user:', user.id, 'brand:', brandId);
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      // Path: userId/brand-pool/timestamp_rand.ext
      // First folder = userId so existing user-photos RLS policy matches.
      const path = `${user.id}/${PREFIX}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      console.log('[useBrandPhotos] storage path:', path);

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });
      if (upErr) {
        console.error('[useBrandPhotos] storage upload failed:', upErr);
        throw upErr;
      }
      console.log('[useBrandPhotos] storage upload OK');

      // Rule: don't persist full URLs in DB. Generate signed URL on read.
      const signed = await signedUrl(BUCKET, path);

      const { data: row, error: insErr } = await supabase
        .from('brand_photos')
        .insert({
          brand_id: brandId,
          user_id: user.id,
          url: null,
          storage_path: path,
          caption: caption || null,
          tags: tags || [],
        })
        .select()
        .single();
      if (insErr) {
        console.error('[useBrandPhotos] DB insert failed:', insErr);
        throw insErr;
      }
      console.log('[useBrandPhotos] DB insert OK', row);

      const withUrl = { ...(row as BrandPhoto), url: signed };
      setPhotos(prev => [withUrl, ...prev]);
      toast({ title: 'Foto caricata', description: file.name });
      return withUrl;
    } catch (e: any) {
      console.error('[useBrandPhotos] addFromFile failed:', e);
      const msg = e?.message || e?.error || JSON.stringify(e);
      toast({ title: 'Upload fallito', description: msg, variant: 'destructive' });
      return null;
    } finally {
      setBusy(false);
    }
  }, [user, brandId, toast]);

  const remove = useCallback(async (photo: BrandPhoto) => {
    if (!user) return;
    setBusy(true);
    try {
      if (photo.storage_path) {
        await supabase.storage.from(BUCKET).remove([photo.storage_path]);
      }
      const { error } = await supabase.from('brand_photos').delete().eq('id', photo.id);
      if (error) throw error;
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (e: any) {
      console.error('[useBrandPhotos] remove failed:', e);
      toast({ title: 'Eliminazione fallita', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }, [user, toast]);

  const updateMeta = useCallback(async (photo: BrandPhoto, patch: { caption?: string; tags?: string[] }) => {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('brand_photos')
        .update(patch)
        .eq('id', photo.id)
        .select()
        .single();
      if (error) throw error;
      setPhotos(prev => prev.map(p => (p.id === photo.id ? (data as BrandPhoto) : p)));
    } catch (e: any) {
      console.error('[useBrandPhotos] updateMeta failed:', e);
      toast({ title: 'Salvataggio fallito', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }, [toast]);

  return { photos, loading, busy, reload: load, addFromFile, remove, updateMeta };
};
