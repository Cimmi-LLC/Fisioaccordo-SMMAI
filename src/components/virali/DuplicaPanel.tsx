import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CopyPlus, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { analizzaVideo, scriviCopione, type Sorgente } from '@/services/virali';
import type { AnalisiVideo, Copione, TipoCopia } from '@/lib/brand/virali';
import CopioneView from './CopioneView';

/** «Duplica questo video»: prima guarda l'originale, poi scrive il copione per il brand attivo. */
const DuplicaPanel: React.FC<{ sorgente: Sorgente; analisiIniziale: AnalisiVideo | null }> = ({ sorgente, analisiIniziale }) => {
  const { toast } = useToast();
  const { activeBrand, activeBrandId } = useActiveBrand();
  const [analisi, setAnalisi] = useState<AnalisiVideo | null>(analisiIniziale);
  const [copione, setCopione] = useState<Copione | null>(null);
  const [argomento, setArgomento] = useState('');
  const [fase, setFase] = useState<'ferma' | 'guardo' | 'scrivo'>('ferma');
  const copioneRef = useRef<HTMLDivElement>(null);

  // Il copione compare QUI sotto: appena arriva ci si scorre sopra, così non
  // va cercato in «I miei copioni» (dove comunque resta salvato).
  useEffect(() => {
    if (copione) copioneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [copione]);

  const duplica = async (tipo: TipoCopia) => {
    if (!activeBrandId) {
      toast({ title: 'Scegli prima un brand', description: 'Il copione si scrive per il brand attivo.', variant: 'destructive' });
      return;
    }
    try {
      if (!analisi) {
        setFase('guardo');
        const r = await analizzaVideo(sorgente);
        setAnalisi(r.analisi);
      }
      setFase('scrivo');
      const r = await scriviCopione(sorgente, activeBrandId, tipo, argomento);
      setAnalisi(r.analisi);
      setCopione(r.copione);
      toast({ title: 'Copione pronto: eccolo qui sotto', description: 'Resta salvato anche in «I miei copioni».' });
    } catch (e) {
      toast({ title: 'Non sono riuscito a duplicarlo', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setFase('ferma');
    }
  };

  const occupato = fase !== 'ferma';
  const nomeBrand = activeBrand?.nome_business || 'il tuo brand';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--viola-dim)', border: '1px solid var(--viola)' }}>
        <div className="font-black" style={{ color: 'var(--ink)' }}>Duplica questo video</div>
        <p className="text-sm" style={{ color: 'var(--ink3)' }}>
          Rifacciamo lo stesso video per {nomeBrand}: stessa struttura e stesso hook, applicati all'argomento che scegli tu.
        </p>
        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--ink)' }}>
            Argomento del nuovo video
          </label>
          <Input
            value={argomento}
            onChange={(e) => setArgomento(e.target.value)}
            placeholder="es. cefalea da cervicale, dolore al ginocchio quando corri…"
            maxLength={200}
            className="bg-white"
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--ink3)' }}>
            Vuoto = lo scegliamo noi dai servizi del tuo brand.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => duplica('esatta')} disabled={occupato}>
            <CopyPlus className="h-4 w-4 mr-1" /> Copia esatta
          </Button>
          <Button variant="outline" onClick={() => duplica('vicina')} disabled={occupato}>
            <Wand2 className="h-4 w-4 mr-1" /> Copia vicina
          </Button>
        </div>
        <p className="text-xs" style={{ color: 'var(--ink3)' }}>
          Esatta: cambia solo l'argomento. Vicina: cambia anche l'angolo e l'hook o la chiamata all'azione.
        </p>
        {occupato && (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink)' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            {fase === 'guardo' ? 'Guardo il video originale… (30-90 s)' : `Scrivo il copione per ${nomeBrand}… (20-60 s)`}
          </div>
        )}
      </div>

      {analisi && !copione && (
        <div className="space-y-2 text-sm" style={{ color: 'var(--ink)' }}>
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ink3)' }}>Perché funziona</div>
          <div><span className="font-semibold">Format:</span> {analisi.format} · <span className="font-semibold">Hook:</span> {analisi.hook.tipo_parlato}</div>
          {analisi.hook.parlato && <div><span className="font-semibold">Prima frase:</span> «{analisi.hook.parlato}»</div>}
          <ul className="list-disc pl-5 space-y-1">{analisi.perche_funziona.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      )}

      {copione && <div ref={copioneRef}><CopioneView copione={copione} /></div>}
    </div>
  );
};

export default DuplicaPanel;
