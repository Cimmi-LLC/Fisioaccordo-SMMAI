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

  const analyzePost = useCallback(async (input: { url?: string; text?: string; platform: string; postType: string }) => {
    if (!user) return null;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-viral-post', { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { data: saved, error: saveErr } = await supabase.from('viral_analysis').insert({
        user_id: user.id,
        post_url: input.url || null,
        platform: input.platform,
        post_type: input.postType,
        patterns: data.patterns || {},
        engagement_data: data.engagement_data || {},
        analysis_text: data.analysis || ''
      } as any).select().single();

      if (!saveErr && saved) {
        setAnalyses(prev => [saved as any, ...prev]);
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

  return { analyses, loading, analyzing, analyzePost, refetch: fetchAnalyses };
};
