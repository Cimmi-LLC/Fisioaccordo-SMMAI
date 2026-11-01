import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { urlInserzione } from '@/lib/brand/virali';
import { eliminaCopione, inserzionePerId, listaCopioni, videoPerId, type CopioneSalvato } from '@/services/virali';
import CopioneView from './CopioneView';
import { dataBreve } from './comuni';

const CopioniTab: React.FC = () => {
  const { toast } = useToast();
  const { activeBrandId } = useActiveBrand();
  const [lista, setLista] = useState<CopioneSalvato[]>([]);
  const [caricando, setCaricando] = useState(false);
  const [aperto, setAperto] = useState<CopioneSalvato | null>(null);
  const [originale, setOriginale] = useState<string | null>(null);

  const carica = useCallback(async () => {
    if (!activeBrandId) return;
    setCaricando(true);
    try { setLista(await listaCopioni(activeBrandId)); } catch (e) {
      toast({ title: 'Copioni non caricati', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally { setCaricando(false); }
  }, [activeBrandId, toast]);

  useEffect(() => { void carica(); }, [carica]);

  const apri = async (c: CopioneSalvato) => {
    setAperto(c);
    setOriginale(null);
    if (c.video_id) setOriginale((await videoPerId(c.video_id))?.url || null);
    else if (c.inserzione_id) {
      const a = await inserzionePerId(c.inserzione_id);
      setOriginale(a ? urlInserzione(a.ad_id) : null);
    }
  };

  const elimina = async (c: CopioneSalvato) => {
    if (!window.confirm(`Eliminare il copione «${c.copione.titolo}»?`)) return;
    try {
      await eliminaCopione(c.id);
      setLista((l) => l.filter((x) => x.id !== c.id));
      if (aperto?.id === c.id) setAperto(null);
    } catch (e) {
      toast({ title: 'Non eliminato', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  if (caricando) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--viola)' }} /></div>;
  if (lista.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center text-sm" style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--ink)' }}>
        Ancora nessun copione. Apri un video in «Video virali» e premi «Copia esatta» o «Copia vicina».
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lista.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3">
          <button onClick={() => apri(c)} className="text-left grow min-w-0">
            <div className="font-bold truncate" style={{ color: 'var(--ink)' }}>{c.copione.titolo}</div>
            <div className="text-xs truncate" style={{ color: 'var(--ink3)' }}>
              {dataBreve(c.creato_il)} · {c.copione.testo_in_alto || c.copione.hook_parlato}
            </div>
          </button>
          <Badge variant="outline">{c.tipo === 'esatta' ? 'Copia esatta' : 'Copia vicina'}</Badge>
          {c.copione.semplice && <Badge variant="outline">Solo telefono</Badge>}
          <Button size="sm" variant="ghost" onClick={() => elimina(c)} title="Elimina"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}

      <Dialog open={!!aperto} onOpenChange={(o) => { if (!o) setAperto(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Copione</DialogTitle></DialogHeader>
          {aperto && <CopioneView copione={aperto.copione} />}
          {originale && (
            <a href={originale} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-semibold pt-2" style={{ color: 'var(--rosa)' }}>
              <ExternalLink className="h-4 w-4" /> Guarda il video originale
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CopioniTab;
