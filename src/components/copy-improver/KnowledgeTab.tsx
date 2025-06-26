
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

interface KnowledgeTabProps {
  getKnowledgeWithErrorHandling: (category?: string) => any[];
}

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ getKnowledgeWithErrorHandling }) => {
  return (
    <div className="space-y-4">
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
    </div>
  );
};
