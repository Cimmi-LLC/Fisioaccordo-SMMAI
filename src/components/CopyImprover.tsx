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

  const handleAnalyzeCopy = () => {
    if (!originalCopy.trim()) {
      toast({
        title: "Inserisci il copy",
        description: "Scrivi il testo da analizzare",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Analyzing copy:', originalCopy);
      const copyAnalysis = CopyService.analyzeCopy(originalCopy);
      console.log('Analysis result:', copyAnalysis);
      setAnalysis(copyAnalysis);

      toast({
        title: "Analisi completata! 🎯",
        description: `Score totale: ${copyAnalysis.score}/100`
      });
    } catch (error) {
      console.error('Errore nell\'analisi:', error);
      toast({
        title: "Errore nell'analisi",
        description: "Si è verificato un errore durante l'analisi del copy",
        variant: "destructive"
      });
    }
  };

  const handleImproveCopy = () => {
    console.log('🎯 handleImproveCopy called');
    console.log('Original copy:', originalCopy.substring(0, 100));
    console.log('Selected templates:', selectedTemplates);

    if (!originalCopy.trim()) {
      toast({
        title: "Inserisci il copy",
        description: "Scrivi il testo da migliorare",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🚀 Starting copy improvement...');
      const improved = CopyService.generateImprovedCopy(originalCopy, selectedTemplates);
      console.log('✅ Improved copy generated:', improved.substring(0, 100));
      
      if (improved && improved !== originalCopy) {
        setImprovedCopy(improved);
        onCopyImproved(improved);

        toast({
          title: "🔥 Copy super-ottimizzato!",
          description: "Il tuo copy è stato trasformato in un format virale"
        });
      } else {
        console.warn('⚠️ No improvement generated');
        toast({
          title: "Copy migliorato",
          description: "Il copy è stato processato",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('💥 Error in handleImproveCopy:', error);
      toast({
        title: "Errore nel miglioramento",
        description: "Si è verificato un errore. Riprova con un testo più semplice.",
        variant: "destructive"
      });
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    try {
      console.log('Applying template:', templateId);
      const templates = CopyService.getTemplatesByCategory();
      console.log('Available templates:', templates);
      const template = templates.find(t => t.id === templateId);
      
      if (template) {
        if (!selectedTemplates.includes(templateId)) {
          setSelectedTemplates(prev => [...prev, templateId]);
          console.log('Template applied successfully:', template.name);
        }
        
        toast({
          title: "Template applicato! 🎯",
          description: template.name
        });
      } else {
        console.error('Template not found:', templateId);
      }
    } catch (error) {
      console.error('Errore nell\'applicazione del template:', error);
      toast({
        title: "Errore nel template",
        description: "Si è verificato un errore nell'applicazione del template",
        variant: "destructive"
      });
    }
  };

  const handleRemoveTemplate = (templateId: string) => {
    setSelectedTemplates(prev => prev.filter(id => id !== templateId));
  };

  const handleCopyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      toast({
        title: "Copiato! 📋",
        description: "Copy copiato negli appunti"
      });
    } catch (error) {
      console.error('Errore nella copia:', error);
      toast({
        title: "Errore nella copia",
        description: "Non è stato possibile copiare il testo",
        variant: "destructive"
      });
    }
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

  // Safely get templates with error handling
  const getTemplatesWithErrorHandling = (category?: string) => {
    try {
      console.log('Getting templates for category:', category);
      const templates = CopyService.getTemplatesByCategory(category);
      console.log('Templates retrieved:', templates?.length || 0);
      return templates || [];
    } catch (error) {
      console.error('Error getting templates:', error);
      return [];
    }
  };

  // Safely get knowledge with error handling
  const getKnowledgeWithErrorHandling = (category?: string) => {
    try {
      console.log('Getting knowledge for category:', category);
      const knowledge = CopyService.getKnowledgeByCategory(category);
      console.log('Knowledge retrieved:', knowledge?.length || 0);
      return knowledge || [];
    } catch (error) {
      console.error('Error getting knowledge:', error);
      return [];
    }
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
            <TabsTrigger value="analyze" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analizza
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
              <Wand2 className="w-4 h-4 mr-2" />
              Template
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
              <BookOpen className="w-4 h-4 mr-2" />
              Knowledge
            </TabsTrigger>
            <TabsTrigger value="improve" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Migliora
            </TabsTrigger>
            <TabsTrigger value="import" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
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
                className="bg-gray-700 border-gray-600 text-white min-h-[120px] focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <Button 
              onClick={handleAnalyzeCopy}
              className="w-full bg-purple-600 hover:bg-purple-700 transition-colors"
              disabled={!originalCopy.trim()}
            >
              <Target className="mr-2 h-4 w-4" />
              Analizza Copy con AI
            </Button>

            {analysis && (
              <div className="space-y-4 mt-6">
                {/* Score Totale */}
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">Score Totale</span>
                    <span className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
                      {analysis.score}/100
                    </span>
                  </div>
                  <Progress value={analysis.score} className="h-2 mb-2" />
                  <span className={`text-sm ${getScoreColor(analysis.score)}`}>
                    {getScoreLabel(analysis.score)}
                  </span>
                </div>

                {/* Breakdown Dettagliato */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">🎯 Hook</span>
                      <span className={`font-bold ${getScoreColor(analysis.hook_rating)}`}>
                        {analysis.hook_rating}
                      </span>
                    </div>
                    <Progress value={analysis.hook_rating} className="h-1 mt-1" />
                  </div>

                  <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">💭 Emozione</span>
                      <span className={`font-bold ${getScoreColor(analysis.emotion_rating)}`}>
                        {analysis.emotion_rating}
                      </span>
                    </div>
                    <Progress value={analysis.emotion_rating} className="h-1 mt-1" />
                  </div>

                  <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">📝 Chiarezza</span>
                      <span className={`font-bold ${getScoreColor(analysis.clarity_rating)}`}>
                        {analysis.clarity_rating}
                      </span>
                    </div>
                    <Progress value={analysis.clarity_rating} className="h-1 mt-1" />
                  </div>

                  <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
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
                {analysis.suggestions && analysis.suggestions.length > 0 && (
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
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-purple-500">
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 z-50">
                  <SelectItem value="" className="text-white hover:bg-gray-600">Tutte le categorie</SelectItem>
                  <SelectItem value="hook" className="text-white hover:bg-gray-600">Hook</SelectItem>
                  <SelectItem value="storytelling" className="text-white hover:bg-gray-600">Storytelling</SelectItem>
                  <SelectItem value="cta" className="text-white hover:bg-gray-600">Call to Action</SelectItem>
                  <SelectItem value="social-proof" className="text-white hover:bg-gray-600">Social Proof</SelectItem>
                  <SelectItem value="viral" className="text-white hover:bg-gray-600">Viral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getTemplatesWithErrorHandling(selectedCategory).map((template) => (
                <div key={template.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-white font-medium">{template.name}</h4>
                      <Badge variant="outline" className="text-xs mt-1 border-gray-500 text-gray-300">
                        {template.category}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                      <span className="text-green-400 text-sm">{template.effectiveness_score || 0}%</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3">{template.description}</p>
                  
                  <div className="bg-gray-800/50 p-3 rounded border-l-4 border-purple-500 mb-3">
                    <code className="text-purple-300 text-sm break-words">{template.template}</code>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {(template.use_cases || []).map((useCase) => (
                      <Badge key={useCase} variant="secondary" className="text-xs bg-gray-600 text-gray-300">
                        {useCase}
                      </Badge>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleApplyTemplate(template.id)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 transition-colors"
                    disabled={selectedTemplates.includes(template.id)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {selectedTemplates.includes(template.id) ? 'Applicato' : 'Applica Template'}
                  </Button>
                </div>
              ))}
              
              {getTemplatesWithErrorHandling(selectedCategory).length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun template disponibile per questa categoria</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab Knowledge */}
          <TabsContent value="knowledge" className="space-y-4">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {getKnowledgeWithErrorHandling().map((knowledge) => (
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
                    {(knowledge.examples || []).map((example, index) => (
                      <div key={index} className="bg-gray-800/50 p-2 rounded text-gray-300 text-sm">
                        "{example}"
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(knowledge.tags || []).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs border-gray-500 text-gray-300">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              
              {getKnowledgeWithErrorHandling().length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna conoscenza disponibile</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab Migliora */}
          <TabsContent value="improve" className="space-y-4">
            <Button 
              onClick={handleImproveCopy}
              disabled={!originalCopy.trim()}
              className="w-full bg-green-600 hover:bg-green-700 transition-colors"
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
                  onClick={() => handleCopyToClipboard(improvedCopy)}
                  variant="outline"
                  className="w-full text-white border-gray-600 hover:bg-gray-700 transition-colors"
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
                      <Badge 
                        key={templateId} 
                        className="bg-purple-600 text-xs cursor-pointer hover:bg-purple-700"
                        onClick={() => handleRemoveTemplate(templateId)}
                      >
                        {template?.name} ✕
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
