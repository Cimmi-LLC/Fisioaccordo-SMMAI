
import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { useContentCache } from "@/contexts/ContentCacheContext";
import { contentService } from "@/services/contentService";

interface FormData {
  description: string;
  audience: string;
  length: string;
  tone: string;
  platform: string;
  postType: string;
  numSlides: string;
  numImages: string;
}

export const useContentGeneration = (user: any, formData: FormData, generateCarouselSlides: () => void) => {
  const { toast } = useToast();
  const loadingState = useGlobalLoading();
  const { cacheContent, getCachedContent } = useContentCache();
  const [generatedContent, setGeneratedContent] = useState('');

  const generateContent = useCallback(async () => {
    if (!formData.description.trim()) {
      toast({
        title: "⚠️ Campo obbligatorio",
        description: "Inserisci una descrizione per generare il contenuto",
        variant: "destructive"
      });
      return;
    }

    // Controlla cache
    const cacheKey = `${formData.description}-${formData.platform}-${formData.tone}`;
    const cached = getCachedContent(cacheKey);
    
    if (cached) {
      setGeneratedContent(cached.content);
      toast({
        title: "⚡ Contenuto dalla cache!",
        description: "Contenuto caricato istantaneamente dalla cache"
      });
      return;
    }

    try {
      loadingState.startLoading('🚀 Generazione contenuto in corso...');
      
      // Simulazione di progress realistico
      loadingState.updateProgress(20, '🧠 Analisi del topic...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      loadingState.updateProgress(50, '✍️ Creazione copy viral...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      loadingState.updateProgress(80, '🎨 Generazione slide...');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockContent = `🚨 **${formData.description.toUpperCase()}** - LA VERITÀ CHE NESSUNO TI DICE!

💡 Se soffri di ${formData.description}, questo post può cambiarti la vita!

❌ ERRORE COMUNE: La maggior parte delle persone fa questo sbaglio...

Come fisioterapista con oltre 10 anni di esperienza, vedo ogni giorno persone che:
• Ignorano i primi segnali
• Usano rimedi temporanei
• Non affrontano la causa principale

🔥 ECCO LA SOLUZIONE che funziona davvero:

✅ 3 PASSI SCIENTIFICI:
1️⃣ Identificazione della causa principale
2️⃣ Protocollo personalizzato di esercizi
3️⃣ Mantenimento a lungo termine

🎯 RISULTATI GARANTITI in 7-14 giorni:
• Riduzione del dolore del 80%
• Movimento naturale e fluido
• Prevenzione di ricadute

💥 TESTIMONIANZA: "In 10 giorni ho risolto un problema che avevo da 2 anni!" - Maria, 45 anni

🚀 VUOI RISULTATI CONCRETI?

📞 Prenota una valutazione GRATUITA di 30 minuti
💬 Scrivici in DM "VALUTAZIONE"
🏢 ${user?.user_metadata?.clinic_name || 'Il tuo studio di fisioterapia'}

⏰ ATTENZIONE: Solo 5 posti disponibili questa settimana!

#fisioterapia #salute #benessere #${formData.description.replace(/\s+/g, '')}`;

      setGeneratedContent(mockContent);
      generateCarouselSlides();
      
      // Cache il contenuto
      cacheContent(cacheKey, mockContent, [], formData);
      
      loadingState.finishLoading(true, '🎉 Contenuto generato con successo!');
      
      toast({
        title: "🎉 Contenuto generato!",
        description: "Post ottimizzato per massimo engagement e conversioni"
      });

    } catch (error) {
      console.error('Errore durante la generazione:', error);
      loadingState.finishLoading(false, '❌ Errore durante la generazione');
      
      toast({
        title: "❌ Errore",
        description: "Errore durante la generazione del contenuto. Riprova.",
        variant: "destructive"
      });
    }
  }, [formData, toast, loadingState, getCachedContent, cacheContent, generateCarouselSlides, user]);

  const saveContent = async (carouselSlides: any[]) => {
    if (!generatedContent) return;

    try {
      loadingState.startLoading('💾 Salvataggio contenuto...');
      
      const { error } = await contentService.saveContent({
        title: formData.description,
        contentText: generatedContent,
        topic: formData.description,
        audience: formData.audience,
        platform: formData.platform,
        postType: formData.postType,
        tone: formData.tone,
        length: formData.length,
        images: carouselSlides.map(slide => slide.userImageUrl || slide.imageUrl || '')
      });

      if (error) {
        throw error;
      }

      loadingState.finishLoading(true, '✅ Contenuto salvato!');
      
      toast({
        title: "✅ Contenuto salvato!",
        description: "Il post è stato aggiunto ai tuoi contenuti salvati"
      });
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      loadingState.finishLoading(false, '❌ Errore salvataggio');
      
      toast({
        title: "❌ Errore",
        description: "Errore durante il salvataggio. Riprova.",
        variant: "destructive"
      });
    }
  };

  return {
    generatedContent,
    setGeneratedContent,
    generateContent,
    saveContent
  };
};
