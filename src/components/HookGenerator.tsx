
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HookGeneratorProps {
  showHookGenerator: boolean;
  setShowHookGenerator: (show: boolean) => void;
  hookTopic: string;
  setHookTopic: (topic: string) => void;
  generatedHooks: string[];
  setGeneratedHooks: (hooks: string[]) => void;
  onApplyHook: (hook: string) => void;
}

const HookGenerator: React.FC<HookGeneratorProps> = ({
  showHookGenerator,
  setShowHookGenerator,
  hookTopic,
  setHookTopic,
  generatedHooks,
  setGeneratedHooks,
  onApplyHook
}) => {
  const { toast } = useToast();

  const generateHooks = () => {
    if (!hookTopic.trim()) {
      toast({
        title: "Campo obbligatorio",
        description: "Inserisci un argomento per generare gli hook",
        variant: "destructive"
      });
      return;
    }

    const hooks = [
      `🚨 ATTENZIONE: Se soffri di ${hookTopic}, questo post può cambiarti la vita!`,
      `❌ ERRORE COMUNE: La maggior parte delle persone con ${hookTopic} fa questo sbaglio...`,
      `🔥 RIVELAZIONE SHOCK: Quello che i dottori non ti dicono su ${hookTopic}`,
      `💡 SEGRETO SVELATO: Come ho risolto il mio ${hookTopic} in 30 giorni`,
      `⚡ TECNICA RIVOLUZIONARIA: Il metodo che sta trasformando il trattamento di ${hookTopic}`,
      `🎯 RISULTATI GARANTITI: 3 passi per eliminare ${hookTopic} per sempre`,
      `🚀 BREAKING NEWS: Nuova scoperta scientifica su ${hookTopic}`,
      `💥 TRASFORMAZIONE INCREDIBILE: Da ${hookTopic} cronico a guarigione completa`
    ];
    
    setGeneratedHooks(hooks);
  };

  return (
    <Card className="mt-8 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-400" />
            🔥 Generatore Hook Forti
          </div>
          <Button
            onClick={() => setShowHookGenerator(!showHookGenerator)}
            variant="ghost"
            size="sm"
            className="text-gray-300"
          >
            {showHookGenerator ? 'Nascondi' : 'Mostra'}
          </Button>
        </CardTitle>
      </CardHeader>
      {showHookGenerator && (
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              value={hookTopic}
              onChange={(e) => setHookTopic(e.target.value)}
              placeholder="Inserisci l'argomento per gli hook (es. 'mal di schiena')"
              className="bg-gray-700 border-gray-600 text-white flex-1"
            />
            <Button 
              onClick={generateHooks}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Genera Hook
            </Button>
          </div>
          
          {generatedHooks.length > 0 && (
            <div className="grid gap-2">
              {generatedHooks.map((hook, index) => (
                <div 
                  key={index}
                  className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 flex items-center justify-between hover:bg-gray-700/70 transition-colors"
                >
                  <span className="text-gray-300 text-sm flex-1">{hook}</span>
                  <Button
                    onClick={() => onApplyHook(hook)}
                    size="sm"
                    className="ml-2 bg-blue-600 hover:bg-blue-700"
                  >
                    Applica
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default HookGenerator;
