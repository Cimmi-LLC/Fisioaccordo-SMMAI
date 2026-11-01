import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Loader2, CalendarDays, Layers } from 'lucide-react';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { ETICHETTA_SOLDI, livelloSoldi, urlInserzione } from '@/lib/brand/virali';
import { listaInserzioni, PER_PAGINA, urlCopertina, type FiltriInserzioni, type InserzioneVirale } from '@/services/virali';
import DuplicaPanel from './DuplicaPanel';
import { Copertina, Filtro, OPZIONI_PROFESSIONE, dataBreve, etichettaPaese, etichettaProfessione } from './comuni';

const COLORE_SOLDI = { forte: 'var(--rosa)', buono: 'var(--viola)', prova: 'rgba(0,0,0,0.55)' } as const;

const BadgeSoldi: React.FC<{ a: InserzioneVirale }> = ({ a }) => {
  const livello = livelloSoldi(a.giorni, a.varianti);
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-black text-white" style={{ backgroundColor: COLORE_SOLDI[livello] }}>
      {ETICHETTA_SOLDI[livello]}
    </span>
  );
};

const InserzioneDialog: React.FC<{ a: InserzioneVirale | null; onClose: () => void }> = ({ a, onClose }) => {
  const [videoRotto, setVideoRotto] = useState(false);
  useEffect(() => setVideoRotto(false), [a?.id]);
  if (!a) return null;
  return (
    <Dialog open={!!a} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{a.pagina} · {etichettaPaese(a.paese)}</DialogTitle></DialogHeader>
        <div className="grid gap-6 md:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            {a.video_url && !videoRotto ? (
              <video
                src={a.video_url}
                poster={urlCopertina(a.copertina) || undefined}
                controls
                playsInline
                className="w-full rounded-xl bg-black"
                style={{ maxHeight: '70vh' }}
                onError={() => setVideoRotto(true)}
              />
            ) : (
              <div className="space-y-2">
                <Copertina percorso={a.copertina} alt={a.pagina} className="w-full rounded-xl aspect-[4/5]" />
                <p className="text-xs" style={{ color: 'var(--ink3)' }}>Il link al video è scaduto: guardalo nella Libreria inserzioni.</p>
              </div>
            )}
            <a href={urlInserzione(a.ad_id)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--rosa)' }}>
              <ExternalLink className="h-4 w-4" /> Vedi nella Libreria inserzioni
            </a>
          </div>
          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--ink)' }}>
              <BadgeSoldi a={a} />
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> accesa da {a.giorni ?? '?'} giorni</span>
              {a.varianti > 1 && <span className="flex items-center gap-1"><Layers className="h-4 w-4" /> {a.varianti} varianti</span>}
            </div>
            <div className="text-xs" style={{ color: 'var(--ink3)' }}>
              {etichettaProfessione(a.professione)} · ricerca «{a.ricerca}» · dal {dataBreve(a.iniziata_il)}
              {a.piattaforme.length ? ` · ${a.piattaforme.map((p) => p.toLowerCase()).join(', ')}` : ''}
            </div>
            {a.titolo && <div className="font-bold" style={{ color: 'var(--ink)' }}>{a.titolo}</div>}
            {a.testo && <p className="text-sm whitespace-pre-line" style={{ color: 'var(--ink)' }}>{a.testo}</p>}
            {a.link && (
              <div className="text-xs truncate" style={{ color: 'var(--ink3)' }}>
                Porta a: <a href={a.link} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--rosa)' }}>{a.link}</a>
                {a.cta ? ` · pulsante «${a.cta}»` : ''}
              </div>
            )}
            <DuplicaPanel key={a.id} sorgente={{ inserzioneId: a.id }} analisiIniziale={a.analisi} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InserzioniTab: React.FC = () => {
  const { activeBrand } = useActiveBrand();
  const professioneBrand = (activeBrand as { professione?: string | null } | null)?.professione || 'fisioterapista';
  const [filtri, setFiltri] = useState<FiltriInserzioni>({ paese: 'tutti', professione: 'brand', giorniMinimi: 30, ordine: 'giorni' });
  const [lista, setLista] = useState<InserzioneVirale[]>([]);
  const [pagina, setPagina] = useState(0);
  const [altri, setAltri] = useState(false);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [aperta, setAperta] = useState<InserzioneVirale | null>(null);

  const carica = useCallback(async (p: number) => {
    setCaricando(true);
    setErrore(null);
    try {
      const nuove = await listaInserzioni({ ...filtri, professione: filtri.professione === 'brand' ? professioneBrand : filtri.professione }, p);
      setLista((prima) => (p === 0 ? nuove : [...prima, ...nuove]));
      setAltri(nuove.length === PER_PAGINA);
      setPagina(p);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setCaricando(false);
    }
  }, [filtri, professioneBrand]);

  useEffect(() => { void carica(0); }, [carica]);
  const set = <K extends keyof FiltriInserzioni>(k: K, v: FiltriInserzioni[K]) => setFiltri((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Filtro etichetta="Paese" valore={filtri.paese} onChange={(v) => set('paese', v as FiltriInserzioni['paese'])} larghezza="w-36"
          opzioni={[{ id: 'tutti', label: 'Italia e USA' }, { id: 'IT', label: 'Italia' }, { id: 'US', label: 'USA' }]} />
        <Filtro etichetta="Professione" valore={filtri.professione} onChange={(v) => set('professione', v)} larghezza="w-56"
          opzioni={[{ id: 'brand', label: `La mia (${etichettaProfessione(professioneBrand)})` }, { id: 'tutte', label: 'Tutte' }, ...OPZIONI_PROFESSIONE]} />
        <Filtro etichetta="Accese da almeno" valore={String(filtri.giorniMinimi)} onChange={(v) => set('giorniMinimi', Number(v))} larghezza="w-36"
          opzioni={[{ id: '0', label: 'Tutte' }, { id: '30', label: '30 giorni' }, { id: '60', label: '60 giorni' }, { id: '90', label: '90 giorni' }]} />
        <Filtro etichetta="Ordina per" valore={filtri.ordine} onChange={(v) => set('ordine', v as FiltriInserzioni['ordine'])} larghezza="w-56"
          opzioni={[{ id: 'giorni', label: 'Accese da più tempo' }, { id: 'varianti', label: 'Più varianti' }]} />
      </div>
      <p className="text-xs" style={{ color: 'var(--ink3)' }}>
        Un'inserzione che resta accesa per settimane sta facendo soldi: nessuno paga per mesi un video che non vende. Tante varianti dello stesso video = lo stanno spingendo.
      </p>

      {errore && <div className="text-sm" style={{ color: 'var(--rosa)' }}>{errore}</div>}
      {!caricando && lista.length === 0 && !errore && (
        <div className="rounded-2xl p-8 text-center text-sm" style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--ink)' }}>
          Nessuna inserzione con questi filtri. Le inserzioni si aggiornano una volta al mese.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {lista.map((a) => (
          <button key={a.id} onClick={() => setAperta(a)} className="text-left rounded-2xl overflow-hidden border bg-white hover:shadow-md transition-shadow">
            <div className="relative">
              <Copertina percorso={a.copertina} alt={a.pagina} className="w-full aspect-[4/5]" />
              <div className="absolute top-2 left-2"><BadgeSoldi a={a} /></div>
              <div className="absolute bottom-2 left-2 flex gap-1">
                <Badge className="text-white" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>{a.giorni ?? '?'} giorni</Badge>
                {a.varianti > 1 && <Badge className="text-white" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>{a.varianti} varianti</Badge>}
              </div>
            </div>
            <div className="p-2 space-y-0.5">
              <div className="text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>{a.pagina}</div>
              <div className="text-xs line-clamp-2" style={{ color: 'var(--ink3)' }}>{a.testo || a.titolo}</div>
            </div>
          </button>
        ))}
      </div>

      {caricando && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--viola)' }} /></div>}
      {!caricando && altri && <div className="flex justify-center"><Button variant="outline" onClick={() => carica(pagina + 1)}>Mostra altre</Button></div>}

      <InserzioneDialog a={aperta} onClose={() => setAperta(null)} />
    </div>
  );
};

export default InserzioniTab;
