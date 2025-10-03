
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

// Sistema di contenuti intelligenti basato su topic specifici
const contentDatabase = {
  'mal di schiena': {
    attention: {
      title: 'MAL DI SCHIENA',
      subtitle: 'FERMATI PRIMA CHE PEGGIORI!',
      body: 'Il 90% delle persone fa questi errori fatali che peggiorano il dolore'
    },
    problem: {
      title: 'ERRORE FATALE',
      subtitle: 'Stai rovinando la tua schiena',
      body: 'Usare solo farmaci antidolorifici senza risolvere la causa. Il dolore ritorna sempre più forte perché il problema vero rimane.'
    },
    solution: {
      title: 'LA VERA SOLUZIONE',
      subtitle: '3 passi scientifici',
      body: '1️⃣ Identifica la postura scorretta\n2️⃣ Rinforza i muscoli profondi\n3️⃣ Correggi gli squilibri muscolari'
    },
    results: {
      title: 'RISULTATI IN 7 GIORNI',
      subtitle: 'Testimonianze reali',
      body: '✅ Dolore ridotto dell\'85%\n✅ Movimento libero\n✅ Niente più risvegli dolorosi'
    },
    cta: {
      title: 'BASTA SOFFRIRE',
      subtitle: 'Consulenza gratuita oggi',
      body: 'Prenota la tua valutazione GRATUITA'
    }
  },
  'postura': {
    attention: {
      title: 'POSTURA SBAGLIATA',
      subtitle: 'STAI INVECCHIANDO PRIMA!',
      body: 'La tua postura sta causando danni irreversibili al tuo corpo'
    },
    problem: {
      title: 'ERRORE COMUNE',
      subtitle: 'Pensi che basti "stare dritto"',
      body: 'Forzare la postura senza rinforzare i muscoli giusti peggiora tutto. Serve un approccio scientifico.'
    },
    solution: {
      title: 'METODO CORRETTIVO',
      subtitle: 'Postura naturale in 21 giorni',
      body: '1️⃣ Allunga i muscoli accorciati\n2️⃣ Rinforza i muscoli deboli\n3️⃣ Rieduca il movimento'
    },
    results: {
      title: 'TRASFORMAZIONE REALE',
      subtitle: 'Risultati visibili subito',
      body: '✅ Schiena dritta naturalmente\n✅ Più energia ogni giorno\n✅ Aspetto più giovane di 10 anni'
    },
    cta: {
      title: 'CAMBIA LA TUA POSTURA',
      subtitle: 'Analisi posturale gratuita',
      body: 'Scopri cosa sta rovinando la tua postura'
    }
  },
  'esercizi': {
    attention: {
      title: 'ESERCIZI SBAGLIATI',
      subtitle: 'TI STANNO FACENDO MALE!',
      body: 'Il 95% degli esercizi fai-da-te peggiorano i problemi'
    },
    problem: {
      title: 'ERRORE DEVASTANTE',
      subtitle: 'Fai esercizi random da YouTube',
      body: 'Ogni corpo ha bisogni diversi. Esercizi generici possono peggiorare squilibri esistenti e creare nuovi problemi.'
    },
    solution: {
      title: 'PIANO PERSONALIZZATO',
      subtitle: 'Esercizi mirati per te',
      body: '1️⃣ Valutazione biomeccanica\n2️⃣ Esercizi specifici per il tuo caso\n3️⃣ Progressione controllata'
    },
    results: {
      title: 'FORZA E MOBILITÀ',
      subtitle: 'Corpo nuovo in 30 giorni',
      body: '✅ Forza funzionale aumentata\n✅ Dolori scomparsi\n✅ Movimento fluido e naturale'
    },
    cta: {
      title: 'PIANO SU MISURA',
      subtitle: 'Valutazione gratuita',
      body: 'Crea il tuo programma personalizzato'
    }
  },
  'distorsione caviglia': {
    attention: {
      title: 'CAVIGLIA DISTORTA',
      subtitle: 'RISCHI LA RICADUTA!',
      body: 'Senza riabilitazione corretta, ricadrai nel 80% dei casi'
    },
    problem: {
      title: 'ERRORE CRITICO',
      subtitle: 'Pensi che il riposo basti',
      body: 'Solo riposo e ghiaccio non bastano. Servono esercizi specifici per ripristinare stabilità e propriocezione.'
    },
    solution: {
      title: 'PROTOCOLLO COMPLETO',
      subtitle: 'Recupero in 3 fasi',
      body: '1️⃣ Riduzione infiammazione\n2️⃣ Ripristino mobilità\n3️⃣ Rinforzo e stabilizzazione'
    },
    results: {
      title: 'CAVIGLIA FORTE',
      subtitle: 'Niente più distorsioni',
      body: '✅ Stabilità perfetta\n✅ Zero rischio ricadute\n✅ Performance migliori di prima'
    },
    cta: {
      title: 'RECUPERO COMPLETO',
      subtitle: 'Protocollo professionale',
      body: 'Evita ricadute per sempre'
    }
  },
  'riabilitazione': {
    attention: {
      title: 'RIABILITAZIONE LENTA',
      subtitle: 'STAI PERDENDO TEMPO!',
      body: 'Metodi obsoleti ti fanno perdere mesi di recupero'
    },
    problem: {
      title: 'ERRORE COSTOSO',
      subtitle: 'Fai riabilitazione generica',
      body: 'Ogni infortunio ha tempi e metodi specifici. Approcci standard rallentano il recupero e aumentano i rischi.'
    },
    solution: {
      title: 'METODO AVANZATO',
      subtitle: 'Recupero accelerato',
      body: '1️⃣ Diagnosi precisa del danno\n2️⃣ Protocollo evidence-based\n3️⃣ Monitoraggio continuo'
    },
    results: {
      title: 'RECUPERO RAPIDO',
      subtitle: 'Torni più forte di prima',
      body: '✅ Tempi dimezzati\n✅ Zero compensi\n✅ Performance superiori'
    },
    cta: {
      title: 'RECUPERO VELOCE',
      subtitle: 'Valutazione specialistica',
      body: 'Accelera il tuo recupero oggi'
    }
  }
};

