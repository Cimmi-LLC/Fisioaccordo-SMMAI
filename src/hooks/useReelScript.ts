import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import type { ReelScript } from '@/types/reel';

export const useReelScript = () => {
  const { toast } = useToast();
  const { activeBrandId } = useActiveBrand();
  const [script, setScript] = useState<ReelScript | null>(null);
  const [generating, setGenerating] = useState(false);

  const generateScript = useCallback(async (topic: string) => {
    if (!topic.trim()) {
      toast({ title: 'Inserisci un argomento', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setScript(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-reel-script', {
        body: { topic, brandId: activeBrandId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setScript(data as ReelScript);
      toast({ title: 'Script generato!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore';
      toast({ title: 'Errore', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [toast, activeBrandId]);

  const copyScript = useCallback(() => {
    if (!script) return;
    navigator.clipboard.writeText(script.script_completo);
    toast({ title: 'Script copiato!' });
  }, [script, toast]);

  const copyCaption = useCallback(() => {
    if (!script) return;
    const text = script.caption_instagram + '\n\n' + script.hashtag_suggeriti.map(h => '#' + h.replace('#', '')).join(' ');
    navigator.clipboard.writeText(text);
    toast({ title: 'Caption copiata!' });
  }, [script, toast]);

  return { script, generating, generateScript, copyScript, copyCaption };
};
