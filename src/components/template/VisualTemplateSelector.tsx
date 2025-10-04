import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette } from "lucide-react";

export type VisualTemplate = 'default' | 'fisioaccordo' | 'business' | 'minimal';

interface VisualTemplateSelectorProps {
  value: VisualTemplate;
  onChange: (template: VisualTemplate) => void;
}

const templateOptions = [
  {
    value: 'default' as VisualTemplate,
    label: 'Default',
    description: 'Stile standard versatile'
  },
  {
    value: 'fisioaccordo' as VisualTemplate,
    label: 'Fisioaccordo',
    description: 'Layout rosa fucsia con header e CTA'
  },
  {
    value: 'business' as VisualTemplate,
    label: 'Business',
    description: 'Professionale e pulito'
  },
  {
    value: 'minimal' as VisualTemplate,
    label: 'Minimal',
    description: 'Essenziale e moderno'
  }
];

const VisualTemplateSelector: React.FC<VisualTemplateSelectorProps> = ({
  value,
  onChange
}) => {
  return (
    <div>
      <Label className="text-foreground text-lg font-medium flex items-center">
        <Palette className="h-4 w-4 mr-2 text-primary" />
        Stile Visivo
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-input border-border text-foreground mt-2 focus:border-primary focus:ring-primary glow-effect">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover/95 backdrop-blur-sm border-border z-50">
          {templateOptions.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="hover:bg-muted/50 focus:bg-accent focus:text-accent-foreground"
            >
              <div className="flex flex-col items-start">
                <span className="font-medium text-foreground">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VisualTemplateSelector;