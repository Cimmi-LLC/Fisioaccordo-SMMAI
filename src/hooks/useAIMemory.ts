import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface AIMemory {
  id: string;
  memory_type: string;
  content: string;
  context: string | null;
  importance: number;
  created_at: string;
  updated_at: string;
}

export const useAIMemory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMemories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_ai_memory')
        .select('*')
        .order('importance', { ascending: false });
      if (error) throw error;
      setMemories((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const addMemory = useCallback(async (memory_type: string, content: string, context?: string, importance: number = 5) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.from('user_ai_memory').insert({
        user_id: user.id, memory_type, content, context: context || null, importance
      } as any).select().single();
      if (error) throw error;
      setMemories(prev => [data as any, ...prev]);
      toast({ title: '🧠 Memoria salvata!' });
      return data as any as AIMemory;
    } catch (err: any) {
      toast({ title: '❌ Errore', description: err.message, variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  const deleteMemory = useCallback(async (id: string) => {
    await supabase.from('user_ai_memory').delete().eq('id', id as any);
    setMemories(prev => prev.filter(m => m.id !== id));
    toast({ title: '🗑️ Memoria eliminata' });
  }, [toast]);

  const updateMemory = useCallback(async (id: string, updates: Partial<Pick<AIMemory, 'content' | 'importance' | 'memory_type'>>) => {
    const { error } = await supabase.from('user_ai_memory').update(updates as any).eq('id', id as any);
    if (!error) {
      setMemories(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    }
  }, []);

  const addFeedback = useCallback(async (isPositive: boolean, comment: string, generatedContent: string) => {
    return addMemory(
      'feedback',
      `${isPositive ? '👍 POSITIVO' : '👎 NEGATIVO'}: ${comment}`,
      `Contenuto generato: ${generatedContent.substring(0, 200)}...`,
      isPositive ? 6 : 8
    );
  }, [addMemory]);

  const addCorrection = useCallback(async (original: string, corrected: string) => {
    return addMemory(
      'correction',
      `Correzione: "${original.substring(0, 100)}" → "${corrected.substring(0, 100)}"`,
      'Correzione manuale del copy generato',
      8
    );
  }, [addMemory]);

  return { memories, loading, addMemory, deleteMemory, updateMemory, addFeedback, addCorrection, refetch: fetchMemories };
};
