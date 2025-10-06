
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  BarChart3,
  BookOpen,
  Wand2,
  Sparkles,
  Upload
} from "lucide-react";
import { CopyService } from "@/services/copyService";
import { useToast } from "@/hooks/use-toast";
import { AnalysisTab } from "./copy-improver/AnalysisTab";
import { TemplatesTab } from "./copy-improver/TemplatesTab";
import { KnowledgeTab } from "./copy-improver/KnowledgeTab";
import { ImproveTab } from "./copy-improver/ImproveTab";
import { ImportTab } from "./copy-improver/ImportTab";

interface CopyImproverProps {
  onCopyImproved: (improvedCopy: string) => void;
}

const CopyImprover: React.FC<CopyImproverProps> = ({ onCopyImproved }) => {
  const [originalCopy, setOriginalCopy] = useState('');
  const [improvedCopy, setImprovedCopy] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
      
      if (!templates || templates.length === 0) {
        console.warn('No templates available');
        toast({
          title: "⚠️ Nessun template disponibile",
          description: "I template non sono al momento disponibili. Riprova più tardi.",
          variant: "destructive"
        });
        return;
      }
      
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
        toast({
          title: "Template non trovato",
          description: "Il template selezionato non è disponibile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Errore nell\'applicazione del template:', error);
      toast({
        title: "Errore nel template",
        description: "Si è verificato un errore nell'applicazione del template. Riprova.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveTemplate = (templateId: string) => {
    try {
      setSelectedTemplates(prev => prev.filter(id => id !== templateId));
      toast({
        title: "Template rimosso",
        description: "Il template è stato rimosso dalla selezione"
      });
    } catch (error) {
      console.error('Error removing template:', error);
    }
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

  // Safely get templates with enhanced error handling
  const getTemplatesWithErrorHandling = (category?: string) => {
    try {
      // Normalize category: 'all' or empty string -> undefined (show all)
      const normalizedCategory = !category || category === 'all' ? undefined : category;
      console.log('Getting templates for category:', normalizedCategory);
      
      const templates = CopyService.getTemplatesByCategory(normalizedCategory);
      console.log('Templates retrieved:', templates?.length || 0);
      
      if (!templates) {
        console.warn('Templates is null or undefined');
        return [];
      }
      
      return Array.isArray(templates) ? templates : [];
    } catch (error) {
      console.error('Error getting templates with error handling:', error);
      toast({
        title: "Errore template",
        description: "Si è verificato un errore nel caricamento dei template",
        variant: "destructive"
      });
      return [];
    }
  };

  // Safely get knowledge with enhanced error handling
  const getKnowledgeWithErrorHandling = (category?: string) => {
    try {
      console.log('Getting knowledge for category:', category);
      const knowledge = CopyService.getKnowledgeByCategory(category);
      console.log('Knowledge retrieved:', knowledge?.length || 0);
      
      if (!knowledge) {
        console.warn('Knowledge is null or undefined');
        return [];
      }
      
      return Array.isArray(knowledge) ? knowledge : [];
    } catch (error) {
      console.error('Error getting knowledge with error handling:', error);
      toast({
        title: "Errore knowledge",
        description: "Si è verificato un errore nel caricamento della knowledge base",
        variant: "destructive"
      });
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

          <TabsContent value="analyze">
            <AnalysisTab
              originalCopy={originalCopy}
              setOriginalCopy={setOriginalCopy}
              analysis={analysis}
              onAnalyzeCopy={handleAnalyzeCopy}
            />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesTab
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedTemplates={selectedTemplates}
              onApplyTemplate={handleApplyTemplate}
              getTemplatesWithErrorHandling={getTemplatesWithErrorHandling}
            />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeTab
              getKnowledgeWithErrorHandling={getKnowledgeWithErrorHandling}
            />
          </TabsContent>

          <TabsContent value="improve">
            <ImproveTab
              originalCopy={originalCopy}
              improvedCopy={improvedCopy}
              selectedTemplates={selectedTemplates}
              onImproveCopy={handleImproveCopy}
              onCopyToClipboard={handleCopyToClipboard}
              onRemoveTemplate={handleRemoveTemplate}
            />
          </TabsContent>

          <TabsContent value="import">
            <ImportTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CopyImprover;
