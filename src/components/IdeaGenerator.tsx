
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
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-8">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
          💡 Sei a corto di idee?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Input
            value={ideaInput}
            onChange={(e) => setIdeaInput(e.target.value)}
            placeholder="Inserisci un argomento (es. 'mal di schiena', 'riabilitazione')"
            className="bg-gray-700 border-gray-600 text-white flex-1"
          />
          <Button 
            onClick={generateIdea}
            className="bg-purple-600 hover:bg-purple-700 px-6"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Trova Idee
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default IdeaGenerator;
