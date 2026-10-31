import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import type { BrandProfile } from '@/types/brand';
import { latestAdvice, generateAdvice, type AdviceResult } from '@/services/course';

interface Props {
  userId: string;
  lessonId: string;
  lessonTitle: string;
  brands: BrandProfile[];
  activeBrandId: string | null;
}

const fmt = (n: unknown) => (typeof n === 'number' ? n.toLocaleString('it-IT') : '—');

// Tre consigli sull'account scelto, legati alla lezione aperta. Si generano
// solo su richiesta e restano salvati: riaprendo la lezione si rivedono.
const AdvicePanel: React.FC<Props> = ({ userId, lessonId, lessonTitle, brands, activeBrandId }) => {
  const [brandId, setBrandId] = useState<string | null>(activeBrandId);
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!brandId && activeBrandId) setBrandId(activeBrandId); }, [activeBrandId, brandId]);

  useEffect(() => {
    if (!brandId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    latestAdvice(userId, brandId, lessonId)
      .then((a) => { if (!cancelled) setAdvice(a); })
      .catch(() => { if (!cancelled) setAdvice(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, brandId, lessonId]);

  const run = async () => {
    if (!brandId) return;
    setWorking(true);
    setError(null);
    try {
      setAdvice(await generateAdvice(brandId, lessonId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Non sono riuscito a generare i consigli.');
    } finally {
      setWorking(false);
    }
  };

  const stats = (advice?.stats || {}) as Record<string, unknown>;

  return (
    <section className="rounded-2xl p-5 mt-10" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }} aria-label="Consigli sul tuo account">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Sparkles className="h-5 w-5" style={{ color: 'var(--rosa)' }} /> Consigli sul tuo account
        </h2>
        {brands.length > 1 && (
          <select
            value={brandId || ''}
            onChange={(e) => setBrandId(e.target.value)}
            aria-label="Account da analizzare"
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
          >
            {brands.map((b) => <option key={b.id} value={b.id}>{b.nome_business || 'Brand senza nome'}</option>)}
          </select>
        )}
      </div>
      <p className="text-sm mt-1" style={{ color: 'var(--ink)', opacity: 0.7 }}>
        Cosa applicare di «{lessonTitle}» guardando i numeri dei tuoi post.
      </p>

      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--viola)' }} /></div>
      ) : advice ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs" style={{ color: 'var(--ink)', opacity: 0.6 }}>
            {fmt(stats.post_analizzati)} post analizzati · copertura mediana {fmt(stats.reach_mediana)} · {fmt(stats.outlier)} outlier (5× la mediana) · aggiornati al {String(stats.ultimo_dato || '—')}
          </p>
          {advice.advice.consigli.map((c, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
              <p className="font-bold" style={{ color: 'var(--ink)' }}>{i + 1}. {c.titolo}</p>
              <p className="text-sm mt-1.5" style={{ color: 'var(--ink)' }}>{c.cosa_fare}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--ink)', opacity: 0.65 }}><strong>Perché:</strong> {c.perche}</p>
            </div>
          ))}
          {advice.advice.nota_dati && (
            <p className="text-xs" style={{ color: 'var(--ink)', opacity: 0.65 }}>{advice.advice.nota_dati}</p>
          )}
          <button onClick={run} disabled={working} className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid var(--line)', color: 'var(--viola)' }}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {working ? 'Analizzo i tuoi post…' : 'Rigenera con i numeri di oggi'}
          </button>
          <p className="text-[11px]" style={{ color: 'var(--ink)', opacity: 0.5 }}>Generati il {new Date(advice.created_at).toLocaleString('it-IT')}</p>
        </div>
      ) : (
        <div className="mt-4">
          <button onClick={run} disabled={working || !brandId} className="inline-flex items-center gap-2 font-semibold px-4 py-2 rounded-lg text-white"
            style={{ background: 'var(--rosa)', opacity: working || !brandId ? 0.7 : 1 }}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {working ? 'Analizzo i tuoi post…' : 'Dammi 3 consigli per questa lezione'}
          </button>
        </div>
      )}
      {error && <p className="text-sm mt-3" style={{ color: '#ae2418' }}>{error}</p>}
    </section>
  );
};

export default AdvicePanel;
