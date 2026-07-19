import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarClock, Instagram } from 'lucide-react';
import { useSchedulePost } from '@/hooks/useSchedulePost';
import { MetaService } from '@/services/metaService';
import { it } from 'date-fns/locale';
import { markPublished } from "@/services/archiveService";

interface SchedulePostDialogProps {
  open: boolean;
  onClose: () => void;
  /** Caption already composed (caption + maybe hashtag separator). */
  content: string;
  /** Hashtags as a single line (es. "#fisio #salute"). Optional. */
  hashtags?: string;
  /**
   * Async preparer that resolves to public image URLs ready for Instagram.
   * Called only when the user confirms — for carousels this typically
   * exports slides via html-to-image and uploads them via save-slide-image.
   */
  prepareImages: () => Promise<string[]>;
  onScheduled?: () => void;
}

const SchedulePostDialog: React.FC<SchedulePostDialogProps> = ({
  open,
  onClose,
  content,
  hashtags,
  prepareImages,
  onScheduled,
}) => {
  const { schedulePost, scheduling, connections, loadConnections, loadingConnections } =
    useSchedulePost();

  const [date, setDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    d.setSeconds(0, 0);
    return d;
  });
  const [time, setTime] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [connectionId, setConnectionId] = useState<string>('');
  const [preparing, setPreparing] = useState(false);
  const [connectingMeta, setConnectingMeta] = useState(false);

  useEffect(() => {
    if (open) loadConnections();
  }, [open, loadConnections]);

  useEffect(() => {
    if (connections && connections.length > 0 && !connectionId) {
      setConnectionId(connections[0].id);
    }
  }, [connections, connectionId]);

  // Listen for the OAuth popup → reload connections when user finishes
  useEffect(() => {
    if (!open) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'meta-auth-success' || event.data?.type === 'meta-auth-error') {
        setConnectingMeta(false);
        loadConnections();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, loadConnections]);

  const handleConnectInstagram = () => {
    setConnectingMeta(true);
    try {
      MetaService.initiateAuth();
    } catch (err) {
      console.error('Meta auth error:', err);
      setConnectingMeta(false);
    }
  };

  const scheduledDate = useMemo<Date | null>(() => {
    if (!date) return null;
    const [hh, mm] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d;
  }, [date, time]);

  const isInPast = scheduledDate ? scheduledDate.getTime() <= Date.now() + 60 * 1000 : true;
  const noConnections = connections !== null && connections.length === 0;
  const canSubmit =
    !!scheduledDate && !isInPast && !!connectionId && !scheduling && !preparing && !noConnections;

  const handleSubmit = async () => {
    if (!scheduledDate || !connectionId) return;
    setPreparing(true);
    try {
      const imageUrls = await prepareImages();
      if (!imageUrls || imageUrls.length === 0) {
        throw new Error('Nessuna immagine disponibile per il post');
      }
      const ok = await schedulePost({
        content,
        hashtags,
        imageUrls,
        connectionId,
        scheduledFor: scheduledDate,
      });
      if (ok) {
        onScheduled?.();
        onClose();
      }
    } catch (err) {
      console.error('Schedule prepare error:', err);
    } finally {
      setPreparing(false);
    }
  };
    const handlePublishNow = async () => { if (!connectionId) return; setPreparing(true); try { const imageUrls = await prepareImages(); if (!imageUrls || imageUrls.length === 0) { throw new Error('Nessuna immagine disponibile per il post'); } const caption = hashtags ? content + String.fromCharCode(10, 10) + hashtags : content; const res = await MetaService.publishToInstagram(connectionId, caption, imageUrls[0], imageUrls.length > 1 ? imageUrls : undefined); if (res.success) { await markPublished({ title: (content || '').slice(0, 90), contentText: content, kind: imageUrls.length > 1 ? 'carosello' : 'post', images: imageUrls }); onScheduled?.(); onClose(); } else { alert('Errore pubblicazione: ' + (res.error || 'sconosciuto')); } } catch (err) { alert('Errore: ' + (err instanceof Error ? err.message : String(err))); } finally { setPreparing(false); } };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" style={{ color: 'var(--rosa)' }} />
            Programma post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account selector */}
          <div>
            <label className="text-[11px] font-bold uppercase block mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              Account Instagram
            </label>
            {loadingConnections || connections === null ? (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ink3)' }}>
                <Loader2 className="h-3 w-3 animate-spin" /> Caricamento...
              </div>
            ) : noConnections ? (
              <div
                className="p-4 rounded-lg space-y-3"
                style={{ backgroundColor: 'var(--rosa-dim)', border: '1px solid rgba(230,0,126,0.2)' }}
              >
                <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
                  Nessun account Instagram collegato
                </div>
                <div className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                  Per programmare il post serve collegare un account Instagram Business o Creator.
                </div>
                <Button
                  onClick={handleConnectInstagram}
                  disabled={connectingMeta}
                  className="w-full text-white font-bold"
                  style={{ backgroundColor: 'var(--rosa)' }}
                >
                  {connectingMeta ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Apertura finestra...</>
                  ) : (
                    <><Instagram className="h-4 w-4 mr-2" /> Collega Instagram</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {connections!.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setConnectionId(c.id)}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all"
                    style={{
                      backgroundColor: connectionId === c.id ? 'var(--rosa-dim)' : 'var(--bg)',
                      border: connectionId === c.id ? '1px solid var(--rosa)' : '1px solid var(--line)',
                      cursor: 'pointer',
                    }}
                  >
                    <Instagram className="h-4 w-4" style={{ color: connectionId === c.id ? 'var(--rosa)' : 'var(--ink3)' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                      @{c.instagram_username || c.page_name || 'account'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Calendar */}
          <div>
            <label className="text-[11px] font-bold uppercase block mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              Giorno
            </label>
            <div className="rounded-lg" style={{ border: '1px solid var(--line)', backgroundColor: 'var(--bg)' }}>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return d < today;
                }}
                locale={it}
                className="p-2"
              />
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-[11px] font-bold uppercase block mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              Ora
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full text-[14px] font-semibold"
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '10px 12px',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>

          {/* Summary */}
          {scheduledDate && (
            <div
              className="p-3 rounded-lg text-[12px]"
              style={{
                backgroundColor: isInPast ? 'rgba(239,68,68,0.08)' : 'var(--viola-dim)',
                border: isInPast ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(85,70,151,0.2)',
                color: 'var(--ink)',
              }}
            >
              {isInPast ? (
                <span style={{ color: '#ef4444' }}>
                  ⚠ Devi scegliere un orario almeno 1 minuto nel futuro.
                </span>
              ) : (
                <>
                  📅 Pubblicazione:{' '}
                  <strong>{scheduledDate.toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' })}</strong>
                </>
              )}
            </div>
          )}
              <Button onClick={handlePublishNow} disabled={!connectionId || preparing || scheduling} className="w-full text-white font-bold mb-2" style={{ backgroundColor: 'var(--rosa)' }}>{preparing ? 'Pubblico ora...' : 'Pubblica ora'}          </Button>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={scheduling || preparing} className="flex-1">
              Annulla
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 text-white font-bold"
              style={{ backgroundColor: 'var(--rosa)' }}
            >
              {preparing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Preparo i media...
                </>
              ) : scheduling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Programmo...
                </>
              ) : (
                'Programma'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SchedulePostDialog;
