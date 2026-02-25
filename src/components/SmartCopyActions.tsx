import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, ExternalLink, Send, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

  const handleDirectPublish = async (platform: string) => {
    if (!onPublishDirect) return;
    setIsPublishing(platform);
    try {
      await onPublishDirect([platform]);
    } finally {
      setIsPublishing(null);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopiedText(true);
      toast({ title: "✅ Testo copiato!", description: "Incollalo nel tuo post social" });
      setTimeout(() => setCopiedText(false), 3000);
    } catch {
      toast({ title: "Errore", description: "Non è stato possibile copiare il testo", variant: "destructive" });
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
        console.error(`Errore download slide ${i + 1}`);
      }
    }
    toast({ title: "📥 Download completato!", description: `${imageSlides.length} immagini scaricate` });
  };

  const handleOpenPlatform = async (platform: 'instagram' | 'facebook') => {
    try { await navigator.clipboard.writeText(generatedContent); } catch {}
    const hasImgs = carouselSlides.some(s => s.userImageUrl || s.imageUrl);
    if (hasImgs) await downloadAllImages();
    toast({
      title: "✅ Tutto pronto!",
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
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground">📲 Pubblica il tuo contenuto</h4>

      {/* === SEZIONE 1: Pubblicazione Diretta via API === */}
      {onPublishDirect && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            ⚡ <strong>Pubblicazione automatica</strong> — Il post viene pubblicato direttamente sul tuo profilo collegato.
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
              ) : isPublishing === 'instagram' ? (
                <span className="animate-pulse">Publishing...</span>
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
              {isPublishing === 'facebook' ? (
                <span className="animate-pulse">Publishing...</span>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Publish Now on Facebook
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* === SEZIONE 2: Metodo manuale collassabile === */}
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
            Copia il testo, scarica le immagini, poi apri il social e incolla manualmente.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default SmartCopyActions;
