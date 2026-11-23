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

  const generateScripts = useCallback(async (topic: string, qty: number = 1, durata: 30 | 45 | 60 = 45) => {
    if (!topic.trim()) {
      toast({ title: 'Inserisci un argomento', variant: 'destructive' });
      return;
    }
    const count = Math.max(1, Math.min(10, qty));
    setGenerating(true);
    setScripts([]);
    setProgress({ done: 0, total: count });
    try {
      // N chiamate in parallelo: ognuna sa il suo numero e il server le dà
      // un tipo di gancio diverso (lista, errore, esperienza, curiosità…).
      // Prima il numero finiva dentro il tema e ogni script usciva uguale.
      const promises = Array.from({ length: count }, (_, i) => {
        return supabase.functions.invoke('generate-reel-script', {
          body: { topic: topic.trim(), brandId: activeBrandId, durata, variante: i, totale: count },
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
    // Copione da registrare: parlato e, sotto ogni pezzo, il testo a schermo.
    const testo = (s.sezioni || []).some(x => x.testo_a_schermo)
      ? s.sezioni.map(x => `${x.testo}${x.testo_a_schermo ? `\n[A SCHERMO: ${x.testo_a_schermo}]` : ''}`).join('\n\n')
      : s.script_completo;
    navigator.clipboard.writeText(testo);
    toast({ title: 'Script copiato!' });
  }, [scripts, toast]);

  const copyCaption = useCallback((index: number = 0) => {
    const s = scripts[index];
    if (!s) return;
    const text = s.caption_instagram + '\n\n' + s.hashtag_suggeriti.map(h => '#' + h.replace(/^#+/, '').toLowerCase()).join(' ');
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
