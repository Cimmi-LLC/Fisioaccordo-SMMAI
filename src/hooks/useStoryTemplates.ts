import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useToast } from '@/hooks/use-toast';
import { signedUrls as mintUrls } from '@/lib/storage';

const BUCKET = 'story-templates';

/**
 * Persistent gallery of story templates per active brand.
 *
 * Storage layout:
 *  Files live at `{userId}/{brandId}/{timestamp}.{ext}` (RLS folder-owner).
 *  `brands.story_templates` is `text[]`. We now persist RELATIVE PATHS, not
 *  full URLs (signed URLs are minted on demand). Legacy rows that still hold
 *  full URLs (http://…) are kept as-is and used directly.
 *
 * Returned `templates` is a list of `{ path, url }` where `url` is a freshly
 * minted signed URL (1h TTL) for rendering. `path` is what's persisted.
 */
export interface StoryTemplate {
  path: string;
  url: string;
}

const isFullUrl = (s: string) => /^https?:\/\//i.test(s);

export const useStoryTemplates = () => {
  const { user } = useAuth();
  const { activeBrand, activeBrandId, reload: reloadBrand } = useActiveBrand();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState<StoryTemplate[]>([]);

  const stored: string[] = activeBrand?.story_templates || [];

  // Mint signed URLs whenever the underlying brand list changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const paths = stored.filter((s) => s && !isFullUrl(s));
      const urls = paths.length > 0 ? await mintUrls(BUCKET, paths) : [];
      if (cancelled) return;
      // Preserve original ordering, mixing legacy URLs and freshly signed ones
      let signedIdx = 0;
      const next = stored
        .filter((s) => !!s)
        .map((s) => {
          if (isFullUrl(s)) return { path: s, url: s };
          const url = urls[signedIdx++] || '';
          return { path: s, url };
        });
      setTemplates(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBrand?.id, JSON.stringify(stored)]);

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
      await persist([...stored, path]);
      toast({ title: 'Template salvato' });
      return path;
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
  }, [user, activeBrandId, stored, persist, toast]);

  const removeTemplate = useCallback(async (pathOrUrl: string) => {
    if (!user || !activeBrandId) return;
    setBusy(true);
    try {
      // For new entries `pathOrUrl` is a path; for legacy ones it could still
      // be a public URL. Strip the bucket marker to recover the path.
      let path = pathOrUrl;
      if (isFullUrl(path)) {
        const marker = `/${BUCKET}/`;
        const idx = path.indexOf(marker);
        if (idx >= 0) path = path.substring(idx + marker.length);
        else path = '';
      }
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]);
      }
      await persist(stored.filter(u => u !== pathOrUrl));
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
  }, [user, activeBrandId, stored, persist, toast]);

  return { templates, addTemplateFromFile, removeTemplate, busy };
};
