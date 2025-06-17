
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wand2, Undo2, Redo2, Trash2, Type, Download } from "lucide-react";
import { defaultOpenAIService } from "@/services/openaiService";
import { useToast } from "@/hooks/use-toast";
import TextEditor from "./TextEditor";

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
  const [showTextEditor, setShowTextEditor] = useState(false);

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

  const downloadImage = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `immagine-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download completato! 📥",
        description: "L'immagine è stata scaricata sul tuo dispositivo"
      });
    } catch (error) {
      toast({
        title: "Errore download",
        description: "Non è stato possibile scaricare l'immagine",
        variant: "destructive"
      });
    }
  };

  const enhanceImage = async (style: string, prompt?: string) => {
    setIsProcessing(true);
    
    try {
      let enhancePrompt = '';
      
      if (style === 'cartoon') {
        enhancePrompt = 'Migliora questa immagine in stile cartoon vivace e colorato, mantenendo il soggetto originale e tutti gli elementi principali IDENTICI. Solo migliora la qualità visiva e i colori.';
      } else if (style === 'professional') {
        enhancePrompt = 'Migliora questa immagine rendendola più professionale e raffinata, mantenendo ESATTAMENTE lo stesso soggetto e composizione. Migliora solo qualità, illuminazione e nitidezza.';
      } else if (style === 'artistic') {
        enhancePrompt = 'Migliora questa immagine con stile artistico e colori vibranti, mantenendo IDENTICO il contenuto principale. Non cambiare soggetto o composizione.';
      } else if (style === 'custom' && prompt) {
        enhancePrompt = `Migliora questa immagine: ${prompt}. IMPORTANTE: mantieni lo stesso soggetto e composizione dell'immagine originale.`;
      }

      if (!enhancePrompt) {
        toast({
          title: "Errore",
          description: "Seleziona uno stile o inserisci una richiesta personalizzata",
          variant: "destructive"
        });
        return;
      }

      const result = await defaultOpenAIService.generateImage({
        positivePrompt: enhancePrompt,
        numberResults: 1,
        imageUrl: currentImage.url,  // Passiamo l'URL dell'immagine originale
        quality: 'hd'
      });

      if (result.imageURL) {
        addToHistory(result.imageURL, enhancePrompt);
        onImageUpdate(result.imageURL);
        
        toast({
          title: "Immagine migliorata! ✨",
          description: "La tua immagine è stata migliorata mantenendo il contenuto originale"
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

  const handleTextEditorUpdate = (newUrl: string) => {
    addToHistory(newUrl, "Modifiche testo aggiunte");
    onImageUpdate(newUrl);
    setShowTextEditor(false);
  };

  if (showTextEditor) {
    return (
      <TextEditor
        imageUrl={currentImage.url}
        onImageUpdate={handleTextEditorUpdate}
        onClose={() => setShowTextEditor(false)}
      />
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Editor Immagine
          <div className="flex gap-2">
            <Button
              onClick={downloadImage}
              variant="outline"
              size="sm"
              className="bg-green-600 border-green-500 text-white hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
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

        {/* Editor di testo */}
        <Button
          onClick={() => setShowTextEditor(true)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Type className="mr-2 h-4 w-4" />
          Aggiungi/Modifica Testo
        </Button>

        {/* Stili predefiniti */}
        <div>
          <Label className="text-gray-300 font-semibold">Migliora Immagine (mantiene contenuto originale)</Label>
          <Select value={presetStyle} onValueChange={setPresetStyle}>
            <SelectTrigger className="mt-2 bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Seleziona uno stile" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="professional">Qualità Professionale</SelectItem>
              <SelectItem value="cartoon">Stile Cartoon</SelectItem>
              <SelectItem value="artistic">Artistico e Vibrante</SelectItem>
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
              placeholder="Descrivi come vuoi migliorare l'immagine mantenendo il contenuto originale..."
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
              Migliora Mantenendo Originale
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
