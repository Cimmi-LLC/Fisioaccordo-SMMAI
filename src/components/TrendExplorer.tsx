import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Loader2, Sparkles } from 'lucide-react';
import { useTrends } from '@/hooks/useTrends';

interface TrendExplorerProps {
  onUseTrend?: (topic: string) => void;
}

const TrendExplorer: React.FC<TrendExplorerProps> = ({ onUseTrend }) => {
  const { trends, searching, findTrends } = useTrends();
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('instagram');

  const handleSearch = () => {
    if (!niche.trim()) return;
    findTrends(niche.trim(), platform);
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
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>

        {trends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Cerca trend per la tua nicchia!</p>
        ) : (
          <div className="space-y-2">
            {trends.map(trend => (
              <div key={trend.id} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{trend.topic}</span>
                  <Badge variant={trend.trend_score >= 70 ? 'default' : 'secondary'}>
                    🔥 {trend.trend_score}/100
                  </Badge>
                </div>
                {trend.source && <p className="text-xs text-muted-foreground">{trend.source}</p>}
                {trend.suggested_content && (
                  <p className="text-xs text-foreground/80">💡 {trend.suggested_content}</p>
                )}
                {onUseTrend && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onUseTrend(trend.topic)}>
                    Genera post su questo trend →
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendExplorer;
