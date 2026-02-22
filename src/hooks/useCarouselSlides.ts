
import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface FormData {
  numSlides: string;
  description: string;
}

export const useCarouselSlides = (formData: FormData, user: any, basePhoto: string | null) => {
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const generateCarouselSlides = useCallback(async () => {
    const numSlides = parseInt(formData.numSlides);
    const topic = formData.description;

    if (!topic.trim()) return;

    try {
      // Generate content via edge function
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          topic,
          audience: '',
          platform: 'instagram',
          tone: 'professionale',
          postType: 'carosello',
          numSlides
        }
      });

      if (error || data?.error) {
        console.error('Error generating slides:', error || data?.error);
        // Fallback: create basic slides
        const fallbackSlides = createFallbackSlides(topic, numSlides, user, basePhoto);
        setCarouselSlides(fallbackSlides);
        return;
      }

      const aiSlides: CarouselSlide[] = (data.slides || []).slice(0, numSlides).map(
        (slide: { title: string; subtitle: string; body: string; cta?: string | null; number?: string | null; banner?: string | null }, i: number) => ({
          type: i === 0 ? 'attention' : i === numSlides - 1 ? 'cta' : i === 1 ? 'problem' : 'solution',
          content: JSON.stringify({
            title: slide.title,
            subtitle: slide.subtitle,
            body: slide.body,
            number: slide.number || '',
            cta: slide.cta || '',
            banner: slide.banner || '',
            logo: user?.user_metadata?.clinic_name || 'Studio Fisioterapico',
            footer: i === numSlides - 1 ? (user?.user_metadata?.clinic_name || 'Studio Fisioterapico') : (slide.cta || ''),
          }),
          imageUrl: undefined,
          userImageUrl: basePhoto && i === 0 ? basePhoto : undefined
        })
      );

      setCarouselSlides(aiSlides);

      // Generate images in background
      generateImagesForSlides(aiSlides, topic);
    } catch (err) {
      console.error('Exception generating slides:', err);
      const fallbackSlides = createFallbackSlides(topic, numSlides, user, basePhoto);
      setCarouselSlides(fallbackSlides);
    }
  }, [formData.numSlides, formData.description, user, basePhoto]);

  const generateImagesForSlides = async (slides: CarouselSlide[], topic: string) => {
    setIsGeneratingImages(true);
    try {
      const slideData = slides.map(slide => {
        let parsed;
        try { parsed = JSON.parse(slide.content); } catch { parsed = { title: topic }; }
        return {
          title: parsed.title || topic,
          body: parsed.body || '',
          theme: topic
        };
      });

      const { data, error } = await supabase.functions.invoke('generate-carousel-images', {
        body: { slides: slideData, style: 'modern, clean, professional healthcare' }
      });

      if (!error && data?.images) {
        setCarouselSlides(prev => prev.map((slide, i) => ({
          ...slide,
          imageUrl: data.images[i]?.url || slide.imageUrl
        })));
      }
    } catch (err) {
      console.error('Error generating images:', err);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  return {
    carouselSlides,
    setCarouselSlides,
    generateCarouselSlides,
    isGeneratingImages
  };
};

function createFallbackSlides(topic: string, numSlides: number, user: any, basePhoto: string | null): CarouselSlide[] {
  const slideTypes = ['attention', 'problem', 'solution', 'results', 'cta'];
  const slides: CarouselSlide[] = [];

  for (let i = 0; i < numSlides && i < slideTypes.length; i++) {
    slides.push({
      type: slideTypes[i],
      content: JSON.stringify({
        title: i === 0 ? topic.toUpperCase() : `PUNTO ${i}`,
        subtitle: i === 0 ? 'Scopri di più' : '',
        body: `Contenuto su ${topic}`,
        ...(i === numSlides - 1 && { footer: user?.user_metadata?.clinic_name || 'Studio Fisioterapico' })
      }),
      imageUrl: undefined,
      userImageUrl: basePhoto && i === 0 ? basePhoto : undefined
    });
  }

  return slides;
}
