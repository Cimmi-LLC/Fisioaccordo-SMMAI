
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy } from "lucide-react";
import { CopyService } from "@/services/copyService";

interface ImproveTabProps {
  originalCopy: string;
  improvedCopy: string;
  selectedTemplates: string[];
  onImproveCopy: () => void;
  onCopyToClipboard: (text: string) => void;
  onRemoveTemplate: (templateId: string) => void;
}

export const ImproveTab: React.FC<ImproveTabProps> = ({
  originalCopy,
  improvedCopy,
  selectedTemplates,
  onImproveCopy,
  onCopyToClipboard,
  onRemoveTemplate
}) => {
  return (
    <div className="space-y-4">
      <Button 
        onClick={onImproveCopy}
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
            onClick={() => onCopyToClipboard(improvedCopy)}
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
                  onClick={() => onRemoveTemplate(templateId)}
                >
                  {template?.name} ✕
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
