// Lista dei caroselli gia prodotti per il brand attivo: le PNG e il copy
// persistono in produced_carousels, da qui si riaprono per rivederli,
// rigenerare slide o programmarli anche a distanza di giorni.

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Images, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { signedUrl } from '@/lib/storage';

type Row = {
  id: string;
  title: string;
  status: 'producing' | 'ready' | 'partial' | 'failed';
  ok_count: number;
  total: number;
  format: string;
  created_at: string;
  storage_bucket: string;
  slides: Array<{ path: string | null }>;
};

interface ProducedCarouselsListProps {
  brandId: string | null;
  /** Id del run attualmente aperto nell'anteprima (evidenziato). */
  activeId: string | null;
  onOpen: (rowId: string) => void;
}

const STATUS_IT: Record<Row['status'], { label: string; color: string }> = {
  producing: { label: 'In produzione', color: '#b45309' },
  ready: { label: 'Pronto', color: '#047857' },
  partial: { label: 'Parziale', color: '#b45309' },
  failed: { label: 'Fallito', color: '#dc2626' },
};

const ProducedCarouselsList: React.FC<ProducedCarouselsListProps> = ({ brandId, activeId, onOpen }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!brandId) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await (supabase as any)
          .from('produced_carousels')
          .select('id, title, status, ok_count, total, format, created_at, storage_bucket, slides')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })
          .limit(12);
        if (cancelled || !data) return;
        const list = data as Row[];
        setRows(list);
        // Thumbnail: la prima slide disponibile di ogni run.
        for (const r of list) {
          const first = (r.slides || []).find((s) => s.path)?.path;
          if (!first) continue;
          try {
            const url = await signedUrl(r.storage_bucket, first, 3600);
            if (!cancelled) setThumbs((t) => ({ ...t, [r.id]: url }));
          } catch { /* thumbnail assente, resta il placeholder */ }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brandId, activeId]);

  if (!brandId || (rows.length === 0 && !loading)) return null;

  return (
    <Card className="panel-card mt-6">
      <CardContent style={{ padding: 24 }}>
        <div className="flex items-center gap-2 mb-4">
          <Images className="h-4 w-4" style={{ color: 'var(--viola)' }} />
          <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
            Caroselli prodotti
          </span>
          {loading && <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--ink3)' }} />}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {rows.map((r) => {
            const st = STATUS_IT[r.status];
            const isActive = r.id === activeId;
            return (
              <button
                key={r.id}
                onClick={() => onOpen(r.id)}
                className="flex-shrink-0 text-left rounded-xl overflow-hidden"
                style={{
                  width: 132,
                  border: isActive ? '2px solid var(--rosa)' : '1px solid var(--line)',
                  backgroundColor: 'var(--bg)', cursor: 'pointer', padding: 0,
                }}
              >
                <div style={{ width: '100%', aspectRatio: r.format === '4:5' ? '4 / 5' : '1', backgroundColor: 'var(--surface)' }}>
                  {thumbs[r.id]
                    ? <img src={thumbs[r.id]} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Images className="h-5 w-5" style={{ color: 'var(--line)' }} />
                      </div>}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div
                    className="text-[11px] font-bold truncate"
                    style={{ color: 'var(--ink)' }}
                    title={r.title}
                  >
                    {r.title || 'Carosello'}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] font-bold" style={{ color: st.color }}>{st.label}</span>
                    <span className="text-[9px]" style={{ color: 'var(--ink3)' }}>{r.ok_count}/{r.total}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProducedCarouselsList;
