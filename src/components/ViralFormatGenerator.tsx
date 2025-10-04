
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
    <Card className="backdrop-blur-enhanced">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center">
          <TrendingUp className="h-6 w-6 mr-2 text-accent" />
          🔥 Generatore Format Virali
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Scegli un formato testato per massimizzare engagement e conversioni
        </p>
      </CardHeader>
      <CardContent>
        {!topic.trim() && (
          <div className="text-center py-6 text-accent border border-accent/30 rounded-lg bg-accent/10 mb-4">
            <Sparkles className="h-8 w-8 mx-auto mb-2" />
            <p>Inserisci prima un topic nel form principale per usare i format virali</p>
          </div>
        )}

        <div className="grid gap-4 mb-6">
          {viralFormats.map((format) => (
            <div
              key={format.id}
              className={`p-4 rounded-lg border transition-all cursor-pointer hover:bg-muted/30 ${
                selectedFormat?.id === format.id 
                  ? 'border-accent bg-accent/10 glow-effect' 
                  : 'border-border'
              }`}
              onClick={() => !isGenerating && topic.trim() && handleFormatSelect(format)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-foreground font-semibold flex items-center">
                  {format.name}
                  <div className={`w-2 h-2 rounded-full ml-2 ${getEffectivenessColor(format.effectiveness)}`}></div>
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {format.effectiveness}% efficacia
                  </Badge>
                  {selectedFormat?.id === format.id && isGenerating && (
                    <Zap className="h-4 w-4 text-accent animate-pulse" />
                  )}
                </div>
              </div>
              
              <p className="text-muted-foreground text-sm mb-2">{format.description}</p>
              
              <div className="bg-muted/30 p-2 rounded text-xs text-muted-foreground mb-2">
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
            <div className="bg-gradient-to-r from-accent/20 to-primary/20 border border-accent rounded-lg p-4 glow-effect">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-accent font-semibold flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {selectedFormat.name} Generato
                </h4>
                <Button
                  onClick={() => copyToClipboard(generatedContent)}
                  size="sm"
                  variant="outline"
                  className="border-accent hover:bg-accent/20"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copia
                </Button>
              </div>
              
              <pre className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                {generatedContent}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => onContentGenerated(generatedContent)}
                className="flex-1"
                variant="default"
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
