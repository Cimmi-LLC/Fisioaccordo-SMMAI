
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Wand2, Download, Edit, TestTube } from "lucide-react";
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
  const [prompt, setPrompt] = useState('');
  const [imageCount, setImageCount] = useState(3);
  const [contentType, setContentType] = useState('social-carousel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showCarouselManager, setShowCarouselManager] = useState(false);

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const isConnected = await defaultOpenAIService.testConnection();
      if (isConnected) {
        toast({
          title: "✅ Connessione riuscita!",
          description: "DALL-E 3 è pronto per generare le tue immagini"
        });
      } else {
        toast({
          title: "❌ Errore connessione",
          description: "Verifica la chiave API di OpenAI",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Test fallito",
        description: "Problema nella connessione a DALL-E 3",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const generateContent = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Inserisci una richiesta",
        description: "Descrivi cosa vuoi creare",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent([]);

    try {
      console.log(`🚀 Iniziando generazione di ${imageCount} immagini...`);
      const results: GeneratedContent[] = [];
      const actualCount = Math.min(imageCount, 7);

      for (let i = 0; i < actualCount; i++) {
        console.log(`📸 Generando immagine ${i + 1}/${actualCount}`);
        
        let finalPrompt = '';
        if (contentType === 'social-carousel') {
          finalPrompt = `Immagine ${i + 1} per social media: ${prompt}`;
        } else if (contentType === 'ad-creative') {
          finalPrompt = `Pubblicità ${i + 1}: ${prompt}`;
        } else if (contentType === 'infographic') {
          finalPrompt = `Infografica ${i + 1}: ${prompt}`;
        } else {
          finalPrompt = `${prompt} - variazione ${i + 1}`;
        }

        const result = await defaultOpenAIService.generateImage({
          positivePrompt: finalPrompt,
          numberResults: 1,
          quality: 'standard',
          style: 'natural'
        });

        if (result.imageURL) {
          results.push({
            type: contentType,
            content: finalPrompt,
            imageUrl: result.imageURL
          });
          
          console.log(`✅ Immagine ${i + 1} completata`);
        }
      }

      setGeneratedContent(results);
      
      toast({
        title: "🎨 Contenuti generati!",
        description: `${results.length} immagini create con DALL-E 3`
      });
    } catch (error) {
      console.error('❌ Errore nella generazione:', error);
      toast({
        title: "Errore generazione",
        description: "Problema durante la creazione delle immagini",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
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

  const prepareCarouselSlides = () => {
    return generatedContent.map(item => ({
      type: item.type,
      content: item.content,
      imageUrl: item.imageUrl
    }));
  };

  const handleCarouselUpdate = (slides: any[]) => {
    const updatedContent = slides.map(slide => ({
      type: slide.type,
      content: slide.content,
      imageUrl: slide.userImageUrl || slide.imageUrl
    }));
    setGeneratedContent(updatedContent);
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
          slides={prepareCarouselSlides()}
          onSlidesUpdate={handleCarouselUpdate}
          onImageEdit={handleImageEdit}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎨 AI Content Generator
          </h1>
          <p className="text-xl text-purple-200">
            Powered by DALL-E 3
          </p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              Configura la tua generazione
              <Button
                onClick={testConnection}
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white border-green-600"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test DALL-E 3
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-gray-300 text-lg font-semibold">
                Richiesta
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descrivi cosa vuoi generare con DALL-E 3..."
                className="mt-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-gray-300 text-lg font-semibold">
                  Tipo di Contenuto
                </Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="mt-2 bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Seleziona un tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="social-carousel">📱 Carosello Social</SelectItem>
                    <SelectItem value="ad-creative">📢 Creatività Pubblicitaria</SelectItem>
                    <SelectItem value="infographic">📊 Infografica</SelectItem>
                    <SelectItem value="general">🎨 Immagine Generica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300 text-lg font-semibold">
                  Numero di Immagini (1-7)
                </Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Input
                    type="number"
                    value={imageCount}
                    onChange={(e) => setImageCount(Math.min(7, Math.max(1, Number(e.target.value))))}
                    className="bg-gray-700 border-gray-600 text-white w-20"
                    min={1}
                    max={7}
                  />
                  <Slider
                    value={[imageCount]}
                    onValueChange={(value) => setImageCount(value[0])}
                    min={1}
                    max={7}
                    step={1}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={generateContent}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-4"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generando con DALL-E 3...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Genera con DALL-E 3
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Visualizzazione risultati */}
        {generatedContent.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                🖼️ Immagini Generate ({generatedContent.length})
              </h2>
              {generatedContent.length > 1 && (
                <Button
                  onClick={() => setShowCarouselManager(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  📱 Gestisci Carosello
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedContent.map((item, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700 backdrop-blur-sm overflow-hidden">
                  <div className="relative group">
                    <img
                      src={item.imageUrl}
                      alt={`Immagine ${index + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
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
                  </div>
                  <CardContent className="p-4">
                    <div className="text-sm text-purple-300 font-semibold mb-2">
                      Immagine {index + 1}
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-3">
                      {item.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
