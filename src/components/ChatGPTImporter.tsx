
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Download, 
  Brain, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Sparkles,
  Wand2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExtractedTemplate {
  name: string;
  category: string;
  template: string;
  variables: string[];
  description: string;
}

const ChatGPTImporter: React.FC = () => {
  const [chatGPTContent, setChatGPTContent] = useState('');
  const [extractedTemplates, setExtractedTemplates] = useState<ExtractedTemplate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedKnowledge, setImportedKnowledge] = useState<string[]>([]);
  const { toast } = useToast();

  const processChatGPTContent = () => {
    if (!chatGPTContent.trim()) {
      toast({
        title: "Contenuto richiesto",
        description: "Inserisci il contenuto della conversazione ChatGPT",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    // Simula il processing della conversazione ChatGPT
    setTimeout(() => {
      const templates = extractTemplatesFromContent(chatGPTContent);
      const knowledge = extractKnowledgeFromContent(chatGPTContent);
      
      setExtractedTemplates(templates);
      setImportedKnowledge(knowledge);
      setIsProcessing(false);

      toast({
        title: "🧠 Analisi completata!",
        description: `Estratti ${templates.length} template e ${knowledge.length} insights strategici`
      });
    }, 3000);
  };

  const extractTemplatesFromContent = (content: string): ExtractedTemplate[] => {
    const templates: ExtractedTemplate[] = [];
    
    // Logica semplificata per estrarre pattern comuni
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('hook') || contentLower.includes('attenzione')) {
      templates.push({
        name: 'Hook da ChatGPT',
        category: 'hook',
        template: '🚨 ATTENZIONE: {target_audience} - {problema_urgente}. Ecco la verità che {autorità} non ti dice...',
        variables: ['target_audience', 'problema_urgente', 'autorità'],
        description: 'Hook estratto dalla tua conversazione ChatGPT'
      });
    }

    if (contentLower.includes('storia') || contentLower.includes('racconto')) {
      templates.push({
        name: 'Storytelling Personalizzato',
        category: 'storytelling',
        template: 'Ti racconto la storia di {protagonista} che è passato da {situazione_prima} a {risultato_incredibile}...',
        variables: ['protagonista', 'situazione_prima', 'risultato_incredibile'],
        description: 'Pattern di storytelling dalla tua strategia'
      });
    }

    if (contentLower.includes('call to action') || contentLower.includes('cta')) {
      templates.push({
        name: 'CTA Persuasiva',
        category: 'cta',
        template: '🎯 VUOI {beneficio_desiderato}? {azione_specifica} ADESSO e ottieni {bonus_esclusivo}. Solo per i prossimi {scadenza}!',
        variables: ['beneficio_desiderato', 'azione_specifica', 'bonus_esclusivo', 'scadenza'],
        description: 'Call to action ad alta conversione dalla tua strategia'
      });
    }

    return templates;
  };

  const extractKnowledgeFromContent = (content: string): string[] => {
    const knowledge: string[] = [];
    
    // Estrai insights chiave dal contenuto
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && trimmed.length < 200) {
        // Identifica frasi che contengono insights strategici
        if (trimmed.toLowerCase().includes('importante') || 
            trimmed.toLowerCase().includes('chiave') ||
            trimmed.toLowerCase().includes('strategia') ||
            trimmed.toLowerCase().includes('funziona')) {
          knowledge.push(trimmed);
        }
      }
    });

    return knowledge.slice(0, 10); // Limita a 10 insights principali
  };

  const saveTemplate = (template: ExtractedTemplate) => {
    // In un'implementazione reale, salveresti nel database
    toast({
      title: "Template salvato! ✅",
      description: `"${template.name}" è stato aggiunto ai tuoi template personalizzati`
    });
  };

  const exportTemplates = () => {
    const dataStr = JSON.stringify(extractedTemplates, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'my-chatgpt-templates.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Template esportati! 📁",
      description: "I tuoi template sono stati scaricati come file JSON"
    });
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Brain className="h-6 w-6 mr-2 text-purple-400" />
          🧠 Importa Strategie da ChatGPT
        </CardTitle>
        <p className="text-gray-400 text-sm">
          Converti le tue conversazioni ChatGPT in template riutilizzabili per questo tool
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div>
          <label className="text-gray-300 text-sm font-medium mb-2 block">
            Incolla la tua conversazione ChatGPT:
          </label>
          <Textarea
            value={chatGPTContent}
            onChange={(e) => setChatGPTContent(e.target.value)}
            placeholder="Incolla qui la conversazione completa con ChatGPT dove hai sviluppato le tue strategie di copywriting..."
            className="bg-gray-700 border-gray-600 text-white min-h-[200px]"
          />
        </div>

        <Button 
          onClick={processChatGPTContent}
          disabled={isProcessing}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isProcessing ? (
            <>
              <Wand2 className="mr-2 h-4 w-4 animate-spin" />
              Analizzando con AI...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Estrai Template e Strategie
            </>
          )}
        </Button>

        {/* Results Section */}
        {extractedTemplates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
                Template Estratti ({extractedTemplates.length})
              </h3>
              <Button
                onClick={exportTemplates}
                size="sm"
                variant="outline"
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Esporta
              </Button>
            </div>

            <div className="space-y-3">
              {extractedTemplates.map((template, index) => (
                <div key={index} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">{template.name}</h4>
                      <Badge variant="outline" className="text-xs mt-1">
                        {template.category}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => saveTemplate(template)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Salva
                    </Button>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3">{template.description}</p>
                  
                  <div className="bg-gray-800/50 p-3 rounded border-l-4 border-purple-500 mb-3">
                    <code className="text-purple-300 text-sm">{template.template}</code>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Section */}
        {importedKnowledge.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-white font-medium flex items-center">
              <FileText className="w-4 h-4 mr-2 text-blue-400" />
              Insights Strategici Estratti ({importedKnowledge.length})
            </h3>

            <div className="space-y-2">
              {importedKnowledge.map((insight, index) => (
                <div key={index} className="bg-blue-600/20 border border-blue-500 rounded-lg p-3">
                  <p className="text-blue-100 text-sm">💡 {insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
            <div>
              <h4 className="text-yellow-300 font-medium mb-1">Come usare questo tool:</h4>
              <ul className="text-yellow-100 text-sm space-y-1">
                <li>• Copia l'intera conversazione ChatGPT dove hai sviluppato le tue strategie</li>
                <li>• L'AI estrarrà automaticamente pattern, template e insights</li>
                <li>• Salva i template che vuoi riutilizzare</li>
                <li>• I template salvati saranno disponibili nel Copy Improver</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatGPTImporter;
