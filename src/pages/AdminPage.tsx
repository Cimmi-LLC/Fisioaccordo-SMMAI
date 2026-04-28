import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, BarChart3, AlertCircle, Image as ImageIcon, FileText, Calendar } from 'lucide-react';

interface UserRow {
  user_id: string;
  email?: string;
  nome_business: string;
  website_url: string | null;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  totalBrands: number;
  totalContents: number;
  totalImages: number;
  imagesSuccess: number;
  imagesError: number;
  totalAnalyses: number;
  totalCompetitors: number;
  totalTrends: number;
}

interface ErrorLog {
  id: string;
  user_id: string | null;
  carousel_id: string | null;
  slide_index: number | null;
  prompt_used: string | null;
  error: string;
  provider: string | null;
  created_at: string;
}

const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color?: string }> = ({ label, value, icon, color = 'var(--viola)' }) => (
  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
    <div className="flex items-center gap-2 mb-1">
      <span style={{ color }}>{icon}</span>
      <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>{label}</span>
    </div>
    <div className="text-2xl font-black" style={{ color: 'var(--ink)' }}>{value}</div>
  </div>
);

const AdminPage = () => {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'errors'>('stats');

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Lista utenti (da brands)
      const { data: brandsData } = await supabase.from('brands').select('user_id, nome_business, website_url, created_at').order('created_at', { ascending: false });
      const usersList = (brandsData || []) as UserRow[];
      setUsers(usersList);

      // Statistiche
      const { count: brandCount } = await supabase.from('brands').select('*', { count: 'exact', head: true });
      const { count: contentCount } = await supabase.from('generated_contents').select('*', { count: 'exact', head: true });
      const { count: imagesCount } = await supabase.from('carousel_image_logs').select('*', { count: 'exact', head: true });
      const { data: imagesAll } = await supabase.from('carousel_image_logs').select('error');
      const imagesSuccess = (imagesAll || []).filter((r: any) => !r.error).length;
      const imagesError = (imagesAll || []).filter((r: any) => r.error).length;
      const { count: analysesCount } = await supabase.from('viral_analysis').select('*', { count: 'exact', head: true });
      const { count: competitorsCount } = await supabase.from('competitor_analysis').select('*', { count: 'exact', head: true });
      const { count: trendsCount } = await supabase.from('trending_topics').select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: usersList.length,
        totalBrands: brandCount || 0,
        totalContents: contentCount || 0,
        totalImages: imagesCount || 0,
        imagesSuccess,
        imagesError,
        totalAnalyses: analysesCount || 0,
        totalCompetitors: competitorsCount || 0,
        totalTrends: trendsCount || 0,
      });

      // Log errori
      const { data: logsData } = await supabase.from('carousel_image_logs')
        .select('*').not('error', 'is', null)
        .order('created_at', { ascending: false }).limit(50);
      setErrorLogs((logsData || []) as ErrorLog[]);
    } catch (e) {
      console.error('Admin load error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12">
        <Card className="panel-card">
          <CardContent style={{ padding: 32, textAlign: 'center' }}>
            <AlertCircle className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--rosa)' }} />
            <h2 className="text-lg font-black mb-2" style={{ color: 'var(--ink)' }}>Accesso negato</h2>
            <p className="text-[13px] mb-4" style={{ color: 'var(--ink3)' }}>
              Questa pagina è riservata all'amministratore.
            </p>
            <button
              onClick={() => navigate('/')}
              className="text-[12px] font-black uppercase px-5 py-2.5 rounded-xl text-white"
              style={{ backgroundColor: 'var(--viola)', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              Torna alla home
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--viola)' }} /></div>;
  }

  const successRate = stats && stats.totalImages > 0 ? Math.round((stats.imagesSuccess / stats.totalImages) * 100) : 0;
  const estimatedCost = stats ? ((stats.totalImages * 0.005) + (stats.totalContents * 0.001) + (stats.totalAnalyses * 0.001)).toFixed(2) : '0.00';

  const tabs = [
    { id: 'stats' as const, label: 'Statistiche', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'users' as const, label: 'Utenti', icon: <Users className="h-4 w-4" /> },
    { id: 'errors' as const, label: 'Log errori', icon: <AlertCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-black" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>Pannello Admin</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--ink3)' }}>
          Vedi tutto quello che succede nell'app. Solo tu hai accesso.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: '1.5px solid var(--line)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-5 pb-3 pt-1 text-[13px] font-semibold relative"
            style={{
              color: activeTab === t.id ? 'var(--viola)' : 'var(--ink3)',
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            {t.icon} {t.label}
            {activeTab === t.id && <span className="absolute bottom-[-1.5px] left-0 right-0 h-[2px]" style={{ backgroundColor: 'var(--viola)' }} />}
          </button>
        ))}
      </div>

      {/* TAB: Statistiche */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Utenti" value={stats.totalUsers} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Brand" value={stats.totalBrands} icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Contenuti" value={stats.totalContents} icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Immagini" value={stats.totalImages} icon={<ImageIcon className="h-4 w-4" />} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Analisi Virali" value={stats.totalAnalyses} icon={<BarChart3 className="h-4 w-4" />} />
            <StatCard label="Competitor" value={stats.totalCompetitors} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Trend cercati" value={stats.totalTrends} icon={<BarChart3 className="h-4 w-4" />} />
          </div>

          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <h3 className="text-[14px] font-bold mb-4" style={{ color: 'var(--ink)' }}>Performance Immagini</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>Successo</div>
                <div className="text-2xl font-black" style={{ color: '#22c55e' }}>{stats.imagesSuccess}</div>
              </div>
              <div>
                <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>Errori</div>
                <div className="text-2xl font-black" style={{ color: 'var(--rosa)' }}>{stats.imagesError}</div>
              </div>
              <div>
                <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>Tasso successo</div>
                <div className="text-2xl font-black" style={{ color: 'var(--viola)' }}>{successRate}%</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--viola-dim)', border: '1px solid rgba(85,70,151,0.15)' }}>
            <h3 className="text-[14px] font-bold mb-2" style={{ color: 'var(--ink)' }}>Costo API Stimato</h3>
            <div className="text-3xl font-black" style={{ color: 'var(--viola)' }}>${estimatedCost}</div>
            <p className="text-[11px] mt-2" style={{ color: 'var(--ink3)' }}>
              Stima basata su: $0.005/immagine Freepik, $0.001/generazione testo Gemini.
            </p>
          </div>
        </div>
      )}

      {/* TAB: Utenti */}
      {activeTab === 'users' && (
        <Card className="panel-card">
          <CardContent style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                  <tr>
                    <th className="text-left p-3 text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Brand</th>
                    <th className="text-left p-3 text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Sito</th>
                    <th className="text-left p-3 text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Registrato</th>
                    <th className="text-left p-3 text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-[12px]" style={{ color: 'var(--ink3)' }}>Nessun utente registrato</td></tr>
                  ) : users.map(u => (
                    <tr key={u.user_id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="p-3 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{u.nome_business || '—'}</td>
                      <td className="p-3 text-[12px]">
                        {u.website_url ? <a href={u.website_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--viola)' }} className="hover:underline">{u.website_url.replace(/^https?:\/\//, '').slice(0, 30)}</a> : <span style={{ color: 'var(--ink3)' }}>—</span>}
                      </td>
                      <td className="p-3 text-[12px]" style={{ color: 'var(--ink3)' }}>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {new Date(u.created_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="p-3 text-[10px] font-mono" style={{ color: 'var(--ink3)' }}>{u.user_id.slice(0, 8)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB: Errori */}
      {activeTab === 'errors' && (
        <Card className="panel-card">
          <CardContent style={{ padding: 0 }}>
            {errorLogs.length === 0 ? (
              <div className="p-6 text-center text-[12px]" style={{ color: 'var(--ink3)' }}>
                Nessun errore registrato. 🎉
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                    <tr>
                      <th className="text-left p-3 text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)' }}>Quando</th>
                      <th className="text-left p-3 text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)' }}>Errore</th>
                      <th className="text-left p-3 text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)' }}>Provider</th>
                      <th className="text-left p-3 text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)' }}>Prompt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td className="p-3 text-[11px]" style={{ color: 'var(--ink3)' }}>
                          {new Date(log.created_at).toLocaleString('it-IT')}
                        </td>
                        <td className="p-3 text-[12px] font-semibold" style={{ color: 'var(--rosa)' }}>{log.error}</td>
                        <td className="p-3 text-[11px]" style={{ color: 'var(--ink3)' }}>{log.provider || '—'}</td>
                        <td className="p-3 text-[11px] max-w-md truncate" style={{ color: 'var(--ink3)' }}>{log.prompt_used?.slice(0, 80) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPage;
