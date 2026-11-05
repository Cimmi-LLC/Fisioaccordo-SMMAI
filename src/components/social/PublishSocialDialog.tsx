import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import BrandSocialConnect, { PLATFORM_ICON, connectionName } from '@/components/BrandSocialConnect';
import TikTokOptionsPanel from '@/components/social/TikTokOptionsPanel';
import { EMPTY_TIKTOK } from '@/lib/social/videoUnico';
import { SocialService, PHOTO_BUCKET, MAX_VIDEO_MB, type CreatorInfo } from '@/services/socialService';
import { supabase } from '@/integrations/supabase/client';
import {
  PLATFORM_LABEL,
  SOCIAL_PLATFORMS,
  explainSocialError,
  validateTikTokOptions,
  youtubeTitle,
  type TikTokOptions,
  type YouTubeOptions,
} from '@/lib/social/socialCore';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 'video': si carica un video verticale · 'photos': le slide del carosello (solo TikTok) */
  mode: 'video' | 'photos';
  defaultCaption?: string;
  defaultTitle?: string;
  /** Solo per 'photos': carica le slide nello Storage e dà i percorsi. */
  prepareImages?: () => Promise<{ bucket: string; paths: string[] }>;
  onDone?: () => void;
}

const fieldStyle: React.CSSProperties = {
  width: '100%', backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8,
  padding: '9px 11px', color: 'var(--ink)', fontSize: 13, outline: 'none',
};
const labelCls = 'text-[11px] font-bold uppercase block mb-1.5';
const labelStyle: React.CSSProperties = { color: 'var(--ink3)', letterSpacing: '0.5px' };

function photoUrl(path: string) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Pubblica su TikTok e YouTube: scegli dove, scrivi il testo, «Pubblica».
 * Per TikTok mostra quello che le sue regole chiedono: profilo con cui si
 * pubblica, visibilità scelta dall'utente, commenti/duetti/stitch,
 * contenuto promozionale e la frase di consenso.
 */
