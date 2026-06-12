import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MetaConnection {
  id: string;
  instagram_username: string | null;
  instagram_business_id: string | null;
  page_name: string | null;
  is_active: boolean;
}

export interface SchedulePostInput {
  content: string;
  hashtags?: string;
  /** Storage paths inside `imageBucket` — NOT public URLs. */
  imagePaths: string[];
  imageBucket: string;
  connectionId: string;
  scheduledFor: Date;
}

export const useSchedulePost = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduling, setScheduling] = useState(false);
  const [connections, setConnections] = useState<MetaConnection[] | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(false);

  const loadConnections = useCallback(async () => {
    if (!user) return;
    setLoadingConnections(true);
    try {
      const { data, error } = await supabase
        .from('meta_connections')
        .select('id, instagram_username, instagram_business_id, page_name, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      setConnections((data as MetaConnection[]) || []);
    } catch (err) {
      console.error('Errore caricamento connessioni Meta:', err);
      setConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  }, [user]);

  const schedulePost = useCallback(async (input: SchedulePostInput): Promise<boolean> => {
    setScheduling(true);
    try {
      const { data, error } = await supabase.functions.invoke('schedule-post', {
        body: {
          content: input.content,
          hashtags: input.hashtags,
          image_paths: input.imagePaths,
          image_bucket: input.imageBucket,
          connection_id: input.connectionId,
          scheduled_for: input.scheduledFor.toISOString(),
        },
      });
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Errore programmazione');
      }
      toast({
        title: 'Post programmato!',
        description: `Sarà pubblicato il ${input.scheduledFor.toLocaleString('it-IT')}`,
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore';
      toast({ title: 'Errore programmazione', description: msg, variant: 'destructive' });
      return false;
    } finally {
      setScheduling(false);
    }
  }, [toast]);

  return { schedulePost, scheduling, connections, loadConnections, loadingConnections };
};
