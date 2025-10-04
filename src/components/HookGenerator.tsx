
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Zap, Sparkles, TrendingUp } from "lucide-react";
import { useAIHookGenerator, AIHook } from "@/hooks/useAIHookGenerator";
import { Badge } from "@/components/ui/badge";

interface HookGeneratorProps {
  showHookGenerator: boolean;
  setShowHookGenerator: (show: boolean) => void;
  hookTopic: string;
  setHookTopic: (topic: string) => void;
  onApplyHook: (hook: string) => void;
  audience?: string;
  tone?: string;
  platform?: string;
}

const HookGenerator: React.FC<HookGeneratorProps> = ({
  showHookGenerator,
  setShowHookGenerator,
  hookTopic,
  setHookTopic,
  onApplyHook,
  audience,
  tone,
  platform
}) => {
  const { generateHooks, generatedHooks, isGenerating } = useAIHookGenerator();

  const handleGenerate = () => {
    generateHooks({
      topic: hookTopic,
      audience,
      tone,
      platform
    });
  };

  const getStyleColor = (style: string) => {
    const colors: Record<string, string> = {
      emotional: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      curiosity: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      controversy: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      storytelling: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      authority: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      urgency: 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return colors[style] || 'bg-muted text-muted-foreground';
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-muted-foreground';
  };

  return (
    <Card className="mt-8 bg-card/50 border-primary/20 backdrop-blur-sm shadow-enhanced">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">
              🚀 AI Hook Generator
            </span>
            <Badge variant="outline" className="ml-2 border-accent/50 text-accent">
              Powered by AI
            </Badge>
          </div>
          <Button
            onClick={() => setShowHookGenerator(!showHookGenerator)}
            variant="ghost"
            size="sm"
          >
            {showHookGenerator ? 'Nascondi' : 'Mostra'}
          </Button>
        </CardTitle>
      </CardHeader>
      {showHookGenerator && (
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              value={hookTopic}
              onChange={(e) => setHookTopic(e.target.value)}
              placeholder="Inserisci l'argomento (es. 'mal di schiena')"
              className="flex-1 glow-effect"
              disabled={isGenerating}
            />
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90 min-w-[140px]"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Genera Hook
                </>
              )}
            </Button>
          </div>
          
          {generatedHooks.length > 0 && (
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm text-muted-foreground">
                  {generatedHooks.length} hook generati • Ordinati per virality score
                </span>
              </div>
              
              <div className="grid gap-3">
                {generatedHooks.map((hook: AIHook, index: number) => (
                  <div 
                    key={index}
                    className="bg-card/80 p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all hover:shadow-enhanced group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <p className="text-foreground font-medium leading-relaxed">
                          {hook.text}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStyleColor(hook.style)}`}
                          >
                            {hook.style}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <TrendingUp className={`h-3 w-3 ${getScoreColor(hook.virality_score)}`} />
                            <span className={`text-xs font-mono ${getScoreColor(hook.virality_score)}`}>
                              {hook.virality_score}/100
                            </span>
                          </div>
                        </div>
                        {hook.reasoning && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            💡 {hook.reasoning}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => onApplyHook(hook.text)}
                        size="sm"
                        className="bg-accent hover:bg-accent/90 shrink-0"
                      >
                        Applica
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default HookGenerator;
