import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarClock, Instagram, Check } from 'lucide-react';
import { useSchedulePost, type MetaConnection } from '@/hooks/useSchedulePost';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MetaService } from '@/services/metaService';
import { it } from 'date-fns/locale';

export interface ScheduleStoryItem {
  id: string;
  /** A function returning the dataUrl of the rendered story (called only on confirm) */
  render: () => Promise<string>;
  /** Small preview shown in the dialog (can be the same as render, or a smaller variant) */
  thumbnailDataUrl: string;
  /** Title used in the schedule entry's content */
  title: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  stories: ScheduleStoryItem[];
  onScheduled?: () => void;
}

const ScheduleStoriesDialog: React.FC<Props> = ({ open, onClose, stories, onScheduled }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { connections, loadConnections, loadingConnections } = useSchedulePost();

  // Defensive: stories may briefly be null/undefined during HMR or initial mount.
  const safeStories = Array.isArray(stories) ? stories : [];
  const [selected, setSelected] = useState<Set<string>>(() => new Set(safeStories.map(s => s.id)));
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
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [connectingMeta, setConnectingMeta] = useState(false);

  useEffect(() => {
    if (open) {
      loadConnections();
      setSelected(new Set(safeStories.map(s => s.id)));
    }
  }, [open, loadConnections, stories]);

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
  const selectedCount = selected.size;
  const canSubmit = !!scheduledDate && !isInPast && !!connectionId && !submitting && !noConnections && selectedCount > 0;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(safeStories.map(s => s.id)));
  const deselectAll = () => setSelected(new Set());

  const submit = async () => {
    if (!user || !scheduledDate || !connectionId) return;
    setSubmitting(true);
    const toProcess = safeStories.filter(s => selected.has(s.id));
    let okCount = 0;
    let failCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const s = toProcess[i];
      setSubmitMsg(`Preparo storia ${i + 1}/${toProcess.length}...`);
      try {
        const dataUrl = await s.render();
        // Upload via save-slide-image (already handles dataUrl → public URL)
        const { data: saveData, error: saveErr } = await supabase.functions.invoke('save-slide-image', {
          body: { dataUrl, userId: user.id, slideIndex: i },
        });
        if (saveErr || saveData?.error || !saveData?.url) {
          throw new Error(saveData?.error || saveErr?.message || 'Upload fallito');
        }
        const { data: schedData, error: schedErr } = await supabase.functions.invoke('schedule-post', {
          body: {
            content: s.title,
            image_urls: [saveData.url],
            connection_id: connectionId,
            scheduled_for: scheduledDate.toISOString(),
            media_type: 'story',
          },
        });
        if (schedErr || schedData?.error) {
          throw new Error(schedData?.error || schedErr?.message || 'Schedule fallito');
        }
        okCount++;
      } catch (err) {
        console.error(`Story ${i + 1} failed:`, err);
        failCount++;
      }
    }

    setSubmitting(false);
    setSubmitMsg('');
    if (okCount > 0) {
      toast({
        title: failCount === 0 ? `${okCount} storie programmate!` : `${okCount}/${toProcess.length} programmate`,
        description: failCount > 0
          ? `${failCount} fallite. Controlla la console.`
          : `Saranno pubblicate il ${scheduledDate.toLocaleString('it-IT')}`,
        variant: failCount > 0 ? 'destructive' : 'default',
      });
      onScheduled?.();
      onClose();
    } else {
      toast({
        title: 'Programmazione fallita',
        description: 'Nessuna storia è stata programmata. Controlla la console.',
        variant: 'destructive',
      });
    }
  };
  const publishNow = async () => { if (!user || !connectionId) return; setSubmitting(true); const toProcess = safeStories.filter(s => selected.has(s.id)); let okCount = 0; let failCount = 0; for (let i = 0; i < toProcess.length; i++) { const s = toProcess[i]; setSubmitMsg('Pubblico storia ' + (i + 1) + '/' + toProcess.length + '...'); try { const dataUrl = await s.render(); const up = await supabase.functions.invoke('save-slide-image', { body: { dataUrl, userId: user.id, slideIndex: i } }); if (up.error || up.data?.error || !up.data?.url) throw new Error(up.data?.error || up.error?.message || 'Upload fallito'); const pub = await supabase.functions.invoke('meta-publish', { body: { connection_id: connectionId, platform: 'instagram', content: s.title, image_url: up.data.url, media_type: 'story' } }); if (pub.error || pub.data?.error || !pub.data?.success) throw new Error(pub.data?.error || pub.error?.message || 'Pubblicazione fallita'); okCount++; } catch (err) { console.error('Story publish failed:', err); failCount++; } } setSubmitting(false); setSubmitMsg(''); if (okCount > 0) { toast({ title: failCount === 0 ? okCount + ' storie pubblicate!' : okCount + '/' + toProcess.length + ' pubblicate', description: failCount > 0 ? failCount + ' fallite. Controlla la console.' : 'Pubblicate ora su Instagram', variant: failCount > 0 ? 'destructive' : 'default' }); onScheduled?.(); onClose(); } else { toast({ title: 'Pubblicazione fallita', description: 'Nessuna storia pubblicata.', variant: 'destructive' }); } };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" style={{ color: 'var(--rosa)' }} />
            Programma storie su Instagram
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                Storie da programmare ({selectedCount}/{safeStories.length})
              </label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[11px] font-semibold" style={{ color: 'var(--rosa)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Tutte
                </button>
                <button onClick={deselectAll} className="text-[11px] font-semibold" style={{ color: 'var(--ink3)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Nessuna
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', maxHeight: 220, overflowY: 'auto' }}>
              {safeStories.map((s) => {
                const isSel = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className="relative aspect-[9/16] rounded-md overflow-hidden transition-all"
                    style={{
                      border: isSel ? '2px solid var(--rosa)' : '2px solid var(--line)',
                      cursor: 'pointer',
                      opacity: isSel ? 1 : 0.55,
                      background: 'transparent',
                      padding: 0,
                    }}
                  >
                    <img src={s.thumbnailDataUrl} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isSel && (
                      <div style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 18, height: 18, borderRadius: '50%',
                        backgroundColor: 'var(--rosa)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check style={{ width: 11, height: 11 }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="text-[11px] font-bold uppercase block mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Account Instagram</label>
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
                  Per programmare le storie serve collegare un account Instagram Business o Creator.
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
                {connections!.map((c: MetaConnection) => (
                  <button
                    key={c.id}
                    onClick={() => setConnectionId(c.id)}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left"
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

          {/* Date / Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Giorno</label>
              <div className="rounded-lg" style={{ border: '1px solid var(--line)', backgroundColor: 'var(--bg)' }}>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => { const t = new Date(); t.setHours(0, 0, 0, 0); return d < t; }}
                  locale={it}
                  className="p-2"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase block mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Ora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-[14px] font-semibold"
                style={{
                  backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8,
                  padding: '10px 12px', color: 'var(--ink)', outline: 'none',
                }}
              />
              {scheduledDate && (
                <div
                  className="mt-3 p-2.5 rounded-lg text-[11px]"
                  style={{
                    backgroundColor: isInPast ? 'rgba(239,68,68,0.08)' : 'var(--viola-dim)',
                    color: 'var(--ink)',
                  }}
                >
                  {isInPast ? (
                    <span style={{ color: '#ef4444' }}>⚠ Almeno 1 minuto nel futuro</span>
                  ) : (
                    <>📅 <strong>{scheduledDate.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</strong></>
                  )}
                </div>
              )}
            </div>
          </div>

          {submitMsg && (
            <div className="text-[12px] flex items-center gap-2" style={{ color: 'var(--viola)' }}>
              <Loader2 className="h-3 w-3 animate-spin" /> {submitMsg}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
              Annulla
            </Button>
            <Button
              onClick={submit}
              disabled={!canSubmit}
              className="flex-1 text-white font-bold"
              style={{ backgroundColor: 'var(--rosa)' }}
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Programmo...</> : `Programma ${selectedCount} ${selectedCount === 1 ? 'storia' : 'storie'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleStoriesDialog;
