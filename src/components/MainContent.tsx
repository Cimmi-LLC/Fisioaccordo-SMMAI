import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { useToast } from "@/hooks/use-toast";
import IdeaGenerator from "./IdeaGenerator";
import ContentForm from "./ContentForm";
import PreviewSection from "./PreviewSection";
import HookGenerator from "./HookGenerator";
import LazyCopyImprover from "./LazyCopyImprover";
import ViralFormatGenerator from "./ViralFormatGenerator";
import MetaConnection from "./MetaConnection";
import PhotoLibrary from "./PhotoLibrary";
import AIMemoryPanel from "./AIMemoryPanel";
import ViralAnalyzer from "./ViralAnalyzer";
import TrendExplorer from "./TrendExplorer";
import FeedbackWidget from "./FeedbackWidget";
import SkeletonLoader from "./ui/skeleton-loader";
import EnhancedProgress from "./ui/enhanced-progress";
import { useContentGeneration } from "@/hooks/useContentGeneration";
import { useCarouselSlides } from "@/hooks/useCarouselSlides";
import { useHookManager } from "@/hooks/useHookManager";
import { useImageManager } from "@/hooks/useImageManager";
import { usePhotoManager } from "@/hooks/usePhotoManager";
import { MetaService } from '@/services/metaService';

interface MainContentProps {
  user: any;
  showCopyImprover: boolean;
  onCopyImproved: (improvedCopy: string) => void;
}

