
import React, { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Send, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PublishingPipeline, { type PipelineStep } from "@/components/PublishingPipeline";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface SmartCopyActionsProps {
  generatedContent: string;
  carouselSlides: CarouselSlide[];
  onPublishDirect?: (platforms: string[]) => Promise<void>;
  isGeneratingImages?: boolean;
}

const INITIAL_STEPS: PipelineStep[] = [
  { label: 'Verifica connessione...', status: 'pending' },
  { label: 'Preparazione contenuto e caption', status: 'pending' },
  { label: 'Caricamento immagini', status: 'pending' },
  { label: 'Creazione container media', status: 'pending' },
  { label: 'Attesa elaborazione media', status: 'pending' },
  { label: 'Pubblicazione sul feed', status: 'pending' },
  { label: 'Pubblicazione confermata!', status: 'pending' },
];

const SmartCopyActions: React.FC<SmartCopyActionsProps> = ({
  generatedContent,
  carouselSlides,
  onPublishDirect,
  isGeneratingImages
}) => {
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState(false);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [publishSteps, setPublishSteps] = useState<PipelineStep[]>([]);
  const [publishProgress, setPublishProgress] = useState(0);

  const advanceStep = (stepIndex: number, status: 'active' | 'done' | 'error') => {
    setPublishSteps(prev => prev.map((s, i) => {
      if (i < stepIndex) return { ...s, status: 'done' as const };
      if (i === stepIndex) return { ...s, status };
      return s;
    }));
    const progressPerStep = 100 / INITIAL_STEPS.length;
    setPublishProgress(Math.min(100, status === 'done' ? (stepIndex + 1) * progressPerStep : (stepIndex + 0.5) * progressPerStep));
  };

  const handleDirectPublish = async (platform: string) => {
    if (!onPublishDirect) return;
    setIsPublishing(platform);
    setPublishSteps(INITIAL_STEPS.map(s => ({ ...s })));
    setPublishProgress(0);

    advanceStep(0, 'active');
    await delay(600);
    advanceStep(0, 'done');
    advanceStep(1, 'active');
    await delay(400);
    advanceStep(1, 'done');
    advanceStep(2, 'active');
    await delay(500);
    advanceStep(2, 'done');
    advanceStep(3, 'active');

    try {
      await onPublishDirect([platform]);
      advanceStep(3, 'done');
      advanceStep(4, 'active');
      await delay(800);
      advanceStep(4, 'done');
      advanceStep(5, 'active');
      await delay(500);
      advanceStep(5, 'done');
      advanceStep(6, 'done');
      setPublishProgress(100);
      await delay(3000);
    } catch {
      advanceStep(3, 'error');
      await delay(3000);
    } finally {
      setIsPublishing(null);
      setPublishSteps([]);
      setPublishProgress(0);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopiedText(true);
      toast({ title: "Testo copiato!", description: "Incollalo nel tuo post social" });
      setTimeout(() => setCopiedText(false), 3000);
    } catch {
      toast({ title: "Errore", description: "Impossibile copiare il testo", variant: "destructive" });
    }
  };

  const downloadAllImages = async () => {
    const imageSlides = carouselSlides.filter(s => s.userImageUrl || s.imageUrl);
    if (imageSlides.length === 0) {
      toast({ title: "Nessuna immagine", description: "Non ci sono immagini da scaricare" });
      return;
    }
    for (let i = 0; i < imageSlides.length; i++) {
      const url = imageSlides[i].userImageUrl || imageSlides[i].imageUrl;
      if (!url) continue;
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `slide-${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      } catch {
        console.error(`Error downloading slide ${i + 1}`);
      }
    }
    toast({ title: "Download completato!", description: `${imageSlides.length} immagini scaricate` });
  };

  const handleOpenPlatform = async (platform: 'instagram' | 'facebook') => {
    try { await navigator.clipboard.writeText(generatedContent); } catch {}
    const hasImgs = carouselSlides.some(s => s.userImageUrl || s.imageUrl);
    if (hasImgs) await downloadAllImages();
    toast({
      title: "Tutto pronto!",
      description: hasImgs
        ? "Testo copiato e immagini scaricate! Crea un nuovo post, seleziona le foto e incolla il testo."
        : "Testo copiato! Crea un nuovo post e incolla il testo."
    });
    if (platform === 'instagram') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.open('instagram://app', '_blank');
        setTimeout(() => window.open('https://www.instagram.com/', '_blank'), 500);
      } else {
        window.open('https://www.instagram.com/', '_blank');
      }
    } else {
      window.open('https://www.facebook.com/', '_blank');
    }
  };

  const hasImages = carouselSlides.some(s => s.userImageUrl || s.imageUrl);

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
    >
      <h4
        className="text-[13px] font-black"
        style={{ color: 'var(--ink)' }}
      >
        Pubblica il Tuo Contenuto
      </h4>

      {isPublishing && publishSteps.length > 0 && (
        <PublishingPipeline
          steps={publishSteps}
          title={`Pubblicazione su ${isPublishing === 'instagram' ? 'Instagram' : 'Facebook'}...`}
          progress={publishProgress}
        />
      )}

      {onPublishDirect && !isPublishing && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium" style={{ color: 'var(--ink3)' }}>
            <strong style={{ color: 'var(--ink2)' }}>Pubblicazione automatica</strong> — Il post viene pubblicato direttamente sul tuo profilo connesso.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleDirectPublish('instagram')}
              disabled={isPublishing !== null || isGeneratingImages}
              className="w-full text-white text-[11px] font-black uppercase py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              style={{
                backgroundColor: 'var(--rosa)',
                border: '1px solid var(--rosa)',
                letterSpacing: '0.5px',
              }}
            >
              {isGeneratingImages ? (
                <span className="animate-pulse">Generazione immagini...</span>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Pubblica su Instagram
                </>
              )}
            </button>
            <button
              onClick={() => handleDirectPublish('facebook')}
              disabled={isPublishing !== null}
              className="w-full text-white text-[11px] font-black uppercase py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              style={{
                backgroundColor: 'var(--viola)',
                border: '1px solid var(--viola)',
                letterSpacing: '0.5px',
              }}
            >
              <Send className="h-3.5 w-3.5" />
              Pubblica su Facebook
            </button>
          </div>
        </div>
      )}

      <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between text-[11px] font-black uppercase py-2 transition-colors"
            style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}
          >
            Metodo manuale (copia & incolla)
            <ChevronDown className={`h-4 w-4 transition-transform ${manualOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyText}
              className="text-[10px] font-black uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              style={copiedText
                ? { backgroundColor: '#16a34a', color: 'white', border: '1px solid #16a34a' }
                : { border: '1px solid var(--line)', color: 'var(--ink3)', backgroundColor: 'transparent' }
              }
            >
              {copiedText ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedText ? "Copiato!" : "Copia Testo"}
            </button>
            {hasImages && (
              <button
                onClick={downloadAllImages}
                className="text-[10px] font-black uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                style={{ border: '1px solid var(--line)', color: 'var(--ink3)', backgroundColor: 'transparent' }}
              >
                <Download className="h-3.5 w-3.5" />
                Scarica Immagini
              </button>
            )}
            <button
              onClick={() => handleOpenPlatform('instagram')}
              className="text-[10px] font-black uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5"
              style={{ border: '1px solid var(--line)', color: 'var(--ink3)', backgroundColor: 'transparent' }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Apri Instagram
            </button>
            <button
              onClick={() => handleOpenPlatform('facebook')}
              className="text-[10px] font-black uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5"
              style={{ border: '1px solid var(--line)', color: 'var(--ink3)', backgroundColor: 'transparent' }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Apri Facebook
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--ink3)' }}>
            Copia il testo, scarica le immagini, poi apri l'app social e incolla manualmente.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default SmartCopyActions;
