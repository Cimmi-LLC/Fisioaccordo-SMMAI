import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Loader2, Sparkles, Search, ArrowRight, Film, Layers, MessageSquare } from 'lucide-react';
import { useTrends } from '@/hooks/useTrends';

interface TrendExplorerProps {
  onUseTrend?: (topic: string) => void;
}

type DevTarget = 'reel' | 'carosello' | 'post';

/**
 * Map a free-text `suggested_format` (from LLM) to the route target we own.
 * Returns null if no clear match — UI shows all buttons in that case.
 * Note: "storia" is intentionally NOT mapped — /storie generates batches
 * by type (quiz/curiosità/…) rather than from a single topic.
 */
function inferTarget(format?: string | null): DevTarget | null {
  if (!format) return null;
  const f = format.toLowerCase();
  if (f.includes('reel') || f.includes('video')) return 'reel';
  if (f.includes('carosell') || f.includes('carousel')) return 'carosello';
  if (f.includes('post')) return 'post';
  return null;
}

const TARGET_META: Record<DevTarget, { label: string; icon: React.ComponentType<{ className?: string }>; path: string; typeParam?: string }> = {
  reel:      { label: 'Reel',      icon: Film,           path: '/reel' },
  carosello: { label: 'Carosello', icon: Layers,         path: '/posts',  typeParam: 'carosello' },
  post:      { label: 'Post',      icon: MessageSquare,  path: '/posts',  typeParam: 'post-singolo' },
};

const TrendExplorer: React.FC<TrendExplorerProps> = ({ onUseTrend }) => {
  const navigate = useNavigate();
  const { trends, searching, findTrends } = useTrends();
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [lastNiche, setLastNiche] = useState('');
  const [lastPlatform, setLastPlatform] = useState('');

  const handleSearch = () => {
    if (!niche.trim()) return;
    setLastNiche(niche.trim());
    setLastPlatform(platform);
    findTrends(niche.trim(), platform, false);
  };

  const handleLoadMore = () => {
    if (!lastNiche) return;
    findTrends(lastNiche, lastPlatform, true);
  };

  const developIdea = (topic: string, target: DevTarget) => {
    const meta = TARGET_META[target];
    const params = new URLSearchParams({ topic, auto: '1' });
    if (meta.typeParam) params.set('type', meta.typeParam);
    navigate(`${meta.path}?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" /> Trend del Momento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="La tua nicchia (es: fisioterapia, fitness...)"
            value={niche}
            onChange={e => setNiche(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={searching || !niche.trim()}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {trends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Cerca trend per la tua nicchia!</p>
        ) : (
          <div className="space-y-2">
            {trends.map(trend => (
              <div key={trend.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{trend.topic}</span>
                  <div className="flex items-center gap-2">
                    {(trend as any).suggested_format && (
                      <Badge variant="outline" className="text-[10px]">{(trend as any).suggested_format}</Badge>
                    )}
                    <Badge variant={trend.trend_score >= 70 ? 'default' : 'secondary'}>
                      {trend.trend_score}/100
                    </Badge>
                  </div>
                </div>
                {trend.source && <p className="text-xs text-muted-foreground">{trend.source}</p>}
                {trend.suggested_content && (
                  <p className="text-xs text-foreground/80">{trend.suggested_content}</p>
                )}


                {/* Develop-this-idea buttons. If the LLM suggested a format,
                    show a single primary CTA matching it; otherwise show
                    all 4 small buttons so the user picks. */}
                {(() => {
                  const target = inferTarget((trend as any).suggested_format);
                  if (target) {
                    const meta = TARGET_META[target];
                    const Icon = meta.icon;
                    return (
                      <Button
                        size="sm"
                        className="text-xs h-8 gap-1.5"
                        style={{ backgroundColor: 'var(--rosa)' }}
                        onClick={() => developIdea(trend.topic, target)}
                      >
                        <Icon className="h-3.5 w-3.5" /> Sviluppa {meta.label.toLowerCase()}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    );
                  }
                  return (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-semibold self-center" style={{ color: 'var(--ink3)' }}>
                        Sviluppa come:
                      </span>
                      {(Object.keys(TARGET_META) as DevTarget[]).map((t) => {
                        const meta = TARGET_META[t];
                        const Icon = meta.icon;
                        return (
                          <Button
                            key={t}
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 gap-1"
                            onClick={() => developIdea(trend.topic, t)}
                          >
                            <Icon className="h-3 w-3" /> {meta.label}
                          </Button>
                        );
                      })}
                    </div>
                  );
                })()}

                {onUseTrend && (
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => onUseTrend(trend.topic)}>
                    Genera post su questo trend (legacy)
                  </Button>
                )}
              </div>
            ))}

            {/* Load more button */}
            <button
              onClick={handleLoadMore}
              disabled={searching}
              className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-bold rounded-lg transition-colors"
              style={{ border: '1px solid var(--line)', color: 'var(--viola)', background: 'transparent', cursor: searching ? 'not-allowed' : 'pointer' }}
            >
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generane altri
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendExplorer;
