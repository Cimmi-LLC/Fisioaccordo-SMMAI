import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Eye, Loader2, Zap } from 'lucide-react';
import { useViralAnalysis } from '@/hooks/useViralAnalysis';

const ViralAnalyzer: React.FC = () => {
  const { analyses, analyzing, analyzePost } = useViralAnalysis();
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    const res = await analyzePost({ url: url.trim(), platform: 'instagram', postType: 'reel' });
    if (res) setResult(res);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5" /> Analisi Post Virali
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Incolla il link del post o reel da analizzare"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAnalyze(); }}
              className="flex-1"
            />
            <Button onClick={handleAnalyze} disabled={analyzing || !url.trim()}>
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
              Analizza
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Score Viralità:</span>
              <Badge variant={result.score >= 70 ? 'default' : 'secondary'}>{result.score}/100</Badge>
            </div>
            <p className="text-sm text-foreground/90">{result.analysis}</p>
            {result.patterns && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Pattern trovati:</p>
                {result.patterns.hook_type && <Badge variant="outline" className="mr-1">Hook: {result.patterns.hook_type}</Badge>}
                {result.patterns.cta_style && <Badge variant="outline" className="mr-1">CTA: {result.patterns.cta_style}</Badge>}
                {result.patterns.emotional_triggers?.map((t: string, i: number) => (
                  <Badge key={i} variant="outline" className="mr-1">{t}</Badge>
                ))}
              </div>
            )}
            {result.takeaways?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Takeaway:</p>
                <ul className="text-sm space-y-1">
                  {result.takeaways.map((t: string, i: number) => <li key={i}>• {t}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {analyses.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Storico analisi ({analyses.length})</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {analyses.slice(0, 10).map(a => (
                <div key={a.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-background">
                  <Badge variant="outline" className="text-[10px]">{a.platform}</Badge>
                  <span className="truncate flex-1">{a.post_url || a.analysis_text?.substring(0, 60)}</span>
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ViralAnalyzer;
