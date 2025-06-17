
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Wand2, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { defaultOpenAIService } from "@/services/openaiService";

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

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const isConnected = await defaultOpenAIService.testConnection();
      if (isConnected) {
        toast({
          title: "Connessione riuscita! ✅",
          description: "DALL-E 3 è pronto per generare le tue immagini"
        });
      } else {
        toast({
          title: "Errore connessione ❌",
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
        title: "Contenuti generati! 🎨",
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">Generatore AI con DALL-E 3</h1>

      <Card className="bg-gray-800/50 border-gray-700">
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
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Richiesta</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descrivi cosa vuoi generare con DALL-E 3..."
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
            <Label className="text-gray-300">Numero di Immagini (1-7)</Label>
            <div className="flex items-center space-x-2">
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

          <Button
            onClick={generateContent}
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando con DALL-E 3...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Genera con DALL-E 3
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Visualizzazione risultati */}
      {generatedContent.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Immagini Generate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedContent.map((item, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Immagine {index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={item.imageUrl}
                    alt={`Immagine ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-md mb-4"
                  />
                  <p className="text-gray-400 text-sm">{item.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
