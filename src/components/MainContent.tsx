import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { useContentCache } from "@/contexts/ContentCacheContext";
import { contentService } from "@/services/contentService";
import IdeaGenerator from "./IdeaGenerator";
import ContentForm from "./ContentForm";
import PreviewSection from "./PreviewSection";
import HookGenerator from "./HookGenerator";
import LazyCopyImprover from "./LazyCopyImprover";
import SkeletonLoader from "./ui/skeleton-loader";
import EnhancedProgress from "./ui/enhanced-progress";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface MainContentProps {
  user: any;
  showCopyImprover: boolean;
  onCopyImproved: (improvedCopy: string) => void;
}

const MainContent: React.FC<MainContentProps> = React.memo(({ user, showCopyImprover, onCopyImproved }) => {
  const { toast } = useToast();
  const loadingState = useGlobalLoading();
  const { cacheContent, getCachedContent } = useContentCache();
  
  const [ideaInput, setIdeaInput] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    audience: '',
    length: 'medio',
    tone: 'professionale',
    platform: 'instagram',
    postType: 'carosello',
    numSlides: '5',
    numImages: '1'
  });
  
  const [generatedContent, setGeneratedContent] = useState('');
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showHookGenerator, setShowHookGenerator] = useState(false);
  const [hookTopic, setHookTopic] = useState('');
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [appliedHook, setAppliedHook] = useState<string>('');
  const [basePhoto, setBasePhoto] = useState<string | null>(null);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleIdeaGenerated = useCallback((idea: string) => {
    setFormData(prev => ({ ...prev, description: idea }));
  }, []);

  const getRelevantImages = useMemo(() => {
    return (topic: string) => {
      const topicLower = topic.toLowerCase();
      
      const imageCategories = {
        'mal di schiena': [
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center'
        ],
        'postura': [
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center'
        ],
        'esercizi': [
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center'
        ],
        'riabilitazione': [
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center'
        ]
      };

      for (const [category, images] of Object.entries(imageCategories)) {
        if (topicLower.includes(category)) {
          return images;
        }
      }

      return imageCategories['mal di schiena'];
    };
  }, []);

  const generateCarouselSlides = useCallback(() => {
    const numSlides = parseInt(formData.numSlides);
    const slides: CarouselSlide[] = [];
    const topic = formData.description;
    
    const relevantImages = getRelevantImages(topic);
    
    const slideContents = [
      `🚨 ${topic.toUpperCase()}\n\nSCOPRI LA VERITÀ che i dottori non ti dicono!\n\n👉 Swipe per la soluzione →`,
      `❌ ERRORE #1\n\nLa maggior parte delle persone fa questo sbaglio con ${topic}...\n\n💡 Ecco cosa dovresti fare invece:`,
      `✅ LA SOLUZIONE\n\n3 passi scientifici per risolvere ${topic}:\n\n1️⃣ [Primo step]\n2️⃣ [Secondo step]\n3️⃣ [Terzo step]`,
      `🔥 RISULTATI GARANTITI\n\nCosa succede quando applichi questo metodo:\n\n• Miglioramento in 7 giorni\n• Dolore ridotto del 80%\n• Movimento naturale`,
      `🎯 CALL TO ACTION\n\nVuoi risultati concreti?\n\n📞 Prenota consulenza GRATUITA\n💬 Scrivici in DM\n🏢 ${user?.user_metadata?.clinic_name || 'Il tuo studio'}\n\n#fisioterapia #salute`
    ];
    
    for (let i = 0; i < numSlides; i++) {
      slides.push({
        type: i === 0 ? 'cover' : 'content',
        content: slideContents[i] || `Slide ${i + 1}: ${topic}`,
        imageUrl: relevantImages[i % relevantImages.length],
        userImageUrl: basePhoto && i === 0 ? basePhoto : undefined
      });
    }
    
    setCarouselSlides(slides);
  }, [formData.numSlides, formData.description, getRelevantImages, user, basePhoto]);

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
      setCarouselSlides(cached.carouselSlides);
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
      const slidesForCache = carouselSlides.length > 0 ? carouselSlides : [];
      cacheContent(cacheKey, mockContent, slidesForCache, formData);
      
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
  }, [formData, toast, loadingState, getCachedContent, cacheContent, generateCarouselSlides, user, carouselSlides]);

  const saveContent = async () => {
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

  const handleImageEdit = (imageUrl: string, slideIndex: number) => {
    setSelectedImageForEdit(imageUrl);
    setEditingSlideIndex(slideIndex);
  };

  const handleImageUpdate = (newUrl: string) => {
    if (editingSlideIndex !== null) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[editingSlideIndex].userImageUrl = newUrl;
      setCarouselSlides(updatedSlides);
    }
    setSelectedImageForEdit(null);
    setEditingSlideIndex(null);
  };

  const applyHookToContent = (hook: string) => {
    if (carouselSlides.length > 0) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[0].content = `${hook}\n\n👉 Swipe per scoprire di più →`;
      setCarouselSlides(updatedSlides);
    }
    
    setGeneratedContent(prev => {
      const lines = prev.split('\n');
      lines[0] = hook;
      return lines.join('\n');
    });
    
    setAppliedHook(hook);
    toast({
      title: "Hook applicato! 🎯",
      description: "L'hook è stato inserito nella prima slide e nel contenuto"
    });
  };

  const removeHook = () => {
    if (carouselSlides.length > 0) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[0].content = `🚨 ${formData.description.toUpperCase()}\n\nSCOPRI LA VERITÀ che i dottori non ti dicono!\n\n👉 Swipe per la soluzione →`;
      setCarouselSlides(updatedSlides);
    }
    
    setGeneratedContent(prev => {
      const lines = prev.split('\n');
      lines.shift();
      return lines.join('\n');
    });
    
    setAppliedHook('');
    toast({
      title: "Hook rimosso",
      description: "L'hook è stato rimosso dal contenuto e dalla prima slide"
    });
  };

  const handlePhotoUpload = (photo: string) => {
    setBasePhoto(photo);
  };

  const handlePhotoRemove = () => {
    setBasePhoto(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-4">
          Generatore di Post Social ✨
        </h2>
        <p className="text-lg sm:text-xl text-gray-300 px-4">
          Crea contenuti coinvolgenti per i tuoi social media con l'intelligenza artificiale
        </p>
      </div>

      {/* Progress indicator quando in loading */}
      {loadingState.isLoading && (
        <div className="mb-6">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
              <EnhancedProgress
                value={loadingState.progress}
                status={loadingState.status}
                message={loadingState.message}
                size="md"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {showCopyImprover && (
        <div className="mb-6 sm:mb-8">
          <LazyCopyImprover onCopyImproved={onCopyImproved} />
        </div>
      )}

      <div className="mb-6 sm:mb-8">
        <IdeaGenerator
          ideaInput={ideaInput}
          setIdeaInput={setIdeaInput}
          onIdeaGenerated={handleIdeaGenerated}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        <div>
          {loadingState.isLoading ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Configurazione Post</CardTitle>
              </CardHeader>
              <CardContent>
                <SkeletonLoader type="form" />
              </CardContent>
            </Card>
          ) : (
            <ContentForm
              formData={formData}
              onInputChange={handleInputChange}
              isGenerating={loadingState.isLoading}
              onGenerate={generateContent}
              basePhoto={basePhoto}
              onPhotoUpload={setBasePhoto}
              onPhotoRemove={() => setBasePhoto(null)}
            />
          )}
        </div>

        <div>
          {loadingState.isLoading && !generatedContent ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Anteprima Contenuto</CardTitle>
              </CardHeader>
              <CardContent>
                <SkeletonLoader type="content" />
                <div className="mt-6">
                  <SkeletonLoader type="carousel" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <PreviewSection
              generatedContent={generatedContent}
              carouselSlides={carouselSlides}
              setCarouselSlides={setCarouselSlides}
              appliedHook={appliedHook}
              onRemoveHook={() => setAppliedHook('')}
              onImageEdit={handleImageEdit}
              onSaveContent={saveContent}
            />
          )}
        </div>
      </div>

      <HookGenerator
        showHookGenerator={showHookGenerator}
        setShowHookGenerator={setShowHookGenerator}
        hookTopic={hookTopic}
        setHookTopic={setHookTopic}
        generatedHooks={generatedHooks}
        setGeneratedHooks={setGeneratedHooks}
        onApplyHook={(hook) => setAppliedHook(hook)}
      />
    </div>
  );
});

MainContent.displayName = 'MainContent';

export default MainContent;
