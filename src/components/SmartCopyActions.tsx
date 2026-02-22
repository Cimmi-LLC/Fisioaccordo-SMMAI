import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

const SmartCopyActions: React.FC<SmartCopyActionsProps> = ({
  generatedContent,
  carouselSlides,
  onPublishDirect
}) => {
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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

  const handleDownloadImages = async () => {
    const imageSlides = carouselSlides.filter(s => s.userImageUrl || s.imageUrl);
    if (imageSlides.length === 0) {
      toast({ title: "Nessuna immagine", description: "Non ci sono immagini da scaricare" });
      return;
    }

    for (let i = 0; i < imageSlides.length; i++) {
      const slide = imageSlides[i];
      const url = slide.userImageUrl || slide.imageUrl;
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

  const downloadAllImages = async () => {
    const imageSlides = carouselSlides.filter(s => s.userImageUrl || s.imageUrl);
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
  };

  const handleOpenInstagram = async () => {
    // 1. Copia testo
    try { await navigator.clipboard.writeText(generatedContent); } catch {}
    // 2. Scarica immagini
    const hasImgs = carouselSlides.some(s => s.userImageUrl || s.imageUrl);
    if (hasImgs) await downloadAllImages();
    // 3. Toast
    toast({
      title: "✅ Tutto pronto!",
      description: hasImgs
        ? "Testo copiato e immagini scaricate! Apri 'Nuovo Post', seleziona le foto e incolla il testo."
        : "Testo copiato! Apri 'Nuovo Post' e incolla il testo."
    });
    // 4. Apri Instagram
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open('instagram://app', '_blank');
      setTimeout(() => window.open('https://www.instagram.com/', '_blank'), 500);
    } else {
      window.open('https://www.instagram.com/', '_blank');
    }
  };

  const handleOpenFacebook = async () => {
    try { await navigator.clipboard.writeText(generatedContent); } catch {}
    const hasImgs = carouselSlides.some(s => s.userImageUrl || s.imageUrl);
    if (hasImgs) await downloadAllImages();
    toast({
      title: "✅ Tutto pronto!",
      description: hasImgs
        ? "Testo copiato e immagini scaricate! Crea un nuovo post, seleziona le foto e incolla il testo."
        : "Testo copiato! Crea un nuovo post e incolla il testo."
    });
    window.open('https://www.facebook.com/', '_blank');
  };

  const handleDirectPublish = async (platforms: string[]) => {
    if (!onPublishDirect) return;
    setIsPublishing(true);
    try {
      await onPublishDirect(platforms);
    } finally {
      setIsPublishing(false);
    }
  };

  const hasImages = carouselSlides.some(s => s.userImageUrl || s.imageUrl);

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">📲 Pubblica il tuo contenuto</h4>
      
      {onPublishDirect && (
        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border">
          <Button
            onClick={() => handleDirectPublish(['instagram'])}
            variant="default"
            size="sm"
            disabled={isPublishing}
          >
            {isPublishing ? "Pubblicando..." : "📸 Pubblica su Instagram"}
          </Button>
          <Button
            onClick={() => handleDirectPublish(['facebook'])}
            variant="default"
            size="sm"
            disabled={isPublishing}
          >
            {isPublishing ? "Pubblicando..." : "📘 Pubblica su Facebook"}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground font-medium">Oppure copia e incolla manualmente:</p>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleCopyText}
          variant={copiedText ? "default" : "outline"}
          size="sm"
          className={copiedText ? "bg-green-600 hover:bg-green-700 text-white" : ""}
        >
          {copiedText ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
          {copiedText ? "Copiato!" : "Copia Testo"}
        </Button>

        {hasImages && (
          <Button onClick={handleDownloadImages} variant="outline" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            Scarica Immagini
          </Button>
        )}

        <Button onClick={handleOpenInstagram} variant="outline" size="sm">
          <ExternalLink className="mr-1.5 h-4 w-4" />
          Apri Instagram
        </Button>

        <Button onClick={handleOpenFacebook} variant="outline" size="sm">
          <ExternalLink className="mr-1.5 h-4 w-4" />
          Apri Facebook
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Usa i pulsanti viola per pubblicare direttamente via API, oppure copia e incolla manualmente.
      </p>
    </div>
  );
};

export default SmartCopyActions;
