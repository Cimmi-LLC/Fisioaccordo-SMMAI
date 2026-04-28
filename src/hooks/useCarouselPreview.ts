import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useToast } from '@/hooks/use-toast';
import type { CarouselData, CarouselSlideData, SlideRenderConfig } from '@/types/carousel';

export const useCarouselPreview = (initialData: CarouselData | null) => {
  const { user } = useAuth();
  const { activeBrand, activeBrandId } = useActiveBrand();
  const { toast } = useToast();
  const [carousel, setCarousel] = useState<CarouselData | null>(initialData);
  const [activeSlide, setActiveSlide] = useState(0);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0 });
  const [regeneratingImage, setRegeneratingImage] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [renderConfig, setRenderConfig] = useState<SlideRenderConfig>({
    format: '1:1',
    brandColor: '#554697',
    brandColorSecondary: '#E6007E',
    brandFont: 'Montserrat',
    logoUrl: '',
    overlayOpacity: 0.55,
  });

  // Sync with initialData
  useEffect(() => {
    if (initialData) {
      setCarousel(initialData);
      setActiveSlide(0);
    }
  }, [initialData]);

  // Sync render config from active brand (no separate fetch)
  useEffect(() => {
    if (!activeBrand) return;
    setRenderConfig(prev => ({
      ...prev,
      brandColor: activeBrand.colore_primario || prev.brandColor,
      brandColorSecondary: activeBrand.colore_secondario || prev.brandColorSecondary,
      brandFont: activeBrand.font_intestazioni || prev.brandFont,
      logoUrl: activeBrand.logo_url || '',
    }));
  }, [activeBrandId, activeBrand]);

  // Auto-generate images when NEW carousel data arrives
  const [lastGeneratedTitle, setLastGeneratedTitle] = useState('');
  useEffect(() => {
    if (!carousel || !user) return;
    if (carousel.titolo_carosello === lastGeneratedTitle) return;
    const slidesWithImages = carousel.slides.filter(s => s.tipo === 'content' || s.tipo === 'cover');
    if (slidesWithImages.length === 0) return;
    const needsImages = slidesWithImages.some(s => !s.imageUrl);
    if (!needsImages || generatingImages) return;
    setLastGeneratedTitle(carousel.titolo_carosello);
    // Call inline to avoid stale closure
    (async () => {
      setGeneratingImages(true);
      const contentCount = slidesWithImages.length;
      setImageProgress({ current: 0, total: contentCount });
      try {
        const slideInputs = carousel.slides.map(s => ({
          tipo: s.tipo,
          keywords_stock: s.keywords_stock || [],
          numero: s.numero,
        }));
        const interval = setInterval(() => {
          setImageProgress(prev => ({ ...prev, current: Math.min(prev.current + 1, prev.total - 1) }));
        }, 2500);
        const { data, error } = await supabase.functions.invoke('generate-carousel-images', {
          body: { slides: slideInputs, format: renderConfig.format, userId: user.id, carouselId: Date.now().toString(), brandId: activeBrandId || undefined }
        });
        clearInterval(interval);
        if (data?.images) {
          setCarousel(prev => {
            if (!prev) return prev;
            return { ...prev, slides: prev.slides.map((s, i) => {
              const img = data.images.find((im: { index: number }) => im.index === i);
              return img?.url ? { ...s, imageUrl: img.url, imageAlternatives: img.alternatives || [], immagine: { promptUsed: img.promptUsed || '', url: img.url, generatedAt: new Date().toISOString(), fallback: false } } : s;
            })};
          });
          const successCount = data.images.filter((im: { url: string | null }) => im.url).length;
          setImageProgress({ current: contentCount, total: contentCount });
          if (successCount > 0) toast({ title: `${successCount} immagini generate!` });
        }
        if (error || data?.error) {
          toast({ title: 'Errore immagini', description: 'Puoi rigenerarle singolarmente.', variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Errore', description: String(err), variant: 'destructive' });
      } finally {
        setGeneratingImages(false);
      }
    })();
  }, [carousel?.titolo_carosello, user]);

  const generateAllImages = useCallback(async () => {
    if (!carousel || !user) return;
    const contentCount = carousel.slides.filter(s => s.tipo === 'content').length;
    setGeneratingImages(true);
    setImageProgress({ current: 0, total: contentCount });

    try {
      const slideInputs = carousel.slides.map(s => ({
        tipo: s.tipo,
        keywords_stock: s.keywords_stock || [],
        numero: s.numero,
      }));

      // Progress simulation
      const interval = setInterval(() => {
        setImageProgress(prev => ({
          ...prev,
          current: Math.min(prev.current + 1, prev.total - 1),
        }));
      }, 2500);

      const { data, error } = await supabase.functions.invoke('generate-carousel-images', {
        body: {
          slides: slideInputs,
          format: renderConfig.format,
          userId: user.id,
          carouselId: Date.now().toString(),
          brandId: activeBrandId || undefined,
        }
      });

      clearInterval(interval);

      if (error || data?.error) {
        console.error('Image generation error:', error || data?.error);
        toast({ title: 'Errore immagini', description: 'Alcune immagini non sono state generate. Puoi rigenerarle singolarmente.', variant: 'destructive' });
      }

      if (data?.images) {
        setCarousel(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            slides: prev.slides.map((s, i) => {
              const img = data.images.find((im: { index: number }) => im.index === i);
              if (img?.url) {
                return {
                  ...s,
                  imageUrl: img.url,
                  imageAlternatives: img.alternatives || [],
                  immagine: {
                    promptUsed: img.queryUsed || (s.keywords_stock || []).join(' '),
                    url: img.url,
                    generatedAt: new Date().toISOString(),
                    fallback: false,
                  },
                };
              }
              return s;
            }),
          };
        });

        const successCount = data.images.filter((im: { url: string | null }) => im.url).length;
        setImageProgress({ current: carousel.slides.length, total: carousel.slides.length });

        if (successCount === carousel.slides.length) {
          toast({ title: 'Immagini generate!', description: `${successCount} immagini create con Freepik` });
        } else if (successCount > 0) {
          toast({ title: `${successCount}/${carousel.slides.length} immagini generate`, description: 'Rigenera le mancanti cliccando sulla slide' });
        }
      }
    } catch (err) {
      console.error('Image generation error:', err);
      toast({ title: 'Errore', description: 'Impossibile generare le immagini', variant: 'destructive' });
    } finally {
      setGeneratingImages(false);
    }
  }, [carousel, user, renderConfig.format, toast]);

  const regenerateSingleImage = useCallback(async (index: number, customPrompt?: string) => {
    if (!carousel || !user) return;
    setRegeneratingImage(index);

    try {
      const slide = carousel.slides[index];
      const keywords = customPrompt ? customPrompt.split(/[,\s]+/).filter(Boolean) : (slide.keywords_stock || []);

      const { data, error } = await supabase.functions.invoke('generate-carousel-images', {
        body: {
          slides: carousel.slides.map(s => ({
            tipo: s.tipo,
            keywords_stock: customPrompt ? customPrompt.split(/[,\s]+/).filter(Boolean) : (s.keywords_stock || []),
            numero: s.numero,
          })),
          userId: user.id,
          carouselId: Date.now().toString(),
          singleIndex: index,
          brandId: activeBrandId || undefined,
        }
      });

      if (error || data?.error) throw new Error(data?.error || 'Errore');

      const img = data?.images?.[0];
      if (img?.url) {
        setCarousel(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            slides: prev.slides.map((s, i) => i === index ? {
              ...s,
              imageUrl: img.url,
              imageAlternatives: img.alternatives || [],
              keywords_stock: customPrompt ? customPrompt.split(/[,\s]+/).filter(Boolean) : s.keywords_stock,
              immagine: {
                promptUsed: img.promptUsed || prompt,
                url: img.url,
                generatedAt: new Date().toISOString(),
                fallback: false,
              },
            } : s),
          };
        });
        toast({ title: 'Immagine rigenerata!' });
      }
    } catch (err) {
      toast({ title: 'Errore', description: String(err), variant: 'destructive' });
    } finally {
      setRegeneratingImage(null);
    }
  }, [carousel, user, renderConfig.format, toast]);

  const [swappingImage, setSwappingImage] = useState<number | null>(null);
  const swapSlideImage = useCallback(async (
    index: number,
    source: { imageUrl?: string; dataUrl?: string }
  ) => {
    if (!user) return;
    setSwappingImage(index);
    try {
      const { data, error } = await supabase.functions.invoke('save-slide-image', {
        body: {
          imageUrl: source.imageUrl,
          dataUrl: source.dataUrl,
          userId: user.id,
          slideIndex: index,
        },
      });
      if (error || data?.error || !data?.url) {
        throw new Error(data?.error || error?.message || 'Errore');
      }
      const newUrl = data.url as string;
      setCarousel(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          slides: prev.slides.map((s, i) => {
            if (i !== index) return s;
            const oldAlts = s.imageAlternatives || [];
            const previousUrl = s.imageUrl;
            const nextAlts = source.imageUrl
              ? [...oldAlts.filter(u => u !== source.imageUrl), ...(previousUrl ? [previousUrl] : [])]
              : oldAlts;
            return { ...s, imageUrl: newUrl, imageAlternatives: nextAlts };
          }),
        };
      });
      toast({ title: 'Immagine cambiata' });
    } catch (e) {
      toast({
        title: 'Errore cambio immagine',
        description: e instanceof Error ? e.message : 'Riprova',
        variant: 'destructive',
      });
    } finally {
      setSwappingImage(null);
    }
  }, [user, toast]);

  const updateSlideText = useCallback((index: number, field: 'titolo' | 'testo', value: string) => {
    setCarousel(prev => {
      if (!prev) return prev;
      return { ...prev, slides: prev.slides.map((s, i) => i === index ? { ...s, [field]: value } : s) };
    });
  }, []);

  const updateSlidePrompt = useCallback((index: number, prompt: string) => {
    setCarousel(prev => {
      if (!prev) return prev;
      return { ...prev, slides: prev.slides.map((s, i) => i === index ? { ...s, prompt_immagine: prompt } : s) };
    });
  }, []);

  const regenerateSlide = useCallback(async (index: number) => {
    if (!carousel) return;
    setRegeneratingSlide(index);
    try {
      const slide = carousel.slides[index];
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          topic: `Riscrivi SOLO la slide ${slide.numero} (ruolo: ${slide.ruolo}) del carosello "${carousel.titolo_carosello}". Contesto: ${carousel.hook_principale}`,
          numSlides: '1',
          postType: 'carosello',
        }
      });
      if (error || data?.error) throw new Error(data?.error || 'Errore');

      const newSlide = data.slides?.[0];
      if (newSlide) {
        setCarousel(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            slides: prev.slides.map((s, i) => i === index ? {
              ...s,
              titolo: newSlide.titolo || newSlide.title || s.titolo,
              testo: newSlide.testo || newSlide.body || s.testo,
              keywords_stock: newSlide.keywords_stock || s.keywords_stock,
            } : s),
          };
        });
        toast({ title: 'Slide rigenerata!' });
      }
    } catch (err) {
      toast({ title: 'Errore', description: String(err), variant: 'destructive' });
    } finally {
      setRegeneratingSlide(null);
    }
  }, [carousel, toast]);

  const nextSlide = useCallback(() => {
    if (!carousel) return;
    setActiveSlide(prev => Math.min(prev + 1, carousel.slides.length - 1));
  }, [carousel]);

  const prevSlide = useCallback(() => {
    setActiveSlide(prev => Math.max(prev - 1, 0));
  }, []);

  const copyCaption = useCallback(() => {
    if (!carousel) return;
    const text = carousel.caption_instagram + '\n\n' + carousel.hashtag_suggeriti.map(h => '#' + h.replace('#', '')).join(' ');
    navigator.clipboard.writeText(text);
    toast({ title: 'Caption copiata!' });
  }, [carousel, toast]);

  return {
    carousel,
    activeSlide,
    setActiveSlide,
    editingSlide,
    setEditingSlide,
    regeneratingSlide,
    generatingImages,
    imageProgress,
    regeneratingImage,
    exporting,
    setExporting,
    renderConfig,
    updateSlideText,
    updateSlidePrompt,
    regenerateSlide,
    regenerateSingleImage,
    generateAllImages,
    swapSlideImage,
    swappingImage,
    nextSlide,
    prevSlide,
    copyCaption,
  };
};
