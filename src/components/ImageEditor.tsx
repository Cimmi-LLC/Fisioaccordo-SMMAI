
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2, Undo2, Redo2, Trash2 } from "lucide-react";
import { defaultRunwareService } from "@/services/runwareService";
import { useToast } from "@/hooks/use-toast";

interface ImageVersion {
  url: string;
  prompt?: string;
  timestamp: number;
}

interface ImageEditorProps {
  imageUrl: string;
  onImageUpdate: (newUrl: string) => void;
  onClose: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onImageUpdate, onClose }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [presetStyle, setPresetStyle] = useState('');
  const [imageHistory, setImageHistory] = useState<ImageVersion[]>([
    { url: imageUrl, timestamp: Date.now() }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentImage = imageHistory[currentIndex];
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < imageHistory.length - 1;

  const addToHistory = (url: string, prompt?: string) => {
    const newVersion: ImageVersion = {
      url,
      prompt,
      timestamp: Date.now()
    };
    
    // Rimuovi tutte le versioni successive se siamo nel mezzo della storia
    const newHistory = [...imageHistory.slice(0, currentIndex + 1), newVersion];
    setImageHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const goBack = () => {
    if (canGoBack) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onImageUpdate(imageHistory[newIndex].url);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onImageUpdate(imageHistory[newIndex].url);
    }
  };

  const enhanceImage = async (style: string, prompt?: string) => {
    setIsProcessing(true);
    
    try {
      let enhancePrompt = '';
      
      if (style === 'cartoon') {
        enhancePrompt = 'Transform this image into a cartoon style, vibrant colors, animated look, high quality';
      } else if (style === 'professional') {
        enhancePrompt = 'Enhance this image to look more professional, high quality, sharp details, good lighting';
      } else if (style === 'artistic') {
        enhancePrompt = 'Transform this image into an artistic masterpiece, creative style, beautiful colors';
      } else if (style === 'custom' && prompt) {
        enhancePrompt = prompt;
      }

      if (!enhancePrompt) {
        toast({
          title: "Errore",
          description: "Seleziona uno stile o inserisci una richiesta personalizzata",
          variant: "destructive"
        });
        return;
      }

      const result = await defaultRunwareService.generateImage({
        positivePrompt: enhancePrompt,
        model: "runware:100@1",
        numberResults: 1,
        outputFormat: "WEBP",
        CFGScale: 7,
        strength: 0.7
      });

      if (result.imageURL) {
        addToHistory(result.imageURL, enhancePrompt);
        onImageUpdate(result.imageURL);
        
        toast({
          title: "Immagine migliorata! ✨",
          description: "La tua immagine è stata migliorata con successo"
        });
      }
    } catch (error) {
      console.error('Errore nel miglioramento immagine:', error);
      toast({
        title: "Errore",
        description: "Errore durante il miglioramento dell'immagine",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Editor Immagine
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Anteprima immagine corrente */}
        <div className="flex justify-center">
          <img 
            src={currentImage.url} 
            alt="Anteprima"
            className="max-w-full h-48 object-cover rounded-lg border border-gray-600"
          />
        </div>

        {/* Controlli cronologia */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={goBack}
            disabled={!canGoBack}
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 text-white"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          
          <span className="text-gray-300 text-sm">
            {currentIndex + 1} di {imageHistory.length}
          </span>
          
          <Button
            onClick={goForward}
            disabled={!canGoForward}
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 text-white"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Stili predefiniti */}
        <div>
          <Label className="text-gray-300 font-semibold">Migliora con AI</Label>
          <Select value={presetStyle} onValueChange={setPresetStyle}>
            <SelectTrigger className="mt-2 bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Seleziona uno stile" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="cartoon">Stile Cartoon</SelectItem>
              <SelectItem value="professional">Professionale</SelectItem>
              <SelectItem value="artistic">Artistico</SelectItem>
              <SelectItem value="custom">Personalizzato</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Richiesta personalizzata */}
        {presetStyle === 'custom' && (
          <div>
            <Label className="text-gray-300 font-semibold">Richiesta Personalizzata</Label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Descrivi come vuoi modificare l'immagine..."
              className="mt-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              rows={3}
            />
          </div>
        )}

        {/* Pulsante di miglioramento */}
        <Button
          onClick={() => enhanceImage(presetStyle, customPrompt)}
          disabled={isProcessing || !presetStyle || (presetStyle === 'custom' && !customPrompt.trim())}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Migliorando...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Migliora Immagine
            </>
          )}
        </Button>

        {/* Info sulla versione corrente */}
        {currentImage.prompt && (
          <div className="text-xs text-gray-400 p-2 bg-gray-900/50 rounded">
            <strong>Ultima modifica:</strong> {currentImage.prompt}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImageEditor;
