import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIHook {
  text: string;
  style: string;
  virality_score: number;
  reasoning: string;
}

interface GenerateHooksParams {
  topic: string;
  audience?: string;
  tone?: string;
  platform?: string;
}

export const useAIHookGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHooks, setGeneratedHooks] = useState<AIHook[]>([]);
  const { toast } = useToast();

  const generateHooks = async (params: GenerateHooksParams) => {
    if (!params.topic?.trim()) {
      toast({
        title: "Campo obbligatorio",
        description: "Inserisci un argomento per generare gli hook",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-hooks', {
        body: params
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        // Handle rate limit or payment errors
        if (data.error.includes('Rate limit')) {
          toast({
            title: "Troppi tentativi",
            description: "Riprova tra qualche minuto",
            variant: "destructive"
          });
        } else if (data.error.includes('Payment required')) {
          toast({
            title: "Crediti esauriti",
            description: "Aggiungi crediti al tuo workspace Lovable",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Errore",
            description: data.error,
            variant: "destructive"
          });
        }
        
        // Use fallback hooks if available
        if (data.fallback_hooks) {
          setGeneratedHooks(data.fallback_hooks);
          toast({
            title: "Hook di fallback caricati",
            description: "Usa questi hook mentre risolviamo il problema",
          });
        }
        return;
      }

      if (data?.hooks && Array.isArray(data.hooks)) {
        setGeneratedHooks(data.hooks);
        toast({
          title: "Hook generati con successo! 🚀",
          description: `${data.hooks.length} hook pronti all'uso, ordinati per virality score`,
        });
      }

    } catch (error) {
      console.error('Error generating hooks:', error);
      toast({
        title: "Errore durante la generazione",
        description: "Riprova tra qualche istante",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateHooks,
    generatedHooks,
    setGeneratedHooks,
    isGenerating
  };
};
