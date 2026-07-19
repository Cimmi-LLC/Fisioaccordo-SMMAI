
import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { archiveContent } from "@/services/archiveService";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
  imageAlternatives?: string[];
}

interface FormData {
  numSlides: string;
  description: string;
  postType?: string;
}

export interface ImageGenProgress {
  current: number;
  total: number;
}

export const useCarouselSlides = (formData: FormData, user: any, basePhoto: string | null) => {
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState<ImageGenProgress>({ current: 0, total: 0 });
  const { toast } = useToast();
  // CRITICAL: must pass activeBrandId to generate-content / generate-carousel-images
  // edge functions, otherwise they fall back to the user's FIRST brand and
  // generate content with the wrong brand context.
  const { activeBrandId } = useActiveBrand();

  const generateCarouselSlides = useCallback(async () => {
    setIsGeneratingImages(true);
    const postType = formData.postType || 'carosello';
    const isSinglePost = ['post-singolo', 'storia', 'reel'].includes(postType);
    const numSlides = isSinglePost ? 1 : parseInt(formData.numSlides);
    const topic = formData.description;

    if (!topic.trim()) {
      setIsGeneratingImages(false);
      return;
    }

    setImageGenProgress({ current: 0, total: numSlides });

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: { topic, audience: '', platform: 'instagram', tone: 'professionale', postType, numSlides, brandId: activeBrandId }
      });

      if (data?.error || (error && !data)) {
        console.error('Error generating slides:', data?.error || error);
        const fallbackSlides = createFallbackSlides(topic, numSlides, user, basePhoto);
        setCarouselSlides(fallbackSlides);
        generateImagesForSlides(fallbackSlides, topic);
        return;
      }

      if (isSinglePost) {
        const content = data?.content || topic;
        const lines = content.split('\n').filter((l: string) => l.trim());
        const singleSlide: CarouselSlide = {
          type: 'attention',
          content: JSON.stringify({
            title: lines[0] || topic.toUpperCase(),
            subtitle: lines[1] || '',
            body: lines.slice(2, 5).join('\n') || content.substring(0, 200),
            number: '', cta: '', banner: '',
            logo: user?.user_metadata?.clinic_name || 'Studio Fisioterapico',
            footer: user?.user_metadata?.clinic_name || 'Studio Fisioterapico',
          }),
          imageUrl: undefined,
          userImageUrl: basePhoto || undefined
        };
        setCarouselSlides([singleSlide]);
        generateImagesForSlides([singleSlide], topic);
        return;
      }

      const aiSlides: CarouselSlide[] = (data.slides || []).slice(0, numSlides).map(
        (slide: { title: string; subtitle: string; body: string; cta?: string | null; number?: string | null; banner?: string | null }, i: number) => ({
          type: i === 0 ? 'attention' : i === numSlides - 1 ? 'cta' : i === 1 ? 'problem' : 'solution',
          content: JSON.stringify({
            title: slide.title, subtitle: slide.subtitle, body: slide.body,
            number: slide.number || '', cta: slide.cta || '', banner: slide.banner || '',
            logo: user?.user_metadata?.clinic_name || 'Studio Fisioterapico',
            footer: i === numSlides - 1 ? (user?.user_metadata?.clinic_name || 'Studio Fisioterapico') : (slide.cta || ''),
          }),
          imageUrl: undefined,
          userImageUrl: basePhoto && i === 0 ? basePhoto : undefined
        })
      );

      setCarouselSlides(aiSlides);
      generateImagesForSlides(aiSlides, topic);
    } catch (err) {
      console.error('Exception generating slides:', err);
      const fallbackSlides = createFallbackSlides(topic, numSlides, user, basePhoto);
      setCarouselSlides(fallbackSlides);
      generateImagesForSlides(fallbackSlides, topic);
    }
  }, [formData.numSlides, formData.description, formData.postType, user, basePhoto, activeBrandId]);

  const generateImagesForSlides = async (slides: CarouselSlide[], topic: string) => {
    setIsGeneratingImages(true);
    setImageGenProgress({ current: 0, total: slides.length });
    const postType = formData.postType || 'carosello';
    const imageFormat = ['storia', 'reel'].includes(postType) ? 'vertical' : 'square';
    
    try {
      const slideData = slides.map(slide => {
        let parsed;
        try { parsed = JSON.parse(slide.content); } catch { parsed = { title: topic }; }
        return { title: parsed.title || topic, body: parsed.body || '', theme: topic };
      });

      // Simulate per-slide progress since API returns all at once
      const progressInterval = setInterval(() => {
        setImageGenProgress(prev => {
          if (prev.current < prev.total - 1) {
            return { ...prev, current: prev.current + 1 };
          }
          return prev;
        });
      }, 2000);

      const { data, error } = await supabase.functions.invoke('generate-carousel-images', {
        body: { slides: slideData, style: 'modern, clean, professional healthcare', format: imageFormat, brandId: activeBrandId }
      });

      clearInterval(progressInterval);

      if (error) {
        console.error('Error calling generate-carousel-images:', error);
        toast({ title: "Errore generazione immagini", description: "Non è stato possibile generare le immagini. Riprova.", variant: "destructive" });
        setImageGenProgress({ current: 0, total: 0 });
        setIsGeneratingImages(false);
        return;
      }

      if (data?.images) {
        const successCount = data.images.filter((img: any) => img.url).length;
        const totalCount = data.images.length;

        setImageGenProgress({ current: totalCount, total: totalCount });

        setCarouselSlides(prev => prev.map((slide, i) => ({
          ...slide,
          imageUrl: data.images[i]?.url || slide.imageUrl,
          imageAlternatives: data.images[i]?.alternatives || slide.imageAlternatives
        })));
        // ARCHIVIO: ogni generazione (post, carosello, storia, reel) viene salvata come NON pubblicata.
        try { const kindMap: Record<string, any> = { "carosello": "carosello", "post-singolo": "post", "storia": "storia", "reel": "reel" }; let firstTitle = topic; const parts: string[] = []; for (const sl of slides) { try { const p = JSON.parse(sl.content); if (!parts.length && p.title) firstTitle = p.title; parts.push([p.title, p.subtitle, p.body].filter(Boolean).join(" - ")); } catch (e2) { /* slide non leggibile */ } } await archiveContent({ title: firstTitle, contentText: parts.filter(Boolean).join(String.fromCharCode(10, 10)), topic, kind: kindMap[postType] || "post", images: (data.images || []).map((im: any) => im && im.url).filter(Boolean) }); console.log("[archivio] salvato:", firstTitle); } catch (e) { console.warn("[archivio] non salvato:", e); }

        if (successCount === 0) {
          toast({ title: "Immagini non generate", description: "Riprova tra qualche secondo", variant: "destructive" });
        } else if (successCount < totalCount) {
          toast({ title: `${successCount}/${totalCount} immagini generate`, description: "Alcune immagini non sono state create. Usa 'Rigenera Immagini' per riprovare." });
        }
      }
    } catch (err) {
      console.error('Error generating images:', err);
      toast({ title: "Errore generazione immagini", description: "Si è verificato un errore. Riprova.", variant: "destructive" });
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const regenerateImages = useCallback(async () => {
    if (carouselSlides.length === 0) return;
    const topic = formData.description;
    if (!topic.trim()) return;
    toast({ title: "Rigenerazione immagini...", description: "Creazione immagini in corso" });
    await generateImagesForSlides(carouselSlides, topic);
  }, [carouselSlides, formData.description, formData.postType]);

  return {
    carouselSlides,
    setCarouselSlides,
    generateCarouselSlides,
    isGeneratingImages,
    regenerateImages,
    imageGenProgress
  };
};

function createFallbackSlides(topic: string, numSlides: number, user: any, basePhoto: string | null): CarouselSlide[] {
  const slideTypes = ['attention', 'problem', 'solution', 'results', 'cta'];
  const slides: CarouselSlide[] = [];
  const clinicName = user?.user_metadata?.clinic_name || 'Studio Fisioterapico';

  for (let i = 0; i < numSlides && i < slideTypes.length; i++) {
    slides.push({
      type: slideTypes[i],
      content: JSON.stringify({
        title: i === 0 ? topic.toUpperCase() : `PUNTO ${i}`,
        subtitle: i === 0 ? 'Scopri di più' : '',
        body: `Contenuto su ${topic}`,
        number: i === 0 ? '' : `${i}`,
        cta: i === numSlides - 1 ? 'Scopri di più →' : '',
        banner: i > 0 && i < numSlides - 1 ? 'Swipe →' : '',
        footer: clinicName,
        logo: clinicName,
      }),
      imageUrl: undefined,
      userImageUrl: basePhoto && i === 0 ? basePhoto : undefined
    });
  }

  return slides;
}