export const useCarouselSlides = (formData: FormData, user: any, basePhoto: string | null) => {
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);

  const getRelevantImages = useMemo(() => {
    return (topic: string) => {
      const topicLower = topic.toLowerCase();
      
      const imageCategories = {
        'mal di schiena': [
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1080&h=1080&fit=crop&crop=center'
        ],
        'postura': [
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1080&h=1080&fit=crop&crop=center'
        ],
        'esercizi': [
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1080&h=1080&fit=crop&crop=center'
        ],
        'riabilitazione': [
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1080&h=1080&fit=crop&crop=center',
          'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1080&h=1080&fit=crop&crop=center'
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

  // Funzione per trovare il contenuto specifico basato sul topic
  const getTopicContent = useCallback((topic: string) => {
    const topicLower = topic.toLowerCase();
    
    // Cerca match esatto nei contentDatabase keys
    for (const [key, content] of Object.entries(contentDatabase)) {
      if (topicLower.includes(key)) {
        return content;
      }
    }
    
    // Default a mal di schiena se non trova match
    return contentDatabase['mal di schiena'];
  }, []);

  const generateCarouselSlides = useCallback(() => {
    const numSlides = parseInt(formData.numSlides);
    const slides: CarouselSlide[] = [];
    const topic = formData.description;
    
    const relevantImages = getRelevantImages(topic);
    const topicContent = getTopicContent(topic);
    
    // Template delle slide con contenuto completo e specifico
    const slideTemplates = [
      {
        type: 'attention',
        data: {
          title: topicContent.attention.title,
          subtitle: topicContent.attention.subtitle,
          body: topicContent.attention.body,
          imageUrl: relevantImages[0]
        }
      },
      {
        type: 'problem',
        data: {
          title: topicContent.problem.title,
          subtitle: topicContent.problem.subtitle,
          body: topicContent.problem.body,
          imageUrl: relevantImages[1]
        }
      },
      {
        type: 'solution',
        data: {
          title: topicContent.solution.title,
          subtitle: topicContent.solution.subtitle,
          body: topicContent.solution.body,
          imageUrl: relevantImages[2]
        }
      },
      {
        type: 'results',
        data: {
          title: topicContent.results.title,
          subtitle: topicContent.results.subtitle,
          body: topicContent.results.body,
          imageUrl: relevantImages[3]
        }
      },
      {
        type: 'cta',
        data: {
          title: topicContent.cta.title,
          subtitle: topicContent.cta.subtitle,
          body: topicContent.cta.body,
          footer: user?.user_metadata?.clinic_name || 'Studio Fisioterapico',
          imageUrl: relevantImages[4]
        }
      }
    ];
    
    for (let i = 0; i < numSlides && i < slideTemplates.length; i++) {
      const template = slideTemplates[i];
      slides.push({
        type: template.type,
        content: JSON.stringify(template.data), // Salviamo i dati strutturati come JSON
        imageUrl: template.data.imageUrl,
        userImageUrl: basePhoto && i === 0 ? basePhoto : undefined
      });
    }
    
    setCarouselSlides(slides);
  }, [formData.numSlides, formData.description, getRelevantImages, getTopicContent, user, basePhoto]);

  return {
    carouselSlides,
    setCarouselSlides,
    generateCarouselSlides
  };
};
