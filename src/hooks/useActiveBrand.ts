import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { BrandProfile } from '@/types/brand';

const LS_KEY = 'fisioaccordo:active_brand_id';

export const useActiveBrand = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [brandsRes, settingsRes] = await Promise.all([
        supabase.from('brands').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('user_settings').select('active_brand_id').eq('user_id', user.id).maybeSingle(),
      ]);

      const list = (brandsRes.data as BrandProfile[]) || [];
      setBrands(list);

      // Resolve active brand: server > localStorage > first brand
      const serverActive = (settingsRes.data as any)?.active_brand_id || null;
      const cached = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
      const candidate = serverActive || cached;
      const valid = candidate && list.some(b => b.id === candidate) ? candidate : list[0]?.id || null;
      setActiveBrandIdState(valid);
      if (typeof window !== 'undefined' && valid) localStorage.setItem(LS_KEY, valid);
    } catch (err) {
      // Un fetch fallito non deve lasciare l'app senza brand in silenzio:
      // lo stato precedente resta, il chiamante vede loading=false e puo
      // mostrare un fallback esplicito.
      console.error('useActiveBrand: caricamento brand fallito', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const setActiveBrand = useCallback(async (brandId: string) => {
    if (!user) return;
    setActiveBrandIdState(brandId);
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, brandId);
    try {
      await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, active_brand_id: brandId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select();
    } catch (err) {
      console.warn('Failed to persist active brand:', err);
    }
  }, [user]);

  const createBrand = useCallback(async (
    nome: string,
    extra?: Partial<BrandProfile>
  ): Promise<BrandProfile | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert({
          user_id: user.id,
          nome_business: nome,
          ...extra,
        })
        .select()
        .single();
      if (error) throw error;
      const created = data as BrandProfile;
      setBrands(prev => [...prev, created]);
      toast({ title: 'Brand creato!' });
      // Auto-activate the new brand
      if (created.id) await setActiveBrand(created.id);
      return created;
    } catch (err) {
      toast({
        title: 'Errore creazione brand',
        description: err instanceof Error ? err.message : 'Errore',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, setActiveBrand, toast]);

  const deleteBrand = useCallback(async (brandId: string) => {
    if (!user) return false;
    try {
      // .select() forces returning the deleted rows; if RLS blocks the delete,
      // we get 0 rows back without an explicit error.
      const { data: deleted, error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId)
        .select();
      if (error) throw error;
      if (!deleted || deleted.length === 0) {
        throw new Error('Permesso negato (RLS): nessuna riga eliminata');
      }
      const remaining = brands.filter(b => b.id !== brandId);
      setBrands(remaining);
      if (activeBrandId === brandId) {
        const next = remaining[0]?.id || null;
        setActiveBrandIdState(next);
        if (next) await setActiveBrand(next);
        else if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY);
      }
      toast({ title: 'Brand eliminato' });
      return true;
    } catch (err) {
      toast({
        title: 'Errore eliminazione',
        description: err instanceof Error ? err.message : 'Errore',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, brands, activeBrandId, setActiveBrand, toast]);

  const activeBrand = brands.find(b => b.id === activeBrandId) || null;

  return {
    brands,
    activeBrand,
    activeBrandId,
    loading,
    setActiveBrand,
    createBrand,
    deleteBrand,
    reload: loadAll,
  };
};
