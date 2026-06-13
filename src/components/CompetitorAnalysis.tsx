import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Loader2, TrendingUp, TrendingDown, Lightbulb, Sparkles, Hash, BarChart3, ArrowLeft } from 'lucide-react';
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
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="h-6 w-6" /> Analisi Competitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="@username Instagram del competitor"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAnalyze(); }}
              className="flex-1 text-base h-11"
            />
            <Button onClick={handleAnalyze} disabled={analyzing || !username.trim()} className="h-11 px-6">
              {analyzing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Analizza
            </Button>
          </div>
          {analyzing && (
            <p className="text-sm" style={{ color: 'var(--ink3)' }}>
              Scarico e analizzo i post del competitor… può richiedere 30-60 secondi.
            </p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-5">
            <Button
              variant="outline"
              onClick={() => { setResult(null); setUsername(''); setManualInfo(''); }}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Nuova analisi
            </Button>
            {/* Header */}
            <div className="flex items-center justify-between p-5 rounded-xl" style={{ backgroundColor: 'var(--viola-dim)' }}>
              <div className="space-y-1">
                <div className="font-bold text-lg" style={{ color: 'var(--ink)' }}>{result.competitor_name}</div>
                {result.engagement_rate && (
                  <div className="text-sm" style={{ color: 'var(--ink3)' }}>
                    Engagement: <strong>{result.engagement_rate}</strong>
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-5xl font-black leading-none" style={{ color: scoreColor(result.overall_score) }}>
                  {result.overall_score}
                </div>
                <div className="text-xs font-semibold mt-1" style={{ color: 'var(--ink3)' }}>/100</div>
              </div>
            </div>

            {/* Metrics */}
            {result.scraped_metrics && (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--viola-dim)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{result.scraped_metrics.posts_analyzed}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--ink3)' }}>Post analizzati</div>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--viola-dim)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{result.scraped_metrics.avg_likes}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--ink3)' }}>Like medi</div>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--viola-dim)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{result.scraped_metrics.avg_comments}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--ink3)' }}>Commenti medi</div>
                </div>
              </div>
            )}

            {/* Content Strategy */}
            {result.content_strategy && (
              <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-5 w-5" style={{ color: 'var(--viola)' }} />
                  <span className="text-base font-bold" style={{ color: 'var(--ink)' }}>Strategia contenuti</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm" style={{ color: 'var(--ink2)' }}>
                  {result.content_strategy.posting_frequency && (
                    <div>Frequenza: <strong style={{ color: 'var(--ink)' }}>{result.content_strategy.posting_frequency}</strong></div>
                  )}
                  {result.content_strategy.best_content_type && (
                    <div>Miglior formato: <strong style={{ color: 'var(--ink)' }}>{result.content_strategy.best_content_type}</strong></div>
                  )}
                  {result.content_strategy.tone_of_voice && (
                    <div className="sm:col-span-2">Tono: <strong style={{ color: 'var(--ink)' }}>{result.content_strategy.tone_of_voice}</strong></div>
                  )}
                </div>
                {result.content_strategy.main_topics?.length > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink3)' }}>Argomenti principali</div>
                    <div className="flex flex-wrap gap-2">
                      {result.content_strategy.main_topics.map((t: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs px-3 py-1">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Strengths + Weaknesses side-by-side */}
            <div className="grid lg:grid-cols-2 gap-4">
              {result.strengths?.length > 0 && (
                <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5" style={{ color: '#22c55e' }} />
                    <span className="text-base font-bold" style={{ color: '#22c55e' }}>Punti di forza</span>
                  </div>
                  <ul className="text-sm space-y-2" style={{ color: 'var(--ink2)' }}>
                    {result.strengths.map((s: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span style={{ color: '#22c55e', flexShrink: 0 }}>+</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.weaknesses?.length > 0 && (
                <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="h-5 w-5" style={{ color: '#ef4444' }} />
                    <span className="text-base font-bold" style={{ color: '#ef4444' }}>Punti deboli</span>
                  </div>
                  <ul className="text-sm space-y-2" style={{ color: 'var(--ink2)' }}>
                    {result.weaknesses.map((w: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span style={{ color: '#ef4444', flexShrink: 0 }}>−</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Opportunities */}
            {result.opportunities?.length > 0 && (
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'var(--viola-dim)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5" style={{ color: 'var(--viola)' }} />
                  <span className="text-base font-bold" style={{ color: 'var(--viola)' }}>Opportunità per te</span>
                </div>
                <ul className="text-sm space-y-2" style={{ color: 'var(--ink2)' }}>
                  {result.opportunities.map((o: string, i: number) => (
                    <li key={i} className="flex gap-2">
                      <span style={{ color: 'var(--viola)', flexShrink: 0 }}>→</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Content Ideas */}
            {result.content_ideas?.length > 0 && (
              <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5" style={{ color: 'var(--rosa)' }} />
                  <span className="text-base font-bold" style={{ color: 'var(--rosa)' }}>Idee contenuti da creare</span>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {result.content_ideas.map((idea: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--viola-dim)' }}>
                      <div className="font-semibold text-sm mb-2" style={{ color: 'var(--ink)' }}>{idea.idea}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{idea.format}</Badge>
                        <span className="text-xs" style={{ color: 'var(--ink3)' }}>{idea.why}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtag Analysis */}
            {result.hashtag_analysis && (
              <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="h-5 w-5" style={{ color: 'var(--ink3)' }} />
                  <span className="text-base font-bold" style={{ color: 'var(--ink)' }}>Hashtag</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {result.hashtag_analysis.most_used?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink3)' }}>Usati dal competitor</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.hashtag_analysis.most_used.map((h: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">#{h.replace('#', '')}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.hashtag_analysis.suggested?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--viola)' }}>Suggeriti per te</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.hashtag_analysis.suggested.map((h: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs" style={{ borderColor: 'var(--viola)', color: 'var(--viola)' }}>#{h.replace('#', '')}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            {result.summary && (
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'var(--viola-dim)' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink3)' }}>Sintesi</div>
                <p className="text-base leading-relaxed" style={{ color: 'var(--ink)' }}>
                  {result.summary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {analyses.length > 0 && (
          <div className="pt-2">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--ink3)' }}>
              Storico analisi ({analyses.length})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {analyses.slice(0, 10).map(a => (
                <button
                  key={a.id}
                  onClick={() => setResult(a.analysis_data)}
                  className="flex items-center gap-3 text-sm p-3 rounded-lg w-full text-left transition-colors"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer' }}
                >
                  <Badge variant="outline" className="text-xs">{a.platform}</Badge>
                  <span className="truncate flex-1 font-medium" style={{ color: 'var(--ink)' }}>{a.competitor_name}</span>
                  <span className="font-bold" style={{ color: scoreColor(a.score) }}>{a.score}/100</span>
                  <span className="text-xs" style={{ color: 'var(--ink3)' }}>{new Date(a.created_at).toLocaleDateString()}</span>
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
