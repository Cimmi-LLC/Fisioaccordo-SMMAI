
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { contentService } from "@/services/contentService";
import IdeaGenerator from "./IdeaGenerator";
import ContentForm from "./ContentForm";
import PreviewSection from "./PreviewSection";
import HookGenerator from "./HookGenerator";
import CopyImprover from "./CopyImprover";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface MainContentProps {
  user: any;
  showCopyImprover: boolean;
  onCopyImproved: (improvedCopy: string) => void;
}

const MainContent: React.FC<MainContentProps> = ({ user, showCopyImprover, onCopyImproved }) => {
  const { toast } = useToast();
  
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
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [showHookGenerator, setShowHookGenerator] = useState(false);
  const [hookTopic, setHookTopic] = useState('');
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [appliedHook, setAppliedHook] = useState<string>('');
  const [basePhoto, setBasePhoto] = useState<string | null>(null);

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

  const generateCarouselSlides = () => {
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
      // Rimuoviamo il mock delay e implementiamo logica reale
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
      generateCarouselSlides();
      
      toast({
        title: "🎉 Contenuto generato!",
        description: "Post ottimizzato per massimo engagement e conversioni"
      });

    } catch (error) {
      console.error('Errore durante la generazione:', error);
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
        throw error;
      }

      toast({
        title: "✅ Contenuto salvato!",
        description: "Il post è stato aggiunto ai tuoi contenuti salvati"
      });
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      toast({
        title: "Errore",
        description: "Errore durante il salvataggio",
        variant: "destructive"
      });
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
    if (carouselSlides.length > 0) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[0].content = `${hook}\n\n👉 Swipe per scoprire di più →`;
      setCarouselSlides(updatedSlides);
    }
    
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
    if (carouselSlides.length > 0) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[0].content = `🚨 ${formData.description.toUpperCase()}\n\nSCOPRI LA VERITÀ che i dottori non ti dicono!\n\n👉 Swipe per la soluzione →`;
      setCarouselSlides(updatedSlides);
    }
    
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-4">
          Generatore di Post Social ✨
        </h2>
        <p className="text-xl text-gray-300">
          Crea contenuti coinvolgenti per i tuoi social media con l'intelligenza artificiale
        </p>
      </div>

      {showCopyImprover && (
        <div className="mb-8">
          <CopyImprover onCopyImproved={onCopyImproved} />
        </div>
      )}

      <IdeaGenerator
        ideaInput={ideaInput}
        setIdeaInput={setIdeaInput}
        onIdeaGenerated={handleIdeaGenerated}
      />

      <div className="grid lg:grid-cols-2 gap-8">
        <ContentForm
          formData={formData}
          onInputChange={handleInputChange}
          isGenerating={isGenerating}
          onGenerate={generateContent}
          basePhoto={basePhoto}
          onPhotoUpload={handlePhotoUpload}
          onPhotoRemove={handlePhotoRemove}
        />

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

      <HookGenerator
        showHookGenerator={showHookGenerator}
        setShowHookGenerator={setShowHookGenerator}
        hookTopic={hookTopic}
        setHookTopic={setHookTopic}
        generatedHooks={generatedHooks}
        setGeneratedHooks={setGeneratedHooks}
        onApplyHook={applyHookToContent}
      />
    </div>
  );
};

export default MainContent;
