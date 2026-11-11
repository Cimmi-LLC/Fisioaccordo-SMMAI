
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { useToast } from "@/hooks/use-toast";
import IdeaGenerator from "./IdeaGenerator";
import ContentForm from "./ContentForm";
import Nb2CarouselPreview from "./carousel/Nb2CarouselPreview";
import ProducedCarouselsList from "./carousel/ProducedCarouselsList";
import CarouselCopyView from "./carousel/CarouselCopyView";
import DaRivedere from "./DaRivedere";
import { caroselloDaRisposta } from "@/lib/carouselText";
import { testiTemplate } from "@/lib/templateStato";
import type { CarouselData } from "@/types/carousel";
import SkeletonLoader from "./ui/skeleton-loader";
import EnhancedProgress from "./ui/enhanced-progress";
import { useContentGeneration } from "@/hooks/useContentGeneration";
import { useNb2Carousel } from "@/hooks/useNb2Carousel";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { resolveProfession } from "@/lib/brand/profession";
import { templateVecchio } from "@/lib/brand/layouts";
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Lightbulb, Sparkles } from 'lucide-react';

interface MainContentProps {
  user: any;
  showCopyImprover: boolean;
  onCopyImproved: (improvedCopy: string) => void;
  onOpenSocialModal?: () => void;
  /** Chiamata dopo che i testi generati sono stati salvati. */
  onContentSaved?: () => void;
}

export type { MainContentProps };

