import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useToast } from '@/hooks/use-toast';
import type { StoryBatch, StoryBatchSource } from '@/types/storyBatch';

export const useStoryBatches = () => {
  const { user } = useAuth();
  const { activeBrandId } = useActiveBrand();
  const { toast } = useToast();
  const [batches, setBatches] = useState<StoryBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Show only the current active brand's batches
      let q = supabase
        .from('generated_story_batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60);
      if (activeBrandId) q = q.eq('brand_id', activeBrandId);
      const { data, error } = await q;
      if (error) throw error;
      setBatches((data as StoryBatch[]) || []);
    } catch (err) {
      console.error('useStoryBatches load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeBrandId]);

  useEffect(() => { load(); }, [load]);

  const saveBatch = useCallback(async (
    sourceType: StoryBatchSource,
    sourceMeta: Record<string, unknown>,
    stories: any[]
  ): Promise<StoryBatch | null> => {
    if (!user || !stories || stories.length === 0) return null;
    try {
      const { data, error } = await supabase
        .from('generated_story_batches')
        .insert({
          user_id: user.id,
          brand_id: activeBrandId || null,
          source_type: sourceType,
          source_meta: sourceMeta,
          stories,
          story_count: stories.length,
        })
        .select()
        .single();
      if (error) throw error;
      const created = data as StoryBatch;
      setBatches(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.warn('useStoryBatches save failed (non-blocking):', err);
      return null;
    }
  }, [user, activeBrandId]);

  const deleteBatch = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('generated_story_batches').delete().eq('id', id);
      if (error) throw error;
      setBatches(prev => prev.filter(b => b.id !== id));
      toast({ title: 'Batch eliminato' });
    } catch (err) {
      toast({
        title: 'Errore eliminazione',
        description: err instanceof Error ? err.message : 'Errore',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return { batches, loading, saveBatch, deleteBatch, reload: load };
};
