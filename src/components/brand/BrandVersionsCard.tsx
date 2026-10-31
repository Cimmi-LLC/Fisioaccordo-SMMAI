// Versioni precedenti del Brand Kit: create da sole a ogni salvataggio.
// "Ripristina" porta la versione nel modulo; si conferma con "Salva modifiche".
import React, { useCallback, useEffect, useState } from 'react';
import { History, RotateCcw, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listVersions, deleteVersion, type BrandVersion } from '@/services/brandVersions';
import { diffSnapshot, pickSnapshot, preview, FIELD_LABELS, type BrandSnapshot } from '@/lib/brandSnapshot';

interface Props {
  brandId: string;
  /** Stato attuale del modulo, per mostrare cosa cambierebbe ripristinando. */
  current: Record<string, unknown>;
  onRestore: (snapshot: BrandSnapshot, label: string) => void;
  refreshKey?: number;
}

const fmt = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const BrandVersionsCard: React.FC<Props> = ({ brandId, current, onRestore, refreshKey }) => {
  const { toast } = useToast();
  const [versions, setVersions] = useState<BrandVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setVersions(await listVersions(brandId)); } catch { /* lo storico non deve bloccare la pagina */ } finally { setLoading(false); }
  }, [brandId]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const cur = pickSnapshot(current);

  return (
    <div className="rounded-2xl p-6 space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }} data-testid="versions-card">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
        <h2 className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>Versioni precedenti</h2>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--ink3)' }} />}
      </div>
      <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
        Ogni volta che salvi, la versione di prima resta qui (le ultime 30). Puoi rivederla e ripristinarla.
      </p>
      {!loading && versions.length === 0 && (
        <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>Ancora nessuna versione: comparirà al primo salvataggio.</p>
      )}
      <div className="space-y-2">
        {versions.map((v) => {
          const changes = diffSnapshot(v.snapshot, cur);
          const open = openId === v.id;
          return (
            <div key={v.id} className="rounded-xl p-3" style={{ border: '1px solid var(--line)', backgroundColor: 'var(--bg)' }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>{fmt(v.created_at)}</div>
                  <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>{v.reason || 'Salvataggio'}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink2)' }}>
                    {changes.length === 0 ? 'Uguale al Brand Kit attuale' : `Diversa in: ${changes.map((f) => FIELD_LABELS[f]).join(', ')}`}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {changes.length > 0 && (
                    <button type="button" onClick={() => setOpenId(open ? null : v.id)} title="Vedi differenze"
                      className="p-1.5 rounded-md" style={{ border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink2)', cursor: 'pointer' }}>
                      {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <button type="button" disabled={changes.length === 0}
                    onClick={() => onRestore(v.snapshot, fmt(v.created_at))}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-40"
                    style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)', border: 'none', cursor: 'pointer' }}>
                    <RotateCcw className="h-3.5 w-3.5" /> Ripristina
                  </button>
                  <button type="button" title="Elimina versione"
                    onClick={async () => {
                      if (!window.confirm('Eliminare questa versione dallo storico?')) return;
                      try { await deleteVersion(v.id); await load(); } catch (e: any) { toast({ title: 'Non eliminata', description: e?.message, variant: 'destructive' }); }
                    }}
                    className="p-1.5 rounded-md" style={{ border: '1px solid rgba(220,38,38,0.3)', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {open && (
                <div className="mt-2 pt-2 space-y-1.5" style={{ borderTop: '1px solid var(--line)' }}>
                  {changes.map((f) => (
                    <div key={f} className="text-[11px]">
                      <span className="font-bold" style={{ color: 'var(--ink2)' }}>{FIELD_LABELS[f]}: </span>
                      <span style={{ color: 'var(--ink3)' }}>allora </span><span style={{ color: 'var(--ink)' }}>{preview(v.snapshot[f], 100)}</span>
                      <span style={{ color: 'var(--ink3)' }}> · ora </span><span style={{ color: 'var(--ink)' }}>{preview(cur[f], 100)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BrandVersionsCard;
