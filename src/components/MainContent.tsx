
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { useToast } from "@/hooks/use-toast";
import IdeaGenerator from "./IdeaGenerator";
import ContentForm from "./ContentForm";
import CarouselPreview from "./carousel/CarouselPreview";
import type { CarouselData } from "@/types/carousel";
import SkeletonLoader from "./ui/skeleton-loader";
import EnhancedProgress from "./ui/enhanced-progress";
import { useContentGeneration } from "@/hooks/useContentGeneration";
import { ChevronDown, Lightbulb } from 'lucide-react';

interface MainContentProps {
  user: any;
  showCopyImprover: boolean;
  onCopyImproved: (improvedCopy: string) => void;
  onOpenSocialModal?: () => void;
}

export type { MainContentProps };

const MainContent: React.FC<MainContentProps> = React.memo(({ user }) => {
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
    numVariations: '1',
    visualTemplate: 'default',
    canvaTemplate: null as any,
    selectedPlatforms: ['instagram'] as string[],
    scheduleDate: '',
  });

  const [ideaOpen, setIdeaOpen] = useState(false);
  const [carouselDataList, setCarouselDataList] = useState<CarouselData[]>([]);
  const [activeVariant, setActiveVariant] = useState(0);

  const noopFn = useCallback(() => {}, []);
  const { generatedContent, setGeneratedContent, lastRawResponses, generateContent } = useContentGeneration(user, formData, noopFn);

  // Build CarouselData[] from raw AI responses
  React.useEffect(() => {
    if (!lastRawResponses || lastRawResponses.length === 0) {
      setCarouselDataList([]);
      return;
    }
    const list: CarouselData[] = lastRawResponses
      .filter((r) => r && r.slides)
      .map((raw) => ({
        titolo_carosello: raw.titolo_carosello || formData.description,
        hook_principale: raw.hook_principale || '',
        slides: (raw.slides || []).map((s: any, i: number) => ({
          numero: s.numero || i + 1,
          tipo: s.tipo || (i === 0 ? 'cover' : i === raw.slides.length - 1 ? 'cta' : 'content'),
          hook: s.hook || '',
          sottotitolo: s.sottotitolo || '',
          titolo: s.titolo || s.title || '',
          testo: s.testo || s.body || '',
          testo_cta: s.testo_cta || '',
          bottone_cta: s.bottone_cta || '',
          keywords_stock: s.keywords_stock || [],
        })),
        cta_finale: raw.cta_finale || '',
        caption_instagram: raw.caption_instagram || raw.content || generatedContent,
        hashtag_suggeriti: raw.hashtag_suggeriti || [],
      }));
    setCarouselDataList(list);
    setActiveVariant(0);
  }, [lastRawResponses]);

  const handleInputChange = useCallback((field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleIdeaGenerated = useCallback((idea: string) => {
    setFormData(prev => ({ ...prev, description: idea }));
    setIdeaOpen(false);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" style={{ paddingTop: '44px' }}>

      {/* Hero */}
      <div className="text-center mb-8">
        <h1
          className="text-[32px] leading-tight"
          style={{ fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1.5px', lineHeight: '1.1' }}
        >
          Crea contenuti <span style={{ color: 'var(--rosa)' }}>virali</span> in secondi
        </h1>
      </div>

      {/* Loading progress */}
      {loadingState.isLoading && (
        <div className="mb-6">
          <Card>
            <CardContent className="p-6">
              <EnhancedProgress value={loadingState.progress} status={loadingState.status} message={loadingState.message} size="md" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Idea Generator */}
      <Collapsible open={ideaOpen} onOpenChange={setIdeaOpen} className="mb-5">
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center gap-2 text-[11px] font-black uppercase transition-colors"
            style={{ color: ideaOpen ? 'var(--rosa)' : 'var(--ink3)', letterSpacing: '0.5px' }}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Ispirazione rapida
            <ChevronDown className="h-3 w-3 transition-transform duration-200" style={{ transform: ideaOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <IdeaGenerator ideaInput={ideaInput} setIdeaInput={setIdeaInput} onIdeaGenerated={handleIdeaGenerated} />
        </CollapsibleContent>
      </Collapsible>

      {/* Main grid: Form + Preview */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {loadingState.isLoading ? (
            <Card>
              <CardHeader><CardTitle>Configurazione Post</CardTitle></CardHeader>
              <CardContent><SkeletonLoader type="form" /></CardContent>
            </Card>
          ) : (
            <ContentForm
              formData={formData}
              onInputChange={handleInputChange}
              isGenerating={loadingState.isLoading}
              onGenerate={generateContent}
              basePhoto={null}
              onPhotoUpload={() => {}}
              onPhotoRemove={() => {}}
            />
          )}
        </div>
        <div>
          {carouselDataList.length > 1 && (
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
              {carouselDataList.map((_, i) => {
                const isActive = i === activeVariant;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveVariant(i)}
                    className="flex-shrink-0 text-[11px] font-bold px-3 py-2 rounded-lg transition-all"
                    style={{
                      backgroundColor: isActive ? 'var(--rosa)' : 'var(--surface)',
                      color: isActive ? '#fff' : 'var(--ink3)',
                      border: isActive ? 'none' : '1px solid var(--line)',
                      cursor: 'pointer',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Variante {i + 1}
                  </button>
                );
              })}
            </div>
          )}
          <CarouselPreview
            key={activeVariant}
            data={carouselDataList[activeVariant] || null}
          />
        </div>
      </div>
    </div>
  );
});

MainContent.displayName = 'MainContent';
export default MainContent;
