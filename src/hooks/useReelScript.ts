import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import type { ReelScript } from '@/types/reel';

export const useReelScript = () => {
  const { toast } = useToast();
  const { activeBrandId } = useActiveBrand();
  const [scripts, setScripts] = useState<ReelScript[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const generateScripts = useCallback(async (topic: string, qty: number = 1) => {
    if (!topic.trim()) {
      toast({ title: 'Inserisci un argomento', variant: 'destructive' });
      return;
    }
    const count = Math.max(1, Math.min(10, qty));
    setGenerating(true);
    setScripts([]);
    setProgress({ done: 0, total: count });
    try {
      // Fire N parallel calls. If user asked for >1, we add a small variation
      // hint so Gemini doesn't return identical scripts.
      const promises = Array.from({ length: count }, (_, i) => {
        const variationHint = count > 1
          ? `\n\nGenera la variazione #${i + 1} di ${count}: cambia angle/hook/struttura rispetto alle altre.`
          : '';
        return supabase.functions.invoke('generate-reel-script', {
          body: { topic: topic + variationHint, brandId: activeBrandId },
        }).then(({ data, error }) => {
          setProgress(p => ({ ...p, done: p.done + 1 }));
          if (error) throw new Error(error.message);
          if (data?.error) throw new Error(data.error);
          return data as ReelScript;
        });
      });
      const results = await Promise.allSettled(promises);
      const succeeded = results
        .filter((r): r is PromiseFulfilledResult<ReelScript> => r.status === 'fulfilled')
        .map(r => r.value);
      if (succeeded.length === 0) throw new Error('Nessuno script generato');
      setScripts(succeeded);
      toast({
        title: succeeded.length === 1 ? 'Script generato!' : `${succeeded.length} script generati!`,
        description: succeeded.length < count ? `${count - succeeded.length} falliti, riprova per più varietà` : undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore';
      toast({ title: 'Errore', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [toast, activeBrandId]);

  // Backwards-compat alias (single script)
  const generateScript = useCallback(async (topic: string) => {
    await generateScripts(topic, 1);
  }, [generateScripts]);

  const copyScript = useCallback((index: number = 0) => {
    const s = scripts[index];
    if (!s) return;
    navigator.clipboard.writeText(s.script_completo);
    toast({ title: 'Script copiato!' });
  }, [scripts, toast]);

  const copyCaption = useCallback((index: number = 0) => {
    const s = scripts[index];
    if (!s) return;
    const text = s.caption_instagram + '\n\n' + s.hashtag_suggeriti.map(h => '#' + h.replace('#', '')).join(' ');
    navigator.clipboard.writeText(text);
    toast({ title: 'Caption copiata!' });
  }, [scripts, toast]);

  return {
    scripts,
    script: scripts[0] || null,  // backwards-compat
    generating,
    progress,
    generateScript,
    generateScripts,
    copyScript,
    copyCaption,
  };
};
