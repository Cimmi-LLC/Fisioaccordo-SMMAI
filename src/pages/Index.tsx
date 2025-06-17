
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
  Plus
} from "lucide-react";

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
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedContents, setSavedContents] = useState<any[]>([]);

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
      // Simula generazione contenuto con AI
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
      
      // Genera immagini mock basate sul numero selezionato
      const numImagesInt = parseInt(formData.numImages);
      const mockImages = Array.from({ length: numImagesInt }, (_, index) => 
        `https://images.unsplash.com/photo-${1559757148 + index}?w=400&h=400`
      );
      setGeneratedImages(mockImages);
      
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
        images: generatedImages
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
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
                placeholder="Inserisci un argomento (es. 'produttività', 'marketing')"
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
                  {/* Anteprima mock delle immagini generate */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-500 rounded-lg p-4 text-center text-white font-bold">
                      TI CHE RINNI...
                    </div>
                    <div className="bg-gradient-to-br from-orange-400 to-teal-500 rounded-lg p-4 text-center text-white font-bold">
                      ALL DI APTION SHITIOB
                    </div>
                  </div>
                  
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
                      variant="outline"
                      className="flex-1 text-white border-gray-600 hover:bg-gray-700"
                    >
                      <Share className="mr-2 h-4 w-4" />
                      Condividi
                    </Button>
                  </div>

                  {/* Gestione Immagini Carosello */}
                  <Card className="bg-gray-700/30 border-gray-600">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-sm">🖼️ Gestione Immagini Carosello</CardTitle>
                        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded">5/7 slide</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="outline"
                        className="w-full text-white border-gray-600 hover:bg-gray-600"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Aggiungi Slide
                      </Button>
                    </CardContent>
                  </Card>
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
