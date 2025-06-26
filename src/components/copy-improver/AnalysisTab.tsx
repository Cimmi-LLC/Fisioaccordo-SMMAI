
import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Target, Lightbulb } from "lucide-react";

interface AnalysisTabProps {
  originalCopy: string;
  setOriginalCopy: (value: string) => void;
  analysis: any;
  onAnalyzeCopy: () => void;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({
  originalCopy,
  setOriginalCopy,
  analysis,
  onAnalyzeCopy
}) => {
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
    <div className="space-y-4">
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
        onClick={onAnalyzeCopy}
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
    </div>
  );
};
