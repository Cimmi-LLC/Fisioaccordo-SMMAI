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
  Sparkles,
  Brain
} from "lucide-react";
import ImageEditor from "@/components/ImageEditor";
import IdeaGenerator from "@/components/IdeaGenerator";
import ContentForm from "@/components/ContentForm";
import PreviewSection from "@/components/PreviewSection";
import HookGenerator from "@/components/HookGenerator";
import InstagramConnection from "@/components/InstagramConnection";
import CopyImprover from "@/components/CopyImprover";

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
  const [showCopyImprover, setShowCopyImprover] = useState(false);
  const [improvedCopyFromAI, setImprovedCopyFromAI] = useState('');

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
    
    // Immagini ottimizzate per fermare lo scroll e catturare l'attenzione
    const imageCategories = {
      'mal di schiena': [
        'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center', // Persona con mal di schiena
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center', // Esercizi schiena
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center', // Fisioterapia schiena
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center', // Stretching
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center'  // Postura
      ],
      'postura': [
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center', // Postura corretta
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&crop=center', // Postura ufficio
        'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center', // Ergonomia
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center', // Stretching posturale
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center'  // Esercizi postura
      ],
      'esercizi': [
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center', // Esercizi fisioterapia
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center', // Allenamento
        'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center', // Stretching
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center', // Riabilitazione
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center'  // Movimento
      ],
      'riabilitazione': [
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center', // Fisioterapia
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center', // Riabilitazione
        'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=400&fit=crop&crop=center', // Terapia
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center', // Recupero
        'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center'  // Esercizi riabilitativi
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
    const topic = formData.description;
    
    // Ottieni immagini pertinenti al topic
    const relevantImages = getRelevantImages(topic);
    
    // Contenuti specifici per ogni slide che fermano lo scroll
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
      
      // Copy ottimizzato per fermare lo scroll e generare engagement
      const mockContent = `🚨 **${formData.description.toUpperCase()}** - LA VERITÀ CHE NESSUNO TI DICE!

💡 Se soffri di ${formData.description}, questo post può cambiarti la vita!

❌ ERRORE COMUNE: La maggior parte delle persone fa questo sbaglio...

Come fisioterapista con oltre 10 anni di esperienza, vedo ogni giorno persone che:
• Ignorano i primi segnali
• Usano rimedi temporanei
• Non affrontano la causa principale

🔥 ECCO LA SOLUZIONE che funziona davvero:

✅ 3 PASSI SCIENTIFICI:
1️⃣ Identificazione della causa principale
2️⃣ Protocollo personalizzato di esercizi
3️⃣ Mantenimento a lungo termine

🎯 RISULTATI GARANTITI in 7-14 giorni:
• Riduzione del dolore del 80%
• Movimento naturale e fluido
• Prevenzione di ricadute

💥 TESTIMONIANZA: "In 10 giorni ho risolto un problema che avevo da 2 anni!" - Maria, 45 anni

🚀 VUOI RISULTATI CONCRETI?

📞 Prenota una valutazione GRATUITA di 30 minuti
💬 Scrivici in DM "VALUTAZIONE"
🏢 ${user?.user_metadata?.clinic_name || 'Il tuo studio di fisioterapia'}

⏰ ATTENZIONE: Solo 5 posti disponibili questa settimana!

#fisioterapia #salute #benessere #${formData.description.replace(/\s+/g, '')}`;

      setGeneratedContent(mockContent);
      
      // Genera le slide del carosello con contenuti specifici
      generateCarouselSlides();
      
      toast({
        title: "🎉 Contenuto generato!",
        description: "Post ottimizzato per massimo engagement e conversioni"
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
    // Applica l'hook alla prima slide del carosello
    if (carouselSlides.length > 0) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[0].content = `${hook}\n\n👉 Swipe per scoprire di più →`;
      setCarouselSlides(updatedSlides);
    }
    
    // Applica anche al contenuto principale
    setGeneratedContent(prev => {
      const lines = prev.split('\n');
      lines[0] = hook;
      return lines.join('\n');
    });
    
    setAppliedHook(hook);
    toast({
      title: "Hook applicato! 🎯",
      description: "L'hook è stato inserito nella prima slide e nel contenuto"
    });
  };

  const removeHook = () => {
    // Rimuovi dalla prima slide
    if (carouselSlides.length > 0) {
      const updatedSlides = [...carouselSlides];
      const originalContent = updatedSlides[0].content.split('\n\n👉 Swipe')[0];
      if (originalContent !== updatedSlides[0].content) {
        // Restore original first slide content
        updatedSlides[0].content = `🚨 ${formData.description.toUpperCase()}\n\nSCOPRI LA VERITÀ che i dottori non ti dicono!\n\n👉 Swipe per la soluzione →`;
      }
      setCarouselSlides(updatedSlides);
    }
    
    // Rimuovi dal contenuto principale
    setGeneratedContent(prev => {
      const lines = prev.split('\n');
      lines.shift();
      return lines.join('\n');
    });
    
    setAppliedHook('');
    toast({
      title: "Hook rimosso",
      description: "L'hook è stato rimosso dal contenuto e dalla prima slide"
    });
  };

  const handlePhotoUpload = (photo: string) => {
    setBasePhoto(photo);
  };

  const handlePhotoRemove = () => {
    setBasePhoto(null);
  };

  const handleCopyImproved = (improvedCopy: string) => {
    setImprovedCopyFromAI(improvedCopy);
    
    // Applica il copy migliorato al contenuto generato
    setGeneratedContent(improvedCopy);
    
    // Se è presente un carosello, aggiorna la prima slide con l'hook migliorato
    if (carouselSlides.length > 0) {
      const updatedSlides = [...carouselSlides];
      const lines = improvedCopy.split('\n');
      updatedSlides[0].content = `${lines[0]}\n\n👉 Swipe per scoprire di più →`;
      setCarouselSlides(updatedSlides);
    }
    
    toast({
      title: "🚀 Copy super-ottimizzato!",
      description: "Il tuo copy è stato migliorato con strategie avanzate di copywriting"
    });
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
            <Button
              onClick={() => setShowCopyImprover(!showCopyImprover)}
              variant="outline"
              size="sm"
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              {showCopyImprover ? 'Nascondi' : 'Copy AI Pro'}
            </Button>
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

        {/* Copy Improver Section */}
        {showCopyImprover && (
          <div className="mb-8">
            <CopyImprover onCopyImproved={handleCopyImproved} />
          </div>
        )}

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

        {/* Connessione Instagram */}
        <div className="mt-8">
          <InstagramConnection />
        </div>

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
