import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Loader2, Instagram, Film, Upload, CheckCircle2, XCircle, CalendarClock, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedulePost } from '@/hooks/useSchedulePost';
import { useToast } from '@/hooks/use-toast';
import { MetaService } from '@/services/metaService';
import {
  REEL_LIMITI,
  TIPI_COPERTINA,
  TIPI_VIDEO,
  contaHashtag,
  formatoRoma,
  oraRomaInUtc,
  partiRoma,
  validaCopertina,
  validaDidascalia,
  validaVideo,
  type InfoVideo,
} from '@/lib/brand/reel';
import {
  caricaFileReel,
  eliminaFileReel,
  leggiStatoReel,
  percorsoReel,
  programmaReel,
  pubblicaReelOra,
} from '@/services/reelService';

interface PublishReelDialogProps {
  open: boolean;
  onClose: () => void;
  /** Didascalia già pronta (es. dallo script del reel). */
  captionIniziale?: string;
  /** Chiamata quando il reel è pubblicato, in elaborazione o programmato. */
  onFatto?: () => void;
}

type Copertina = 'instagram' | 'fotogramma' | 'immagine';
type Fase = 'modulo' | 'invio' | 'attesa' | 'fatto' | 'errore';

const etichetta: React.CSSProperties = { color: 'var(--ink3)', letterSpacing: '0.5px' };
const MB = 1024 * 1024;
const ATTESA_MAX_MS = 10 * 60 * 1000;

function fusoLocaleDiversoDaRoma(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz !== 'Europe/Rome' ? tz : null;
  } catch {
    return null;
  }
}

function proponiOrario(): { data: string; ora: string } {
  // Domani alle 17:00 italiane: l'ora degli Short già usciti.
  const domani = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { data: partiRoma(domani).data, ora: '17:00' };
}

