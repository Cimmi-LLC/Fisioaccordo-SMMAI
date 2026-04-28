import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { HistoryEntry, GenerationType } from '@/types/history';

export interface HistoryFilters {
  type?: GenerationType | 'all';
  brandId?: string | 'all';
  search?: string;
}

export const useGenerationHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<HistoryFilters>({ type: 'all', brandId: 'all', search: '' });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('generation_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setEntries((data as HistoryEntry[]) || []);
    } catch (err) {
      toast({
        title: 'Errore storico',
        description: err instanceof Error ? err.message : 'Errore',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { load(); }, [load]);

  const remove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('generation_history').delete().eq('id', id);
      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Voce eliminata' });
    } catch (err) {
      toast({
        title: 'Errore',
        description: err instanceof Error ? err.message : 'Errore',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const filtered = entries.filter(e => {
    if (filters.type && filters.type !== 'all' && e.generation_type !== filters.type) return false;
    if (filters.brandId && filters.brandId !== 'all' && e.brand_id !== filters.brandId) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${e.title || ''} ${e.topic || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return {
    entries: filtered,
    rawEntries: entries,
    loading,
    filters,
    setFilters,
    reload: load,
    remove,
  };
};
