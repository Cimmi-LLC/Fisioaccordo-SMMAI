// Siti collegati al brand: aggiungi, rendi principale, apri, rianalizza, rinomina, rimuovi.
// Sono collegamenti: ogni azione e salvata subito. I dati che la rianalisi
// propone invece passano dal modulo e si salvano solo con "Salva modifiche".
import React, { useCallback, useEffect, useState } from 'react';
import { Globe, Plus, Star, RefreshCw, Trash2, ExternalLink, Loader2, Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { listSites, addSite, setPrimary, removeSite, renameSite, type BrandSite } from '@/services/brandSites';
import { normalizeWebsiteUrl } from '@/utils/url';

interface Props {
  brandId: string;
  userId: string;
  /** Avvisa la pagina quando cambia il sito principale (per tenere allineato il modulo). */
  onPrimaryChange: (url: string | null) => void;
  /** Avvia la rianalisi di un sito. */
  onAnalyze: (site: BrandSite) => void;
  /** Id del sito in analisi, se c'e. */
  analyzingId: string | null;
  /** Cambia ogni volta che la pagina vuole ricaricare la lista (es. dopo un'analisi). */
  refreshKey?: number;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;

const BrandSitesCard: React.FC<Props> = ({ brandId, userId, onPrimaryChange, onAnalyze, analyzingId, refreshKey }) => {
  const { toast } = useToast();
  const [sites, setSites] = useState<BrandSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const load = useCallback(async () => {
    try {
      setSites(await listSites(brandId));
    } catch (e: any) {
      toast({ title: 'Non riesco a caricare i siti', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [brandId, toast]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try { await fn(); } catch (e: any) {
      toast({ title: 'Operazione non riuscita', description: e?.message || String(e), variant: 'destructive' });
    } finally { setBusyId(null); }
  };

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    try {
      const site = await addSite(brandId, userId, newUrl, newLabel);
      setNewUrl(''); setNewLabel('');
      await load();
      if (site.is_primary) onPrimaryChange(site.url);
      toast({ title: 'Sito collegato', description: site.is_primary ? 'È il sito principale del brand.' : 'Puoi analizzarlo o renderlo principale.' });
    } catch (e: any) {
      toast({ title: 'Sito non aggiunto', description: e?.message || String(e), variant: 'destructive' });
    } finally { setAdding(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
          Siti collegati
        </label>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--ink3)' }} />}
      </div>

      {!loading && sites.length === 0 && (
        <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>Nessun sito collegato. Aggiungine uno qui sotto.</p>
      )}

      <div className="space-y-2">
        {sites.map((s) => {
          const busy = busyId === s.id;
          const analyzing = analyzingId === s.id;
          return (
            <div key={s.id} className="rounded-xl p-3" data-site-url={s.url}
              style={{ border: s.is_primary ? '1.5px solid var(--viola)' : '1px solid var(--line)', backgroundColor: s.is_primary ? 'var(--viola-dim)' : 'var(--bg)' }}>
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--viola)' }} />
                <div className="flex-1 min-w-0">
                  {editingId === s.id ? (
                    <div className="flex gap-1.5 mb-1">
                      <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} maxLength={60} placeholder="Es. Sede di Bologna" className="h-7 text-xs" />
                      <button type="button" title="Salva nome" onClick={() => run(s.id, async () => { await renameSite(s.id, editLabel); setEditingId(null); await load(); })}
                        className="px-2 rounded-md" style={{ backgroundColor: 'var(--viola)', color: '#fff', border: 'none' }}><Check className="h-3.5 w-3.5" /></button>
                      <button type="button" title="Annulla" onClick={() => setEditingId(null)}
                        className="px-2 rounded-md" style={{ backgroundColor: 'transparent', color: 'var(--ink3)', border: '1px solid var(--line)' }}><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{s.label || 'Sito'}</span>
                      {s.is_primary && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--viola)', color: '#fff', letterSpacing: '0.5px' }}>Principale</span>
                      )}
                      <button type="button" title="Rinomina" onClick={() => { setEditingId(s.id); setEditLabel(s.label); }}
                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink3)' }}><Pencil className="h-3 w-3" /></button>
                    </div>
                  )}
                  <a href={normalizeWebsiteUrl(s.url)} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] break-all inline-flex items-center gap-1" style={{ color: 'var(--viola)' }}>
                    {s.url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                  <div className="text-[10px] mt-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--ink3)' }}>
                    {s.last_analyzed_at ? <>Analizzato il {fmtDate(s.last_analyzed_at)}</> : <>Mai analizzato da qui</>}
                    {s.last_colors?.length > 0 && (
                      <span className="inline-flex gap-1">
                        {s.last_colors.slice(0, 5).map((c) => <span key={c} title={c} style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c, border: '1px solid var(--line)', display: 'inline-block' }} />)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <button type="button" onClick={() => onAnalyze(s)} disabled={!!analyzingId || busy}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: 'var(--viola)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {analyzing ? 'Leggo il sito… (fino a un minuto)' : 'Rianalizza'}
                </button>
                {!s.is_primary && (
                  <button type="button" disabled={busy}
                    onClick={() => run(s.id, async () => { const url = await setPrimary(brandId, s.id); await load(); onPrimaryChange(url); toast({ title: 'Sito principale cambiato', description: url }); })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: 'transparent', color: 'var(--viola)', border: '1px solid var(--viola)', cursor: 'pointer' }}>
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />} Rendi principale
                  </button>
                )}
                <button type="button" disabled={busy}
                  onClick={() => {
                    const msg = s.is_primary && sites.length > 1
                      ? `Scollegare ${s.url}? Il prossimo sito della lista diventerà il principale. I dati del Brand Kit non vengono toccati.`
                      : `Scollegare ${s.url}? I dati del Brand Kit non vengono toccati.`;
                    if (!window.confirm(msg)) return;
                    run(s.id, async () => { const next = await removeSite(brandId, s.id); await load(); onPrimaryChange(next); toast({ title: 'Sito scollegato' }); });
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', cursor: 'pointer' }}>
                  <Trash2 className="h-3.5 w-3.5" /> Scollega
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Aggiungi sito */}
      <div className="rounded-xl p-3 space-y-2" style={{ border: '1px dashed var(--line)' }}>
        <div className="text-[11px] font-bold" style={{ color: 'var(--ink2)' }}>Collega un altro sito</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://www.tuostudio.it"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            className="h-9 text-xs flex-1" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
          <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Nome (facoltativo)" maxLength={60}
            className="h-9 text-xs sm:w-44" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
          <button type="button" onClick={handleAdd} disabled={adding || !newUrl.trim()}
            className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-lg text-[11px] font-bold disabled:opacity-40"
            style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)', border: 'none', cursor: 'pointer' }}>
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Collega
          </button>
        </div>
        <p className="text-[10px]" style={{ color: 'var(--ink3)' }}>
          Il sito principale è quello usato per i contenuti. Gli altri (una landing, una seconda sede) li puoi analizzare quando vuoi.
        </p>
      </div>
    </div>
  );
};

export default BrandSitesCard;
