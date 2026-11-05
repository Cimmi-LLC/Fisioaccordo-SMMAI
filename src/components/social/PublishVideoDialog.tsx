import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Loader2, Instagram, Film, Upload, CheckCircle2, XCircle, CalendarClock, ImageIcon, Send, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useSchedulePost } from '@/hooks/useSchedulePost';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { useToast } from '@/hooks/use-toast';
import { MetaService } from '@/services/metaService';
import { SocialService, type CreatorInfo } from '@/services/socialService';
import BrandSocialConnect, { PLATFORM_ICON, connectionName } from '@/components/BrandSocialConnect';
import TikTokOptionsPanel from '@/components/social/TikTokOptionsPanel';
import {
  REEL_LIMITI,
  TIPI_COPERTINA,
  contaHashtag,
  formatoRoma,
  oraRomaInUtc,
  partiRoma,
  validaCopertina,
  type InfoVideo,
} from '@/lib/brand/reel';
import { explainSocialError, validateTikTokOptions, youtubeTitle, type TikTokOptions, type YouTubeOptions } from '@/lib/social/socialCore';
import {
  DESTINAZIONI,
  EMPTY_TIKTOK,
  MAX_TESTO,
  MAX_TITOLO_YOUTUBE,
  NOME_DESTINAZIONE,
  controllaTesti,
  controllaVideo,
  maxByteVideo,
  testoPer,
  titoloEsiti,
  type Destinazione,
  type EsitoDestinazione,
} from '@/lib/social/videoUnico';
import {
  caricaFileReel,
  eliminaFileReel,
  leggiStatoReel,
  percorsoReel,
  programmaReel,
  pubblicaReelOra,
} from '@/services/reelService';

interface PublishVideoDialogProps {
  open: boolean;
  onClose: () => void;
  /** Testo già pronto (es. la caption dello script del reel). */
  captionIniziale?: string;
  /** Titolo già pronto per YouTube (es. il titolo dello script). */
  titoloIniziale?: string;
  /** Chiamata quando almeno una piattaforma ha pubblicato, preso in carico o programmato. */
  onFatto?: () => void;
}

type Copertina = 'instagram' | 'fotogramma' | 'immagine';
type Fase = 'modulo' | 'invio' | 'esiti';

