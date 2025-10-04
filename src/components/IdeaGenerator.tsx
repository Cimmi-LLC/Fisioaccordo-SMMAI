
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lightbulb, Sparkles } from "lucide-react";

interface IdeaGeneratorProps {
  ideaInput: string;
  setIdeaInput: (value: string) => void;
  onIdeaGenerated: (idea: string) => void;
}

const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({
  ideaInput,
  setIdeaInput,
  onIdeaGenerated
}) => {
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
    onIdeaGenerated(randomIdea);
  };

  return (
    <Card className="backdrop-blur-enhanced mb-8">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center text-base sm:text-lg">
          <Lightbulb className="h-5 w-5 mr-2 text-accent flex-shrink-0" />
          💡 Sei a corto di idee?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            value={ideaInput}
            onChange={(e) => setIdeaInput(e.target.value)}
            placeholder="Inserisci un argomento (es. 'mal di schiena', 'riabilitazione')"
            className="bg-input border-border text-foreground flex-1 text-sm sm:text-base min-h-[44px] focus:border-primary focus:ring-primary"
          />
          <Button 
            onClick={generateIdea}
            variant="secondary"
            className="px-4 sm:px-6 py-2 min-h-[44px] whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm sm:text-base">Trova Idee</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default IdeaGenerator;