const MainContent: React.FC<MainContentProps> = React.memo(({ user, showCopyImprover, onCopyImproved }) => {
  const loadingState = useGlobalLoading();
  const { toast } = useToast();
  
  const [ideaInput, setIdeaInput] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    audience: '',
    length: 'medio',
    tone: 'professionale',
    platform: 'instagram',
    postType: 'carosello',
    numSlides: '5',
    numImages: '1',
    visualTemplate: 'default',
    canvaTemplate: null as any,
    selectedPlatforms: ['instagram'] as string[],
    scheduleDate: '',
  });
  
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showHookGenerator, setShowHookGenerator] = useState(false);
  const [hookTopic, setHookTopic] = useState('');
  const [appliedHook, setAppliedHook] = useState<string>('');
  const [basePhoto, setBasePhoto] = useState<string | null>(null);
  const [showViralGenerator, setShowViralGenerator] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const { carouselSlides, setCarouselSlides, generateCarouselSlides, isGeneratingImages, regenerateImages, imageGenProgress } = useCarouselSlides(formData, user, basePhoto);
  const { generatedContent, setGeneratedContent, generateContent, saveContent } = useContentGeneration(user, formData, generateCarouselSlides);

  const hookManager = useHookManager({ carouselSlides, setCarouselSlides, generatedContent, setGeneratedContent, appliedHook, setAppliedHook, formData });
  const imageManager = useImageManager({ carouselSlides, setCarouselSlides, selectedImageForEdit, setSelectedImageForEdit, editingSlideIndex, setEditingSlideIndex });
  const photoManager = usePhotoManager({ basePhoto, setBasePhoto });

  const handleInputChange = useCallback((field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleIdeaGenerated = useCallback((idea: string) => {
    setFormData(prev => ({ ...prev, description: idea }));
  }, []);

  const handleSaveContent = () => saveContent(carouselSlides);

  const handleViralContentGenerated = (content: string) => {
    setGeneratedContent(content);
    setShowViralGenerator(false);
  };

  const handleUseTrend = (topic: string) => {
    setFormData(prev => ({ ...prev, description: topic }));
    toast({ title: '🔥 Trend selezionato!', description: `"${topic}" inserito nel form. Genera il post!` });
  };

  const handlePublish = async (platforms: string[]) => {
    if (!generatedContent) {
      toast({ title: "❌ Errore", description: "Genera prima il contenuto prima di pubblicare", variant: "destructive" });
      return;
    }
    if (isGeneratingImages) {
      toast({ title: "⏳ Attendi", description: "Le immagini sono ancora in fase di creazione. Riprova tra qualche secondo." });
      return;
    }

    loadingState.startLoading('Preparazione pubblicazione...');
    loadingState.updateProgress(10, 'Verifica connessione...');

    try {
      const isMetaConnected = await MetaService.isConnected();
      if (!isMetaConnected) {
        toast({ title: "📋 Usa Smart Copy", description: "Copia il testo e scarica le immagini dall'anteprima per pubblicare manualmente." });
        loadingState.finishLoading(false, 'Nessuna connessione attiva');
        return;
      }

      loadingState.updateProgress(20, 'Recupero connessione...');
      const connections = await MetaService.getConnections();
      const connection = connections[0];
      if (!connection) {
        loadingState.finishLoading(false, 'Nessuna connessione valida trovata');
        throw new Error('Nessuna connessione attiva o token scaduto. Riconnetti Instagram.');
      }

      loadingState.updateProgress(30, 'Preparazione contenuto...');

      const imageUrl = basePhoto
        || carouselSlides.find(s => s.userImageUrl)?.userImageUrl
        || carouselSlides.find(s => s.imageUrl)?.imageUrl
        || undefined;

      let publishedCount = 0;
      const errors: string[] = [];

      for (const platform of platforms) {
        loadingState.updateProgress(50, `Pubblicazione su ${platform}...`);

        if (platform === 'facebook') {
          const result = await MetaService.publishToFacebook(connection.id, generatedContent, imageUrl);
          if (result.success) { publishedCount++; } else { errors.push(`Facebook: ${result.error}`); }
        } else if (platform === 'instagram') {
          if (!imageUrl) {
            errors.push("Generazione immagine fallita. Carica una foto manualmente o riprova a generare il contenuto.");
            continue;
          }
          const carouselUrls = carouselSlides
            .map(s => s.userImageUrl || s.imageUrl)
            .filter((url): url is string => !!url);
          
          const result = await MetaService.publishToInstagram(
            connection.id, generatedContent, imageUrl,
            carouselUrls.length > 1 ? carouselUrls : undefined
          );
          if (result.success) { publishedCount++; } else { errors.push(`Instagram: ${result.error}`); }
        }
      }

      loadingState.updateProgress(90, 'Finalizzazione...');

      if (publishedCount > 0) {
        toast({ title: "🎉 Pubblicato!", description: `Contenuto pubblicato su ${publishedCount} piattaform${publishedCount > 1 ? 'e' : 'a'}` });
        loadingState.finishLoading(true, 'Pubblicazione completata!');
      } else if (errors.length > 0) {
        toast({ title: "❌ Pubblicazione fallita", description: errors.join(' | '), variant: "destructive" });
        loadingState.finishLoading(false, errors.join(' | '));
      }
    } catch (error) {
      toast({ title: "❌ Errore di pubblicazione", description: error instanceof Error ? error.message : 'Errore sconosciuto', variant: "destructive" });
      loadingState.finishLoading(false, error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
      <div className="text-center mb-6 sm:mb-8 space-y-2">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground mb-2 sm:mb-4 leading-tight">
          <span className="gradient-text">Social Post Generator</span> ✨
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground px-4 max-w-2xl mx-auto">
          Crea contenuti coinvolgenti per i tuoi social media con l'intelligenza artificiale
        </p>
      </div>

      {loadingState.isLoading && (
        <div className="mb-6 animate-fade-in">
          <Card><CardContent className="p-6">
            <EnhancedProgress value={loadingState.progress} status={loadingState.status} message={loadingState.message} size="md" />
          </CardContent></Card>
        </div>
      )}

      {showCopyImprover && (
        <div className="mb-6 sm:mb-8"><LazyCopyImprover onCopyImproved={onCopyImproved} /></div>
      )}

      {showViralGenerator && (
        <div className="mb-6 sm:mb-8">
          <ViralFormatGenerator topic={formData.description} audience={formData.audience} user={user} onContentGenerated={handleViralContentGenerated} />
        </div>
      )}

      <Tabs defaultValue="genera" className="mb-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="genera">✍️ Genera</TabsTrigger>
          <TabsTrigger value="foto">📸 Foto</TabsTrigger>
          <TabsTrigger value="memoria">🧠 AI Memory</TabsTrigger>
          <TabsTrigger value="virale">🔍 Virale</TabsTrigger>
          <TabsTrigger value="trend">🔥 Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="genera" className="mt-4">
          <div className="mb-6">
            <IdeaGenerator ideaInput={ideaInput} setIdeaInput={setIdeaInput} onIdeaGenerated={handleIdeaGenerated} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-4">
              {loadingState.isLoading ? (
                <Card><CardHeader><CardTitle>Configurazione Post</CardTitle></CardHeader><CardContent><SkeletonLoader type="form" /></CardContent></Card>
              ) : (
                <>
                  <ContentForm
                    formData={formData}
                    onInputChange={handleInputChange}
                    isGenerating={loadingState.isLoading}
                    onGenerate={generateContent}
                    basePhoto={basePhoto}
                    onPhotoUpload={photoManager.handlePhotoUpload}
                    onPhotoRemove={photoManager.handlePhotoRemove}
                    onPublish={handlePublish}
                  />
                  <div className="text-center">
                    <button onClick={() => setShowViralGenerator(!showViralGenerator)} className="text-accent hover:text-accent/80 underline text-sm font-medium transition-colors">
                      {showViralGenerator ? '🔥 Hide Viral Formats' : '🔥 Show Viral Formats'}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div>
              {loadingState.isLoading && !generatedContent ? (
                <Card><CardHeader><CardTitle>Content Preview</CardTitle></CardHeader><CardContent><SkeletonLoader type="content" /><div className="mt-6"><SkeletonLoader type="carousel" /></div></CardContent></Card>
              ) : (
                <>
                  <PreviewSection
                    generatedContent={generatedContent}
                    carouselSlides={carouselSlides}
                    setCarouselSlides={setCarouselSlides}
                    appliedHook={appliedHook}
                    onRemoveHook={hookManager.removeHook}
                    onImageEdit={imageManager.handleImageEdit}
                    onSaveContent={handleSaveContent}
                    canvaTemplate={formData.canvaTemplate}
                    onPublishDirect={handlePublish}
                    isGeneratingImages={isGeneratingImages}
                    postType={formData.postType}
                    onRegenerateImages={regenerateImages}
                    imageGenProgress={imageGenProgress}
                  />
                  {generatedContent && <div className="mt-3"><FeedbackWidget generatedContent={generatedContent} /></div>}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="foto" className="mt-4">
          <PhotoLibrary
            selectable
            selectedPhotos={selectedPhotos}
            onSelectPhoto={url => setSelectedPhotos(prev => [...prev, url])}
            onDeselectPhoto={url => setSelectedPhotos(prev => prev.filter(p => p !== url))}
          />
        </TabsContent>

        <TabsContent value="memoria" className="mt-4">
          <AIMemoryPanel />
        </TabsContent>

        <TabsContent value="virale" className="mt-4">
          <ViralAnalyzer />
        </TabsContent>

        <TabsContent value="trend" className="mt-4">
          <TrendExplorer onUseTrend={handleUseTrend} />
        </TabsContent>
      </Tabs>

      <div className="mt-8"><MetaConnection /></div>

      <HookGenerator
        showHookGenerator={showHookGenerator}
        setShowHookGenerator={setShowHookGenerator}
        hookTopic={hookTopic}
        setHookTopic={setHookTopic}
        onApplyHook={hookManager.applyHookToContent}
        audience={formData.audience}
        tone={formData.tone}
        platform={formData.platform}
      />
    </div>
  );
});

MainContent.displayName = 'MainContent';

export default MainContent;