const etichetta: React.CSSProperties = { color: 'var(--ink3)', letterSpacing: '0.5px' };
const campo: React.CSSProperties = { backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' };
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

function IconaDestinazione({ d, className, style }: { d: Destinazione; className?: string; style?: React.CSSProperties }) {
  const Icona = d === 'instagram' ? Instagram : PLATFORM_ICON[d];
  return <Icona className={className} style={style} />;
}

/**
 * Un video, caricato una volta, pubblicato subito o programmato su Instagram
 * (Reel), YouTube (Shorts) e TikTok insieme. Il testo è comune ma ogni
 * piattaforma può averne uno suo; YouTube ha anche titolo e visibilità.
 * L'ora si sceglie sempre in ora italiana.
 */
const PublishVideoDialog: React.FC<PublishVideoDialogProps> = ({ open, onClose, captionIniziale, titoloIniziale, onFatto }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { brands, activeBrandId } = useActiveBrand();
  const { connections, loadConnections, loadingConnections } = useSchedulePost();
  const social = useSocialConnections();
  const brandName = brands.find((b) => b.id === activeBrandId)?.nome_business || 'questo brand';

  const account = useMemo(
    () => ({ tiktok: social.forBrand('tiktok', activeBrandId), youtube: social.forBrand('youtube', activeBrandId) }),
    [social, activeBrandId],
  );

  const [scelte, setScelte] = useState<Partial<Record<Destinazione, boolean>>>({});
  const [connectionId, setConnectionId] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoVideo | null>(null);
  const [copertina, setCopertina] = useState<Copertina>('instagram');
  const [fotogramma, setFotogramma] = useState(0);
  const [immagine, setImmagine] = useState<File | null>(null);
  const [immagineUrl, setImmagineUrl] = useState<string | null>(null);
  const [testo, setTesto] = useState(captionIniziale || '');
  const [propri, setPropri] = useState<Partial<Record<Destinazione, string | null>>>({});
  const [nelFeed, setNelFeed] = useState(true);
  const [yt, setYt] = useState<YouTubeOptions>({ title: '', privacy_status: 'public' });
  const [tt, setTt] = useState<TikTokOptions>(EMPTY_TIKTOK);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [quando, setQuando] = useState<'ora' | 'programma'>('programma');
  const [data, setData] = useState(() => proponiOrario().data);
  const [ora, setOra] = useState(() => proponiOrario().ora);
  const [fase, setFase] = useState<Fase>('modulo');
  const [progresso, setProgresso] = useState(0);
  const [passo, setPasso] = useState('');
  const [esiti, setEsiti] = useState<EsitoDestinazione[]>([]);
  // Il video già caricato: se si riprova solo dove non è andato, non si ricarica.
  const [caricato, setCaricato] = useState<{ file: File; videoPath: string; coverFile: File | null; coverPath: string | null } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const attesaRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    loadConnections();
    social.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadConnections]);

  useEffect(() => {
    if (connections && connections.length > 0 && !connectionId) setConnectionId(connections[0].id);
  }, [connections, connectionId]);

  // Ogni piattaforma collegata parte selezionata (una volta sola: poi decide
  // l'utente). Dopo «Chiudi» le scelte tornano vuote e si riempiono di nuovo.
  useEffect(() => {
    setScelte((s) => {
      const prossime = { ...s };
      let cambiato = false;
      const collegate: Record<Destinazione, boolean> = {
        instagram: !!connections && connections.length > 0,
        tiktok: !!account.tiktok,
        youtube: !!account.youtube,
      };
      for (const d of DESTINAZIONI) {
        if (prossime[d] === undefined && collegate[d]) { prossime[d] = true; cambiato = true; }
      }
      return cambiato ? prossime : s;
    });
  }, [connections, account.tiktok, account.youtube, scelte]);

  // Aperto dallo script di un reel: testo e titolo prendono il posto della bozza.
  useEffect(() => {
    if (!open) return;
    if (captionIniziale) setTesto(captionIniziale);
    const base = titoloIniziale || (captionIniziale || '').split('\n')[0] || '';
    if (base) setYt((y) => ({ ...y, title: youtubeTitle(base) }));
  }, [open, captionIniziale, titoloIniziale]);

  const destinazioni = DESTINAZIONI.filter((d) => {
    if (!scelte[d]) return false;
    if (d === 'instagram') return !!connectionId;
    return !!account[d];
  });
  const conTikTok = destinazioni.includes('tiktok');
  const conInstagram = destinazioni.includes('instagram');
  const conYoutube = destinazioni.includes('youtube');

  // TikTok: profilo e limiti letti a ogni apertura (regola TikTok).
  useEffect(() => {
    if (!open || !conTikTok || !account.tiktok) { setCreator(null); return; }
    let annullato = false;
    setCreatorError(null);
    SocialService.creatorInfo(account.tiktok.id)
      .then((i) => { if (!annullato) setCreator(i); })
      .catch((e) => { if (!annullato) setCreatorError(explainSocialError('tiktok', e instanceof Error ? e.message : String(e))); });
    return () => { annullato = true; };
  }, [open, conTikTok, account.tiktok]);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => () => { if (immagineUrl) URL.revokeObjectURL(immagineUrl); }, [immagineUrl]);
  useEffect(() => () => { if (attesaRef.current) window.clearInterval(attesaRef.current); }, []);

  const profilo = connections?.find((c) => c.id === connectionId);
  const nomeProfilo = profilo ? `@${profilo.instagram_username || profilo.page_name || 'profilo'}` : 'Instagram';
  const nomeAccount = (d: Destinazione) =>
    d === 'instagram' ? nomeProfilo : account[d] ? connectionName(account[d]!) : NOME_DESTINAZIONE[d];

  const verificaVideo = useMemo(
    () => (info ? controllaVideo(info, destinazioni, creator?.max_video_post_duration_sec) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [info, destinazioni.join(), creator?.max_video_post_duration_sec],
  );
  const verificaTesti = useMemo(
    () => controllaTesti(destinazioni, testo, propri, yt.title),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destinazioni.join(), testo, propri, yt.title],
  );
  const verificaImmagine = useMemo(
    () => (immagine ? validaCopertina({ tipo: immagine.type, byte: immagine.size }) : null),
    [immagine],
  );
  const istante = useMemo(() => oraRomaInUtc(data, ora), [data, ora]);
  const fusoLocale = useMemo(fusoLocaleDiversoDaRoma, []);
  const istanteNelPassato = !istante || istante.getTime() < Date.now() + 2 * 60 * 1000;

  const problema = (() => {
    if (destinazioni.length === 0) return 'Scegli almeno una piattaforma.';
    if (!video || !info) return 'Scegli il video.';
    if (verificaVideo?.errori.length) return verificaVideo.errori[0];
    if (conInstagram && copertina === 'immagine') {
      if (!immagine) return 'Scegli l\'immagine di copertina.';
      if (verificaImmagine?.errori.length) return verificaImmagine.errori[0];
    }
    if (verificaTesti.errori.length) return verificaTesti.errori[0];
    if (conTikTok) {
      if (creatorError) return creatorError;
      if (!creator) return 'Leggo il profilo TikTok…';
      const v = validateTikTokOptions(tt, creator.privacy_level_options);
      if (v) return v;
    }
    if (quando === 'programma' && istanteNelPassato) return 'Scegli un orario fra almeno 2 minuti.';
    return null;
  })();

  const scegliVideo = (file: File | undefined) => {
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideo(file);
    setVideoUrl(URL.createObjectURL(file));
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
    setTesto('');
    setPropri({});
    setTt(EMPTY_TIKTOK);
    setYt({ title: '', privacy_status: 'public' });
    setScelte({});
    setCaricato(null);
    setEsiti([]);
    setFase('modulo');
    setProgresso(0);
  };

  const chiudi = () => {
    if (fase === 'invio') return; // il caricamento è in corso
    if (fase === 'esiti') azzera();
    onClose();
  };

  const aggiornaEsito = (d: Destinazione, campi: Partial<EsitoDestinazione>) =>
    setEsiti((lista) => lista.map((e) => (e.destinazione === d ? { ...e, ...campi } : e)));

  const seguiReel = (reelId: string) => {
    const inizio = Date.now();
    if (attesaRef.current) window.clearInterval(attesaRef.current);
    attesaRef.current = window.setInterval(async () => {
      const stato = await leggiStatoReel(reelId);
      const ferma = () => { window.clearInterval(attesaRef.current!); attesaRef.current = null; };
      if (stato?.status === 'published') {
        ferma();
        aggiornaEsito('instagram', { stato: 'pubblicato', messaggio: `Il Reel è uscito su ${nomeProfilo}.` });
        onFatto?.();
      } else if (stato?.status === 'failed') {
        ferma();
        aggiornaEsito('instagram', { stato: 'fallito', messaggio: stato.error_message || 'Instagram ha rifiutato il video.' });
        onFatto?.();
      } else if (Date.now() - inizio > ATTESA_MAX_MS) {
        ferma();
      } else if (stato?.error_message) {
        aggiornaEsito('instagram', { messaggio: stato.error_message });
      }
    }, 5000);
  };

  const pubblicaSu = async (d: Destinazione, videoPath: string, coverPath: string | null): Promise<EsitoDestinazione> => {
    const scheduledFor = quando === 'programma' ? istante : null;
    const quandoTesto = scheduledFor ? `${formatoRoma(scheduledFor)} (ora italiana)` : '';
    try {
      if (d === 'instagram') {
        const dati = {
          connectionId,
          content: testoPer('instagram', testo, propri),
          videoPath,
          coverPath,
          thumbOffsetMs: copertina === 'fotogramma' ? Math.round(fotogramma * 1000) : null,
          shareToFeed: nelFeed,
        };
        if (scheduledFor) {
          await programmaReel({ ...dati, scheduledFor });
          return { destinazione: d, stato: 'programmato', messaggio: `Esce ${quandoTesto} su ${nomeProfilo}.` };
        }
        const r = await pubblicaReelOra(dati);
        if (r.status === 'published') return { destinazione: d, stato: 'pubblicato', messaggio: `Il Reel è uscito su ${nomeProfilo}.` };
        return {
          destinazione: d,
          stato: 'in_elaborazione',
          messaggio: r.message || 'Instagram sta preparando il video: esce da solo appena è pronto.',
          reelId: r.reelId ?? null,
        };
      }
      const acc = account[d]!;
      const r = await SocialService.publish({
        connectionId: acc.id,
        kind: 'video',
        videoPath,
        caption: testoPer(d, testo, propri),
        tiktok: d === 'tiktok' ? tt : undefined,
        youtube: d === 'youtube' ? { ...yt, title: youtubeTitle(yt.title) } : undefined,
        scheduledFor,
      });
      if (r.scheduled) return { destinazione: d, stato: 'programmato', messaggio: `Esce ${quandoTesto} su ${connectionName(acc)}.` };
      if (r.status === 'processing') {
        return { destinazione: d, stato: 'in_elaborazione', messaggio: `Inviato a ${connectionName(acc)}: compare sul profilo fra qualche minuto.`, url: r.url };
      }
      return { destinazione: d, stato: 'pubblicato', messaggio: `Uscito su ${connectionName(acc)}.`, url: r.url };
    } catch (err) {
      const testoErrore = err instanceof Error ? err.message : 'Pubblicazione non riuscita.';
      return { destinazione: d, stato: 'fallito', messaggio: d === 'instagram' ? testoErrore : explainSocialError(d, testoErrore) };
    }
  };

  const invia = async () => {
    if (problema || !video || !user) return;
    setFase('invio');
    setProgresso(0);
    const coverFile = conInstagram && copertina === 'immagine' ? immagine : null;
    let videoPath = caricato?.file === video ? caricato.videoPath : null;
    let coverPath = coverFile && caricato?.coverFile === coverFile ? caricato.coverPath : null;
    const nuovi: string[] = [];
    try {
      if (!videoPath) {
        videoPath = percorsoReel(user.id, video, 'video');
        setPasso(`Carico il video (${(video.size / MB).toFixed(0)} MB)…`);
        await caricaFileReel(videoPath, video, setProgresso);
        nuovi.push(videoPath);
      }
      if (coverFile && !coverPath) {
        coverPath = percorsoReel(user.id, coverFile, 'copertina');
        setPasso('Carico la copertina…');
        await caricaFileReel(coverPath, coverFile);
        nuovi.push(coverPath);
      }
    } catch (err) {
      await eliminaFileReel(nuovi);
      setEsiti([{ destinazione: destinazioni[0], stato: 'fallito', messaggio: err instanceof Error ? err.message : 'Caricamento non riuscito.' }]);
      setFase('esiti');
      return;
    }
    setCaricato({ file: video, videoPath, coverFile, coverPath });

    setPasso(quando === 'programma' ? 'Programmo…' : `Invio a ${destinazioni.map((d) => NOME_DESTINAZIONE[d]).join(', ')}…`);
    setProgresso(100);
    const risultati = await Promise.all(destinazioni.map((d) => pubblicaSu(d, videoPath!, coverPath)));
    setEsiti(risultati);
    setFase('esiti');

    const riusciti = risultati.filter((r) => r.stato !== 'fallito');
    if (riusciti.length > 0) onFatto?.();
    // Nessuna piattaforma l'ha preso: il video caricato non serve a nessuno.
    if (riusciti.length === 0) {
      await eliminaFileReel([videoPath, coverPath]);
      setCaricato(null);
    }
    const reel = risultati.find((r) => r.destinazione === 'instagram' && r.stato === 'in_elaborazione' && r.reelId);
    if (reel?.reelId) seguiReel(reel.reelId);
    toast({
      title: titoloEsiti(risultati),
      description: risultati.map((r) => `${NOME_DESTINAZIONE[r.destinazione]}: ${r.stato === 'fallito' ? 'non riuscito' : r.stato.replace('_', ' ')}`).join(' · '),
      variant: riusciti.length === 0 ? 'destructive' : undefined,
    });
  };

  // Si riprova solo dove non è andato: le altre piattaforme si spengono.
  const riprova = () => {
    const falliti = new Set(esiti.filter((e) => e.stato === 'fallito').map((e) => e.destinazione));
    setScelte((s) => Object.fromEntries(DESTINAZIONI.map((d) => [d, !!s[d] && falliti.has(d)])));
    setEsiti([]);
    setFase('modulo');
  };

  const nessunInstagram = connections !== null && connections.length === 0;
  const caricamento = loadingConnections || connections === null || social.loading;

  const casellaTesto = (d: Destinazione | null) => {
    const valore = d ? propri[d] ?? '' : testo;
    const max = d ? MAX_TESTO[d] : Math.min(...(destinazioni.length ? destinazioni : DESTINAZIONI).map((x) => MAX_TESTO[x]));
    const caratteri = [...valore].length;
    return (
      <>
        <textarea
          value={valore}
          onChange={(e) => (d ? setPropri({ ...propri, [d]: e.target.value }) : setTesto(e.target.value))}
          rows={d ? 4 : 6}
          placeholder={d ? `Il testo solo per ${NOME_DESTINAZIONE[d]}` : 'Il testo sotto il video, con gli hashtag in fondo'}
          className="w-full p-3 rounded-lg text-[13px] leading-relaxed"
          style={{ ...campo, resize: 'vertical' }}
        />
        <div className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--ink3)' }}>
          {(d === 'instagram' || (!d && conInstagram && propri.instagram == null)) ? (
            <span style={{ color: contaHashtag(valore) > REEL_LIMITI.maxHashtag ? '#ef4444' : undefined }}>
              {contaHashtag(valore)} hashtag su {REEL_LIMITI.maxHashtag} (Instagram)
            </span>
          ) : <span />}
          <span style={{ color: caratteri > max ? '#ef4444' : undefined }}>{caratteri} / {max}</span>
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && chiudi()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" style={{ color: 'var(--rosa)' }} />
            Pubblica il video
          </DialogTitle>
          <DialogDescription>
            Carichi il video una volta: esce come Reel su Instagram, Short su YouTube e su TikTok, subito o all'ora che scegli.
          </DialogDescription>
        </DialogHeader>

        {fase === 'esiti' ? (
          <div className="space-y-3 py-1">
            <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>{titoloEsiti(esiti)}</div>
            {esiti.map((e) => (
              <div key={e.destinazione} className="p-3 rounded-lg flex gap-3"
                style={{
                  backgroundColor: e.stato === 'fallito' ? 'rgba(239,68,68,0.08)' : e.stato === 'in_elaborazione' ? 'var(--viola-dim)' : 'rgba(16,185,129,0.1)',
                  border: '1px solid var(--line)',
                }}>
                {e.stato === 'fallito' ? <XCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#ef4444' }} />
                  : e.stato === 'in_elaborazione' ? <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" style={{ color: 'var(--viola)' }} />
                  : e.stato === 'programmato' ? <Clock className="h-5 w-5 flex-shrink-0" style={{ color: '#10b981' }} />
                  : <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#10b981' }} />}
                <div className="text-[13px] min-w-0" style={{ color: 'var(--ink)' }}>
                  <div className="font-bold flex items-center gap-1.5">
                    <IconaDestinazione d={e.destinazione} className="h-3.5 w-3.5" /> {NOME_DESTINAZIONE[e.destinazione]}
                  </div>
                  <div className="break-words">{e.messaggio}</div>
                  {e.url && e.stato === 'pubblicato' && (
                    <a href={e.url} target="_blank" rel="noreferrer" className="text-[12px] underline" style={{ color: 'var(--viola)' }}>Apri</a>
                  )}
                </div>
              </div>
            ))}
            {esiti.some((e) => e.stato === 'in_elaborazione') && (
              <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                Puoi chiudere questa finestra: esce da solo appena è pronto. Lo stato è nel Calendario.
              </div>
            )}
            <div className="flex gap-2">
              {esiti.some((e) => e.stato === 'fallito') && (
                <Button variant="outline" className="flex-1" onClick={riprova}>
                  {esiti.every((e) => e.stato === 'fallito') ? 'Correggi e riprova' : 'Riprova dove non è andato'}
                </Button>
              )}
              <Button className="flex-1 text-white font-bold" style={{ backgroundColor: 'var(--rosa)' }} onClick={chiudi}>
                Chiudi
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Dove */}
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={etichetta}>Dove · {brandName}</label>
              {caricamento ? (
                <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ink3)' }}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Caricamento…
                </div>
              ) : (
                <div className="space-y-1.5">
                  {DESTINAZIONI.map((d) => {
                    const collegato = d === 'instagram' ? !nessunInstagram : !!account[d];
                    if (!collegato) {
                      if (d === 'instagram') {
                        return (
                          <Button key={d} variant="outline" className="w-full justify-start"
                            onClick={() => {
                              let brandId: string | null = null;
                              try { brandId = localStorage.getItem('fisioaccordo:active_brand_id'); } catch { /* storage bloccato */ }
                              MetaService.initiateAuth(brandId);
                            }}>
                            <Instagram className="h-4 w-4 mr-2" /> Collega Instagram
                          </Button>
                        );
                      }
                      return activeBrandId ? (
                        <BrandSocialConnect key={d} platform={d} brandId={activeBrandId} brandName={brandName}
                          connection={null} enabled={social.enabled[d]} onChanged={social.reload} />
                      ) : null;
                    }
                    const attiva = !!scelte[d];
                    return (
                      <label key={d} className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer"
                        style={{ border: `1px solid ${attiva ? 'var(--rosa)' : 'var(--line)'}`, backgroundColor: attiva ? 'var(--rosa-dim)' : 'var(--bg)' }}>
                        <input type="checkbox" checked={attiva} disabled={fase === 'invio'}
                          onChange={(e) => setScelte({ ...scelte, [d]: e.target.checked })} />
                        <IconaDestinazione d={d} className="h-4 w-4" />
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{NOME_DESTINAZIONE[d]}</span>
                        {d === 'instagram' && connections && connections.length > 1 ? (
                          <select value={connectionId} onChange={(e) => setConnectionId(e.target.value)}
                            className="ml-auto text-[12px] rounded px-1.5 py-1" style={campo}>
                            {connections.map((c) => (
                              <option key={c.id} value={c.id}>@{c.instagram_username || c.page_name || 'profilo'}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[12px] truncate" style={{ color: 'var(--ink3)' }}>{nomeAccount(d)}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Video */}
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={etichetta}>Video</label>
              {!videoUrl ? (
                <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg cursor-pointer text-center"
                  style={{ border: '2px dashed var(--line)', backgroundColor: 'var(--bg)' }}>
                  <Upload className="h-6 w-6" style={{ color: 'var(--ink3)' }} />
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Scegli il video</span>
                  <span className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                    MP4 o MOV verticale 9:16, fino a {maxByteVideo(destinazioni) / MB} MB
                    {conYoutube ? ' · per gli Shorts al massimo 3 minuti' : ''}
                  </span>
                  <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
                    onChange={(e) => scegliVideo(e.target.files?.[0])} />
                </label>
              ) : (
                <div className="flex gap-3">
                  <video ref={videoRef} src={videoUrl} controls playsInline muted preload="metadata"
                    onLoadedMetadata={letturaVideo}
                    className="rounded-lg bg-black flex-shrink-0"
                    style={{ width: 140, aspectRatio: '9 / 16', objectFit: 'contain' }} />
                  <div className="flex-1 min-w-0 space-y-1.5 text-[12px]" style={{ color: 'var(--ink)' }}>
                    <div className="font-semibold truncate">{video?.name}</div>
                    <div style={{ color: 'var(--ink3)' }}>
                      {((video?.size || 0) / MB).toFixed(1)} MB
                      {info?.durata ? ` · ${secondi(info.durata)}` : ''}
                      {info?.larghezza ? ` · ${info.larghezza}×${info.altezza}` : ''}
                    </div>
                    {verificaVideo?.errori.map((e) => <div key={e} style={{ color: '#ef4444' }}>⚠ {e}</div>)}
                    {verificaVideo?.avvisi.map((a) => <div key={a} style={{ color: '#b45309' }}>{a}</div>)}
                    <label className="inline-block text-[11px] font-bold underline cursor-pointer" style={{ color: 'var(--viola)' }}>
                      Cambia video
                      <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
                        onChange={(e) => scegliVideo(e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Testo comune */}
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={etichetta}>Testo</label>
              {casellaTesto(null)}
              {destinazioni.length > 1 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {destinazioni.map((d) => (
                    <button key={d} type="button" className="text-[11px] font-bold underline" style={{ color: 'var(--viola)' }}
                      onClick={() => setPropri({ ...propri, [d]: propri[d] == null ? testo : null })}>
                      {propri[d] == null ? `Testo diverso per ${NOME_DESTINAZIONE[d]}` : `${NOME_DESTINAZIONE[d]}: usa quello comune`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Instagram */}
            {conInstagram && (
              <div className="p-3 rounded-lg space-y-3" style={{ border: '1px solid var(--line)' }}>
                <div className="text-[12px] font-bold flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
                  <Instagram className="h-3.5 w-3.5" /> Instagram Reel · {nomeProfilo}
                </div>
                {destinazioni.length > 1 && propri.instagram != null && casellaTesto('instagram')}
                {videoUrl && (
                  <div>
                    <span className="text-[11px] font-bold uppercase block mb-1.5" style={etichetta}>Copertina (facoltativa)</span>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {([
                        ['instagram', 'La sceglie Instagram'],
                        ['fotogramma', 'Un fotogramma del video'],
                        ['immagine', 'Carica un\'immagine'],
                      ] as [Copertina, string][]).map(([k, t]) => (
                        <button key={k} type="button" onClick={() => setCopertina(k)}
                          className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
                          style={{
                            backgroundColor: copertina === k ? 'var(--viola-dim)' : 'var(--bg)',
                            border: copertina === k ? '1px solid var(--viola)' : '1px solid var(--line)',
                            color: 'var(--ink)',
                          }}>
                          {t}
                        </button>
                      ))}
                    </div>
                    {copertina === 'fotogramma' && info?.durata ? (
                      <div className="space-y-1">
                        <Slider min={0} max={Math.max(0, info.durata - 0.1)} step={0.1} value={[fotogramma]}
                          onValueChange={(v) => spostaFotogramma(v[0])} />
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
                          <div className="rounded-lg flex items-center justify-center" style={{ width: 54, height: 96, ...campo }}>
                            <ImageIcon className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
                          </div>
                        )}
                        <div className="text-[12px] space-y-1">
                          <label className="inline-block font-bold underline cursor-pointer" style={{ color: 'var(--viola)' }}>
                            {immagine ? 'Cambia immagine' : 'Scegli l\'immagine'}
                            <input type="file" accept={TIPI_COPERTINA.join(',')} className="hidden"
                              onChange={(e) => scegliImmagine(e.target.files?.[0])} />
                          </label>
                          <div style={{ color: 'var(--ink3)' }}>JPG o PNG verticale 9:16, fino a 8 MB. Vale solo per Instagram.</div>
                          {verificaImmagine?.errori.map((e) => <div key={e} style={{ color: '#ef4444' }}>⚠ {e}</div>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <label className="flex items-center justify-between gap-3 text-[13px]" style={{ color: 'var(--ink)' }}>
                  <span>
                    Mostralo anche nella griglia del profilo
                    <span className="block text-[11px]" style={{ color: 'var(--ink3)' }}>Se lo spegni il Reel resta solo nella scheda Reel.</span>
                  </span>
                  <Switch checked={nelFeed} onCheckedChange={setNelFeed} />
                </label>
              </div>
            )}

            {/* YouTube */}
            {conYoutube && account.youtube && (
              <div className="p-3 rounded-lg space-y-2.5" style={{ border: '1px solid var(--line)' }}>
                <div className="text-[12px] font-bold flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
                  <IconaDestinazione d="youtube" className="h-3.5 w-3.5" /> YouTube Shorts · {connectionName(account.youtube)}
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase block mb-1.5" style={etichetta}>Titolo (max {MAX_TITOLO_YOUTUBE} caratteri)</span>
                  <input value={yt.title} maxLength={MAX_TITOLO_YOUTUBE} onChange={(e) => setYt({ ...yt, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-[13px]" style={campo} />
                </div>
                {destinazioni.length > 1 && propri.youtube != null && (
                  <div>
                    <span className="text-[11px] font-bold uppercase block mb-1.5" style={etichetta}>Descrizione</span>
                    {casellaTesto('youtube')}
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold uppercase block mb-1.5" style={etichetta}>Chi può vederlo</span>
                  <select value={yt.privacy_status} onChange={(e) => setYt({ ...yt, privacy_status: e.target.value as YouTubeOptions['privacy_status'] })}
                    className="w-full px-3 py-2 rounded-lg text-[13px]" style={campo}>
                    <option value="public">Tutti</option>
                    <option value="unlisted">Solo chi ha il link</option>
                    <option value="private">Solo io</option>
                  </select>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--ink3)' }}>I video verticali fino a 3 minuti finiscono negli Shorts.</p>
              </div>
            )}

            {/* TikTok */}
            {conTikTok && account.tiktok && (
              <div className="space-y-2">
                {destinazioni.length > 1 && propri.tiktok != null && (
                  <div>
                    <span className="text-[11px] font-bold uppercase block mb-1.5" style={etichetta}>Testo per TikTok</span>
                    {casellaTesto('tiktok')}
                  </div>
                )}
                <TikTokOptionsPanel value={tt} onChange={setTt} creator={creator} creatorError={creatorError}
                  accountName={connectionName(account.tiktok)} mode="video" />
              </div>
            )}

            {/* Quando */}
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={etichetta}>Quando</label>
              <div className="flex gap-1.5 mb-3">
                {([
                  ['programma', 'Programma'],
                  ['ora', 'Pubblica ora'],
                ] as ['programma' | 'ora', string][]).map(([k, t]) => (
                  <button key={k} type="button" onClick={() => setQuando(k)}
                    className="flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold"
                    style={{
                      backgroundColor: quando === k ? 'var(--rosa-dim)' : 'var(--bg)',
                      border: quando === k ? '1px solid var(--rosa)' : '1px solid var(--line)',
                      color: 'var(--ink)',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
              {quando === 'programma' ? (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input type="date" value={data} min={partiRoma(new Date()).data} onChange={(e) => setData(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg text-[13px]" style={campo} />
                    <input type="time" value={ora} onChange={(e) => setOra(e.target.value)}
                      className="w-28 px-3 py-2 rounded-lg text-[13px]" style={campo} />
                  </div>
                  <div className="text-[11px]" style={{ color: istanteNelPassato ? '#ef4444' : 'var(--ink3)' }}>
                    {!istante
                      ? 'Data o ora non valida.'
                      : istanteNelPassato
                        ? 'Scegli un orario fra almeno 2 minuti.'
                        : <>
                            Ora italiana: esce {formatoRoma(istante)} su tutte le piattaforme scelte.
                            {fusoLocale && (
                              <> Per te ({fusoLocale.split('/').pop()?.replace('_', ' ')}):{' '}
                                {istante.toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.
                              </>
                            )}
                          </>}
                  </div>
                </div>
              ) : (
                <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                  Dopo il caricamento ogni piattaforma elabora il video: di solito esce entro pochi minuti.
                </div>
              )}
            </div>

            {fase === 'invio' ? (
              <div className="space-y-2">
                <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{passo}</div>
                <Progress value={progresso} />
                <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>Non chiudere la finestra finché non è finito.</div>
              </div>
            ) : (
              <>
                {problema && video && <div className="text-[12px]" style={{ color: 'var(--ink3)' }}>{problema}</div>}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={chiudi}>Annulla</Button>
                  <Button className="flex-1 text-white font-bold" style={{ backgroundColor: 'var(--rosa)' }}
                    disabled={!!problema} onClick={invia}>
                    {quando === 'ora'
                      ? <><Send className="h-4 w-4 mr-2" /> Pubblica ora</>
                      : <><CalendarClock className="h-4 w-4 mr-2" /> Programma</>}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PublishVideoDialog;
