
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { useToast } from "@/hooks/use-toast";
import IdeaGenerator from "./IdeaGenerator";
import ContentForm from "./ContentForm";
import Nb2CarouselPreview from "./carousel/Nb2CarouselPreview";
import type { CarouselData } from "@/types/carousel";
import SkeletonLoader from "./ui/skeleton-loader";
import EnhancedProgress from "./ui/enhanced-progress";
import { useContentGeneration } from "@/hooks/useContentGeneration";
import { useNb2Carousel } from "@/hooks/useNb2Carousel";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Lightbulb, Sparkles } from 'lucide-react';

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

  // ── Template Genesis: gating + produzione NB2 ──
  const navigate = useNavigate();
  const { activeBrand, loading: brandLoading } = useActiveBrand();
  const brandRecord = activeBrand as (typeof activeBrand & { genesis_status?: string; genome?: unknown }) | null;
  const genesisLocked = brandRecord?.genesis_status === 'locked';
  const nb2 = useNb2Carousel(brandRecord?.id ?? null, brandRecord?.genome ?? null);
  const [carouselRunId, setCarouselRunId] = useState('');
  const producedFingerprint = useRef('');

  /** Avvio manuale della produzione (fallback se l'automatico non e partito). */
  const produceNow = useCallback(() => {
    const carousel = carouselDataList[activeVariant];
    if (!carousel || !brandRecord?.id) return;
    producedFingerprint.current = activeVariant + '|' + carousel.titolo_carosello + '|' + carousel.slides.length;
    const runId = 'nb2_' + Date.now() + '_v' + activeVariant;
    setCarouselRunId(runId);
    nb2.produce(carousel, runId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselDataList, activeVariant, brandRecord?.id]);

  // Deep-link from Trend page (?topic=…&type=carosello&auto=1):
  //   1) prefill description
  //   2) set postType if provided
  //   3) flag for auto-trigger; the actual generate fires in the next effect
  //      after formData has been committed (otherwise generateContent would
  //      see the stale closure description and send an empty topic).
  const [searchParams, setSearchParams] = useSearchParams();
  const consumedParamsRef = useRef(false);
  const [pendingAuto, setPendingAuto] = useState(false);
  useEffect(() => {
    if (consumedParamsRef.current) return;
    const incoming = (searchParams.get('topic') || '').trim();
    const type = (searchParams.get('type') || '').trim();
    const auto = searchParams.get('auto') === '1';
    if (!incoming && !type) return;
    consumedParamsRef.current = true;
    setFormData(prev => ({
      ...prev,
      description: incoming || prev.description,
      postType: type || prev.postType,
    }));
    setSearchParams({}, { replace: true });
    if (auto && incoming) setPendingAuto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fires generate AFTER setFormData has been committed (formData.description
  // matches the value we set above). One-shot.
  useEffect(() => {
    if (!pendingAuto) return;
    if (!formData.description) return;
    setPendingAuto(false);
    generateContent();
  }, [pendingAuto, formData.description, generateContent]);

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

  // Produzione NB2: quando arriva un carosello (o si cambia variante),
  // genera le slide reali via reference template. Fingerprint per non
  // riprodurre lo stesso contenuto a ogni re-render.
  useEffect(() => {
    const carousel = carouselDataList[activeVariant];
    if (!carousel) return;
    if (!genesisLocked || !brandRecord?.id) {
      // Non deve mai fallire in silenzio: il fallback visibile in colonna
      // preview offre l'avvio manuale, qui lasciamo traccia per il debug.
      console.warn('Produzione NB2 non avviata:', {
        brandId: brandRecord?.id ?? null,
        genesisLocked,
        brandLoading,
      });
      return;
    }
    const fingerprint = activeVariant + '|' + carousel.titolo_carosello + '|' + carousel.slides.length;
    if (producedFingerprint.current === fingerprint) return;
    producedFingerprint.current = fingerprint;
    const runId = 'nb2_' + Date.now() + '_v' + activeVariant;
    setCarouselRunId(runId);
    nb2.produce(carousel, runId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselDataList, activeVariant, genesisLocked, brandRecord?.id]);

  const handleInputChange = useCallback((field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleIdeaGenerated = useCallback((idea: string) => {
    setFormData(prev => ({ ...prev, description: idea }));
    setIdeaOpen(false);
  }, []);

  // GATE Template Genesis: senza template approvato la produzione caroselli
  // e bloccata (sostituzione totale della vecchia pipeline).
  if (brandRecord && !genesisLocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="panel-card">
          <CardContent style={{ padding: 40, textAlign: 'center' }}>
            <Sparkles className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--rosa)' }} />
            <h2 className="text-xl font-black mb-2" style={{ color: 'var(--ink)' }}>
              Prima crea il tuo template
            </h2>
            <p className="text-[13px] mb-6" style={{ color: 'var(--ink3)' }}>
              I tuoi caroselli vengono generati sul TUO sistema visivo.
              Bastano 5 minuti: carichi logo e qualche post, l'AI progetta il template, tu approvi.
            </p>
            <button
              onClick={() => navigate(`/onboarding/template?brand=${brandRecord.id}`)}
              className="text-white text-[13px] font-black uppercase px-8 py-3.5 rounded-xl"
              style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              Crea il template
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          {carouselDataList[activeVariant] && (nb2.slides.length > 0 || nb2.producing) && (
            <Nb2CarouselPreview
              key={activeVariant}
              carousel={carouselDataList[activeVariant]}
              carouselId={carouselRunId}
              slides={nb2.slides}
              producing={nb2.producing}
              regenerating={nb2.regenerating}
              onRegenerate={(index, override) => nb2.regenerateSlide(index, carouselRunId, override)}
            />
          )}
          {/* Fallback: copy pronto ma slide non prodotte (produzione fallita
              o saltata). Mai lasciare la colonna vuota senza spiegazione. */}
          {carouselDataList[activeVariant] && nb2.slides.length === 0 && !nb2.producing && (
            <Card className="panel-card">
              <CardContent style={{ padding: 24 }}>
                <div className="py-8 text-center space-y-3">
                  <p className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>
                    "{carouselDataList[activeVariant].titolo_carosello}"
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
                    Il copy e pronto ma le slide non sono state ancora prodotte.
                  </p>
                  {brandRecord?.id && genesisLocked ? (
                    <button
                      onClick={produceNow}
                      className="text-white text-[12px] font-black uppercase px-6 py-3 rounded-xl"
                      style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
                    >
                      Genera le slide
                    </button>
                  ) : (
                    <p className="text-[12px]" style={{ color: '#b45309' }}>
                      {brandLoading
                        ? 'Sto caricando il brand attivo, un attimo…'
                        : !brandRecord
                          ? 'Nessun brand attivo trovato: ricarica la pagina o seleziona un brand.'
                          : 'Il brand attivo non ha un template approvato: completa prima il Template Genesis.'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {!carouselDataList[activeVariant] && (
            <Card className="panel-card">
              <CardContent style={{ padding: 24 }}>
                <div className="py-12 text-center">
                  <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
                    Scrivi un argomento e clicca "Genera Contenuto"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
});

MainContent.displayName = 'MainContent';
export default MainContent;
