import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Loader2, TrendingUp, TrendingDown, Lightbulb, Sparkles, Hash } from 'lucide-react';
import { useCompetitorAnalysis } from '@/hooks/useCompetitorAnalysis';

const CompetitorAnalysis: React.FC = () => {
  const { analyses, analyzing, analyzeCompetitor } = useCompetitorAnalysis();
  const [username, setUsername] = useState('');
  const [manualInfo, setManualInfo] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!username.trim() && !manualInfo.trim()) return;
    const res = await analyzeCompetitor({
      username: username.trim(),
      platform,
      manualInfo: manualInfo.trim() || undefined,
    });
    if (res) setResult(res);
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return 'var(--rosa)';
    if (score >= 50) return 'var(--viola)';
    return 'var(--ink3)';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" /> Analisi Competitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="@username Instagram del competitor"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAnalyze(); }}
              className="flex-1"
            />
            <Button onClick={handleAnalyze} disabled={analyzing || !username.trim()}>
              {analyzing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Analizza
            </Button>
          </div>
          {analyzing && (
            <p className="text-[11px]" style={{ color: 'var(--ink3)' }}>
              Scarico e analizzo i post del competitor... può richiedere 30-60 secondi.
            </p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--viola-dim)' }}>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{result.competitor_name}</div>
                {result.engagement_rate && (
                  <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                    Engagement: {result.engagement_rate}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: scoreColor(result.overall_score) }}>
                  {result.overall_score}
                </div>
                <div className="text-[10px] font-semibold" style={{ color: 'var(--ink3)' }}>/100</div>
              </div>
            </div>

            {/* Metrics */}
            {result.scraped_metrics && (
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--viola-dim)' }}>
                  <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{result.scraped_metrics.posts_analyzed}</div>
                  <div className="text-[10px]" style={{ color: 'var(--ink3)' }}>Post analizzati</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--viola-dim)' }}>
                  <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{result.scraped_metrics.avg_likes}</div>
                  <div className="text-[10px]" style={{ color: 'var(--ink3)' }}>Like medi</div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--viola-dim)' }}>
                  <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{result.scraped_metrics.avg_comments}</div>
                  <div className="text-[10px]" style={{ color: 'var(--ink3)' }}>Commenti medi</div>
                </div>
              </div>
            )}

            {/* Content Strategy */}
            {result.content_strategy && (
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: 'var(--ink)' }}>Strategia contenuti</div>
                <div className="space-y-1 text-[11px]" style={{ color: 'var(--ink3)' }}>
                  {result.content_strategy.posting_frequency && <div>Frequenza: <strong>{result.content_strategy.posting_frequency}</strong></div>}
                  {result.content_strategy.best_content_type && <div>Miglior formato: <strong>{result.content_strategy.best_content_type}</strong></div>}
                  {result.content_strategy.tone_of_voice && <div>Tono: <strong>{result.content_strategy.tone_of_voice}</strong></div>}
                  {result.content_strategy.main_topics?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.content_strategy.main_topics.map((t: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Strengths */}
            {result.strengths?.length > 0 && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.06)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />
                  <span className="text-xs font-bold" style={{ color: '#22c55e' }}>Punti di forza</span>
                </div>
                <ul className="text-[11px] space-y-1" style={{ color: 'var(--ink3)' }}>
                  {result.strengths.map((s: string, i: number) => <li key={i}>+ {s}</li>)}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {result.weaknesses?.length > 0 && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.06)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                  <span className="text-xs font-bold" style={{ color: '#ef4444' }}>Punti deboli</span>
                </div>
                <ul className="text-[11px] space-y-1" style={{ color: 'var(--ink3)' }}>
                  {result.weaknesses.map((w: string, i: number) => <li key={i}>- {w}</li>)}
                </ul>
              </div>
            )}

            {/* Opportunities */}
            {result.opportunities?.length > 0 && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--viola-dim)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="h-3.5 w-3.5" style={{ color: 'var(--viola)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--viola)' }}>Opportunità per te</span>
                </div>
                <ul className="text-[11px] space-y-1" style={{ color: 'var(--ink3)' }}>
                  {result.opportunities.map((o: string, i: number) => <li key={i}>&#x2192; {o}</li>)}
                </ul>
              </div>
            )}

            {/* Content Ideas */}
            {result.content_ideas?.length > 0 && (
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--rosa)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--rosa)' }}>Idee contenuti da creare</span>
                </div>
                <div className="space-y-2">
                  {result.content_ideas.map((idea: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg text-[11px]" style={{ backgroundColor: 'var(--viola-dim)' }}>
                      <div className="font-semibold" style={{ color: 'var(--ink)' }}>{idea.idea}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{idea.format}</Badge>
                        <span style={{ color: 'var(--ink3)' }}>{idea.why}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtag Analysis */}
            {result.hashtag_analysis && (
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Hash className="h-3.5 w-3.5" style={{ color: 'var(--ink3)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--ink)' }}>Hashtag</span>
                </div>
                {result.hashtag_analysis.most_used?.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--ink3)' }}>Usati dal competitor:</div>
                    <div className="flex flex-wrap gap-1">
                      {result.hashtag_analysis.most_used.map((h: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">#{h.replace('#', '')}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {result.hashtag_analysis.suggested?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--viola)' }}>Suggeriti per te:</div>
                    <div className="flex flex-wrap gap-1">
                      {result.hashtag_analysis.suggested.map((h: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]" style={{ borderColor: 'var(--viola)', color: 'var(--viola)' }}>#{h.replace('#', '')}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {result.summary && (
              <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--ink)' }}>
                {result.summary}
              </p>
            )}
          </div>
        )}

        {/* History */}
        {analyses.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--ink3)' }}>
              Storico analisi ({analyses.length})
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {analyses.slice(0, 10).map(a => (
                <button
                  key={a.id}
                  onClick={() => setResult(a.analysis_data)}
                  className="flex items-center gap-2 text-xs p-2 rounded-lg w-full text-left hover:bg-muted/50"
                  style={{ backgroundColor: 'var(--bg)', border: 'none', cursor: 'pointer' }}
                >
                  <Badge variant="outline" className="text-[10px]">{a.platform}</Badge>
                  <span className="truncate flex-1" style={{ color: 'var(--ink)' }}>{a.competitor_name}</span>
                  <span className="font-bold text-[11px]" style={{ color: scoreColor(a.score) }}>{a.score}/100</span>
                  <span style={{ color: 'var(--ink3)' }}>{new Date(a.created_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompetitorAnalysis;
