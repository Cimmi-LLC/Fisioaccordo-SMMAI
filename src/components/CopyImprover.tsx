import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain, 
  Zap, 
  Target, 
  TrendingUp, 
  Lightbulb, 
  Copy,
  Sparkles,
  BarChart3,
  BookOpen,
  Wand2,
  Upload
} from "lucide-react";
import { CopyService } from "@/services/copyService";
import { useToast } from "@/hooks/use-toast";
import ChatGPTImporter from "./ChatGPTImporter";

interface CopyImproverProps {
  onCopyImproved: (improvedCopy: string) => void;
}

const CopyImprover: React.FC<CopyImproverProps> = ({ onCopyImproved }) => {
  const [originalCopy, setOriginalCopy] = useState('');
  const [improvedCopy, setImprovedCopy] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const { toast } = useToast();

  const analyzeCopy = () => {
    if (!originalCopy.trim()) {
      toast({
        title: "Inserisci il copy",
        description: "Scrivi il testo da analizzare",
        variant: "destructive"
      });
      return;
    }

    const copyAnalysis = CopyService.analyzeCopy(originalCopy);
    setAnalysis(copyAnalysis);

    toast({
      title: "Analisi completata! 🎯",
      description: `Score totale: ${copyAnalysis.score}/100`
    });
  };

  const improveCopy = () => {
    if (!originalCopy.trim()) return;

    const improved = CopyService.generateImprovedCopy(originalCopy, selectedTemplates);
    setImprovedCopy(improved);
    onCopyImproved(improved);

    toast({
      title: "Copy migliorato! ✨",
      description: "Il tuo copy è stato ottimizzato con template avanzati"
    });
  };

  const applyTemplate = (templateId: string) => {
    const templates = CopyService.getTemplatesByCategory();
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      setSelectedTemplates([...selectedTemplates, templateId]);
      toast({
        title: "Template applicato! 🎯",
        description: template.name
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiato! 📋",
      description: "Copy copiato negli appunti"
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Eccellente";
    if (score >= 80) return "Molto Buono";
    if (score >= 70) return "Buono";
    if (score >= 60) return "Sufficiente";
    return "Da Migliorare";
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Brain className="h-6 w-6 mr-2 text-purple-400" />
          🧠 Sistema Avanzato di Copy Improvement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="analyze" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 bg-gray-700">
            <TabsTrigger value="analyze" className="text-gray-300">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analizza
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-gray-300">
              <Wand2 className="w-4 h-4 mr-2" />
              Template
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="text-gray-300">
              <BookOpen className="w-4 h-4 mr-2" />
              Knowledge
            </TabsTrigger>
            <TabsTrigger value="improve" className="text-gray-300">
              <Sparkles className="w-4 h-4 mr-2" />
              Migliora
            </TabsTrigger>
            <TabsTrigger value="import" className="text-gray-300">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </TabsTrigger>
          </TabsList>

          {/* Tab Analizza */}
          <TabsContent value="analyze" className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Incolla il tuo copy per l'analisi avanzata:
              </label>
              <Textarea
                value={originalCopy}
                onChange={(e) => setOriginalCopy(e.target.value)}
                placeholder="🚨 ATTENZIONE: Se soffri di mal di schiena, questo post può cambiarti la vita! La maggior parte delle persone commette questi 3 errori..."
                className="bg-gray-700 border-gray-600 text-white min-h-[120px]"
              />
            </div>

            <Button 
              onClick={analyzeCopy}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Target className="mr-2 h-4 w-4" />
              Analizza Copy con AI
            </Button>

            {analysis && (
              <div className="space-y-4 mt-6">
                {/* Score Totale */}
                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">Score Totale</span>
                    <span className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
                      {analysis.score}/100
                    </span>
                  </div>
                  <Progress value={analysis.score} className="h-2" />
                  <span className={`text-sm ${getScoreColor(analysis.score)}`}>
                    {getScoreLabel(analysis.score)}
                  </span>
                </div>

                {/* Breakdown Dettagliato */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">🎯 Hook</span>
                      <span className={`font-bold ${getScoreColor(analysis.hook_rating)}`}>
                        {analysis.hook_rating}
                      </span>
                    </div>
                    <Progress value={analysis.hook_rating} className="h-1 mt-1" />
                  </div>

                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">💭 Emozione</span>
                      <span className={`font-bold ${getScoreColor(analysis.emotion_rating)}`}>
                        {analysis.emotion_rating}
                      </span>
                    </div>
                    <Progress value={analysis.emotion_rating} className="h-1 mt-1" />
                  </div>

                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">📝 Chiarezza</span>
                      <span className={`font-bold ${getScoreColor(analysis.clarity_rating)}`}>
                        {analysis.clarity_rating}
                      </span>
                    </div>
                    <Progress value={analysis.clarity_rating} className="h-1 mt-1" />
                  </div>

                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">🎯 CTA</span>
                      <span className={`font-bold ${getScoreColor(analysis.cta_rating)}`}>
                        {analysis.cta_rating}
                      </span>
                    </div>
                    <Progress value={analysis.cta_rating} className="h-1 mt-1" />
                  </div>
                </div>

                {/* Suggerimenti */}
                {analysis.suggestions.length > 0 && (
                  <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-4">
                    <h4 className="text-blue-300 font-medium mb-2 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Suggerimenti per Migliorare:
                    </h4>
                    <div className="space-y-2">
                      {analysis.suggestions.map((suggestion: string, index: number) => (
                        <div key={index} className="text-blue-100 text-sm">
                          • {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab Template */}
          <TabsContent value="templates" className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Filtra per categoria:
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="">Tutte le categorie</SelectItem>
                  <SelectItem value="hook">Hook</SelectItem>
                  <SelectItem value="storytelling">Storytelling</SelectItem>
                  <SelectItem value="cta">Call to Action</SelectItem>
                  <SelectItem value="social-proof">Social Proof</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {CopyService.getTemplatesByCategory(selectedCategory).map((template) => (
                <div key={template.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">{template.name}</h4>
                      <Badge variant="outline" className="text-xs mt-1">
                        {template.category}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                      <span className="text-green-400 text-sm">{template.effectiveness_score}%</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3">{template.description}</p>
                  
                  <div className="bg-gray-800/50 p-3 rounded border-l-4 border-purple-500 mb-3">
                    <code className="text-purple-300 text-sm">{template.template}</code>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {template.use_cases.map((useCase) => (
                      <Badge key={useCase} variant="secondary" className="text-xs">
                        {useCase}
                      </Badge>
                    ))}
                  </div>

                  <Button
                    onClick={() => applyTemplate(template.id)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Applica Template
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab Knowledge */}
          <TabsContent value="knowledge" className="space-y-4">
            <div className="space-y-4">
              {CopyService.getKnowledgeByCategory().map((knowledge) => (
                <div key={knowledge.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-medium">{knowledge.title}</h4>
                    <div className="flex items-center">
                      <span className="text-yellow-400 text-sm">★ {knowledge.effectiveness_rating}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-3">{knowledge.content}</p>
                  
                  <div className="space-y-2 mb-3">
                    <span className="text-gray-400 text-xs">Esempi:</span>
                    {knowledge.examples.map((example, index) => (
                      <div key={index} className="bg-gray-800/50 p-2 rounded text-gray-300 text-sm">
                        "{example}"
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {knowledge.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab Migliora */}
          <TabsContent value="improve" className="space-y-4">
            <Button 
              onClick={improveCopy}
              disabled={!originalCopy.trim()}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Genera Copy Migliorato
            </Button>

            {improvedCopy && (
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-2 block">
                    ✨ Copy Ottimizzato:
                  </label>
                  <div className="bg-green-600/20 border border-green-500 rounded-lg p-4">
                    <pre className="text-green-100 whitespace-pre-wrap text-sm">
                      {improvedCopy}
                    </pre>
                  </div>
                </div>

                <Button
                  onClick={() => copyToClipboard(improvedCopy)}
                  variant="outline"
                  className="w-full text-white border-gray-600 hover:bg-gray-700"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copia Copy Migliorato
                </Button>
              </div>
            )}

            {selectedTemplates.length > 0 && (
              <div className="bg-purple-600/20 border border-purple-500 rounded-lg p-3">
                <span className="text-purple-300 text-sm">Template applicati:</span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTemplates.map((templateId) => {
                    const template = CopyService.getTemplatesByCategory().find(t => t.id === templateId);
                    return (
                      <Badge key={templateId} className="bg-purple-600 text-xs">
                        {template?.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab Import ChatGPT */}
          <TabsContent value="import" className="space-y-4">
            <ChatGPTImporter />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CopyImprover;
