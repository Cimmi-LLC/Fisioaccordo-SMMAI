
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Wand2, Zap } from "lucide-react";

interface TemplatesTabProps {
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  selectedTemplates: string[];
  onApplyTemplate: (templateId: string) => void;
  getTemplatesWithErrorHandling: (category?: string) => any[];
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedTemplates,
  onApplyTemplate,
  getTemplatesWithErrorHandling
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-foreground text-sm font-medium mb-2 block">
          Filtra per categoria:
        </label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="bg-input border-border text-foreground focus:border-primary focus:ring-primary glow-effect">
            <SelectValue placeholder="Tutte le categorie" />
          </SelectTrigger>
          <SelectContent className="bg-popover/95 backdrop-blur-sm border-border z-50">
            <SelectItem value="all" className="text-foreground hover:bg-muted/50">Tutte le categorie</SelectItem>
            <SelectItem value="hook" className="text-foreground hover:bg-muted/50">Hook</SelectItem>
            <SelectItem value="storytelling" className="text-foreground hover:bg-muted/50">Storytelling</SelectItem>
            <SelectItem value="cta" className="text-foreground hover:bg-muted/50">Call to Action</SelectItem>
            <SelectItem value="social-proof" className="text-foreground hover:bg-muted/50">Social Proof</SelectItem>
            <SelectItem value="viral" className="text-foreground hover:bg-muted/50">Viral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {getTemplatesWithErrorHandling(selectedCategory).map((template) => (
          <div key={template.id} className="bg-card/50 p-4 rounded-lg border border-border backdrop-blur-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-foreground font-medium">{template.name}</h4>
                <Badge variant="outline" className="text-xs mt-1 border-border text-muted-foreground">
                  {template.category}
                </Badge>
              </div>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-green-400 text-sm">{template.effectiveness_score || 0}%</span>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm mb-3">{template.description}</p>
            
            <div className="bg-muted/50 p-3 rounded border-l-4 border-primary mb-3">
              <code className="text-primary text-sm break-words">{template.template}</code>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {(template.use_cases || []).map((useCase) => (
                <Badge key={useCase} variant="secondary" className="text-xs">
                  {useCase}
                </Badge>
              ))}
            </div>

            <Button
              onClick={() => onApplyTemplate(template.id)}
              size="sm"
              className="glow-effect"
              disabled={selectedTemplates.includes(template.id)}
            >
              <Zap className="w-4 h-4 mr-2" />
              {selectedTemplates.includes(template.id) ? 'Applicato' : 'Applica Template'}
            </Button>
          </div>
        ))}
        
        {getTemplatesWithErrorHandling(selectedCategory).length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessun template disponibile per questa categoria</p>
          </div>
        )}
      </div>
    </div>
  );
};
