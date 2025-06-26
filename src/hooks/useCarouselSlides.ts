
import { useState, useCallback, useMemo } from 'react';

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

  const getRelevantImages = useMemo(() => {
    return (topic: string) => {
      const topicLower = topic.toLowerCase();
      
      const imageCategories = {
        'mal di schiena': [
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center'
        ],
        'postura': [
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center'
        ],
        'esercizi': [
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center'
        ],
        'riabilitazione': [
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center'
        ]
      };

      for (const [category, images] of Object.entries(imageCategories)) {
        if (topicLower.includes(category)) {
          return images;
        }
      }

      return imageCategories['mal di schiena'];
    };
  }, []);

  const generateCarouselSlides = useCallback(() => {
    const numSlides = parseInt(formData.numSlides);
    const slides: CarouselSlide[] = [];
    const topic = formData.description;
    
    const relevantImages = getRelevantImages(topic);
    
    const slideContents = [
      `🚨 ${topic.toUpperCase()}\n\nSCOPRI LA VERITÀ che i dottori non ti dicono!\n\n👉 Swipe per la soluzione →`,
      `❌ ERRORE #1\n\nLa maggior parte delle persone fa questo sbaglio con ${topic}...\n\n💡 Ecco cosa dovresti fare invece:`,
      `✅ LA SOLUZIONE\n\n3 passi scientifici per risolvere ${topic}:\n\n1️⃣ [Primo step]\n2️⃣ [Secondo step]\n3️⃣ [Terzo step]`,
      `🔥 RISULTATI GARANTITI\n\nCosa succede quando applichi questo metodo:\n\n• Miglioramento in 7 giorni\n• Dolore ridotto del 80%\n• Movimento naturale`,
      `🎯 CALL TO ACTION\n\nVuoi risultati concreti?\n\n📞 Prenota consulenza GRATUITA\n💬 Scrivici in DM\n🏢 ${user?.user_metadata?.clinic_name || 'Il tuo studio'}\n\n#fisioterapia #salute`
    ];
    
    for (let i = 0; i < numSlides; i++) {
      slides.push({
        type: i === 0 ? 'cover' : 'content',
        content: slideContents[i] || `Slide ${i + 1}: ${topic}`,
        imageUrl: relevantImages[i % relevantImages.length],
        userImageUrl: basePhoto && i === 0 ? basePhoto : undefined
      });
    }
    
    setCarouselSlides(slides);
  }, [formData.numSlides, formData.description, getRelevantImages, user, basePhoto]);

  return {
    carouselSlides,
    setCarouselSlides,
    generateCarouselSlides
  };
};
