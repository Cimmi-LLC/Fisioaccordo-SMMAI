// Professioni scritte a mano dall'utente quando la sua non e nella lista.
// Restano solo nel suo account (RLS su user_professions) e vengono riproposte
// nel selettore professione accanto a quelle predefinite.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserProfession = { id: string; label: string; created_at: string };

/** Pulisce l'etichetta: spazi doppi, lunghezza massima, prima lettera maiuscola. */
export function cleanProfessionLabel(raw: string): string {
  const s = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function useUserProfessions() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserProfession[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('user_professions')
        .select('id, label, created_at')
        .order('label', { ascending: true });
      if (!error) setItems((data as UserProfession[]) || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /**
   * Aggiunge la professione alla lista dell'utente e ne restituisce l'etichetta
   * salvata. Se esiste gia (stesse lettere, maiuscole a parte) riusa quella.
   */
  const add = useCallback(async (raw: string): Promise<string | null> => {
    const label = cleanProfessionLabel(raw);
    if (!user || label.length < 2) return null;
    const existing = items.find((p) => p.label.toLowerCase() === label.toLowerCase());
    if (existing) return existing.label;
    const { data, error } = await (supabase as any)
      .from('user_professions')
      .insert({ user_id: user.id, label })
      .select('id, label, created_at')
      .single();
    if (error) {
      // Doppione creato da un'altra scheda: ricarico e riuso quello.
      await load();
      return label;
    }
    setItems((prev) => [...prev, data as UserProfession].sort((a, b) => a.label.localeCompare(b.label)));
    return (data as UserProfession).label;
  }, [user, items, load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await (supabase as any).from('user_professions').delete().eq('id', id);
    if (error) return false;
    setItems((prev) => prev.filter((p) => p.id !== id));
    return true;
  }, []);

  return { items, loading, add, remove, reload: load };
}
