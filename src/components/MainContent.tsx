
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { useToast } from "@/hooks/use-toast";
import IdeaGenerator from "./IdeaGenerator";
import ContentForm from "./ContentForm";
import PreviewSection from "./PreviewSection";
import HookGenerator from "./HookGenerator";
import LazyCopyImprover from "./LazyCopyImprover";
import ViralFormatGenerator from "./ViralFormatGenerator";
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
import { ChevronDown, Lightbulb, PenLine, Image, Cpu, TrendingUp, Flame } from 'lucide-react';

interface MainContentProps {
  user: any;
  showCopyImprover: boolean;
  onCopyImproved: (improvedCopy: string) => void;
  onOpenSocialModal?: () => void;
}

// Expose openSocialModal via a simple callback for AppHeader
export type { MainContentProps };

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
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);

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
    setIdeaOpen(false);
  }, []);

  const handleSaveContent = () => saveContent(carouselSlides);

  const handleViralContentGenerated = (content: string) => {
    setGeneratedContent(content);
    setShowViralGenerator(false);
  };

  const handleUseTrend = (topic: string) => {
    setFormData(prev => ({ ...prev, description: topic }));
    toast({ title: 'Trend selezionato!', description: `"${topic}" inserito nel form. Genera il post!` });
  };

  const handlePublish = async (platforms: string[]) => {
    if (!generatedContent) {
      toast({ title: "Errore", description: "Genera prima il contenuto prima di pubblicare", variant: "destructive" });
      return;
    }
    if (isGeneratingImages) {
      toast({ title: "Attendi", description: "Le immagini sono ancora in fase di creazione. Riprova tra qualche secondo." });
      return;
    }

    loadingState.startLoading('Preparazione pubblicazione...');
    loadingState.updateProgress(10, 'Verifica connessione...');

    try {
      const isMetaConnected = await MetaService.isConnected();
      if (!isMetaConnected) {
        toast({ title: "Usa Smart Copy", description: "Copia il testo e scarica le immagini dall'anteprima per pubblicare manualmente." });
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
          if (!imageUrl) { errors.push("Generazione immagine fallita. Carica una foto manualmente o riprova a generare il contenuto."); continue; }
          const carouselUrls = carouselSlides.map(s => s.userImageUrl || s.imageUrl).filter((url): url is string => !!url);
          const result = await MetaService.publishToInstagram(connection.id, generatedContent, imageUrl, carouselUrls.length > 1 ? carouselUrls : undefined);
          if (result.success) { publishedCount++; } else { errors.push(`Instagram: ${result.error}`); }
        }
      }

      loadingState.updateProgress(90, 'Finalizzazione...');
      if (publishedCount > 0) {
        toast({ title: "Pubblicato!", description: `Contenuto pubblicato su ${publishedCount} piattaform${publishedCount > 1 ? 'e' : 'a'}` });
        loadingState.finishLoading(true, 'Pubblicazione completata!');
      } else if (errors.length > 0) {
        toast({ title: "Pubblicazione fallita", description: errors.join(' | '), variant: "destructive" });
        loadingState.finishLoading(false, errors.join(' | '));
      }
    } catch (error) {
      toast({ title: "Errore di pubblicazione", description: error instanceof Error ? error.message : 'Errore sconosciuto', variant: "destructive" });
      loadingState.finishLoading(false, error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" style={{ paddingTop: '44px' }}>

      {/* ── Hero (compact, 1 line) ─────────────────────────── */}
      <div className="text-center mb-8">
        <h1
          className="text-[32px] leading-tight"
          style={{ fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1.5px', lineHeight: '1.1' }}
        >
          Crea contenuti <span style={{ color: 'var(--rosa)' }}>virali</span> in secondi
        </h1>
      </div>

      {/* ── Loading progress ──────────────────────────────── */}
      {loadingState.isLoading && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-6">
              <EnhancedProgress value={loadingState.progress} status={loadingState.status} message={loadingState.message} size="md" />
            </CardContent>
          </Card>
        </div>
      )}

      {showCopyImprover && (
        <div className="mb-6">
          <LazyCopyImprover onCopyImproved={onCopyImproved} />
        </div>
      )}

      {showViralGenerator && (
        <div className="mb-6">
          <ViralFormatGenerator topic={formData.description} audience={formData.audience} user={user} onContentGenerated={handleViralContentGenerated} />
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────── */}
      <Tabs defaultValue="genera" className="mb-6">
        <TabsList
          className="tab-underline-list w-full justify-start rounded-none bg-transparent h-auto p-0 mb-0"
          style={{ borderBottom: '1.5px solid var(--line)' }}
        >
          {[
            { value: 'genera', label: 'Genera', Icon: PenLine },
            { value: 'foto', label: 'Foto', Icon: Image },
            { value: 'memoria', label: 'AI Memory', Icon: Cpu },
            { value: 'virale', label: 'Virale', Icon: TrendingUp },
            { value: 'trend', label: 'Trend', Icon: Flame },
          ].map(({ value, label, Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="relative rounded-none border-0 bg-transparent px-4 pb-2.5 pt-2 text-[11px] font-black uppercase tracking-wider shadow-none
                data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[var(--ink)]
                data-[state=inactive]:text-[var(--ink3)]
                hover:text-[var(--viola)]
                data-[state=active]:[&::after]:content-[''] data-[state=active]:[&::after]:absolute data-[state=active]:[&::after]:bottom-[-1.5px] data-[state=active]:[&::after]:left-0 data-[state=active]:[&::after]:right-0 data-[state=active]:[&::after]:h-[2px] data-[state=active]:[&::after]:bg-[var(--rosa)] data-[state=active]:[&::after]:rounded-t"
              style={{ letterSpacing: '0.6px' }}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5 inline-block" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="genera" className="mt-6">

          {/* ── Collapsible Idea Generator ─────────────────── */}
          <Collapsible open={ideaOpen} onOpenChange={setIdeaOpen} className="mb-5">
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-2 text-[11px] font-black uppercase transition-colors"
                style={{ color: ideaOpen ? 'var(--rosa)' : 'var(--ink3)', letterSpacing: '0.5px' }}
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Ispirazione rapida
                <ChevronDown
                  className="h-3 w-3 transition-transform duration-200"
                  style={{ transform: ideaOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <IdeaGenerator
                ideaInput={ideaInput}
                setIdeaInput={setIdeaInput}
                onIdeaGenerated={handleIdeaGenerated}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {loadingState.isLoading ? (
                <Card>
                  <CardHeader><CardTitle>Configurazione Post</CardTitle></CardHeader>
                  <CardContent><SkeletonLoader type="form" /></CardContent>
                </Card>
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
                    onShowHookGenerator={() => setShowHookGenerator(!showHookGenerator)}
                  />
                  <div className="text-center">
                    <button
                      onClick={() => setShowViralGenerator(!showViralGenerator)}
                      className="text-sm font-semibold transition-colors underline"
                      style={{ color: 'var(--viola)' }}
                    >
                      {showViralGenerator ? 'Nascondi Formati Virali' : 'Mostra Formati Virali'}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div>
              {loadingState.isLoading && !generatedContent ? (
                <Card>
                  <CardHeader><CardTitle>Anteprima Contenuto</CardTitle></CardHeader>
                  <CardContent>
                    <SkeletonLoader type="content" />
                    <div className="mt-6"><SkeletonLoader type="carousel" /></div>
                  </CardContent>
                </Card>
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
                  {generatedContent && (
                    <div className="mt-3">
                      <FeedbackWidget generatedContent={generatedContent} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="foto" className="mt-6">
          <PhotoLibrary
            selectable
            selectedPhotos={selectedPhotos}
            onSelectPhoto={url => setSelectedPhotos(prev => [...prev, url])}
            onDeselectPhoto={url => setSelectedPhotos(prev => prev.filter(p => p !== url))}
          />
        </TabsContent>

        <TabsContent value="memoria" className="mt-6">
          <AIMemoryPanel />
        </TabsContent>

        <TabsContent value="virale" className="mt-6">
          <ViralAnalyzer />
        </TabsContent>

        <TabsContent value="trend" className="mt-6">
          <TrendExplorer onUseTrend={handleUseTrend} />
        </TabsContent>
      </Tabs>

      {/* ── Hook Generator (floating) ────────────────────── */}
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

      {/* ── Social connection link ────────────────────────── */}
      <div className="mt-6 text-center">
        <button
          onClick={() => setSocialModalOpen(true)}
          className="text-[10px] font-black uppercase transition-colors"
          style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}
        >
          Connessioni Social →
        </button>
      </div>

      {/* ── Social Modal ──────────────────────────────────── */}
      <Dialog open={socialModalOpen} onOpenChange={setSocialModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
              Connessioni Social
            </DialogTitle>
          </DialogHeader>
          <MetaConnection />
        </DialogContent>
      </Dialog>
    </div>
  );
});

MainContent.displayName = 'MainContent';
export default MainContent;
