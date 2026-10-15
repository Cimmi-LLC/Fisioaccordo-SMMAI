import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ViralAnalysisResult {
  id: string;
  post_url: string | null;
  platform: string;
  post_type: string;
  patterns: any;
  engagement_data: any;
  analysis_text: string | null;
  created_at: string;
}

export const useViralAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<ViralAnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('viral_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setAnalyses((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching analyses:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const analyzePost = useCallback(async (input: { url?: string; text?: string; video_path?: string; video_mime_type?: string; platform: string; postType: string }) => {
    if (!user) return null;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-viral-post', { body: input });
      if (error) throw error;
      if (data?.requires_text) {
        throw new Error("Instagram/TikTok bloccano la lettura automatica. Incolla la caption del post nel campo di testo per analizzarlo.");
      }
      if (data?.error) throw new Error(data.error);

      const { data: saved, error: saveErr } = await supabase.from('viral_analysis').insert({
        user_id: user.id,
        post_url: input.url || null,
        platform: input.platform,
        post_type: input.postType,
        patterns: data.patterns || {},
        engagement_data: {
          ...(data.engagement_data || {}),
          score: data.score,
          analysis: data.analysis,
          visual_analysis: data.visual_analysis,
          audio_analysis: data.audio_analysis,
          takeaways: data.takeaways,
        },
        analysis_text: data.analysis || ''
      } as any).select().single();

      if (!saveErr && saved) {
        setAnalyses(prev => [saved as any, ...prev]);
        (data as any)._rowId = (saved as any).id;
      }

      toast({ title: '🔍 Analisi completata!', description: `Score viralità: ${data.score}/100` });
      return data;
    } catch (err: any) {
      toast({ title: '❌ Errore analisi', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [user, toast]);

  /** Elimina un'analisi dallo storico (RLS: solo le proprie). */
  const deleteAnalysis = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('viral_analysis').delete().eq('id', id);
    if (error) {
      toast({ title: 'Non riesco a eliminarla', description: error.message, variant: 'destructive' });
      return false;
    }
    setAnalyses(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Analisi eliminata' });
    return true;
  }, [toast]);

  /** Modifica il testo dell'analisi; rilegge la riga per confermare il salvataggio. */
  const updateAnalysis = useCallback(async (id: string, analysis: string): Promise<ViralAnalysisResult | null> => {
    const current = analyses.find(a => a.id === id);
    if (!current) return null;
    const text = analysis.trim();
    const engagement_data = { ...((current as any).engagement_data || {}), analysis: text };
    const { data, error } = await (supabase as any)
      .from('viral_analysis')
      .update({ analysis_text: text, engagement_data })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) {
      toast({ title: 'Modifica non salvata', description: error?.message || 'Riprova.', variant: 'destructive' });
      return null;
    }
    setAnalyses(prev => prev.map(a => (a.id === id ? (data as any) : a)));
    toast({ title: 'Analisi aggiornata' });
    return data as ViralAnalysisResult;
  }, [analyses, toast]);

  return { analyses, loading, analyzing, analyzePost, deleteAnalysis, updateAnalysis, refetch: fetchAnalyses };
};
