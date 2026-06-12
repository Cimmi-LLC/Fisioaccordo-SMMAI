import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { signedUrl } from '@/lib/storage';

export interface UserPhoto {
  id: string;
  storage_path: string;
  /**
   * Signed URL minted on read. Stays in memory only — NOT written to DB.
   * Legacy `public_url` column kept null for forward-compat.
   */
  public_url: string;
  filename: string;
  category: string;
  tags: string[] | null;
  created_at: string;
}

export const useUserPhotos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_photos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Mint signed URLs for display (1h TTL). public_url in DB is legacy.
      const enriched = await Promise.all(
        (data || []).map(async (p) => ({
          ...p,
          public_url: await signedUrl('user-photos', p.storage_path),
        }))
      );
      setPhotos(enriched);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const uploadPhoto = useCallback(async (file: File, category: string = 'generale', tags: string[] = []) => {
    if (!user) {
      console.error('uploadPhoto: user is null, cannot upload');
      return null;
    }
    console.log('uploadPhoto: starting upload for', file.name, 'size:', file.size, 'user:', user.id);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      console.log('uploadPhoto: uploading to storage path:', path);

      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) {
        console.error('uploadPhoto: storage upload failed:', uploadError);
        throw uploadError;
      }
      console.log('uploadPhoto: storage upload success');

      // Rule: don't persist full URLs in DB — generate signed URL on read.
      const signed = await signedUrl('user-photos', path);

      const { data, error } = await supabase.from('user_photos').insert({
        user_id: user.id,
        storage_path: path,
        public_url: null,
        filename: file.name,
        category,
        tags
      }).select().single();

      if (error) {
        console.error('uploadPhoto: DB insert failed:', error);
        throw error;
      }
      console.log('uploadPhoto: DB insert success', data);
      const withUrl = { ...data, public_url: signed } as UserPhoto;
      setPhotos(prev => [withUrl, ...prev]);
      toast({ title: '📸 Foto caricata!', description: file.name });
      return withUrl;
    } catch (err: any) {
      console.error('uploadPhoto: error:', err);
      toast({ title: '❌ Errore upload', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  }, [user, toast]);

  const deletePhoto = useCallback(async (photo: UserPhoto) => {
    try {
      await supabase.storage.from('user-photos').remove([photo.storage_path]);
      await supabase.from('user_photos').delete().eq('id', photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast({ title: '🗑️ Foto eliminata' });
    } catch (err: any) {
      toast({ title: '❌ Errore', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  const updateCategory = useCallback(async (id: string, category: string) => {
    const { error } = await supabase.from('user_photos').update({ category }).eq('id', id);
    if (!error) setPhotos(prev => prev.map(p => p.id === id ? { ...p, category } : p));
  }, []);

  return { photos, loading, uploading, uploadPhoto, deletePhoto, updateCategory, refetch: fetchPhotos };
};