const PublishSocialDialog: React.FC<Props> = ({ open, onClose, mode, defaultCaption = '', defaultTitle = '', prepareImages, onDone }) => {
  const { toast } = useToast();
  const { brands, activeBrandId } = useActiveBrand();
  const { enabled, loading, reload, forBrand } = useSocialConnections();
  const brandName = brands.find((b) => b.id === activeBrandId)?.nome_business || 'questo brand';

  const platforms = useMemo(() => (mode === 'photos' ? (['tiktok'] as const) : SOCIAL_PLATFORMS), [mode]);
  const accounts = useMemo(
    () => platforms.map((p) => forBrand(p, activeBrandId)).filter(Boolean) as NonNullable<ReturnType<typeof forBrand>>[],
    [platforms, forBrand, activeBrandId],
  );

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [caption, setCaption] = useState(defaultCaption);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoSec, setVideoSec] = useState<number | null>(null);
  const [photoPaths, setPhotoPaths] = useState<string[] | null>(null);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [yt, setYt] = useState<YouTubeOptions>({ title: youtubeTitle(defaultTitle || defaultCaption.split('\n')[0] || ''), privacy_status: 'public' });
  const [tt, setTt] = useState<TikTokOptions>(EMPTY_TIKTOK);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prepareRef = useRef(prepareImages);
  prepareRef.current = prepareImages;

  const tiktokAccount = accounts.find((a) => a.platform === 'tiktok' && selected[a.id]);
  const youtubeAccount = accounts.find((a) => a.platform === 'youtube' && selected[a.id]);

  // Alla prima apertura: tutti gli account collegati selezionati, testo di partenza.
  useEffect(() => {
    if (!open) return;
    setCaption(defaultCaption);
    setTt(EMPTY_TIKTOK);
    setWhen('now');
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setSelected((s) => {
      const missing = accounts.filter((a) => s[a.id] === undefined);
      if (missing.length === 0) return s;
      const next = { ...s };
      for (const a of missing) next[a.id] = true;
      return next;
    });
  }, [accounts]);

  // TikTok: profilo e limiti letti ogni volta che si apre (regola TikTok).
  useEffect(() => {
    if (!open || !tiktokAccount) { setCreator(null); return; }
    let cancelled = false;
    setCreatorError(null);
    SocialService.creatorInfo(tiktokAccount.id)
      .then((info) => { if (!cancelled) setCreator(info); })
      .catch((e) => { if (!cancelled) setCreatorError(explainSocialError('tiktok', e instanceof Error ? e.message : String(e))); });
    return () => { cancelled = true; };
  }, [open, tiktokAccount?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Foto del carosello: convertite in JPEG e mostrate in anteprima.
  useEffect(() => {
    if (!open) { setPhotoPaths(null); return; }
    if (mode !== 'photos' || !prepareRef.current) return;
    let cancelled = false;
    setPreparingPhotos(true);
    (async () => {
      try {
        const { bucket, paths } = await prepareRef.current!();
        const jpegs = await SocialService.prepareTikTokPhotos(bucket, paths);
        if (!cancelled) setPhotoPaths(jpegs);
      } catch (e) {
        if (!cancelled) toast({ title: 'Foto non pronte', description: e instanceof Error ? e.message : 'Errore', variant: 'destructive' });
      } finally {
        if (!cancelled) setPreparingPhotos(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, mode, toast]);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const pickFile = (f: File | null) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(f);
    setVideoSec(null);
    setVideoUrl(f ? URL.createObjectURL(f) : null);
  };

  const tooLong = !!(tiktokAccount && creator?.max_video_post_duration_sec && videoSec && videoSec > creator.max_video_post_duration_sec);

  const problem = (() => {
    if (accounts.length === 0) return `Collega prima ${mode === 'photos' ? 'TikTok' : 'TikTok o YouTube'}.`;
    if (!tiktokAccount && !youtubeAccount) return 'Scegli dove pubblicare.';
    if (mode === 'video' && !file) return 'Scegli il video da pubblicare.';
    if (mode === 'video' && file && file.size > MAX_VIDEO_MB * 1024 * 1024) return `Il video supera ${MAX_VIDEO_MB} MB.`;
    if (mode === 'photos' && !photoPaths?.length) return preparingPhotos ? 'Preparo le foto…' : 'Nessuna foto da pubblicare.';
    if (tiktokAccount) {
      if (creatorError) return creatorError;
      if (!creator) return 'Leggo il profilo TikTok…';
      if (tooLong) return `Su questo profilo TikTok il video può durare al massimo ${creator.max_video_post_duration_sec} secondi.`;
      const v = validateTikTokOptions(tt, creator.privacy_level_options);
      if (v) return v;
    }
    if (youtubeAccount && !yt.title.trim()) return 'Scrivi il titolo per YouTube.';
    if (when === 'later') {
      const d = new Date(scheduledAt);
      if (!scheduledAt || isNaN(d.getTime()) || d.getTime() < Date.now() + 60_000) return "Scegli giorno e ora nel futuro.";
    }
    return null;
  })();

  const submit = async () => {
    if (problem) return;
    try {
      let videoPath: string | undefined;
      if (mode === 'video' && file) {
        setBusy('Carico il video…');
        videoPath = await SocialService.uploadVideo(file);
      }
      const targets = [tiktokAccount, youtubeAccount].filter(Boolean) as NonNullable<typeof tiktokAccount>[];
      const outcomes: string[] = [];
      let failures = 0;
      for (const acc of targets) {
        const label = PLATFORM_LABEL[acc.platform];
        setBusy(when === 'later' ? `Programmo su ${label}…` : `Pubblico su ${label}…`);
        try {
          const r = await SocialService.publish({
            connectionId: acc.id,
            kind: mode,
            videoPath,
            photoPaths: photoPaths || undefined,
            caption,
            tiktok: acc.platform === 'tiktok' ? tt : undefined,
            youtube: acc.platform === 'youtube' ? yt : undefined,
            scheduledFor: when === 'later' ? new Date(scheduledAt) : null,
          });
          outcomes.push(r.scheduled ? `${label}: programmato` : r.status === 'processing' ? `${label}: inviato, compare tra qualche minuto` : `${label}: pubblicato`);
        } catch (e) {
          failures++;
          outcomes.push(`${label}: ${explainSocialError(acc.platform, e instanceof Error ? e.message : String(e))}`);
        }
      }
      toast({
        title: failures === 0 ? (when === 'later' ? 'Programmato' : 'Fatto') : failures === targets.length ? 'Non pubblicato' : 'Pubblicato in parte',
        description: outcomes.join(' · '),
        variant: failures === targets.length ? 'destructive' : undefined,
      });
      if (failures < targets.length) {
        onDone?.();
        onClose();
      }
    } catch (e) {
      toast({ title: 'Errore', description: e instanceof Error ? e.message : 'Errore', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" style={{ color: 'var(--rosa)' }} />
            {mode === 'photos' ? 'Pubblica il carosello su TikTok' : 'Pubblica il video su TikTok e YouTube'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dove */}
          <div>
            <span className={labelCls} style={labelStyle}>Dove · {brandName}</span>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--ink3)' }} />
            ) : (
              <div className="space-y-1.5">
                {accounts.map((a) => {
                  const Icon = PLATFORM_ICON[a.platform];
                  return (
                    <label key={a.id} className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer"
                      style={{ border: `1px solid ${selected[a.id] ? 'var(--rosa)' : 'var(--line)'}`, backgroundColor: selected[a.id] ? 'var(--rosa-dim)' : 'var(--bg)' }}>
                      <input type="checkbox" checked={!!selected[a.id]} onChange={(e) => setSelected({ ...selected, [a.id]: e.target.checked })} />
                      <Icon className="h-4 w-4" />
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{PLATFORM_LABEL[a.platform]}</span>
                      <span className="text-[12px] truncate" style={{ color: 'var(--ink3)' }}>{connectionName(a)}</span>
                    </label>
                  );
                })}
                {activeBrandId && platforms.filter((p) => !forBrand(p, activeBrandId)).map((p) => (
                  <BrandSocialConnect key={p} platform={p} brandId={activeBrandId} brandName={brandName}
                    connection={null} enabled={enabled[p]} onChanged={reload} />
                ))}
              </div>
            )}
          </div>

          {/* Cosa: anteprima */}
          {mode === 'video' ? (
            <div>
              <span className={labelCls} style={labelStyle}>Video verticale</span>
              <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              {videoUrl ? (
                <div className="flex gap-3 items-start">
                  <video src={videoUrl} controls playsInline className="rounded-lg" style={{ width: 140, maxHeight: 250, backgroundColor: '#000' }}
                    onLoadedMetadata={(e) => setVideoSec(Math.round(e.currentTarget.duration))} />
                  <div className="text-[12px] space-y-1" style={{ color: 'var(--ink3)' }}>
                    <div className="font-semibold truncate" style={{ color: 'var(--ink)', maxWidth: 220 }}>{file?.name}</div>
                    <div>{file ? (file.size / 1024 / 1024).toFixed(1) : 0} MB{videoSec ? ` · ${videoSec} s` : ''}</div>
                    <button className="underline" onClick={() => inputRef.current?.click()}>Cambia video</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => inputRef.current?.click()} className="w-full py-6 rounded-lg flex flex-col items-center gap-1 text-[12px]"
                  style={{ border: '1.5px dashed var(--line)', color: 'var(--ink3)' }}>
                  <Upload className="h-5 w-5" />
                  Scegli il video dal telefono o dal computer (MP4 o MOV, fino a {MAX_VIDEO_MB} MB)
                </button>
              )}
            </div>
          ) : (
            <div>
              <span className={labelCls} style={labelStyle}>Foto del carosello</span>
              {preparingPhotos || !photoPaths ? (
                <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ink3)' }}>
                  <Loader2 className="h-3 w-3 animate-spin" /> Preparo le foto…
                </div>
              ) : (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {photoPaths.map((p) => (
                    <img key={p} src={photoUrl(p)} alt="" className="rounded-md shrink-0" style={{ height: 110, border: '1px solid var(--line)' }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Testo */}
          <div>
            <span className={labelCls} style={labelStyle}>{youtubeAccount && !tiktokAccount ? 'Descrizione' : 'Testo del post'}</span>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>

          {/* YouTube */}
          {youtubeAccount && (
            <div className="p-3 rounded-lg space-y-2" style={{ border: '1px solid var(--line)' }}>
              <div className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>YouTube · {connectionName(youtubeAccount)}</div>
              <div>
                <span className={labelCls} style={labelStyle}>Titolo (max 100 caratteri)</span>
                <input value={yt.title} maxLength={100} onChange={(e) => setYt({ ...yt, title: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <span className={labelCls} style={labelStyle}>Chi può vederlo</span>
                <select value={yt.privacy_status} onChange={(e) => setYt({ ...yt, privacy_status: e.target.value as YouTubeOptions['privacy_status'] })} style={fieldStyle}>
                  <option value="public">Tutti</option>
                  <option value="unlisted">Solo chi ha il link</option>
                  <option value="private">Solo io</option>
                </select>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--ink3)' }}>I video verticali fino a 3 minuti finiscono negli Shorts.</p>
            </div>
          )}

          {/* TikTok */}
          {tiktokAccount && (
            <TikTokOptionsPanel value={tt} onChange={setTt} creator={creator} creatorError={creatorError}
              accountName={connectionName(tiktokAccount)} mode={mode} />
          )}

          {/* Quando */}
          <div>
            <span className={labelCls} style={labelStyle}>Quando</span>
            <div className="flex gap-2">
              {(['now', 'later'] as const).map((w) => (
                <button key={w} onClick={() => setWhen(w)} className="flex-1 py-2 rounded-lg text-[12px] font-bold"
                  style={{ border: `1px solid ${when === w ? 'var(--rosa)' : 'var(--line)'}`, backgroundColor: when === w ? 'var(--rosa-dim)' : 'var(--bg)', color: 'var(--ink)' }}>
                  {w === 'now' ? 'Subito' : 'Programma'}
                </button>
              ))}
            </div>
            {when === 'later' && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-2" style={fieldStyle} />
            )}
          </div>

          {problem && !busy && <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>{problem}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={!!busy} className="flex-1">Annulla</Button>
            <Button onClick={submit} disabled={!!problem || !!busy} className="flex-1 text-white font-bold" style={{ backgroundColor: 'var(--rosa)' }}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{busy}</> : when === 'later' ? 'Programma' : 'Pubblica'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublishSocialDialog;
