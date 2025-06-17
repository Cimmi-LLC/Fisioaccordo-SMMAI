import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, ImagePlus, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Carousel } from "@/components/ui/carousel";
import { defaultOpenAIService } from "@/services/openaiService";
import CarouselImageManager from "@/components/CarouselImageManager";
import ImageEditor from "@/components/ImageEditor";

const Index = () => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [imageCount, setImageCount] = useState(3);
  const [contentType, setContentType] = useState('social-carousel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  const [isEditingCarousel, setIsEditingCarousel] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);

  const [carouselSlides, setCarouselSlides] = useState([
    { type: 'text', content: 'Slide 1: Inserisci qui il contenuto' },
  ]);

  const handleSlidesUpdate = (newSlides: any[]) => {
    setCarouselSlides(newSlides);
  };

  const handleImageEdit = (imageUrl: string, slideIndex: number) => {
    setEditingImage(imageUrl);
    setEditingSlideIndex(slideIndex);
  };

  const handleImageUpdate = (newUrl: string) => {
    if (editingSlideIndex !== null) {
      const updatedSlides = [...carouselSlides];
      if (updatedSlides[editingSlideIndex]) {
        updatedSlides[editingSlideIndex].userImageUrl = newUrl;
        setCarouselSlides(updatedSlides);
      }
      setEditingImage(null);
      setEditingSlideIndex(null);
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
      const results = [];
      const actualCount = Math.min(imageCount, 7);

      for (let i = 0; i < actualCount; i++) {
        let finalPrompt = '';
        
        if (contentType === 'social-carousel') {
          finalPrompt = `Slide ${i + 1} di un carosello social per Instagram: ${prompt}. Stile moderno e accattivante per social media. IMPORTANTE: tutto il testo deve essere scritto in italiano perfetto.`;
        } else if (contentType === 'ad-creative') {
          finalPrompt = `Creativo pubblicitario professionale: ${prompt}. Design accattivante per campagne marketing. IMPORTANTE: tutto il testo deve essere scritto in italiano perfetto.`;
        } else if (contentType === 'infographic') {
          finalPrompt = `Infografica moderna e informativa: ${prompt}. Design pulito e facile da leggere. IMPORTANTE: tutto il testo deve essere scritto in italiano perfetto.`;
        } else {
          finalPrompt = `${prompt}. IMPORTANTE: tutto il testo deve essere scritto in italiano perfetto.`;
        }

        const result = await defaultOpenAIService.generateImage({
          positivePrompt: finalPrompt,
          numberResults: 1
        });

        if (result.imageURL) {
          results.push({
            type: contentType,
            content: finalPrompt,
            imageUrl: result.imageURL
          });
        }
      }

      setGeneratedContent(results);
      
      toast({
        title: "Contenuti generati! 🎨",
        description: `${results.length} ${contentType === 'social-carousel' ? 'slide create' : 'immagini generate'} con DALL-E`
      });
    } catch (error) {
      console.error('Errore nella generazione:', error);
      toast({
        title: "Errore",
        description: "Errore durante la generazione del contenuto",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = useCallback(() => {
    if (isEditingCarousel) {
      return (
        <CarouselImageManager
          slides={carouselSlides}
          onSlidesUpdate={handleSlidesUpdate}
          onImageEdit={handleImageEdit}
        />
      );
    }

    if (editingImage) {
      return (
        <ImageEditor
          imageUrl={editingImage}
          onImageUpdate={handleImageUpdate}
          onClose={() => {
            setEditingImage(null);
            setEditingSlideIndex(null);
          }}
        />
      );
    }

    if (generatedContent.length > 0) {
      if (contentType === 'social-carousel') {
        return (
          <Carousel className="w-full max-w-4xl mx-auto">
            <CarouselContent className="gap-4">
              {generatedContent.map((slide, index) => (
                <div key={index} className="flex-1 min-w-full">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Slide {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={slide.imageUrl}
                        alt={`Slide ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-md mb-4"
                      />
                      <p className="text-gray-400">{slide.content}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </CarouselContent>
          </Carousel>
        );
      } else {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedContent.map((item, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Immagine {index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={item.imageUrl}
                    alt={`Immagine ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-md mb-4"
                  />
                  <p className="text-gray-400">{item.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      }
    }

    return null;
  }, [generatedContent, contentType, isEditingCarousel, editingImage, carouselSlides]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Generatore di Contenuti AI</h1>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Configura la tua generazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Richiesta</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descrivi cosa vuoi generare..."
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          <div>
            <Label className="text-gray-300">Tipo di Contenuto</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Seleziona un tipo" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="social-carousel">Carosello Social</SelectItem>
                <SelectItem value="ad-creative">Creatività Pubblicitaria</SelectItem>
                <SelectItem value="infographic">Infografica</SelectItem>
                <SelectItem value="general">Immagine Generica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Numero di Immagini</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                className="bg-gray-700 border-gray-600 text-white w-20"
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

          <Button
            onClick={generateContent}
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Genera Contenuto
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {contentType === 'social-carousel' && generatedContent.length === imageCount && (
        <Button
          onClick={() => setIsEditingCarousel(true)}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Gestisci Immagini Carosello
        </Button>
      )}

      <div className="mt-4">{renderContent()}</div>
    </div>
  );
};

export default Index;
