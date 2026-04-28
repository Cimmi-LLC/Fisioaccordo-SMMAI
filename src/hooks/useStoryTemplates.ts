import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useToast } from '@/hooks/use-toast';

const BUCKET = 'story-templates';

/**
 * Persistent gallery of story templates per active brand.
 * URLs are stored in `brands.story_templates`. Files live in Storage
 * under `{userId}/{brandId}/{timestamp}.{ext}` (RLS allows only owner).
 */
export const useStoryTemplates = () => {
  const { user } = useAuth();
  const { activeBrand, activeBrandId, reload: reloadBrand } = useActiveBrand();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const templates: string[] = activeBrand?.story_templates || [];

  const persist = useCallback(async (next: string[]) => {
    if (!activeBrandId) return false;
    const { error } = await supabase
      .from('brands')
      .update({ story_templates: next, updated_at: new Date().toISOString() })
      .eq('id', activeBrandId);
    if (error) throw error;
    await reloadBrand();
    return true;
  }, [activeBrandId, reloadBrand]);

  const addTemplateFromFile = useCallback(async (file: File): Promise<string | null> => {
    if (!user || !activeBrandId) return null;
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${user.id}/${activeBrandId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const newUrl = urlData.publicUrl;
      await persist([...templates, newUrl]);
      toast({ title: 'Template salvato' });
      return newUrl;
    } catch (err) {
      toast({
        title: 'Errore upload template',
        description: err instanceof Error ? err.message : 'Errore',
        variant: 'destructive',
      });
      return null;
    } finally {
      setBusy(false);
    }
  }, [user, activeBrandId, templates, persist, toast]);

  const removeTemplate = useCallback(async (url: string) => {
    if (!user || !activeBrandId) return;
    setBusy(true);
    try {
      // Try to extract storage path from public URL and delete the file
      // Public URL format: .../storage/v1/object/public/{bucket}/{path}
      const marker = `/${BUCKET}/`;
      const idx = url.indexOf(marker);
      if (idx >= 0) {
        const path = url.substring(idx + marker.length);
        await supabase.storage.from(BUCKET).remove([path]);
      }
      await persist(templates.filter(u => u !== url));
      toast({ title: 'Template rimosso' });
    } catch (err) {
      toast({
        title: 'Errore rimozione',
        description: err instanceof Error ? err.message : 'Errore',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }, [user, activeBrandId, templates, persist, toast]);

  return { templates, addTemplateFromFile, removeTemplate, busy };
};
