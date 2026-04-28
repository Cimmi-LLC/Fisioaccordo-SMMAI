import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface TrendingTopic {
  id: string;
  topic: string;
  category: string;
  trend_score: number;
  source: string | null;
  suggested_content: string | null;
  expires_at: string;
  created_at: string;
}

export const useTrends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const fetchTrends = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trending_topics')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('trend_score', { ascending: false });
      if (error) throw error;
      setTrends((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching trends:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  const findTrends = useCallback(async (niche: string, platform: string, append = false) => {
    if (!user) return null;
    setSearching(true);
    try {
      const excludeTopics = append ? trends.map(t => t.topic) : [];

      const { data, error } = await supabase.functions.invoke('find-trends', {
        body: { niche, platform, count: 10, excludeTopics }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newTrends = data.trends || [];

      // Save to DB (non-blocking)
      for (const trend of newTrends) {
        try {
          await supabase.from('trending_topics').insert({
            user_id: user.id,
            topic: trend.topic,
            category: niche,
            trend_score: trend.trend_score,
            source: trend.why_trending,
            suggested_content: trend.content_idea
          } as any);
        } catch {}
      }

      const enrichedTrends = newTrends.map((t: any) => ({
        id: Math.random().toString(36).slice(2),
        topic: t.topic,
        category: niche,
        trend_score: t.trend_score,
        source: t.why_trending,
        suggested_content: t.content_idea,
        suggested_format: t.suggested_format,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
      }));

      if (append) {
        setTrends(prev => [...prev, ...enrichedTrends]);
      } else {
        setTrends(enrichedTrends);
      }

      toast({ title: 'Trend trovati!', description: `${newTrends.length} trend per ${niche}` });
      return newTrends;
    } catch (err: any) {
      toast({ title: '❌ Errore', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setSearching(false);
    }
  }, [user, toast, fetchTrends]);

  return { trends, loading, searching, findTrends, refetch: fetchTrends };
};
