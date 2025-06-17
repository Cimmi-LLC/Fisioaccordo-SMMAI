import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { contentService } from "@/services/contentService";
import { 
  Loader2, 
  LogOut, 
  Sparkles
} from "lucide-react";
import ImageEditor from "@/components/ImageEditor";
import IdeaGenerator from "@/components/IdeaGenerator";
import ContentForm from "@/components/ContentForm";
import PreviewSection from "@/components/PreviewSection";
import HookGenerator from "@/components/HookGenerator";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  
  const [ideaInput, setIdeaInput] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    audience: '',
    length: 'medio',
    tone: 'professionale',
    platform: 'instagram',
    postType: 'carosello',
    numSlides: '5',
    numImages: '1'
  });
  
  const [generatedContent, setGeneratedContent] = useState('');
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedContents, setSavedContents] = useState<any[]>([]);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showHookGenerator, setShowHookGenerator] = useState(false);
  const [hookTopic, setHookTopic] = useState('');
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [appliedHook, setAppliedHook] = useState<string>('');
  const [basePhoto, setBasePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadSavedContents();
    }
  }, [user]);

  const loadSavedContents = async () => {
    const { data, error } = await contentService.getUserContents();
    if (data && !error) {
      setSavedContents(data);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIdeaGenerated = (idea: string) => {
    setFormData(prev => ({ ...prev, description: idea }));
  };

  const getRelevantImages = (topic: string) => {
    const topicLower = topic.toLowerCase();
    
    // Immagini specifiche per argomenti fisioterapici
    const imageCategories = {
      'mal di schiena': [
        'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center'
      ],
      'postura': [
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center'
      ],
      'esercizi': [
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&crop=center'
      ],
      'riabilitazione': [
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center'
      ]
    };

    // Trova la categoria più pertinente
    for (const [category, images] of Object.entries(imageCategories)) {
      if (topicLower.includes(category)) {
        return images;
      }
    }

    // Default per argomenti fisioterapici generici
    return imageCategories['mal di schiena'];
  };

  const generateCarouselSlides = () => {
    const numSlides = parseInt(formData.numSlides);
    const slides: CarouselSlide[] = [];
    
    // Ottieni immagini pertinenti al topic
    const relevantImages = getRelevantImages(formData.description);
    
    for (let i = 0; i < numSlides; i++) {
      slides.push({
        type: i === 0 ? 'cover' : 'content',
        content: i === 0 
          ? `${formData.description.toUpperCase()}`
          : `Slide ${i + 1}: Contenuto per ${formData.description}`,
        imageUrl: relevantImages[i % relevantImages.length],
        userImageUrl: basePhoto && i === 0 ? basePhoto : undefined
      });
    }
    
    setCarouselSlides(slides);
  };

  const generateContent = async () => {
    if (!formData.description.trim()) {
      toast({
        title: "Campo obbligatorio",
        description: "Inserisci una descrizione per generare il contenuto",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockContent = `🏥 **${formData.description.toUpperCase()}** 🏥

💡 Hai mai pensato a quanto sia importante prendersi cura di questo aspetto della tua salute?

Come fisioterapista, vedo ogni giorno quanto una corretta prevenzione possa fare la differenza.

✅ 3 consigli pratici:
1. Mantieni una postura corretta
2. Fai stretching quotidiano  
3. Non ignorare i primi segnali di dolore

🎯 La prevenzione è sempre meglio della cura!

Vuoi saperne di più? Prenota una valutazione gratuita!

📞 Chiamaci o scrivici in DM
🏢 ${user?.user_metadata?.clinic_name || 'Il tuo studio'}

#fisioterapia #salute #benessere #prevenzione`;

      setGeneratedContent(mockContent);
      
      // Genera le slide del carosello
      generateCarouselSlides();
      
      toast({
        title: "🎉 Contenuto generato!",
        description: "Il tuo post è pronto per essere pubblicato"
      });

    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la generazione del contenuto",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveContent = async () => {
    if (!generatedContent) return;

    try {
      const { error } = await contentService.saveContent({
        title: formData.description,
        contentText: generatedContent,
        topic: formData.description,
        audience: formData.audience,
        platform: formData.platform,
        postType: formData.postType,
        tone: formData.tone,
        length: formData.length,
        images: carouselSlides.map(slide => slide.userImageUrl || slide.imageUrl || '')
      });

      if (error) {
        toast({
          title: "Errore salvataggio",
          description: "Non è stato possibile salvare il contenuto",
          variant: "destructive"
        });
      } else {
        toast({
          title: "✅ Contenuto salvato!",
          description: "Il post è stato aggiunto ai tuoi contenuti salvati"
        });
        loadSavedContents();
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il salvataggio",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/auth');
    }
  };

  const handleImageEdit = (imageUrl: string, slideIndex: number) => {
    setSelectedImageForEdit(imageUrl);
    setEditingSlideIndex(slideIndex);
  };

  const handleImageUpdate = (newUrl: string) => {
    if (editingSlideIndex !== null) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[editingSlideIndex].userImageUrl = newUrl;
      setCarouselSlides(updatedSlides);
    }
    setSelectedImageForEdit(null);
    setEditingSlideIndex(null);
  };

  const applyHookToContent = (hook: string) => {
    setGeneratedContent(prev => {
      const lines = prev.split('\n');
      lines[0] = hook;
      return lines.join('\n');
    });
    setAppliedHook(hook);
    toast({
      title: "Hook applicato! 🎯",
      description: "L'hook è stato inserito nel tuo contenuto"
    });
  };

  const removeHook = () => {
    setGeneratedContent(prev => {
      const lines = prev.split('\n');
      lines.shift();
      return lines.join('\n');
    });
    setAppliedHook('');
    toast({
      title: "Hook rimosso",
      description: "L'hook è stato rimosso dal contenuto"
    });
  };

  const handlePhotoUpload = (photo: string) => {
    setBasePhoto(photo);
  };

  const handlePhotoRemove = () => {
    setBasePhoto(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (selectedImageForEdit && editingSlideIndex !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <ImageEditor
          imageUrl={selectedImageForEdit}
          onImageUpdate={handleImageUpdate}
          onClose={() => {
            setSelectedImageForEdit(null);
            setEditingSlideIndex(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src="/lovable-uploads/217c8d5c-ce96-40c5-ab52-ff057f4b0d15.png" 
              alt="FisioAccordo Logo" 
              className="h-10 w-auto"
            />
            <h1 className="text-xl font-bold text-white">
              Generatore di Post Social <Sparkles className="inline h-5 w-5 text-purple-300 ml-2" />
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">
              Ciao, {user?.user_metadata?.first_name || 'Utente'}!
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSignOut}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Generatore di Post Social ✨
          </h2>
          <p className="text-xl text-gray-300">
            Crea contenuti coinvolgenti per i tuoi social media con l'intelligenza artificiale
          </p>
        </div>

        {/* Generatore di idee */}
        <IdeaGenerator
          ideaInput={ideaInput}
          setIdeaInput={setIdeaInput}
          onIdeaGenerated={handleIdeaGenerated}
        />

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form di creazione contenuto */}
          <ContentForm
            formData={formData}
            onInputChange={handleInputChange}
            isGenerating={isGenerating}
            onGenerate={generateContent}
            basePhoto={basePhoto}
            onPhotoUpload={handlePhotoUpload}
            onPhotoRemove={handlePhotoRemove}
          />

          {/* Sezione anteprima */}
          <PreviewSection
            generatedContent={generatedContent}
            carouselSlides={carouselSlides}
            setCarouselSlides={setCarouselSlides}
            appliedHook={appliedHook}
            onRemoveHook={removeHook}
            onImageEdit={handleImageEdit}
            onSaveContent={saveContent}
          />
        </div>

        {/* Generatore Hook Forti */}
        <HookGenerator
          showHookGenerator={showHookGenerator}
          setShowHookGenerator={setShowHookGenerator}
          hookTopic={hookTopic}
          setHookTopic={setHookTopic}
          generatedHooks={generatedHooks}
          setGeneratedHooks={setGeneratedHooks}
          onApplyHook={applyHookToContent}
        />

        {/* Contenuti salvati */}
        {savedContents.length > 0 && (
          <Card className="mt-8 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">I Tuoi Contenuti Salvati</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedContents.map((content) => (
                  <div key={content.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <h3 className="text-white font-medium mb-2">{content.title}</h3>
                    <p className="text-gray-400 text-sm mb-2">
                      {content.platform} • {content.post_type}
                    </p>
                    <p className="text-gray-300 text-sm line-clamp-3">
                      {content.content_text.substring(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer con disclaimer */}
        <div className="mt-12 p-6 bg-gray-900/50 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            © 2024 Cimmi LLC. Tutti i diritti riservati.<br/>
            FisioAccordo(VIRAL)ContentAI è proprietà esclusiva di Cimmi LLC.<br/>
            È vietata la copia, riproduzione o replica di questa piattaforma senza autorizzazione scritta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
