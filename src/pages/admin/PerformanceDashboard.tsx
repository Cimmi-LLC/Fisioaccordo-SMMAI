import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Instagram, Music2, Youtube, Calendar, AlertCircle, RefreshCw, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import SidebarClients, { ClientBrand } from '@/components/admin/SidebarClients';
import { usePerformanceMetrics, Channel, MetricRow } from '@/hooks/usePerformanceMetrics';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type RangeId = 7 | 28 | 90 | 'custom';

const RANGES: { id: RangeId; label: string }[] = [
  { id: 7, label: '7 giorni' },
  { id: 28, label: '28 giorni' },
  { id: 90, label: '90 giorni' },
];

const CHANNELS: { id: Channel; label: string; icon: LucideIcon; accent: string; enabled: boolean }[] = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, accent: '#E1306C', enabled: true },
  { id: 'tiktok',    label: 'TikTok',    icon: Music2,    accent: '#00BCD4', enabled: false },
  { id: 'youtube',   label: 'YouTube',   icon: Youtube,   accent: '#FF0000', enabled: false },
];

function fmt(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k';
  return n.toLocaleString('it-IT');
}

function fmtDur(sec: number | null | undefined) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function shiftDays(d: string, n: number) {
  return new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
}

function sumKey(rows: MetricRow[], key: keyof MetricRow): number {
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}
function lastNonNull(rows: MetricRow[], key: keyof MetricRow): number {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i][key];
    if (v != null && !isNaN(Number(v))) return Number(v);
  }
  return 0;
}
function avgKey(rows: MetricRow[], key: keyof MetricRow): number {
  const vals = rows.map((r) => Number(r[key])).filter((v) => !isNaN(v) && v != null);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function delta(cur: number, prev: number): number {
  if (!prev) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

interface Kpi {
  key: string;
  label: string;
  value: string;
  delta: number;
  sub?: string;
}

function buildKpis(
  channel: Channel,
  rows: MetricRow[],            // post-level rows only
  accountRows: MetricRow[],     // account-level rows only
  prevRows: MetricRow[],
  prevAccountRows: MetricRow[],
): Kpi[] {
  const sum = (k: keyof MetricRow) => sumKey(rows, k);
  const psum = (k: keyof MetricRow) => sumKey(prevRows, k);
  // followers / new_followers: account-level rows (LAST or SUM as appropriate)
  const last = (k: keyof MetricRow) => lastNonNull(accountRows, k);
  const plast = (k: keyof MetricRow) => lastNonNull(prevAccountRows, k);
  const sumAcc = (k: keyof MetricRow) => sumKey(accountRows, k);
  const avg = (k: keyof MetricRow) => avgKey(rows, k);
  const pavg = (k: keyof MetricRow) => avgKey(prevRows, k);

  const er = (engNow: number, denomNow: number, engPrev: number, denomPrev: number) => {
    const cur = denomNow > 0 ? engNow / denomNow : 0;
    const prev = denomPrev > 0 ? engPrev / denomPrev : 0;
    return { value: (cur * 100).toFixed(1) + '%', d: delta(cur, prev) };
  };

  if (channel === 'instagram') {
    const reach = sum('reach'); const prevReach = psum('reach');
    const eng = sum('engagement'); const prevEng = psum('engagement');
    const foll = last('followers_total'); const pfoll = plast('followers_total');
    // Engagement rate: use reach when available (Meta Graph case), else
    // fall back to followers (Apify case). Avoids the division-by-0 that
    // would otherwise show 0.0% on every Apify-scraped account.
    const denom = reach > 0 ? reach : foll;
    const prevDenom = prevReach > 0 ? prevReach : pfoll;
    const erIg = er(eng, denom, prevEng, prevDenom);
    return [
      { key: 'reach', label: 'Copertura', value: reach > 0 ? fmt(reach) : '—', delta: delta(reach, prevReach) },
      { key: 'foll',  label: 'Follower',  value: fmt(foll),  delta: delta(foll, pfoll), sub: `+${fmt(sumAcc('new_followers'))} nuovi` },
      { key: 'eng',   label: 'Interazioni', value: fmt(eng), delta: delta(eng, prevEng) },
      { key: 'er',    label: 'Tasso engagement', value: erIg.value, delta: erIg.d },
      { key: 'saves', label: 'Salvataggi', value: fmt(sum('saves')),  delta: delta(sum('saves'), psum('saves')) },
      { key: 'shares', label: 'Condivisioni', value: fmt(sum('shares')), delta: delta(sum('shares'), psum('shares')) },
    ];
  }
  if (channel === 'tiktok') {
    const views = sum('video_views'); const pviews = psum('video_views');
    const likes = sum('likes') + sum('comments');
    const plikes = psum('likes') + psum('comments');
    const foll = last('followers_total'); const pfoll = plast('followers_total');
    const erTt = er(likes, views, plikes, pviews);
    return [
      { key: 'views', label: 'Visualizzazioni', value: fmt(views), delta: delta(views, pviews) },
      { key: 'foll',  label: 'Follower',        value: fmt(foll),  delta: delta(foll, pfoll), sub: `+${fmt(sumAcc('new_followers'))} nuovi` },
      { key: 'eng',   label: 'Mi piace + commenti', value: fmt(likes), delta: delta(likes, plikes) },
      { key: 'er',    label: 'Tasso engagement', value: erTt.value, delta: erTt.d },
      { key: 'comp',  label: 'Tasso completamento', value: (avg('video_completion_rate') * 100).toFixed(1) + '%', delta: delta(avg('video_completion_rate'), pavg('video_completion_rate')) },
      { key: 'shares', label: 'Condivisioni', value: fmt(sum('shares')), delta: delta(sum('shares'), psum('shares')) },
    ];
  }
  // youtube
  const views = sum('video_views'); const pviews = psum('video_views');
  const eng = sum('engagement'); const peng = psum('engagement');
  const foll = last('followers_total'); const pfoll = plast('followers_total');
  const erYt = er(eng, views, peng, pviews);
  return [
    { key: 'views', label: 'Visualizzazioni', value: fmt(views), delta: delta(views, pviews) },
    { key: 'foll',  label: 'Iscritti',        value: fmt(foll),  delta: delta(foll, pfoll), sub: `+${fmt(sumAcc('new_followers'))} nuovi` },
    { key: 'eng',   label: 'Interazioni',     value: fmt(eng),   delta: delta(eng, peng) },
    { key: 'er',    label: 'Tasso engagement', value: erYt.value, delta: erYt.d },
    { key: 'watch', label: 'Tempo di visualizzazione', value: fmt(Math.round(sum('watch_minutes') / 60)) + ' h', delta: delta(sum('watch_minutes'), psum('watch_minutes')) },
    { key: 'dur',   label: 'Durata media', value: fmtDur(avg('avg_view_sec')), delta: delta(avg('avg_view_sec'), pavg('avg_view_sec')) },
  ];
}

const PerformanceDashboard: React.FC = () => {
  const isAdmin = useIsAdmin();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientBrand | null>(null);
  const [channel, setChannel] = useState<Channel>('instagram');
  const [range, setRange] = useState<RangeId>(28);
  const [customFrom, setCustomFrom] = useState(shiftDays(todayStr(), -27));
  const [customTo, setCustomTo] = useState(todayStr());
  const [syncing, setSyncing] = useState(false);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      // We invoke the Apify ingestion fn. The fn accepts either x-cron-secret
      // or an admin JWT — supabase.functions.invoke automatically includes
      // the user JWT, and the fn checks user_roles for 'admin'.
      const { data, error } = await supabase.functions.invoke('sync-instagram-metrics-apify', { body: {} });
      if (error) throw error;
      const d = data as any;
      toast({
        title: 'Sincronizzazione completata',
        description: `${d?.processed ?? 0} account · ${d?.totalPostsSynced ?? 0} post aggiornati. Refresh tra 2-3 secondi.`,
      });
      // small delay so post_metrics is consistent, then refresh
      setTimeout(() => window.location.reload(), 2500);
    } catch (e: any) {
      toast({ title: 'Errore sincronizzazione', description: e?.message || 'unknown', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const { from, to } = useMemo(() => {
    if (range === 'custom') return { from: customFrom, to: customTo };
    return { from: shiftDays(todayStr(), -(range as number) + 1), to: todayStr() };
  }, [range, customFrom, customTo]);

  const { rows, prevRows, loading, error } = usePerformanceMetrics({
    brandId: client?.kind === 'brand' ? client.id : null,
    trackedHandleId: client?.kind === 'tracked' ? client.id : null,
    channel,
    from, to,
  });

  // Post-level vs account-level split. Post metrics (reach, engagement, …)
  // SUM only over post rows so account snapshots don't double-count.
  // Followers / new_followers come from account rows (LAST in period).
  const postRows = useMemo(() => rows.filter((r) => !r.is_account_level), [rows]);
  const accountRows = useMemo(() => rows.filter((r) => r.is_account_level), [rows]);
  const prevPostRows = useMemo(() => prevRows.filter((r) => !r.is_account_level), [prevRows]);
  const prevAccountRows = useMemo(() => prevRows.filter((r) => r.is_account_level), [prevRows]);

  const kpis = useMemo(
    () => buildKpis(channel, postRows, accountRows, prevPostRows, prevAccountRows),
    [channel, postRows, accountRows, prevPostRows, prevAccountRows]
  );

  const channelMeta = CHANNELS.find((c) => c.id === channel)!;
  const accent = channelMeta.accent;

  // Trend chart data — daily reach OR video_views depending on channel.
  // SUM only over post rows (account rows have reach=null anyway).
  const trendKey: keyof MetricRow = channel === 'instagram' ? 'reach' : 'video_views';
  const trendData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of postRows) {
      byDay.set(r.snapshot_date, (byDay.get(r.snapshot_date) || 0) + (Number(r[trendKey]) || 0));
    }
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({
        date,
        label: new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
        value,
      }));
  }, [postRows, trendKey]);

  // Follower growth: pull from account rows (1 per day, even if no posts).
  const followersData = useMemo(() => {
    return [...accountRows]
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      .filter((r) => r.followers_total != null)
      .map((r) => ({
        date: r.snapshot_date,
        label: new Date(r.snapshot_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
        followers: r.followers_total as number,
      }));
  }, [accountRows]);

  // Top content of the period (aggregate per external_post_id, sort by engagement)
  const topRows = useMemo(() => {
    const byPost = new Map<string, { title: string; reach: number; engagement: number }>();
    for (const r of postRows) {
      const id = r.external_post_id;
      const prev = byPost.get(id) || { title: r.caption_excerpt || '(senza testo)', reach: 0, engagement: 0 };
      prev.reach += Number(r[trendKey]) || 0;
      prev.engagement += Number(r.engagement) || 0;
      if (r.caption_excerpt && !prev.title.startsWith(r.caption_excerpt.slice(0, 10))) prev.title = r.caption_excerpt;
      byPost.set(id, prev);
    }
    return Array.from(byPost.values()).sort((a, b) => b.engagement - a.engagement).slice(0, 5);
  }, [postRows, trendKey]);

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12">
        <Card>
          <CardContent style={{ padding: 32, textAlign: 'center' }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--rosa)' }} />
            <h2 className="text-lg font-black mb-2" style={{ color: 'var(--ink)' }}>Accesso negato</h2>
            <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
              Questa pagina è riservata agli amministratori.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const volLabel = channel === 'instagram' ? 'Copertura' : 'Visualizzazioni';
  const follLabel = channel === 'youtube' ? 'Iscritti' : 'Follower';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)' }}>
      <SidebarClients selectedId={client?.id ?? null} onSelect={setClient} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
          padding: '14px 24px', borderBottom: '1px solid var(--line)', backgroundColor: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                {client ? client.nome_business : 'Performance'}
              </h1>
              <p className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                {client
                  ? (client.instagram_username ? `@${client.instagram_username} · ` : '') + 'Performance social'
                  : 'Seleziona un cliente dalla sidebar'}
              </p>
            </div>
          </div>

          {/* Date selector + Sync now */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              title="Forza ora la sincronizzazione dati da Apify"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 999,
                fontSize: 12, fontWeight: 700,
                background: 'var(--ink)', color: '#fff',
                border: 'none', cursor: syncing ? 'wait' : 'pointer',
                opacity: syncing ? 0.6 : 1,
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Sincronizzo…' : 'Sincronizza ora'}
            </button>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              padding: 3, borderRadius: 10, backgroundColor: 'var(--bg)', border: '1px solid var(--line)',
            }}>
              <Calendar className="h-3.5 w-3.5" style={{ margin: '0 4px 0 6px', color: 'var(--ink3)' }} />
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className="text-xs font-semibold transition-colors"
                  style={{
                    padding: '6px 12px', borderRadius: 7,
                    border: 'none', cursor: 'pointer',
                    backgroundColor: range === r.id ? '#fff' : 'transparent',
                    color: range === r.id ? 'var(--ink)' : 'var(--ink3)',
                    boxShadow: range === r.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {r.label}
                </button>
              ))}
              <button
                onClick={() => setRange('custom')}
                className="text-xs font-semibold transition-colors"
                style={{
                  padding: '6px 12px', borderRadius: 7,
                  border: 'none', cursor: 'pointer',
                  backgroundColor: range === 'custom' ? '#fff' : 'transparent',
                  color: range === 'custom' ? 'var(--ink)' : 'var(--ink3)',
                  boxShadow: range === 'custom' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Personalizzato
              </button>
            </div>

            {range === 'custom' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: 4, borderRadius: 10, backgroundColor: 'var(--surface)', border: '1px solid var(--line)',
              }}>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, background: 'transparent' }}
                />
                <span style={{ color: 'var(--ink3)' }}>→</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={todayStr()}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, background: 'transparent' }}
                />
              </div>
            )}
          </div>
        </header>

        {/* Channel tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 24px', borderBottom: '1px solid var(--line)', backgroundColor: 'var(--surface)',
        }}>
          {CHANNELS.map((ch) => {
            const active = ch.id === channel;
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                onClick={() => ch.enabled && setChannel(ch.id)}
                disabled={!ch.enabled}
                title={!ch.enabled ? 'Sincronizzazione non ancora attiva per questo canale' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 999,
                  fontSize: 13, fontWeight: 600,
                  border: active ? 'none' : '1px solid var(--line)',
                  backgroundColor: active ? ch.accent : 'transparent',
                  color: active ? '#fff' : (ch.enabled ? 'var(--ink2)' : 'var(--ink3)'),
                  cursor: ch.enabled ? 'pointer' : 'not-allowed',
                  opacity: ch.enabled ? 1 : 0.5,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} /> {ch.label}
                {!ch.enabled && <span style={{ fontSize: 9, marginLeft: 4, padding: '1px 6px', background: 'var(--bg)', borderRadius: 4, color: 'var(--ink3)' }}>SOON</span>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!client && (
            <Card>
              <CardContent style={{ padding: 60, textAlign: 'center' }}>
                <p className="text-sm" style={{ color: 'var(--ink3)' }}>
                  Seleziona un cliente dalla sidebar a sinistra per vedere i suoi dati.
                </p>
              </CardContent>
            </Card>
          )}

          {client && error && (
            <Card>
              <CardContent style={{ padding: 24 }}>
                <p className="text-sm" style={{ color: '#ef4444' }}>Errore: {error}</p>
              </CardContent>
            </Card>
          )}

          {client && !error && rows.length === 0 && !loading && (
            <Card>
              <CardContent style={{ padding: 40, textAlign: 'center' }}>
                <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--ink3)', opacity: 0.4 }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  Nessuna metrica nel periodo selezionato
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ink3)' }}>
                  La sincronizzazione automatica con {channelMeta.label} non è ancora attiva.
                  Una volta deployato l'edge function di sync, i dati appariranno qui.
                </p>
              </CardContent>
            </Card>
          )}

          {client && rows.length > 0 && (
            <>
              {/* KPI grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {kpis.map((k) => {
                  const up = k.delta >= 0;
                  return (
                    <Card key={k.key}>
                      <CardContent style={{ padding: 16 }}>
                        <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                          {k.label}
                        </div>
                        <div className="text-2xl font-bold mt-1" style={{ color: 'var(--ink)' }}>
                          {k.value}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className="inline-flex items-center gap-0.5 text-xs font-semibold rounded-md px-1.5 py-0.5"
                            style={{
                              background: up ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                              color: up ? '#10b981' : '#ef4444',
                            }}
                          >
                            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            {Math.abs(k.delta).toFixed(1)}%
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--ink3)' }}>
                            {k.sub || 'vs periodo prec.'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Trend chart */}
              <Card className="mb-4">
                <CardContent style={{ padding: 18 }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {volLabel} · {trendData.length} giorni
                    </h2>
                    <span className="text-xs" style={{ color: 'var(--ink3)' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: accent, marginRight: 6 }} />
                      {channelMeta.label}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={trendData} margin={{ left: -8, right: 8, top: 4 }}>
                      <defs>
                        <linearGradient id="grad-trend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accent} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={28} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} width={48} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: any) => [fmt(v), volLabel]} />
                      <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5} fill="url(#grad-trend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Followers + top content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardContent style={{ padding: 18 }}>
                    <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
                      {follLabel} · crescita
                    </h2>
                    {followersData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={followersData} margin={{ left: -8, right: 8, top: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={28} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} width={48} domain={['dataMin - 50', 'dataMax + 50']} />
                          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v: any) => [fmt(v), follLabel]} />
                          <Line type="monotone" dataKey="followers" stroke="#0f172a" strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-center py-8" style={{ color: 'var(--ink3)' }}>Nessun dato.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent style={{ padding: 18 }}>
                    <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Contenuti top</h2>
                    {topRows.length === 0 ? (
                      <p className="text-xs text-center py-8" style={{ color: 'var(--ink3)' }}>Nessun contenuto nel periodo.</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-2 pb-1 text-[10px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                          <span>Contenuto</span>
                          <span className="text-right">{volLabel}</span>
                          <span className="text-right">Inter.</span>
                        </div>
                        {topRows.map((r, i) => (
                          <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-2 py-2 rounded-lg" style={{ backgroundColor: 'transparent' }}>
                            <span className="text-sm truncate" style={{ color: 'var(--ink2)' }}>{r.title}</span>
                            <span className="text-right text-sm font-medium tabular-nums" style={{ color: 'var(--ink)' }}>{fmt(r.reach)}</span>
                            <span className="text-right text-sm tabular-nums" style={{ color: 'var(--ink3)' }}>{fmt(r.engagement)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PerformanceDashboard;
