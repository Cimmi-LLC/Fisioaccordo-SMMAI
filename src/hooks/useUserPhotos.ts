import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPhoto {
  id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  category: string;
  tags: string[];
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
      setPhotos((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const uploadPhoto = useCallback(async (file: File, category: string = 'generale', tags: string[] = []) => {
    if (!user) return null;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('user-photos').getPublicUrl(path);
      
      const { data, error } = await supabase.from('user_photos').insert({
        user_id: user.id,
        storage_path: path,
        public_url: urlData.publicUrl,
        filename: file.name,
        category,
        tags
      } as any).select().single();

      if (error) throw error;
      setPhotos(prev => [(data as any), ...prev]);
      toast({ title: '📸 Foto caricata!', description: file.name });
      return data as any as UserPhoto;
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: '❌ Errore upload', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  }, [user, toast]);

  const deletePhoto = useCallback(async (photo: UserPhoto) => {
    try {
      await supabase.storage.from('user-photos').remove([photo.storage_path]);
      await supabase.from('user_photos').delete().eq('id', photo.id as any);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast({ title: '🗑️ Foto eliminata' });
    } catch (err: any) {
      toast({ title: '❌ Errore', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  const updateCategory = useCallback(async (id: string, category: string) => {
    const { error } = await supabase.from('user_photos').update({ category } as any).eq('id', id as any);
    if (!error) setPhotos(prev => prev.map(p => p.id === id ? { ...p, category } : p));
  }, []);

  return { photos, loading, uploading, uploadPhoto, deletePhoto, updateCategory, refetch: fetchPhotos };
};
