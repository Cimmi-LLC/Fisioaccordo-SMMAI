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

  const analyzeCompetitor = useCallback(async (input: { username: string; platform: string; manualInfo?: string }) => {
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

  return { analyses, loading, analyzing, analyzeCompetitor, refetch: fetchAnalyses };
};
