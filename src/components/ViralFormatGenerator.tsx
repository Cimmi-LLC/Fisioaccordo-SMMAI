
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Copy, Sparkles, TrendingUp } from "lucide-react";
import { IntelligentCopyService, ViralFormat } from "@/services/intelligentCopyService";
import { useToast } from "@/hooks/use-toast";

interface ViralFormatGeneratorProps {
  topic: string;
  audience: string;
  user: any;
  onContentGenerated: (content: string) => void;
}

const ViralFormatGenerator: React.FC<ViralFormatGeneratorProps> = ({
  topic,
  audience,
  user,
  onContentGenerated
}) => {
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<ViralFormat | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const viralFormats = IntelligentCopyService.getViralFormats();

  const handleFormatSelect = async (format: ViralFormat) => {
    if (!topic.trim()) {
      toast({
        title: "⚠️ Topic mancante",
        description: "Inserisci prima un topic per generare il formato viral",
        variant: "destructive"
      });
      return;
    }

    setSelectedFormat(format);
    setIsGenerating(true);

    try {
      const content = await IntelligentCopyService.generateViralContent(
        format,
        topic,
        audience,
        user
      );
      
      setGeneratedContent(content);
      onContentGenerated(content);
      
      toast({
        title: "🔥 Formato viral generato!",
        description: `${format.name} personalizzato per il tuo topic`
      });
    } catch (error) {
      console.error('Errore generazione formato viral:', error);
      toast({
        title: "❌ Errore",
        description: "Errore nella generazione del formato viral",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "📋 Copiato!",
      description: "Contenuto viral copiato negli appunti"
    });
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 95) return 'bg-green-500';
    if (score >= 90) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <TrendingUp className="h-6 w-6 mr-2 text-orange-400" />
          🔥 Generatore Format Virali
        </CardTitle>
        <p className="text-gray-300 text-sm">
          Scegli un formato testato per massimizzare engagement e conversioni
        </p>
      </CardHeader>
      <CardContent>
        {!topic.trim() && (
          <div className="text-center py-6 text-yellow-400 border border-yellow-500/30 rounded-lg bg-yellow-500/10 mb-4">
            <Sparkles className="h-8 w-8 mx-auto mb-2" />
            <p>Inserisci prima un topic nel form principale per usare i format virali</p>
          </div>
        )}

        <div className="grid gap-4 mb-6">
          {viralFormats.map((format) => (
            <div
              key={format.id}
              className={`p-4 rounded-lg border transition-all cursor-pointer hover:bg-gray-700/30 ${
                selectedFormat?.id === format.id 
                  ? 'border-orange-500 bg-orange-500/10' 
                  : 'border-gray-600'
              }`}
              onClick={() => !isGenerating && topic.trim() && handleFormatSelect(format)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold flex items-center">
                  {format.name}
                  <div className={`w-2 h-2 rounded-full ml-2 ${getEffectivenessColor(format.effectiveness)}`}></div>
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {format.effectiveness}% efficacia
                  </Badge>
                  {selectedFormat?.id === format.id && isGenerating && (
                    <Zap className="h-4 w-4 text-orange-400 animate-pulse" />
                  )}
                </div>
              </div>
              
              <p className="text-gray-300 text-sm mb-2">{format.description}</p>
              
              <div className="bg-gray-900/50 p-2 rounded text-xs text-gray-400 mb-2">
                <strong>Esempio:</strong> {format.example}
              </div>
              
              <div className="flex flex-wrap gap-1">
                {format.platforms.map((platform) => (
                  <Badge key={platform} variant="outline" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        {generatedContent && selectedFormat && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-orange-300 font-semibold flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {selectedFormat.name} Generato
                </h4>
                <Button
                  onClick={() => copyToClipboard(generatedContent)}
                  size="sm"
                  variant="outline"
                  className="text-orange-300 border-orange-500 hover:bg-orange-500/20"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copia
                </Button>
              </div>
              
              <pre className="text-orange-100 whitespace-pre-wrap text-sm leading-relaxed">
                {generatedContent}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => onContentGenerated(generatedContent)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Usa questo formato
              </Button>
              <Button
                onClick={() => {
                  setSelectedFormat(null);
                  setGeneratedContent('');
                }}
                variant="outline"
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                Prova altro formato
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ViralFormatGenerator;
