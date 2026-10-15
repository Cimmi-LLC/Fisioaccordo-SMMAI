import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface CompetitorAnalysisResult {
  id: string;
  competitor_name: string;
  competitor_url: string | null;
  platform: string;
  analysis_data: any;
  analysis_text: string | null;
  score: number;
  created_at: string;
}

export const useCompetitorAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<CompetitorAnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('competitor_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error) setAnalyses((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching competitor analyses:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const analyzeCompetitor = useCallback(async (input: { username: string; platform: string; manualInfo?: string; brandId?: string | null }) => {
    if (!user) return null;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-competitors', { body: input });
      if (error) {
        console.error('Competitor analysis invoke error:', error);
        throw new Error(error.message || 'Errore nella chiamata. Riprova.');
      }
      if (data?.error) throw new Error(data.error);

      // Save to database (non-blocking — don't fail if table doesn't exist yet)
      try {
        const { data: saved, error: saveErr } = await supabase.from('competitor_analysis').insert({
          user_id: user.id,
          competitor_name: data.competitor_name || input.username,
          competitor_url: input.username ? `https://instagram.com/${input.username.replace('@', '')}` : null,
          platform: input.platform,
          analysis_data: data,
          analysis_text: data.summary || '',
          score: data.overall_score || 0,
        } as any).select().single();

        if (!saveErr && saved) {
          setAnalyses(prev => [saved as any, ...prev]);
          // Id della riga: serve alla UI per modificare o eliminare subito il risultato.
          (data as any)._rowId = (saved as any).id;
        }
      } catch (dbErr) {
        console.warn('Could not save competitor analysis:', dbErr);
      }

      toast({ title: 'Analisi completata!', description: `Score competitor: ${data.overall_score}/100` });
      return data;
    } catch (err: any) {
      toast({ title: 'Errore analisi', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [user, toast]);

  /** Elimina un'analisi dallo storico (RLS: solo le proprie). */
  const deleteAnalysis = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await (supabase as any).from('competitor_analysis').delete().eq('id', id);
    if (error) {
      toast({ title: 'Non riesco a eliminarla', description: error.message, variant: 'destructive' });
      return false;
    }
    setAnalyses(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Analisi eliminata' });
    return true;
  }, [toast]);

  /**
   * Modifica nome e sintesi di un'analisi. La sintesi vive sia in
   * analysis_text sia dentro analysis_data.summary: aggiorno entrambe e
   * rileggo la riga, cosi la modifica e verificata e non solo a schermo.
   */
  const updateAnalysis = useCallback(async (
    id: string,
    patch: { competitor_name?: string; summary?: string }
  ): Promise<CompetitorAnalysisResult | null> => {
    const current = analyses.find(a => a.id === id);
    if (!current) return null;
    const name = patch.competitor_name !== undefined ? patch.competitor_name.trim() : current.competitor_name;
    const summary = patch.summary !== undefined ? patch.summary.trim() : (current.analysis_text || '');
    const analysis_data = { ...(current.analysis_data || {}), competitor_name: name, summary };
    const { data, error } = await (supabase as any)
      .from('competitor_analysis')
      .update({ competitor_name: name, analysis_text: summary, analysis_data })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) {
      toast({ title: 'Modifica non salvata', description: error?.message || 'Riprova.', variant: 'destructive' });
      return null;
    }
    setAnalyses(prev => prev.map(a => (a.id === id ? (data as any) : a)));
    toast({ title: 'Analisi aggiornata' });
    return data as CompetitorAnalysisResult;
  }, [analyses, toast]);

  return { analyses, loading, analyzing, analyzeCompetitor, deleteAnalysis, updateAnalysis, refetch: fetchAnalyses };
};
