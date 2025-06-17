import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { contentService } from "@/services/contentService";
import { 
  Loader2, 
  LogOut, 
  User, 
  Sparkles, 
  Instagram, 
  Linkedin, 
  Facebook,
  Heart,
  Zap,
  Download,
  Share,
  Lightbulb,
  Plus,
  Image,
  Wand2,
  Copy,
  Upload,
  X,
  Trash2
} from "lucide-react";
import CarouselImageManager from "@/components/CarouselImageManager";
import ImageEditor from "@/components/ImageEditor";

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

  const generateIdea = () => {
    const ideas = [
      'Esercizi per il mal di schiena da ufficio',
      'Prevenzione infortuni sportivi',
      'Riabilitazione post-chirurgica',
      'Stretching mattutino per iniziare la giornata',
      'Fisioterapia per anziani',
      'Recupero da distorsione caviglia',
      'Postura corretta al computer',
      'Benefici della terapia manuale'
    ];
    const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
    setIdeaInput(randomIdea);
    setFormData(prev => ({ ...prev, description: randomIdea }));
  };

  const generateHooks = () => {
    if (!hookTopic.trim()) {
      toast({
        title: "Campo obbligatorio",
        description: "Inserisci un argomento per generare gli hook",
        variant: "destructive"
      });
      return;
    }

    const hooks = [
      `🚨 ATTENZIONE: Se soffri di ${hookTopic}, questo post può cambiarti la vita!`,
      `❌ ERRORE COMUNE: La maggior parte delle persone con ${hookTopic} fa questo sbaglio...`,
      `🔥 RIVELAZIONE SHOCK: Quello che i dottori non ti dicono su ${hookTopic}`,
      `💡 SEGRETO SVELATO: Come ho risolto il mio ${hookTopic} in 30 giorni`,
      `⚡ TECNICA RIVOLUZIONARIA: Il metodo che sta trasformando il trattamento di ${hookTopic}`,
      `🎯 RISULTATI GARANTITI: 3 passi per eliminare ${hookTopic} per sempre`,
      `🚀 BREAKING NEWS: Nuova scoperta scientifica su ${hookTopic}`,
      `💥 TRASFORMAZIONE INCREDIBILE: Da ${hookTopic} cronico a guarigione completa`
    ];
    
    setGeneratedHooks(hooks);
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
      // Rimuovi la prima riga (hook) e ricrea il contenuto
      lines.shift();
      return lines.join('\n');
    });
    setAppliedHook('');
    toast({
      title: "Hook rimosso",
      description: "L'hook è stato rimosso dal contenuto"
    });
  };

  const generateCarouselSlides = () => {
    const numSlides = parseInt(formData.numSlides);
    const slides: CarouselSlide[] = [];
    
    // Array di immagini placeholder reali
    const placeholderImages = [
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=400&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=400&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop&crop=center',
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=center'
    ];
    
    for (let i = 0; i < numSlides; i++) {
      slides.push({
        type: i === 0 ? 'cover' : 'content',
        content: i === 0 
          ? `${formData.description.toUpperCase()}`
          : `Slide ${i + 1}: Contenuto per ${formData.description}`,
        imageUrl: placeholderImages[i % placeholderImages.length]
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiato! 📋",
      description: "Contenuto copiato negli appunti"
    });
  };

  const uploadImageToSlide = (slideIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedSlides = [...carouselSlides];
      updatedSlides[slideIndex].userImageUrl = reader.result as string;
      setCarouselSlides(updatedSlides);
      
      toast({
        title: "Immagine caricata! 📸",
        description: `Immagine caricata per la slide ${slideIndex + 1}`
      });
    };
    reader.readAsDataURL(file);
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

        {/* Sezione "Sei a corto di idee?" */}
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
              💡 Sei a corto di idee?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                placeholder="Inserisci un argomento (es. 'mal di schiena', 'riabilitazione')"
                className="bg-gray-700 border-gray-600 text-white flex-1"
              />
              <Button 
                onClick={generateIdea}
                className="bg-purple-600 hover:bg-purple-700 px-6"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Trova Idee
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pannello di controllo */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">
                Crea il tuo contenuto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 1. Descrivi il tuo post */}
              <div>
                <Label className="text-gray-300 text-lg font-medium">1. Descrivi il tuo post</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="mal di schiena al pc"
                  className="bg-gray-700 border-gray-600 text-white mt-2 min-h-[100px]"
                />
              </div>

              {/* 2. Definisci la tua Audience */}
              <div>
                <Label className="text-gray-300 text-lg font-medium flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  2. Definisci la tua Audience (Opzionale)
                </Label>
                <Input
                  value={formData.audience}
                  onChange={(e) => handleInputChange('audience', e.target.value)}
                  placeholder="lavoratori al pc"
                  className="bg-gray-700 border-gray-600 text-white mt-2"
                />
              </div>

              {/* Opzioni in griglia */}
              <div className="grid grid-cols-2 gap-4">
                {/* Lunghezza */}
                <div>
                  <Label className="text-gray-300">Lunghezza</Label>
                  <Select value={formData.length} onValueChange={(value) => handleInputChange('length', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="corto">Corto</SelectItem>
                      <SelectItem value="medio">Medio</SelectItem>
                      <SelectItem value="lungo">Lungo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tono */}
                <div>
                  <Label className="text-gray-300">Tono</Label>
                  <Select value={formData.tone} onValueChange={(value) => handleInputChange('tone', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="professionale">Professionale</SelectItem>
                      <SelectItem value="informale">Informale</SelectItem>
                      <SelectItem value="divertente">Divertente</SelectItem>
                      <SelectItem value="motivazionale">Motivazionale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Piattaforma */}
                <div>
                  <Label className="text-gray-300">Piattaforma</Label>
                  <Select value={formData.platform} onValueChange={(value) => handleInputChange('platform', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo di Post */}
                <div>
                  <Label className="text-gray-300">Tipo di Post</Label>
                  <Select value={formData.postType} onValueChange={(value) => handleInputChange('postType', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="carosello">Carosello</SelectItem>
                      <SelectItem value="post-singolo">Post Singolo</SelectItem>
                      <SelectItem value="storia">Storia</SelectItem>
                      <SelectItem value="reel">Reel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Numero Slide */}
                <div>
                  <Label className="text-gray-300">Numero Slide</Label>
                  <Select value={formData.numSlides} onValueChange={(value) => handleInputChange('numSlides', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="3">3 Slide</SelectItem>
                      <SelectItem value="5">5 Slide</SelectItem>
                      <SelectItem value="7">7 Slide</SelectItem>
                      <SelectItem value="10">10 Slide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Numero Immagini */}
                <div>
                  <Label className="text-gray-300">Numero Immagini</Label>
                  <Select value={formData.numImages} onValueChange={(value) => handleInputChange('numImages', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="1">1 Immagine</SelectItem>
                      <SelectItem value="2">2 Immagini</SelectItem>
                      <SelectItem value="3">3 Immagini</SelectItem>
                      <SelectItem value="4">4 Immagini</SelectItem>
                      <SelectItem value="5">5 Immagini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={generateContent} 
                disabled={isGenerating}
                className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-6"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generando contenuto...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    3. Genera Contenuto
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Anteprima contenuto */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Anteprima</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedContent ? (
                <div className="space-y-4">
                  {/* Anteprima slide del carosello */}
                  {carouselSlides.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {carouselSlides.slice(0, 4).map((slide, index) => (
                          <div 
                            key={index}
                            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                            onClick={() => handleImageEdit(slide.userImageUrl || slide.imageUrl || '', index)}
                          >
                            {slide.userImageUrl || slide.imageUrl ? (
                              <img 
                                src={slide.userImageUrl || slide.imageUrl} 
                                alt={`Slide ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center`;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                Slide {index + 1}
                              </div>
                            )}
                            
                            {/* Overlay per upload */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    uploadImageToSlide(index, file);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {carouselSlides.length > 4 && (
                        <p className="text-gray-400 text-sm text-center">
                          +{carouselSlides.length - 4} altre slide
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Hook applicato */}
                  {appliedHook && (
                    <div className="bg-orange-600/20 border border-orange-500 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-orange-300 text-sm font-medium">Hook applicato:</span>
                        <Button
                          onClick={removeHook}
                          size="sm"
                          variant="ghost"
                          className="text-orange-300 hover:text-orange-200 p-1 h-auto"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-orange-100 text-sm mt-1">{appliedHook}</p>
                    </div>
                  )}
                  
                  <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <pre className="text-gray-300 whitespace-pre-wrap text-sm">
                      {generatedContent}
                    </pre>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={saveContent}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Salva
                    </Button>
                    <Button 
                      onClick={() => copyToClipboard(generatedContent)}
                      variant="outline"
                      className="flex-1 text-white border-gray-600 hover:bg-gray-700"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copia
                    </Button>
                  </div>

                  {/* Gestione Immagini Carosello */}
                  {carouselSlides.length > 0 && (
                    <CarouselImageManager
                      slides={carouselSlides}
                      onSlidesUpdate={setCarouselSlides}
                      onImageEdit={handleImageEdit}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>I tuoi contenuti generati appariranno qui</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Generatore Hook Forti */}
        <Card className="mt-8 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-400" />
                🔥 Generatore Hook Forti
              </div>
              <Button
                onClick={() => setShowHookGenerator(!showHookGenerator)}
                variant="ghost"
                size="sm"
                className="text-gray-300"
              >
                {showHookGenerator ? 'Nascondi' : 'Mostra'}
              </Button>
            </CardTitle>
          </CardHeader>
          {showHookGenerator && (
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  value={hookTopic}
                  onChange={(e) => setHookTopic(e.target.value)}
                  placeholder="Inserisci l'argomento per gli hook (es. 'mal di schiena')"
                  className="bg-gray-700 border-gray-600 text-white flex-1"
                />
                <Button 
                  onClick={generateHooks}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Genera Hook
                </Button>
              </div>
              
              {generatedHooks.length > 0 && (
                <div className="grid gap-2">
                  {generatedHooks.map((hook, index) => (
                    <div 
                      key={index}
                      className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 flex items-center justify-between hover:bg-gray-700/70 transition-colors"
                    >
                      <span className="text-gray-300 text-sm flex-1">{hook}</span>
                      <Button
                        onClick={() => applyHookToContent(hook)}
                        size="sm"
                        className="ml-2 bg-blue-600 hover:bg-blue-700"
                      >
                        Applica
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

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