const MainContent: React.FC<MainContentProps> = React.memo(({ user, onContentSaved }) => {
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
  const { generatedContent, setGeneratedContent, lastRawResponses, generateContent } = useContentGeneration(user, formData, noopFn, onContentSaved);

  // ── Template Genesis: gating + produzione NB2 ──
  const navigate = useNavigate();
  const { activeBrand, loading: brandLoading } = useActiveBrand();
  const brandRecord = activeBrand as (typeof activeBrand & { genesis_status?: string; genome?: unknown }) | null;
  // Professione del brand attivo: idee rapide e placeholder nel suo linguaggio.
  const brandProfession = resolveProfession(activeBrand);
  const genesisLocked = brandRecord?.genesis_status === 'locked';
  // Template approvato del tipo vecchio (disegnato dal modello): non comanda
  // più le slide, e la pagina lo dice.
  const tplVecchio = templateVecchio(brandRecord?.genesis_status, brandRecord?.genome);
  const nb2 = useNb2Carousel(brandRecord?.id ?? null, brandRecord?.genome ?? null);
  const producedFingerprint = useRef('');

  /** Avvio manuale della produzione (fallback se l'automatico non e partito). */
  const produceNow = useCallback(() => {
    const carousel = carouselDataList[activeVariant];
    if (!carousel || !brandRecord?.id) return;
    producedFingerprint.current = activeVariant + '|' + carousel.titolo_carosello + '|' + carousel.slides.length;
    nb2.produce(carousel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselDataList, activeVariant, brandRecord?.id]);

  /** Riapre un carosello prodotto in precedenza (senza rigenerare nulla). */
  const handleReopen = useCallback(async (rowId: string) => {
    const copy = await nb2.reopen(rowId);
    if (copy) {
      // Fingerprint impostato PRIMA di settare la lista: il riaprire non
      // deve mai far ripartire una produzione (costerebbe di nuovo).
      producedFingerprint.current = '0|' + copy.titolo_carosello + '|' + copy.slides.length;
      setCarouselDataList([copy]);
      setActiveVariant(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nb2.reopen]);

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
      .map((raw) => {
        const c = caroselloDaRisposta(raw, formData.description);
        return { ...c, caption_instagram: c.caption_instagram || generatedContent };
      });
    setCarouselDataList(list);
    setActiveVariant(0);
  }, [lastRawResponses]);

  // Produzione delle slide: quando arriva un carosello (o si cambia
  // variante), genera le slide reali. Parte anche senza template approvato:
  // il server usa il layout di base nei colori del brand (prima si fermava
  // qui e chi non aveva logo né template non vedeva mai un'immagine).
  // Fingerprint per non riprodurre lo stesso contenuto a ogni re-render.
  useEffect(() => {
    const carousel = carouselDataList[activeVariant];
    if (!carousel) return;
    if (!brandRecord?.id) {
      // Non deve mai fallire in silenzio: il fallback visibile in colonna
      // preview offre l'avvio manuale, qui lasciamo traccia per il debug.
      console.warn('Produzione slide non avviata: nessun brand attivo', { brandLoading });
      return;
    }
    const fingerprint = activeVariant + '|' + carousel.titolo_carosello + '|' + carousel.slides.length;
    if (producedFingerprint.current === fingerprint) return;
    producedFingerprint.current = fingerprint;
    nb2.produce(carousel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselDataList, activeVariant, brandRecord?.id]);

  const handleInputChange = useCallback((field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleIdeaGenerated = useCallback((idea: string) => {
    setFormData(prev => ({ ...prev, description: idea }));
    setIdeaOpen(false);
  }, []);

  // Senza template approvato la pagina resta aperta e le slide escono nello
  // stile di base: il riquadro propone il template su misura come un di più.
  // Prima era un blocco a tutta pagina e chi saltava l'onboarding restava fuori.
  const goToGenesis = () => brandRecord && navigate(`/onboarding/template?brand=${brandRecord.id}`);
  const testiTpl = testiTemplate(brandRecord?.genesis_status, { templateVecchio: tplVecchio });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" style={{ paddingTop: '44px' }}>

      {/* Hero */}
      <div className="text-center mb-8">
        <h1
          className="text-[32px] leading-tight"
          style={{ fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1.5px', lineHeight: '1.1' }}
        >
          Crea i <span style={{ color: 'var(--rosa)' }}>contenuti</span> del tuo studio
        </h1>
      </div>

      {brandRecord && (!genesisLocked || tplVecchio) && (
        <Card className="panel-card mb-6">
          <CardContent style={{ padding: 20 }}>
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <Sparkles className="h-8 w-8 shrink-0" style={{ color: 'var(--rosa)' }} />
              <div className="flex-1">
                <p className="text-[14px] font-black" style={{ color: 'var(--ink)' }}>
                  {testiTpl.titolo}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
                  {testiTpl.testo}
                </p>
              </div>
              {testiTpl.bottone && (
                <button
                  onClick={goToGenesis}
                  className="text-white text-[12px] font-black uppercase px-6 py-3 rounded-xl shrink-0"
                  style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
                >
                  {testiTpl.bottone}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
          <IdeaGenerator
            ideaInput={ideaInput}
            setIdeaInput={setIdeaInput}
            onIdeaGenerated={handleIdeaGenerated}
            ideas={brandProfession.profile.temiEsempio}
            placeholder={`Inserisci un argomento (es. ${brandProfession.profile.temiEsempio.slice(0, 2).map(t => t.toLowerCase()).join(', ')})`}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Main grid: Form + Preview. min-w-0 sulle colonne: senza, un contenuto
          largo (slide, barre) sfonda la griglia e la pagina scorre in
          orizzontale da telefono (revisione 03/11). */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4 min-w-0">
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
          {/* I campi del metodo ci sono dal 03/11 ma stanno in una scheda che
              pochi aprono: finché sono vuoti, la pagina lo ricorda. */}
          {brandRecord && !((brandRecord as { frasi_pazienti?: string[] | null }).frasi_pazienti?.length) && (
            <p className="text-[12px] mt-3" style={{ color: 'var(--ink3)' }}>
              Oggi il copy parte da quello che c'è scritto sul tuo sito. Per farlo parlare come i tuoi pazienti, scrivi 3 frasi che ti dicono loro:{' '}
              <button
                type="button"
                onClick={() => navigate('/brand?tab=preferenze')}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--viola)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Brand Kit, scheda Preferenze
              </button>.
            </p>
          )}
        </div>
        <div className="min-w-0">
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
          <DaRivedere voci={carouselDataList[activeVariant]?.da_rivedere} className="mb-4" />
          {carouselDataList[activeVariant] && (nb2.slides.length > 0 || nb2.producing) && (
            <Nb2CarouselPreview
              key={activeVariant}
              carousel={carouselDataList[activeVariant]}
              format={nb2.format}
              slides={nb2.slides}
              producing={nb2.producing}
              regenerating={nb2.regenerating}
              onRegenerate={(index, override) => nb2.regenerateSlide(index, override)}
            />
          )}
          {/* Fallback: copy pronto ma slide non prodotte (produzione fallita
              o saltata). Mai lasciare la colonna vuota senza spiegazione. */}
          {carouselDataList[activeVariant] && nb2.slides.length === 0 && !nb2.producing && (
            <Card className="panel-card">
              <CardContent style={{ padding: 24 }}>
                <div className="text-center space-y-3">
                  <p className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>
                    "{carouselDataList[activeVariant].titolo_carosello}"
                  </p>
                  {/* I testi si vedono sempre: prima senza template restava
                      solo il titolo e il copy scritto dall'AI non compariva. */}
                  <CarouselCopyView carousel={carouselDataList[activeVariant]} />
                  <p className="text-[12px] pt-2" style={{ color: 'var(--ink3)' }}>
                    I testi sono pronti e salvati nei tuoi contenuti; le slide grafiche non sono ancora state prodotte.
                  </p>
                  {brandRecord?.id ? (
                    <>
                      {/* Anche senza template: le slide escono nello stile di base. */}
                      <button
                        onClick={produceNow}
                        className="text-white text-[12px] font-black uppercase px-6 py-3 rounded-xl"
                        style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
                      >
                        Genera le slide
                      </button>
                      {(!genesisLocked || tplVecchio) && (
                        <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
                          {testiTpl.sottoCarosello}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[12px]" style={{ color: '#b45309' }}>
                      {brandLoading
                        ? 'Sto caricando il brand attivo, un attimo…'
                        : 'Nessun brand attivo trovato: ricarica la pagina o seleziona un brand.'}
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

      {/* Caroselli gia prodotti: persistono e si riaprono senza rigenerare */}
      <ProducedCarouselsList
        brandId={brandRecord?.id ?? null}
        activeId={nb2.carouselId}
        onOpen={handleReopen}
      />
    </div>
  );
});

MainContent.displayName = 'MainContent';
export default MainContent;
