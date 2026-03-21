import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
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
  { label: 'Pubblicazione confermata! ✨', status: 'pending' },
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

    // Simulate step-by-step progress for visual feedback
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
      toast({ title: "✅ Text copied!", description: "Paste it in your social post" });
      setTimeout(() => setCopiedText(false), 3000);
    } catch {
      toast({ title: "Error", description: "Could not copy text", variant: "destructive" });
    }
  };

  const downloadAllImages = async () => {
    const imageSlides = carouselSlides.filter(s => s.userImageUrl || s.imageUrl);
    if (imageSlides.length === 0) {
      toast({ title: "No images", description: "There are no images to download" });
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
    toast({ title: "📥 Download complete!", description: `${imageSlides.length} images downloaded` });
  };

  const handleOpenPlatform = async (platform: 'instagram' | 'facebook') => {
    try { await navigator.clipboard.writeText(generatedContent); } catch {}
    const hasImgs = carouselSlides.some(s => s.userImageUrl || s.imageUrl);
    if (hasImgs) await downloadAllImages();
    toast({
      title: "✅ All ready!",
      description: hasImgs
        ? "Text copied and images downloaded! Create a new post, select the photos and paste the text."
        : "Text copied! Create a new post and paste the text."
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
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground">📲 Publish Your Content</h4>

      {/* Publishing pipeline progress */}
      {isPublishing && publishSteps.length > 0 && (
        <PublishingPipeline
          steps={publishSteps}
          title={`Publishing to ${isPublishing === 'instagram' ? 'Instagram' : 'Facebook'}...`}
          progress={publishProgress}
        />
      )}

      {onPublishDirect && !isPublishing && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            ⚡ <strong>Automatic publishing</strong> — The post is published directly to your connected profile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={() => handleDirectPublish('instagram')}
              size="lg"
              disabled={isPublishing !== null || isGeneratingImages}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white w-full"
            >
              {isGeneratingImages ? (
                <span className="animate-pulse">⏳ Generating images...</span>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Publish Now on Instagram
                </>
              )}
            </Button>
            <Button
              onClick={() => handleDirectPublish('facebook')}
              size="lg"
              disabled={isPublishing !== null}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white w-full"
            >
              <>
                <Send className="mr-2 h-5 w-5" />
                Publish Now on Facebook
              </>
            </Button>
          </div>
        </div>
      )}

      <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground text-xs">
            ✋ Manual method (copy & paste)
            <ChevronDown className={`h-4 w-4 transition-transform ${manualOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCopyText} variant={copiedText ? "default" : "outline"} size="sm"
              className={copiedText ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
              {copiedText ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copiedText ? "Copied!" : "Copy Text"}
            </Button>
            {hasImages && (
              <Button onClick={downloadAllImages} variant="outline" size="sm">
                <Download className="mr-1.5 h-4 w-4" />
                Download Images
              </Button>
            )}
            <Button onClick={() => handleOpenPlatform('instagram')} variant="outline" size="sm">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open Instagram
            </Button>
            <Button onClick={() => handleOpenPlatform('facebook')} variant="outline" size="sm">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open Facebook
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy the text, download images, then open the social app and paste manually.
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
