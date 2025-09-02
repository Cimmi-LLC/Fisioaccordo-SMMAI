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
      <Label className="text-gray-300 text-lg font-medium flex items-center">
        <Palette className="h-4 w-4 mr-2" />
        Stile Visivo
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 border-gray-600">
          {templateOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-gray-400">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VisualTemplateSelector;