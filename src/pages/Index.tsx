import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Copy, Upload, Image, Quote, ArrowRight, Lightbulb, Target, Zap, Palette, X, Edit2 } from "lucide-react";
import { defaultRunwareService, GenerateImageParams } from "@/services/runwareService";
import ImageEditor from "@/components/ImageEditor";

const Index = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stati principali
  const [prompt, setPrompt] = useState('');
  const [generatedPost, setGeneratedPost] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [length, setLength] = useState('medio');
  const [tone, setTone] = useState('professionale');
  const [platform, setPlatform] = useState('instagram');
  const [postType, setPostType] = useState('testo-immagine');
  
  // Stati avanzati
  const [audience, setAudience] = useState('');
  const [ideaTopic, setIdeaTopic] = useState('');
  const [generatedIdeas, setGeneratedIdeas] = useState('');
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [userUploadedImage, setUserUploadedImage] = useState<string | null>(null);
  const [generatedAIImages, setGeneratedAIImages] = useState<string[]>([]);
  const [isGeneratingAIImage, setIsGeneratingAIImage] = useState(false);
  const [imageHook, setImageHook] = useState('');
  const [hookVariants, setHookVariants] = useState<string[]>([]);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  const [carouselSlides, setCarouselSlides] = useState<Array<{type: string, content: string, imageUrl?: string}>>([]);
  const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);
  
  // Nuovi stati per l'editor
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState('');

  // Template per la generazione di contenuti
  const generateContent = (type: string, topic: string, additionalParams: any = {}): string | string[] => {
    const templates = {
      post: {
        breve: `Ecco un post conciso e d'impatto su ${topic}:

🔥 ${topic.charAt(0).toUpperCase() + topic.slice(1)} - La verità che nessuno ti dice

✨ 3 punti chiave:
• Punto 1: Concetto fondamentale
• Punto 2: Strategia pratica  
• Punto 3: Risultato concreto

💡 La differenza tra chi ha successo e chi no? L'azione costante.

Qual è la tua esperienza con ${topic}? Condividi nei commenti! 👇

#${topic.replace(/\s+/g, '')} #successo #crescita`,
        
        medio: `🎯 ${topic.charAt(0).toUpperCase() + topic.slice(1)}: La guida definitiva

Negli ultimi anni ho notato un pattern ricorrente tra chi riesce davvero in questo campo...

✨ I 5 pilastri fondamentali:

1️⃣ **Mindset giusto**: Non si tratta di talento, ma di mentalità
2️⃣ **Strategia chiara**: Senza una direzione, ogni strada porta al nulla
3️⃣ **Azione costante**: I piccoli passi quotidiani battono i grandi slanci sporadici
4️⃣ **Apprendimento continuo**: Chi smette di imparare, smette di crescere
5️⃣ **Perseveranza**: I fallimenti sono lezioni, non stop definitivi

💡 **Il segreto che cambia tutto**: La maggior parte delle persone sopravvaluta quello che può fare in un giorno e sottovaluta quello che può fare in un anno.

🔥 **Call to action**: Inizia oggi stesso. Anche solo 15 minuti dedicati a ${topic} possono fare la differenza.

Quale di questi punti risuona di più con te? Raccontami la tua esperienza! 👇

#${topic.replace(/\s+/g, '')} #crescitapersonale #successo #motivazione`,
        
        lungo: `🚀 ${topic.charAt(0).toUpperCase() + topic.slice(1)}: La mia trasformazione (e come puoi replicarla)

Tre anni fa ero esattamente dove sei tu ora. Confuso, overwhelmed, e senza una direzione chiara su ${topic}.

Oggi le cose sono completamente cambiate, e voglio condividere con te il percorso che mi ha portato qui.

📊 **I numeri parlano chiaro**:
• Prima: Risultati inconsistenti e frustrazione
• Dopo: Crescita costante e risultati misurabili
• Il punto di svolta: Quando ho capito questi principi

🎯 **Le 7 lezioni che hanno cambiato tutto**:

1️⃣ **Mentalità > Tecnica**: Il 80% del successo è mentale
2️⃣ **Sistemi > Obiettivi**: I sistemi creano risultati duraturi
3️⃣ **Qualità > Quantità**: Meglio poco ma fatto bene
4️⃣ **Consistenza > Perfezione**: La costanza batte il perfezionismo
5️⃣ **Feedback > Ego**: Ascolta, impara, adatta
6️⃣ **Processo > Risultato**: Goditi il viaggio, non solo la destinazione
7️⃣ **Comunità > Solitudine**: Circondati delle persone giuste

💡 **Il framework che uso ogni giorno**:
- Mattina: Pianificazione e priorità
- Pomeriggio: Esecuzione e focus
- Sera: Riflessione e miglioramento

🔥 **La verità scomoda**: Non esistono scorciatoie. Ma esistono strade più intelligenti.

❓ **E tu?** Dove ti trovi nel tuo percorso con ${topic}? Quali sono le tue sfide principali?

Condividi nei commenti, rispondo a tutti! 👇

#${topic.replace(/\s+/g, '')} #crescita #successo #mindset #strategia #risultati`
      },
      
      ideas: [
        {
          title: "🎯 I 5 errori che tutti commettono con " + topic,
          description: "Un carosello che svela gli errori più comuni e come evitarli",
          format: "Carosello educativo"
        },
        {
          title: "🚀 La mia trasformazione in 30 giorni con " + topic,
          description: "Before/after con numeri concreti e strategie utilizzate",
          format: "Post storytelling con immagini"
        },
        {
          title: "💡 " + topic + ": Mito vs Realtà",
          description: "Sfatiamo i luoghi comuni e parliamo di fatti concreti",
          format: "Reel o video breve"
        }
      ],
      
      hooks: [
        `🚨 La verità su ${topic} che nessuno ti dice`,
        `❌ STOP! Stai sbagliando tutto con ${topic}`,
        `💰 Come ${topic} mi ha cambiato la vita (e può cambiare la tua)`
      ],
      
      carousel: [
        `Il problema con ${topic} non è quello che pensi...`,
        `La maggior parte delle persone fallisce perché...`,
        `Ecco cosa dovresti fare invece:`,
        `I risultati che otterrai saranno...`,
        `Inizia subito! Condividi se ti è stato utile 🔥`
      ],
      
      cta: `🔥 Sei pronto a trasformare il tuo approccio a ${topic}? Inizia oggi stesso!`
    };

    if (type === 'post') {
      return templates.post[length as keyof typeof templates.post] || templates.post.medio;
    } else if (type === 'ideas') {
      return templates.ideas.map(idea => 
        `**${idea.title}**\n\n${idea.description}\n\n*Formato suggerito: ${idea.format}*`
      ).join('\n\n---\n\n');
    } else if (type === 'hooks') {
      return templates.hooks;
    } else if (type === 'carousel') {
      return templates.carousel;
    } else if (type === 'cta') {
      return templates.cta;
    }
    
    return templates.post.medio;
  };

  const resetState = (keepIdeas = false) => {
    setGeneratedPost('');
    setUserUploadedImage(null);
    setGeneratedAIImages([]);
    setImageHook('');
    setHookVariants([]);
    setCarouselSlides([]);
    if (!keepIdeas) {
      setGeneratedIdeas('');
    }
  };

  const generatePost = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci una descrizione per il post",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    resetState(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const content = generateContent('post', prompt, { 
        length, 
        tone, 
        platform, 
        audience 
      });
      
      if (typeof content === 'string') {
        setGeneratedPost(content);
      } else {
        setGeneratedPost(content[0] || '');
      }
      
      if (postType === 'carosello') {
        setTimeout(() => {
          generateCarouselContent();
        }, 500);
      }
      
      toast({
        title: "Successo! ✨",
        description: "Post generato con successo"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la generazione del post",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateIdeas = async () => {
    if (!ideaTopic.trim()) {
      toast({
        title: "Attenzione",
        description: "Inserisci un argomento per generare le idee",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingIdeas(true);
    setGeneratedIdeas('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const ideas = generateContent('ideas', ideaTopic);
      
      if (typeof ideas === 'string') {
        setGeneratedIdeas(ideas);
      } else {
        setGeneratedIdeas(ideas.join('\n\n'));
      }
      
      toast({
        title: "Idee generate! 💡",
        description: "Ecco 3 idee creative per i tuoi post"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la generazione delle idee",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingIdeas(false);
    }
  };

  const generateCarouselContent = async () => {
    setIsGeneratingCarousel(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const slides = generateContent('carousel', prompt);
      const cta = generateContent('cta', prompt);
      
      let slideTexts: string[] = [];
      if (Array.isArray(slides)) {
        slideTexts = slides;
      } else {
        slideTexts = [slides];
      }
      
      let ctaText = '';
      if (typeof cta === 'string') {
        ctaText = cta;
      } else if (Array.isArray(cta)) {
        ctaText = cta[0] || '';
      }
      
      const slideObjects = slideTexts.map((text: string) => ({ type: 'text', content: text }));
      slideObjects.push({ type: 'cta', content: ctaText });
      
      setCarouselSlides(slideObjects);
      
      if (slideObjects.length > 0) {
        setTimeout(() => {
          generateCarouselImages(slideObjects);
        }, 500);
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la generazione delle slide",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingCarousel(false);
    }
  };

  const generateCarouselImages = async (slides: Array<{type: string, content: string}>) => {
    setIsGeneratingAIImage(true);
    
    try {
      const imagePrompts = slides.map((slide, index) => {
        if (slide.type === 'cta') {
          return `Call to action design for ${prompt}, modern, professional, ${platform} style, vibrant colors, motivational`;
        }
        return `Professional infographic style image representing: ${slide.content.substring(0, 100)}... Modern design, ${platform} format, clear visual hierarchy`;
      });

      console.log("Generando", imagePrompts.length, "immagini per il carosello...");
      
      const generatedImages = await defaultRunwareService.generateMultipleImages(imagePrompts);
      
      if (generatedImages.length > 0) {
        const updatedSlides = slides.map((slide, index) => ({
          ...slide,
          imageUrl: generatedImages[index]?.imageURL || undefined
        }));
        
        setCarouselSlides(updatedSlides);
        setGeneratedAIImages(generatedImages.map(img => img.imageURL));
        
        toast({
          title: "Immagini generate! 🎨",
          description: `${generatedImages.length} immagini create per il carosello`
        });
      }
    } catch (error) {
      console.error('Errore generazione immagini carosello:', error);
      toast({
        title: "Avviso",
        description: "Alcune immagini non sono state generate correttamente",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAIImage(false);
    }
  };

  const generateHookVariants = async () => {
    if (!generatedPost) {
      toast({
        title: "Attenzione",
        description: "Genera prima un post per creare gli hook",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingHooks(true);
    setHookVariants([]);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const hooks = generateContent('hooks', prompt);
      
      if (Array.isArray(hooks)) {
        setHookVariants(hooks);
      } else {
        setHookVariants([hooks]);
      }
      
      toast({
        title: "Hook generati! 🔥",
        description: "3 varianti di hook per il tuo A/B test"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la generazione degli hook",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingHooks(false);
    }
  };

  const generateAIImage = async () => {
    if (!generatedPost) {
      toast({
        title: "Attenzione",
        description: "Genera prima un post per creare un'immagine AI",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAIImage(true);
    setGeneratedAIImages([]);
    
    try {
      let imagePrompts: string[] = [];
      
      if (postType === 'carosello') {
        imagePrompts = [
          `Professional cover image for social media post about: ${prompt}. Modern design, ${platform} style, eye-catching, vibrant colors`,
          `Infographic style illustration representing: ${prompt}. Clean design, professional, suitable for ${platform}`,
          `Motivational quote design about: ${prompt}. Typography focus, inspiring, modern aesthetic for ${platform}`
        ];
      } else {
        imagePrompts = [
          `Professional social media image for: ${prompt}. High quality, modern design, vibrant colors, suitable for ${platform}`
        ];
      }

      console.log("Generando", imagePrompts.length, "immagini...");
      
      const generatedImages = await defaultRunwareService.generateMultipleImages(imagePrompts);
      
      if (generatedImages.length > 0) {
        const imageUrls = generatedImages.map(img => img.imageURL);
        setGeneratedAIImages(imageUrls);
        setUserUploadedImage(null);
        
        toast({
          title: "Immagini generate! 🎨",
          description: `${generatedImages.length} ${generatedImages.length === 1 ? 'immagine creata' : 'immagini create'} con successo`
        });
      }
    } catch (error) {
      console.error('Errore generazione immagine AI:', error);
      toast({
        title: "Errore",
        description: "Errore durante la generazione delle immagini AI",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAIImage(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserUploadedImage(reader.result as string);
        setImageHook('');
        toast({
          title: "Immagine caricata! 📸",
          description: "Immagine caricata con successo"
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copiato! 📋",
        description: "Testo copiato negli appunti"
      });
    }).catch(() => {
      // Fallback per browser più vecchi
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      
      toast({
        title: "Copiato! 📋",
        description: "Testo copiato negli appunti"
      });
    });
  };

  const handleImageEdit = (imageUrl: string, imageIndex?: number) => {
    setEditingImageUrl(imageUrl);
    setEditingImageIndex(imageIndex ?? null);
    setShowImageEditor(true);
  };

  const handleImageUpdate = (newImageUrl: string) => {
    if (editingImageIndex !== null) {
      // Aggiorna immagine nel carosello
      const updatedSlides = [...carouselSlides];
      if (updatedSlides[editingImageIndex]) {
        updatedSlides[editingImageIndex].imageUrl = newImageUrl;
        setCarouselSlides(updatedSlides);
      }
      
      // Aggiorna anche l'array delle immagini generate
      const updatedImages = [...generatedAIImages];
      if (updatedImages[editingImageIndex]) {
        updatedImages[editingImageIndex] = newImageUrl;
        setGeneratedAIImages(updatedImages);
      }
    } else {
      // Aggiorna immagine singola
      setUserUploadedImage(newImageUrl);
    }
  };

  const removeImageHook = () => {
    setImageHook('');
    toast({
      title: "Hook rimosso",
      description: "L'hook è stato rimosso dall'immagine",
    });
  };

  const toggleImageHook = (hook: string) => {
    if (imageHook === hook) {
      removeImageHook();
    } else {
      setImageHook(hook);
    }
  };

  const QuoteIcon = () => (
    <Quote className="w-10 h-10 text-blue-400 mb-6" />
  );

  const ArrowRightIcon = () => (
    <ArrowRight className="w-12 h-12 text-white" />
  );

  const currentImages = userUploadedImage ? [userUploadedImage] : generatedAIImages;
  const currentImage = currentImages[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-6xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
            Generatore di Post Social ✨
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Crea contenuti coinvolgenti per i tuoi social media con l'intelligenza artificiale
          </p>
        </div>

        {/* Sezione Idee */}
        <Card className="mb-8 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              Sei a corto di idee?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                type="text"
                value={ideaTopic}
                onChange={(e) => setIdeaTopic(e.target.value)}
                placeholder="Inserisci un argomento (es. 'produttività', 'marketing')"
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Button
                onClick={generateIdeas}
                disabled={!ideaTopic || isGeneratingIdeas}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isGeneratingIdeas ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Trova Idee
                  </>
                )}
              </Button>
            </div>
            
            {generatedIdeas && (
              <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                <h3 className="font-semibold text-white mb-2">💡 Idee Generate:</h3>
                <div className="text-gray-300 whitespace-pre-wrap">{generatedIdeas}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pannello di controllo */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Crea il tuo contenuto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="prompt" className="text-gray-300 text-lg font-semibold">
                  1. Descrivi il tuo post
                </Label>
                <Textarea
                  id="prompt"
                  className="mt-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[120px]"
                  placeholder="Es: I 5 errori da evitare quando si avvia un business online"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="audience" className="text-gray-300 text-lg font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  2. Definisci la tua Audience (Opzionale)
                </Label>
                <Input
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Es: Giovani imprenditori tech, mamme attente al biologico"
                  className="mt-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 font-semibold">Lunghezza</Label>
                  <Select value={length} onValueChange={setLength}>
                    <SelectTrigger className="mt-2 bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="breve">Breve</SelectItem>
                      <SelectItem value="medio">Medio</SelectItem>
                      <SelectItem value="lungo">Lungo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold">Tono</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="mt-2 bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="professionale">Professionale</SelectItem>
                      <SelectItem value="coinvolgente">Coinvolgente</SelectItem>
                      <SelectItem value="autorevole">Autorevole</SelectItem>
                      <SelectItem value="umoristico">Umoristico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold">Piattaforma</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="mt-2 bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="x">X (Twitter)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 font-semibold">Tipo di Post</Label>
                  <Select value={postType} onValueChange={(value) => {
                    setPostType(value);
                    resetState(true);
                  }}>
                    <SelectTrigger className="mt-2 bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="testo-immagine">Testo + Immagine</SelectItem>
                      <SelectItem value="carosello">Carosello</SelectItem>
                      <SelectItem value="storia">Storia</SelectItem>
                      <SelectItem value="video-reel">Video/Reel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={generatePost}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
                disabled={isLoading || !prompt.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    3. Genera Contenuto
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Pannello di anteprima con editor integrato */}
          <div className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Anteprima</CardTitle>
              </CardHeader>
              <CardContent className="min-h-[400px] flex flex-col items-center justify-center">
                {postType === 'carosello' ? (
                  <div className="w-full">
                    {isLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
                        <p className="text-gray-300">Generazione contenuto...</p>
                      </div>
                    ) : generatedPost ? (
                      <div className="w-full flex space-x-4 overflow-x-auto p-4 snap-x snap-mandatory">
                        {/* Prima slide con immagine */}
                        <div className="snap-center flex-shrink-0 w-full max-w-sm">
                          <div className="relative group inline-block mx-auto rounded-lg shadow-lg overflow-hidden border-2 border-blue-500/50 aspect-square bg-gray-700">
                            {currentImage ? (
                              <>
                                <img src={currentImage} alt="Slide 1" className="w-full h-full object-cover" />
                                <Button
                                  onClick={() => handleImageEdit(currentImage)}
                                  className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  size="sm"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col justify-center items-center text-center p-4">
                                <Image className="w-16 h-16 text-gray-500 mb-4" />
                                <p className="font-semibold text-lg">Slide 1</p>
                                <p className="text-sm text-gray-400">Carica o genera un'immagine</p>
                              </div>
                            )}
                            {imageHook && (
                              <div className="absolute bottom-0 left-0 right-0 p-6 pt-16 bg-gradient-to-t from-black/80 to-transparent">
                                <div 
                                  className="relative cursor-pointer group"
                                  onClick={removeImageHook}
                                >
                                  <p className="text-white text-2xl lg:text-3xl font-bold text-center drop-shadow-2xl">
                                    {imageHook}
                                  </p>
                                  <Button
                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    size="sm"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            <div className="absolute top-4 right-4 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full">
                              1 / {carouselSlides.length > 0 ? carouselSlides.length + 1 : 1}
                            </div>
                          </div>
                        </div>

                        {/* Slide di testo/immagini generate */}
                        {isGeneratingCarousel ? (
                          <div className="snap-center flex-shrink-0 w-full max-w-sm aspect-square p-8 rounded-lg flex justify-center items-center bg-gray-800">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
                              <p className="text-gray-300">Generazione slide...</p>
                            </div>
                          </div>
                        ) : carouselSlides.length > 0 ? (
                          carouselSlides.map((slide, index) => (
                            <div
                              key={index}
                              className={`snap-center relative group flex-shrink-0 w-full max-w-sm aspect-square rounded-lg overflow-hidden border-2 border-gray-700 ${
                                slide.type === 'cta' ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gray-800'
                              }`}
                            >
                              <div className="absolute top-4 right-4 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {index + 2} / {carouselSlides.length + 1}
                              </div>
                              
                              {slide.imageUrl ? (
                                <div className="relative w-full h-full">
                                  <img src={slide.imageUrl} alt={`Slide ${index + 2}`} className="w-full h-full object-cover" />
                                  <Button
                                    onClick={() => handleImageEdit(slide.imageUrl!, index)}
                                    className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    size="sm"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-white text-lg font-semibold leading-tight">
                                      {slide.content}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-8 flex flex-col justify-center items-center text-center h-full">
                                  {slide.type === 'text' && (
                                    <>
                                      <Quote className="w-10 h-10 text-blue-400 mb-6" />
                                      <p className="text-xl md:text-2xl text-white font-semibold leading-relaxed">
                                        {slide.content}
                                      </p>
                                    </>
                                  )}
                                  {slide.type === 'cta' && (
                                    <>
                                      <ArrowRight className="w-12 h-12 text-white" />
                                      <p className="text-2xl md:text-3xl text-white font-bold mt-6">
                                        {slide.content}
                                      </p>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="snap-center flex-shrink-0 w-full max-w-sm aspect-square p-8 rounded-lg flex justify-center items-center bg-gray-800">
                            <p className="text-gray-400">Nessuna slide generata</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center">Genera il contenuto per vedere l'anteprima</p>
                    )}
                  </div>
                ) : currentImage ? (
                  <div className="relative group inline-block mx-auto max-w-sm rounded-lg shadow-lg overflow-hidden border-2 border-blue-500/50">
                    <img src={currentImage} alt="Anteprima" className="w-full h-auto block" />
                    <Button
                      onClick={() => handleImageEdit(currentImage)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      size="sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {imageHook && (
                      <div className="absolute bottom-0 left-0 right-0 p-5 pt-12 bg-gradient-to-t from-black/80 to-transparent">
                        <div 
                          className="relative cursor-pointer group"
                          onClick={removeImageHook}
                        >
                          <p className="text-white text-xl font-bold drop-shadow-2xl">
                            {imageHook}
                          </p>
                          <Button
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            size="sm"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <Image className="w-24 h-24 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">L'anteprima apparirà qui</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Editor immagine */}
            {showImageEditor && (
              <ImageEditor
                imageUrl={editingImageUrl}
                onImageUpdate={handleImageUpdate}
                onClose={() => setShowImageEditor(false)}
              />
            )}
          </div>
        </div>

        {/* Sezione strumenti avanzati */}
        {generatedPost && (
          <div className="mt-8 space-y-6">
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Strumenti Avanzati</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    onClick={triggerFileSelect}
                    className="bg-gray-600 hover:bg-gray-500 text-white"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Carica Immagine
                  </Button>
                  <Button
                    onClick={generateAIImage}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isGeneratingAIImage}
                  >
                    {isGeneratingAIImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Palette className="mr-2 h-4 w-4" />
                        Genera Immagini AI
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={generateHookVariants}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={isGeneratingHooks}
                  >
                    {isGeneratingHooks ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando Hook...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Genera Hook A/B Test
                      </>
                    )}
                  </Button>
                </div>

                {/* Visualizzazione immagini multiple generate */}
                {generatedAIImages.length > 1 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">🎨 Immagini Generate</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {generatedAIImages.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={imageUrl} 
                            alt={`Immagine generata ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-600 hover:border-blue-500 transition-colors cursor-pointer"
                          />
                          <Button
                            onClick={() => handleImageEdit(imageUrl, index)}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            size="sm"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hookVariants.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">🔥 Varianti di Hook</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {hookVariants.map((variant, i) => (
                        <Button
                          key={i}
                          onClick={() => toggleImageHook(variant)}
                          variant={imageHook === variant ? "default" : "outline"}
                          className={`p-4 h-auto text-left whitespace-normal relative ${
                            imageHook === variant 
                              ? 'bg-blue-600 border-blue-400 text-white' 
                              : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {variant}
                          {imageHook === variant && (
                            <X className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full p-1" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Testo del Post Completo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 mb-4">
                  <pre className="text-gray-300 text-base whitespace-pre-wrap break-words font-sans">
                    {generatedPost}
                  </pre>
                </div>
                <Button
                  onClick={() => copyToClipboard(generatedPost)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copia Testo
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
