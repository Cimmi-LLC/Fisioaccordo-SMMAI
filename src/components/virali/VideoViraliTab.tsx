import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Eye, Heart, MessageCircle, Share2, Bookmark, Loader2 } from 'lucide-react';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { numeroBreve, urlIncorporato } from '@/lib/brand/virali';
import { listaVideo, PER_PAGINA, type FiltriVideo, type VideoVirale } from '@/services/virali';
import DuplicaPanel from './DuplicaPanel';
import {
  BadgeOutlier, Copertina, Filtro, OPZIONI_PROFESSIONE, dataBreve, etichettaPaese, etichettaPiattaforma, etichettaProfessione,
} from './comuni';

const Numero: React.FC<{ icona: React.ReactNode; valore: number | null; titolo: string }> = ({ icona, valore, titolo }) =>
  valore === null || valore === undefined ? null : (
    <span className="flex items-center gap-1" title={titolo}>{icona}{numeroBreve(valore)}</span>
  );

const VideoDialog: React.FC<{ video: VideoVirale | null; onClose: () => void }> = ({ video, onClose }) => {
  if (!video) return null;
  const incorporato = urlIncorporato(video.piattaforma, video.external_id, video.shortcode);
  return (
    <Dialog open={!!video} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>@{video.handle} · {etichettaPiattaforma(video.piattaforma)} · {etichettaPaese(video.paese)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            {incorporato ? (
              <iframe
                src={incorporato}
                title={`Video di @${video.handle}`}
                className="w-full rounded-xl border"
                style={{ aspectRatio: '9 / 16', maxHeight: '70vh' }}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <Copertina percorso={video.copertina} alt={video.handle} className="w-full rounded-xl aspect-[9/16]" />
            )}
            <a href={video.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--rosa)' }}>
              <ExternalLink className="h-4 w-4" /> Apri su {etichettaPiattaforma(video.piattaforma)}
            </a>
          </div>
          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--ink)' }}>
              <BadgeOutlier valore={video.outlier} />
              <Numero icona={<Eye className="h-4 w-4" />} valore={video.views} titolo="Visualizzazioni" />
              <Numero icona={<Heart className="h-4 w-4" />} valore={video.likes} titolo="Mi piace" />
              <Numero icona={<MessageCircle className="h-4 w-4" />} valore={video.commenti} titolo="Commenti" />
              <Numero icona={<Share2 className="h-4 w-4" />} valore={video.condivisioni} titolo="Condivisioni" />
              <Numero icona={<Bookmark className="h-4 w-4" />} valore={video.salvataggi} titolo="Salvataggi" />
            </div>
            <div className="text-xs" style={{ color: 'var(--ink3)' }}>
              {etichettaProfessione(video.professione)} · pubblicato il {dataBreve(video.pubblicato_il)}
              {video.outlier ? ` · ${String(video.outlier).replace('.', ',')} volte la media del canale` : ''}
            </div>
            {video.didascalia && (
              <details className="text-sm" style={{ color: 'var(--ink)' }}>
                <summary className="cursor-pointer font-semibold">Didascalia</summary>
                <p className="mt-2 whitespace-pre-line">{video.didascalia}</p>
              </details>
            )}
            <DuplicaPanel key={video.id} sorgente={{ videoId: video.id }} analisiIniziale={video.analisi} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VideoViraliTab: React.FC<{ soloHandle?: string[] | null }> = ({ soloHandle }) => {
  const { activeBrand } = useActiveBrand();
  const professioneBrand = (activeBrand as { professione?: string | null } | null)?.professione || 'fisioterapista';
  const [filtri, setFiltri] = useState<FiltriVideo>({
    paese: 'tutti', piattaforma: 'tutte', professione: 'brand', giorni: 180, ordine: 'outlier', nascondiSponsorizzate: true,
  });
  const [video, setVideo] = useState<VideoVirale[]>([]);
  const [pagina, setPagina] = useState(0);
  const [altri, setAltri] = useState(false);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [aperto, setAperto] = useState<VideoVirale | null>(null);

  const filtriEffettivi = useCallback((): FiltriVideo => ({
    ...filtri,
    professione: filtri.professione === 'brand' ? professioneBrand : filtri.professione,
    soloHandle: soloHandle || null,
  }), [filtri, professioneBrand, soloHandle]);

  const carica = useCallback(async (p: number) => {
    setCaricando(true);
    setErrore(null);
    try {
      const nuovi = await listaVideo(filtriEffettivi(), p);
      setVideo((prima) => (p === 0 ? nuovi : [...prima, ...nuovi]));
      setAltri(nuovi.length === PER_PAGINA);
      setPagina(p);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setCaricando(false);
    }
  }, [filtriEffettivi]);

  useEffect(() => { void carica(0); }, [carica]);

  const set = <K extends keyof FiltriVideo>(k: K, v: FiltriVideo[K]) => setFiltri((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Filtro etichetta="Paese" valore={filtri.paese} onChange={(v) => set('paese', v as FiltriVideo['paese'])}
          opzioni={[{ id: 'tutti', label: 'Italia e USA' }, { id: 'IT', label: 'Italia' }, { id: 'US', label: 'USA' }]} larghezza="w-36" />
        <Filtro etichetta="Piattaforma" valore={filtri.piattaforma} onChange={(v) => set('piattaforma', v as FiltriVideo['piattaforma'])}
          opzioni={[{ id: 'tutte', label: 'Tutte' }, { id: 'instagram', label: 'Instagram' }, { id: 'tiktok', label: 'TikTok' }]} larghezza="w-36" />
        <Filtro etichetta="Professione" valore={filtri.professione} onChange={(v) => set('professione', v)} larghezza="w-56"
          opzioni={[{ id: 'brand', label: `La mia (${etichettaProfessione(professioneBrand)})` }, { id: 'tutte', label: 'Tutte' }, ...OPZIONI_PROFESSIONE]} />
        <Filtro etichetta="Pubblicati" valore={String(filtri.giorni ?? 0)} onChange={(v) => set('giorni', Number(v) || null)} larghezza="w-40"
          opzioni={[{ id: '30', label: 'Ultimo mese' }, { id: '90', label: 'Ultimi 3 mesi' }, { id: '180', label: 'Ultimi 6 mesi' }, { id: '0', label: 'Sempre' }]} />
        <Filtro etichetta="Ordina per" valore={filtri.ordine} onChange={(v) => set('ordine', v as FiltriVideo['ordine'])} larghezza="w-52"
          opzioni={[{ id: 'outlier', label: 'Più sopra la media (outlier)' }, { id: 'views', label: 'Più visualizzazioni' }, { id: 'salvati', label: 'Più salvati (TikTok)' }]} />
        <label className="flex items-center gap-2 text-xs font-semibold pb-2" style={{ color: 'var(--ink3)' }}>
          <Switch checked={filtri.nascondiSponsorizzate} onCheckedChange={(c) => set('nascondiSponsorizzate', c)} />
          Nascondi le probabili sponsorizzate
        </label>
      </div>
      <p className="text-xs" style={{ color: 'var(--ink3)' }}>
        «×10» vuol dire 10 volte le visualizzazioni medie di quel canale negli ultimi 3 mesi: è il video che ha funzionato più degli altri, quello da copiare.
      </p>

      {errore && <div className="text-sm" style={{ color: 'var(--rosa)' }}>{errore}</div>}

      {!caricando && video.length === 0 && !errore && (
        <div className="rounded-2xl p-8 text-center text-sm" style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--ink)' }}>
          Nessun video con questi filtri. La libreria si aggiorna ogni domenica: prova «Tutte» le professioni o un periodo più lungo.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {video.map((v) => (
          <button key={v.id} onClick={() => setAperto(v)} className="text-left rounded-2xl overflow-hidden border bg-white hover:shadow-md transition-shadow">
            <div className="relative">
              <Copertina percorso={v.copertina} alt={`@${v.handle}`} className="w-full aspect-[9/16]" />
              <div className="absolute top-2 left-2 flex gap-1"><BadgeOutlier valore={v.outlier} /></div>
              <div className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-xs font-bold text-white flex items-center gap-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <Eye className="h-3 w-3" /> {numeroBreve(v.views)}
              </div>
            </div>
            <div className="p-2 space-y-0.5">
              <div className="text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>@{v.handle}</div>
              <div className="text-xs truncate" style={{ color: 'var(--ink3)' }}>
                {etichettaPiattaforma(v.piattaforma)} · {etichettaPaese(v.paese)} · {dataBreve(v.pubblicato_il)}
              </div>
            </div>
          </button>
        ))}
      </div>

      {caricando && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--viola)' }} /></div>}
      {!caricando && altri && (
        <div className="flex justify-center"><Button variant="outline" onClick={() => carica(pagina + 1)}>Mostra altri</Button></div>
      )}

      <VideoDialog video={aperto} onClose={() => setAperto(null)} />
    </div>
  );
};

export default VideoViraliTab;
