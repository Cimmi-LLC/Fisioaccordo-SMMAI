
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Download, Edit, Upload, Zap, ArrowRight, Image, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { defaultOpenAIService } from "@/services/openaiService";
import ImageEditor from "@/components/ImageEditor";
import CarouselImageManager from "@/components/CarouselImageManager";

interface GeneratedContent {
  type: string;
  content: string;
  imageUrl: string;
}

const Index = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [length, setLength] = useState('breve');
  const [tone, setTone] = useState('professionale');
  const [platform, setPlatform] = useState('instagram');
  const [postType, setPostType] = useState('carosello');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generatedPost, setGeneratedPost] = useState('');
  
  // Editor state
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showCarouselManager, setShowCarouselManager] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const generateContent = async () => {
    if (!topic.trim()) {
      toast({
        title: "Inserisci un argomento",
        description: "Descrivi di cosa vuoi parlare nel tuo post",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent([]);
    setGeneratedPost('');

    try {
      console.log('🚀 Generando contenuto con AI copywriter...');
      
      // Genera il testo del post usando GPT-4
      const generatedText = await defaultOpenAIService.generateText({
        topic,
        audience,
        length,
        tone,
        platform,
        postType
      });
      
      setGeneratedPost(generatedText);

      // Genera le immagini per il carosello
      const imageCount = postType === 'carosello' ? 3 : 1;
      const results: GeneratedContent[] = [];

      for (let i = 0; i < imageCount; i++) {
        console.log(`📸 Generando immagine ${i + 1}/${imageCount}`);
        
        let imagePrompt = '';
        if (postType === 'carosello') {
          if (i === 0) {
            imagePrompt = `Copertina coinvolgente per social media su "${topic}", stile moderno e professionale, colori vivaci`;
          } else {
            imagePrompt = `Slide ${i} del carosello su "${topic}", design pulito e leggibile per ${platform}`;
          }
        } else {
          imagePrompt = `Immagine per post social su "${topic}", stile ${tone}, perfetta per ${platform}`;
        }

        const result = await defaultOpenAIService.generateImage({
          positivePrompt: imagePrompt,
          numberResults: 1,
          quality: 'standard',
          style: 'natural'
        });

        if (result.imageURL) {
          results.push({
            type: postType,
            content: imagePrompt,
            imageUrl: result.imageURL
          });
          
          console.log(`✅ Immagine ${i + 1} completata`);
        }
      }

      setGeneratedContent(results);
      
      toast({
        title: "🎨 Contenuto generato!",
        description: `Copy professionale + ${results.length} immagini create con AI`
      });
    } catch (error) {
      console.error('❌ Errore nella generazione:', error);
      toast({
        title: "Errore generazione",
        description: "Problema durante la creazione del contenuto",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateHookVariant = async (variant: string) => {
    if (!topic.trim()) {
      toast({
        title: "Inserisci un argomento",
        description: "Prima inserisci l'argomento del tuo post",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log(`🎯 Generando hook variant: ${variant}`);
      
      const hookText = await defaultOpenAIService.generateText({
        topic,
        audience,
        length,
        tone,
        platform,
        postType,
        hookVariant: variant
      });
      
      setGeneratedPost(hookText);
      toast({
        title: "🎯 Hook generato!",
        description: "Variante di hook professionale pronta"
      });
    } catch (error) {
      console.error('❌ Errore generazione hook:', error);
      toast({
        title: "Errore",
        description: "Problema nella generazione del hook",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAdvancedTool = async (tool: string) => {
    setIsGenerating(true);
    try {
      let prompt = '';
      switch (tool) {
        case 'upload':
          fileInputRef.current?.click();
          setIsGenerating(false);
          return;
        case 'ai':
          prompt = `Immagine AI avanzata per ${topic || 'social media'}, qualità professionale, design moderno`;
          break;
        case 'hook':
          await generateHookVariant('verita');
          return;
      }

      if (prompt) {
        const result = await defaultOpenAIService.generateImage({
          positivePrompt: prompt,
          numberResults: 1,
          quality: 'hd',
          style: 'vivid'
        });

        if (result.imageURL) {
          setGeneratedContent([{
            type: 'advanced',
            content: prompt,
            imageUrl: result.imageURL
          }]);
          
          toast({
            title: "🎨 Immagine AI generata!",
            description: "Immagine di alta qualità creata con DALL-E 3"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Problema nella generazione avanzata",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setGeneratedContent(prev => [...prev, {
          type: 'uploaded',
          content: 'Immagine caricata dall\'utente',
          imageUrl: imageUrl
        }]);
        
        toast({
          title: "Immagine caricata!",
          description: "Immagine aggiunta con successo"
        });
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Formato non supportato",
        description: "Carica solo file immagine (JPG, PNG, etc.)",
        variant: "destructive"
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleImageAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  };

  const handleImageEdit = (imageUrl: string, index: number) => {
    setEditingImage(imageUrl);
    setEditingIndex(index);
  };

  const handleImageUpdate = (newUrl: string) => {
    if (editingIndex !== null) {
      const updatedContent = [...generatedContent];
      updatedContent[editingIndex].imageUrl = newUrl;
      setGeneratedContent(updatedContent);
    }
    setEditingImage(null);
    setEditingIndex(null);
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `immagine-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download completato!",
        description: `Immagine ${index + 1} scaricata`
      });
    } catch (error) {
      toast({
        title: "Errore download",
        description: "Impossibile scaricare l'immagine",
        variant: "destructive"
      });
    }
  };

  if (editingImage) {
    return (
      <div className="container mx-auto p-4">
        <ImageEditor
          imageUrl={editingImage}
          onImageUpdate={handleImageUpdate}
          onClose={() => setEditingImage(null)}
        />
      </div>
    );
  }

  if (showCarouselManager && generatedContent.length > 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-4">
          <Button
            onClick={() => setShowCarouselManager(false)}
            variant="outline"
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            ← Torna al Generatore
          </Button>
        </div>
        <CarouselImageManager
          slides={generatedContent.map(item => ({
            type: item.type,
            content: item.content,
            imageUrl: item.imageUrl
          }))}
          onSlidesUpdate={(slides) => {
            const updatedContent = slides.map(slide => ({
              type: slide.type,
              content: slide.content,
              imageUrl: slide.userImageUrl || slide.imageUrl
            }));
            setGeneratedContent(updatedContent);
          }}
          onImageEdit={handleImageEdit}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonna sinistra - Form di generazione */}
          <div className="space-y-6">
            {/* Sezione 1: Argomento */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600">1</Badge>
                  <CardTitle className="text-white">Definisci il tuo Argomento</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="di cosa vuoi parlare nel tuo post"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[80px]"
                />
              </CardContent>
            </Card>

            {/* Sezione 2: Audience */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600">2</Badge>
                  <CardTitle className="text-white">Definisci la tua Audience (Opzionale)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="chi lavora al computer"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm font-semibold">Lunghezza</Label>
                    <Select value={length} onValueChange={setLength}>
                      <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="breve">Breve</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="lunga">Lunga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300 text-sm font-semibold">Tono</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="professionale">Professionale</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="motivazionale">Motivazionale</SelectItem>
                        <SelectItem value="divertente">Divertente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm font-semibold">Piattaforma</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300 text-sm font-semibold">Tipo di Post</Label>
                    <Select value={postType} onValueChange={setPostType}>
                      <SelectTrigger className="mt-1 bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="carosello">Carosello</SelectItem>
                        <SelectItem value="post-singolo">Post Singolo</SelectItem>
                        <SelectItem value="reel">Reel</SelectItem>
                        <SelectItem value="storia">Storia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={generateContent}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-4"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generando Contenuto...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      3. Genera Contenuto
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Strumenti Avanzati */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Strumenti Avanzati</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => generateAdvancedTool('upload')}
                    className="bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center gap-2 py-3 text-sm"
                    disabled={isGenerating}
                  >
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Carica Immagine</span>
                  </Button>
                  
                  <Button
                    onClick={() => generateAdvancedTool('ai')}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-3 text-sm"
                    disabled={isGenerating}
                  >
                    <Zap className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Genera Immagine AI</span>
                  </Button>
                  
                  <Button
                    onClick={() => generateAdvancedTool('hook')}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-2 py-3 text-sm"
                    disabled={isGenerating}
                  >
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Genera Hook A/B Test</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Varianti di Hook */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  🔥 Varianti di Hook
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    onClick={() => generateHookVariant('verita')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-left justify-start p-4 h-auto"
                  >
                    <div className="text-sm">
                      <div className="font-semibold">🔥 La verità che nessuno ti dice</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => generateHookVariant('stop')}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-left justify-start p-4 h-auto"
                  >
                    <div className="text-sm">
                      <div className="font-semibold">🛑 STOP! Stai sbagliando tutto</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => generateHookVariant('errori')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-left justify-start p-4 h-auto"
                  >
                    <div className="text-sm">
                      <div className="font-semibold">⚡ Come mi ha cambiato la vita</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonna destra - Area Anteprima */}
          <div className="space-y-6">
            {/* Input nascosto per file upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            {/* Anteprima del Post */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  📱 Anteprima Post
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedPost ? (
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                    <Textarea
                      value={generatedPost}
                      onChange={(e) => setGeneratedPost(e.target.value)}
                      className="bg-transparent border-none text-white resize-none min-h-[200px] focus:ring-0 focus:outline-none"
                      placeholder="Il testo del post apparirà qui..."
                    />
                  </div>
                ) : (
                  <div className="bg-gray-900/30 p-8 rounded-lg border-2 border-dashed border-gray-600 text-center">
                    <div className="text-gray-400 text-lg mb-2">📝</div>
                    <p className="text-gray-400">Il testo del post apparirà qui dopo la generazione</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Anteprima Immagini */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center">
                    <Image className="mr-2 h-5 w-5" />
                    Anteprima Immagini
                  </CardTitle>
                  {generatedContent.length > 1 && (
                    <Button
                      onClick={() => setShowCarouselManager(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1"
                      size="sm"
                    >
                      📱 Gestisci Carosello
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedContent.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {generatedContent.map((item, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={item.imageUrl}
                          alt={`Immagine ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg cursor-pointer"
                          onClick={() => handleImageEdit(item.imageUrl, index)}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 rounded-lg">
                          <Button
                            onClick={() => handleImageEdit(item.imageUrl, index)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => downloadImage(item.imageUrl, index)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Immagine {index + 1}
                        </div>
                      </div>
                    ))}
                    
                    {/* Area per aggiungere nuove immagini */}
                    <div 
                      className={`bg-gray-900/30 p-8 rounded-lg border-2 border-dashed transition-all cursor-pointer hover:bg-gray-800/30 ${
                        isDragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600'
                      }`}
                      onClick={handleImageAreaClick}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="text-center">
                        <Plus className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-400 text-sm">
                          Clicca per aggiungere un'immagine
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          o trascina qui un file
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`bg-gray-900/30 p-8 rounded-lg border-2 border-dashed transition-all cursor-pointer hover:bg-gray-800/30 ${
                      isDragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600'
                    }`}
                    onClick={handleImageAreaClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-center">
                      <div className="text-gray-400 text-4xl mb-4">🖼️</div>
                      <p className="text-gray-400 text-lg">Le immagini generate appariranno qui</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Clicca su "Genera Contenuto" per iniziare o clicca qui per caricare un'immagine
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Puoi anche trascinare e rilasciare file qui
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistiche del Contenuto */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">📊 Statistiche Contenuto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-900/50 p-3 rounded-lg">
                    <div className="text-blue-400 text-2xl font-bold">{generatedPost.length}</div>
                    <div className="text-gray-400 text-sm">Caratteri Testo</div>
                  </div>
                  <div className="bg-gray-900/50 p-3 rounded-lg">
                    <div className="text-green-400 text-2xl font-bold">{generatedContent.length}</div>
                    <div className="text-gray-400 text-sm">Immagini Generate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
