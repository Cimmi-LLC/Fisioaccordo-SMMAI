
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
  postType?: string;
}

export const useCarouselSlides = (formData: FormData, user: any, basePhoto: string | null) => {
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const generateCarouselSlides = useCallback(async () => {
    const postType = formData.postType || 'carosello';
    const isSinglePost = ['post-singolo', 'storia', 'reel'].includes(postType);
    const numSlides = isSinglePost ? 1 : parseInt(formData.numSlides);
    const topic = formData.description;

    if (!topic.trim()) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          topic,
          audience: '',
          platform: 'instagram',
          tone: 'professionale',
          postType,
          numSlides
        }
      });

      if (error || data?.error) {
        console.error('Error generating slides:', error || data?.error);
      const fallbackSlides = createFallbackSlides(topic, numSlides, user, basePhoto);
      setCarouselSlides(fallbackSlides);
      generateImagesForSlides(fallbackSlides, topic);
      return;
      }

      // For single posts, create 1 slide from the generated content
      if (isSinglePost) {
        const content = data?.content || topic;
        const lines = content.split('\n').filter((l: string) => l.trim());
        const singleSlide: CarouselSlide = {
          type: 'attention',
          content: JSON.stringify({
            title: lines[0] || topic.toUpperCase(),
            subtitle: lines[1] || '',
            body: lines.slice(2, 5).join('\n') || content.substring(0, 200),
            number: '',
            cta: '',
            banner: '',
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
      generateImagesForSlides(aiSlides, topic);
    } catch (err) {
      console.error('Exception generating slides:', err);
      const fallbackSlides = createFallbackSlides(topic, numSlides, user, basePhoto);
      setCarouselSlides(fallbackSlides);
      generateImagesForSlides(fallbackSlides, topic);
    }
  }, [formData.numSlides, formData.description, formData.postType, user, basePhoto]);

  const generateImagesForSlides = async (slides: CarouselSlide[], topic: string) => {
    setIsGeneratingImages(true);
    const postType = formData.postType || 'carosello';
    const imageFormat = ['storia', 'reel'].includes(postType) ? 'vertical' : 'square';
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
        body: { slides: slideData, style: 'modern, clean, professional healthcare', format: imageFormat }
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