function secondi(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

const PublishReelDialog: React.FC<PublishReelDialogProps> = ({ open, onClose, captionIniziale, onFatto }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { connections, loadConnections, loadingConnections } = useSchedulePost();

  const [connectionId, setConnectionId] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoVideo | null>(null);
  const [copertina, setCopertina] = useState<Copertina>('instagram');
  const [fotogramma, setFotogramma] = useState(0);
  const [immagine, setImmagine] = useState<File | null>(null);
  const [immagineUrl, setImmagineUrl] = useState<string | null>(null);
  const [didascalia, setDidascalia] = useState(captionIniziale || '');
  const [nelFeed, setNelFeed] = useState(true);
  const [quando, setQuando] = useState<'ora' | 'programma'>('programma');
  const [data, setData] = useState(() => proponiOrario().data);
  const [ora, setOra] = useState(() => proponiOrario().ora);
  const [fase, setFase] = useState<Fase>('modulo');
  const [progresso, setProgresso] = useState(0);
  const [passo, setPasso] = useState('');
  const [messaggio, setMessaggio] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const attesaRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) loadConnections();
  }, [open, loadConnections]);

  useEffect(() => {
    if (connections && connections.length > 0 && !connectionId) setConnectionId(connections[0].id);
  }, [connections, connectionId]);

  // Aperta dallo script di un reel: la sua caption prende il posto della bozza.
  useEffect(() => {
    if (open && captionIniziale) setDidascalia(captionIniziale);
  }, [open, captionIniziale]);

  // Libera le anteprime e ferma il controllo dello stato quando si chiude.
  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);
  useEffect(() => () => {
    if (immagineUrl) URL.revokeObjectURL(immagineUrl);
  }, [immagineUrl]);
  useEffect(() => () => {
    if (attesaRef.current) window.clearInterval(attesaRef.current);
  }, []);

  const profilo = connections?.find((c) => c.id === connectionId);
  const nomeProfilo = profilo ? `@${profilo.instagram_username || profilo.page_name || 'profilo'}` : 'Instagram';

  const verificaVideo = useMemo(() => (info ? validaVideo(info) : null), [info]);
  const verificaDidascalia = useMemo(() => validaDidascalia(didascalia), [didascalia]);
  const verificaImmagine = useMemo(
    () => (immagine ? validaCopertina({ tipo: immagine.type, byte: immagine.size }) : null),
    [immagine],
  );
  const istante = useMemo(() => oraRomaInUtc(data, ora), [data, ora]);
  const fusoLocale = useMemo(fusoLocaleDiversoDaRoma, []);
  const istanteNelPassato = !istante || istante.getTime() < Date.now() + 2 * 60 * 1000;

  const errori = [
    ...(verificaVideo?.errori || []),
    ...verificaDidascalia.errori,
    ...(copertina === 'immagine' ? verificaImmagine?.errori || (immagine ? [] : ['Scegli l\'immagine di copertina.']) : []),
  ];
  const pronto =
    !!video && !!info && !!connectionId && errori.length === 0 && didascalia.trim().length > 0 &&
    (quando === 'ora' || !istanteNelPassato);

  const scegliVideo = (file: File | undefined) => {
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideo(file);
    setVideoUrl(url);
    setFotogramma(0);
    setInfo({ tipo: file.type, byte: file.size, durata: null, larghezza: null, altezza: null });
  };

  const letturaVideo = () => {
    const v = videoRef.current;
    if (!v || !video) return;
    setInfo({
      tipo: video.type,
      byte: video.size,
      durata: Number.isFinite(v.duration) ? v.duration : null,
      larghezza: v.videoWidth || null,
      altezza: v.videoHeight || null,
    });
  };

  const scegliImmagine = (file: File | undefined) => {
    if (!file) return;
    if (immagineUrl) URL.revokeObjectURL(immagineUrl);
    setImmagine(file);
    setImmagineUrl(URL.createObjectURL(file));
  };

  const spostaFotogramma = (s: number) => {
    setFotogramma(s);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = s;
    }
  };

  const azzera = () => {
    if (attesaRef.current) window.clearInterval(attesaRef.current);
    attesaRef.current = null;
    setVideo(null);
    setVideoUrl(null);
    setInfo(null);
    setImmagine(null);
    setImmagineUrl(null);
    setCopertina('instagram');
    setDidascalia('');
    setFase('modulo');
    setProgresso(0);
    setMessaggio('');
  };

  const chiudi = () => {
    if (fase === 'invio') return; // il caricamento è in corso
    if (fase === 'fatto' || fase === 'attesa') azzera();
    onClose();
  };

  const seguiStato = (reelId: string) => {
    const inizio = Date.now();
    attesaRef.current = window.setInterval(async () => {
      const stato = await leggiStatoReel(reelId);
      if (stato?.status === 'published') {
        window.clearInterval(attesaRef.current!);
        attesaRef.current = null;
        setFase('fatto');
        setMessaggio(`Il Reel è uscito su ${nomeProfilo}.`);
        onFatto?.();
      } else if (stato?.status === 'failed') {
        window.clearInterval(attesaRef.current!);
        attesaRef.current = null;
        setFase('errore');
        setMessaggio(stato.error_message || 'Instagram ha rifiutato il video.');
        onFatto?.();
      } else if (Date.now() - inizio > ATTESA_MAX_MS) {
        window.clearInterval(attesaRef.current!);
        attesaRef.current = null;
      } else if (stato?.error_message) {
        setMessaggio(stato.error_message);
      }
    }, 5000);
  };

  const invia = async () => {
    if (!pronto || !video || !user) return;
    setFase('invio');
    setProgresso(0);
    const videoPath = percorsoReel(user.id, video, 'video');
    const coverPath = copertina === 'immagine' && immagine ? percorsoReel(user.id, immagine, 'copertina') : null;
    const caricati: string[] = [];
    try {
      setPasso(`Carico il video (${(video.size / MB).toFixed(0)} MB)…`);
      await caricaFileReel(videoPath, video, setProgresso);
      caricati.push(videoPath);
      if (coverPath && immagine) {
        setPasso('Carico la copertina…');
        await caricaFileReel(coverPath, immagine);
        caricati.push(coverPath);
      }
    } catch (err) {
      await eliminaFileReel(caricati);
      setFase('errore');
      setMessaggio(err instanceof Error ? err.message : 'Caricamento non riuscito.');
      return;
    }

    const dati = {
      connectionId,
      content: didascalia.trim(),
      videoPath,
      coverPath,
      thumbOffsetMs: copertina === 'fotogramma' ? Math.round(fotogramma * 1000) : null,
      shareToFeed: nelFeed,
    };

    try {
      if (quando === 'programma' && istante) {
        setPasso('Programmo il Reel…');
        await programmaReel({ ...dati, scheduledFor: istante });
        setFase('fatto');
        setMessaggio(`Programmato per ${formatoRoma(istante)} (ora italiana) su ${nomeProfilo}.`);
        toast({ title: 'Reel programmato', description: `${formatoRoma(istante)}, ora italiana` });
        onFatto?.();
        return;
      }
      setPasso('Invio il video a Instagram…');
      const r = await pubblicaReelOra(dati);
      onFatto?.();
      if (r.status === 'published') {
        setFase('fatto');
        setMessaggio(`Il Reel è uscito su ${nomeProfilo}.`);
        toast({ title: 'Reel pubblicato su Instagram' });
      } else {
        setFase('attesa');
        setMessaggio(r.message || 'Instagram sta preparando il video.');
        if (r.reelId) seguiStato(r.reelId);
      }
    } catch (err) {
      // La riga (se creata) resta nel Calendario come «Fallito» con il motivo:
      // da lì si toglie insieme al video.
      setFase('errore');
      setMessaggio(err instanceof Error ? err.message : 'Pubblicazione non riuscita.');
    }
  };

  const nessunProfilo = connections !== null && connections.length === 0;
  const caratteri = [...didascalia].length;
  const hashtag = contaHashtag(didascalia);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && chiudi()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" style={{ color: 'var(--rosa)' }} />
            Pubblica un Reel
          </DialogTitle>
          <DialogDescription>
            Carica il video verticale montato, scrivi la didascalia e scegli quando farlo uscire.
          </DialogDescription>
        </DialogHeader>

        {fase === 'fatto' || fase === 'attesa' || fase === 'errore' ? (
          <div className="space-y-4 py-2">
            <div
              className="p-4 rounded-lg flex gap-3"
              style={{
                backgroundColor: fase === 'errore' ? 'rgba(239,68,68,0.08)' : fase === 'fatto' ? 'rgba(16,185,129,0.1)' : 'var(--viola-dim)',
                border: '1px solid var(--line)',
              }}
            >
              {fase === 'errore' ? (
                <XCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#ef4444' }} />
              ) : fase === 'fatto' ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#10b981' }} />
              ) : (
                <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" style={{ color: 'var(--viola)' }} />
              )}
              <div className="text-[13px]" style={{ color: 'var(--ink)' }}>
                <div className="font-bold mb-1">
                  {fase === 'errore' ? 'Non è andato' : fase === 'fatto' ? 'Fatto' : 'Instagram sta preparando il video'}
                </div>
                <div>{messaggio}</div>
                {fase === 'attesa' && (
                  <div className="text-[11px] mt-2" style={{ color: 'var(--ink3)' }}>
                    Puoi chiudere questa finestra: esce da solo appena è pronto. Lo stato è nel Calendario.
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {fase === 'errore' && (
                <Button variant="outline" className="flex-1" onClick={() => setFase('modulo')}>
                  Correggi e riprova
                </Button>
              )}
              <Button className="flex-1 text-white font-bold" style={{ backgroundColor: 'var(--rosa)' }} onClick={chiudi}>
                Chiudi
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Profilo */}
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={etichetta}>Profilo Instagram</label>
              {loadingConnections || connections === null ? (
                <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ink3)' }}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Caricamento…
                </div>
              ) : nessunProfilo ? (
                <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--rosa-dim)' }}>
                  <div className="text-[12px]" style={{ color: 'var(--ink)' }}>
                    Nessun profilo Instagram collegato a questo account.
                  </div>
                  <Button
                    onClick={() => {
                      let brandId: string | null = null;
                      try { brandId = localStorage.getItem('fisioaccordo:active_brand_id'); } catch { /* storage bloccato */ }
                      MetaService.initiateAuth(brandId);
                    }}
                    className="w-full text-white font-bold"
                    style={{ backgroundColor: 'var(--rosa)' }}
                  >
                    <Instagram className="h-4 w-4 mr-2" /> Collega Instagram
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {connections!.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setConnectionId(c.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold"
                      style={{
                        backgroundColor: connectionId === c.id ? 'var(--rosa-dim)' : 'var(--bg)',
                        border: connectionId === c.id ? '1px solid var(--rosa)' : '1px solid var(--line)',
                        color: 'var(--ink)',
                      }}
                    >
                      <Instagram className="h-3.5 w-3.5" style={{ color: connectionId === c.id ? 'var(--rosa)' : 'var(--ink3)' }} />
                      @{c.instagram_username || c.page_name || 'profilo'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Video */}
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={etichetta}>Video</label>
              {!videoUrl ? (
                <label
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg cursor-pointer text-center"
                  style={{ border: '2px dashed var(--line)', backgroundColor: 'var(--bg)' }}
                >
                  <Upload className="h-6 w-6" style={{ color: 'var(--ink3)' }} />
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Scegli il video</span>
                  <span className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                    MP4 o MOV verticale 9:16, da 3 secondi a 15 minuti, fino a {REEL_LIMITI.maxByte / MB} MB
                  </span>
                  <input
                    type="file"
                    accept={TIPI_VIDEO.join(',')}
                    className="hidden"
                    onChange={(e) => scegliVideo(e.target.files?.[0])}
                  />
                </label>
              ) : (
                <div className="flex gap-3">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    playsInline
                    muted
                    preload="metadata"
                    onLoadedMetadata={letturaVideo}
                    className="rounded-lg bg-black flex-shrink-0"
                    style={{ width: 140, aspectRatio: '9 / 16', objectFit: 'contain' }}
                  />
                  <div className="flex-1 min-w-0 space-y-1.5 text-[12px]" style={{ color: 'var(--ink)' }}>
                    <div className="font-semibold truncate">{video?.name}</div>
                    <div style={{ color: 'var(--ink3)' }}>
                      {((video?.size || 0) / MB).toFixed(1)} MB
                      {info?.durata ? ` · ${secondi(info.durata)}` : ''}
                      {info?.larghezza ? ` · ${info.larghezza}×${info.altezza}` : ''}
                    </div>
                    {verificaVideo?.errori.map((e) => (
                      <div key={e} style={{ color: '#ef4444' }}>⚠ {e}</div>
                    ))}
                    {verificaVideo?.avvisi.map((a) => (
                      <div key={a} style={{ color: '#b45309' }}>{a}</div>
                    ))}
                    <label className="inline-block text-[11px] font-bold underline cursor-pointer" style={{ color: 'var(--viola)' }}>
                      Cambia video
                      <input
                        type="file"
                        accept={TIPI_VIDEO.join(',')}
                        className="hidden"
                        onChange={(e) => scegliVideo(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Copertina */}
            {videoUrl && (
              <div>
                <label className="text-[11px] font-bold uppercase block mb-2" style={etichetta}>Copertina (facoltativa)</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {([
                    ['instagram', 'La sceglie Instagram'],
                    ['fotogramma', 'Un fotogramma del video'],
                    ['immagine', 'Carica un\'immagine'],
                  ] as [Copertina, string][]).map(([k, testo]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCopertina(k)}
                      className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
                      style={{
                        backgroundColor: copertina === k ? 'var(--viola-dim)' : 'var(--bg)',
                        border: copertina === k ? '1px solid var(--viola)' : '1px solid var(--line)',
                        color: 'var(--ink)',
                      }}
                    >
                      {testo}
                    </button>
                  ))}
                </div>
                {copertina === 'fotogramma' && info?.durata ? (
                  <div className="space-y-1">
                    <Slider
                      min={0}
                      max={Math.max(0, info.durata - 0.1)}
                      step={0.1}
                      value={[fotogramma]}
                      onValueChange={(v) => spostaFotogramma(v[0])}
                    />
                    <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                      Fotogramma a {secondi(fotogramma)}: lo vedi nell'anteprima qui sopra.
                    </div>
                  </div>
                ) : null}
                {copertina === 'immagine' && (
                  <div className="flex items-center gap-3">
                    {immagineUrl ? (
                      <img src={immagineUrl} alt="Copertina" className="rounded-lg object-cover" style={{ width: 54, height: 96 }} />
                    ) : (
                      <div className="rounded-lg flex items-center justify-center" style={{ width: 54, height: 96, backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}>
                        <ImageIcon className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
                      </div>
                    )}
                    <div className="text-[12px] space-y-1">
                      <label className="inline-block font-bold underline cursor-pointer" style={{ color: 'var(--viola)' }}>
                        {immagine ? 'Cambia immagine' : 'Scegli l\'immagine'}
                        <input
                          type="file"
                          accept={TIPI_COPERTINA.join(',')}
                          className="hidden"
                          onChange={(e) => scegliImmagine(e.target.files?.[0])}
                        />
                      </label>
                      <div style={{ color: 'var(--ink3)' }}>JPG o PNG verticale 9:16, fino a 8 MB</div>
                      {verificaImmagine?.errori.map((e) => (
                        <div key={e} style={{ color: '#ef4444' }}>⚠ {e}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Didascalia */}
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={etichetta}>Didascalia</label>
              <textarea
                value={didascalia}
                onChange={(e) => setDidascalia(e.target.value)}
                rows={6}
                placeholder="Il testo sotto il Reel, con gli hashtag in fondo"
                className="w-full p-3 rounded-lg text-[13px] leading-relaxed"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)', resize: 'vertical' }}
              />
              <div className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--ink3)' }}>
                <span style={{ color: hashtag > REEL_LIMITI.maxHashtag ? '#ef4444' : undefined }}>
                  {hashtag} hashtag su {REEL_LIMITI.maxHashtag}
                </span>
                <span style={{ color: caratteri > REEL_LIMITI.maxDidascalia ? '#ef4444' : undefined }}>
                  {caratteri} / {REEL_LIMITI.maxDidascalia}
                </span>
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 text-[13px]" style={{ color: 'var(--ink)' }}>
              <span>
                Mostralo anche nella griglia del profilo
                <span className="block text-[11px]" style={{ color: 'var(--ink3)' }}>
                  Se lo spegni il Reel resta solo nella scheda Reel.
                </span>
              </span>
              <Switch checked={nelFeed} onCheckedChange={setNelFeed} />
            </label>

            {/* Quando */}
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={etichetta}>Quando</label>
              <div className="flex gap-1.5 mb-3">
                {([
                  ['programma', 'Programma'],
                  ['ora', 'Pubblica ora'],
                ] as ['programma' | 'ora', string][]).map(([k, testo]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setQuando(k)}
                    className="flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold"
                    style={{
                      backgroundColor: quando === k ? 'var(--rosa-dim)' : 'var(--bg)',
                      border: quando === k ? '1px solid var(--rosa)' : '1px solid var(--line)',
                      color: 'var(--ink)',
                    }}
                  >
                    {testo}
                  </button>
                ))}
              </div>
              {quando === 'programma' && (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={data}
                      min={partiRoma(new Date()).data}
                      onChange={(e) => setData(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg text-[13px]"
                      style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                    />
                    <input
                      type="time"
                      value={ora}
                      onChange={(e) => setOra(e.target.value)}
                      className="w-28 px-3 py-2 rounded-lg text-[13px]"
                      style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                    />
                  </div>
                  <div className="text-[11px]" style={{ color: istanteNelPassato ? '#ef4444' : 'var(--ink3)' }}>
                    {!istante
                      ? 'Data o ora non valida.'
                      : istanteNelPassato
                        ? 'Scegli un orario fra almeno 2 minuti.'
                        : <>
                            Ora italiana: esce {formatoRoma(istante)}.
                            {fusoLocale && (
                              <> Per te ({fusoLocale.split('/').pop()?.replace('_', ' ')}):{' '}
                                {istante.toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.
                              </>
                            )}
                          </>}
                  </div>
                </div>
              )}
              {quando === 'ora' && (
                <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                  Dopo il caricamento Instagram elabora il video: di solito esce entro pochi minuti.
                </div>
              )}
            </div>

            {verificaDidascalia.errori.map((e) => (
              <div key={e} className="text-[12px]" style={{ color: '#ef4444' }}>⚠ {e}</div>
            ))}

            {fase === 'invio' ? (
              <div className="space-y-2">
                <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{passo}</div>
                <Progress value={progresso} />
                <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                  Non chiudere la finestra finché il caricamento non è finito.
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={chiudi}>Annulla</Button>
                <Button
                  className="flex-1 text-white font-bold"
                  style={{ backgroundColor: 'var(--rosa)' }}
                  disabled={!pronto}
                  onClick={invia}
                >
                  {quando === 'ora' ? (
                    <><Instagram className="h-4 w-4 mr-2" /> Pubblica ora</>
                  ) : (
                    <><CalendarClock className="h-4 w-4 mr-2" /> Programma</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublishReelDialog;
