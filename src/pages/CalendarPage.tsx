import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Instagram,
  Image as ImageIcon,
  Film,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PublishReelDialog from '@/components/reel/PublishReelDialog';
import { eliminaFileReel } from '@/services/reelService';

interface PostRow {
  id: string;
  content: string;
  hashtags: string | null;
  image_urls: string[] | null;
  status: 'scheduled' | 'processing' | 'published' | 'failed';
  scheduled_for: string | null;
  published_at: string | null;
  error_message: string | null;
  attempts: number | null;
  platforms: string[];
  media_type: 'post' | 'story' | 'reel' | null;
  video_path?: string | null;
  cover_path?: string | null;
  created_at: string;
}

const statusBadge = (s: PostRow['status']) => {
  const map = {
    scheduled: { label: 'Programmato', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', Icon: CalendarClock },
    processing: { label: 'In elaborazione su Instagram', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', Icon: Loader2 },
    published: { label: 'Pubblicato', color: '#10b981', bg: 'rgba(16,185,129,0.12)', Icon: CheckCircle2 },
    failed: { label: 'Fallito', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', Icon: XCircle },
  };
  return map[s];
};

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'published' | 'failed'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [reelAperto, setReelAperto] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('published_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: false, nullsFirst: false });
      if (error) throw error;
      setPosts((data as PostRow[]) || []);
    } catch (err) {
      toast({
        title: 'Errore caricamento',
        description: err instanceof Error ? err.message : 'Errore',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Un Reel in elaborazione esce da solo nel giro di pochi minuti: si ricarica.
  const inElaborazione = posts.some((p) => p.status === 'processing');
  useEffect(() => {
    if (!inElaborazione) return;
    const t = window.setInterval(load, 20000);
    return () => window.clearInterval(t);
  }, [inElaborazione, load]);

  const deletePost = async (id: string) => {
    try {
      const post = posts.find((p) => p.id === id);
      const { data, error } = await supabase.from('published_posts').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Il post è già in pubblicazione: non si può più togliere.');
      if (post?.media_type === 'reel') await eliminaFileReel([post.video_path, post.cover_path]);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: post?.status === 'failed' ? 'Tolto dal calendario' : 'Programmazione annullata' });
    } catch (err) {
      toast({
        title: 'Errore eliminazione',
        description: err instanceof Error ? err.message : 'Errore',
        variant: 'destructive',
      });
    } finally {
      setConfirmDelete(null);
    }
  };

  // «Programmati» comprende i Reel che Instagram sta ancora elaborando.
  const inAttesa = (p: PostRow) => p.status === 'scheduled' || p.status === 'processing';
  const visible = posts.filter((p) => filter === 'all' || p.status === filter || (filter === 'scheduled' && inAttesa(p)));

  const counts = {
    all: posts.length,
    scheduled: posts.filter(inAttesa).length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
            Calendario
          </h1>
          <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
            Tutti i tuoi post programmati e pubblicati su Instagram.
          </p>
        </div>
        <Button
          onClick={() => setReelAperto(true)}
          className="text-white font-bold"
          style={{ backgroundColor: 'var(--rosa)' }}
        >
          <Film className="h-4 w-4 mr-2" /> Pubblica un Reel
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'scheduled', 'published', 'failed'] as const).map((k) => {
          const labels = { all: 'Tutti', scheduled: 'Programmati', published: 'Pubblicati', failed: 'Falliti' };
          const isActive = filter === k;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: isActive ? 'var(--rosa)' : 'var(--surface)',
                color: isActive ? '#fff' : 'var(--ink3)',
                border: isActive ? 'none' : '1px solid var(--line)',
                cursor: 'pointer',
              }}
            >
              {labels[k]} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[k]}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card className="panel-card">
          <CardContent style={{ padding: '40px', textAlign: 'center' }}>
            <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: 'var(--viola)' }} />
            <p className="text-[12px] mt-3" style={{ color: 'var(--ink3)' }}>Caricamento...</p>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="panel-card">
          <CardContent style={{ padding: '60px 40px', textAlign: 'center' }}>
            <CalendarClock className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--ink3)', opacity: 0.4 }} />
            <p className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
              {filter === 'all' ? 'Nessun post nel calendario' : 'Nessun post in questa categoria'}
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--ink3)' }}>
              Genera un post e clicca "Programma su Instagram" per iniziare.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((post) => {
            const badge = statusBadge(post.status) || statusBadge('scheduled');
            const Icon = badge.Icon;
            const isReel = post.media_type === 'reel';
            const date = post.scheduled_for ? new Date(post.scheduled_for) : null;
            return (
              <Card key={post.id} className="panel-card">
                <CardContent style={{ padding: '16px 20px' }}>
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {isReel ? (
                        <div
                          className="rounded-lg flex items-center justify-center"
                          style={{ width: 80, height: 80, backgroundColor: 'var(--viola-dim)', border: '1px solid var(--line)' }}
                        >
                          <Film className="h-6 w-6" style={{ color: 'var(--viola)' }} />
                        </div>
                      ) : post.image_urls && post.image_urls.length > 0 ? (
                        <div className="relative" style={{ width: 80, height: 80 }}>
                          <img
                            src={post.image_urls[0]}
                            alt="preview"
                            className="rounded-lg object-cover"
                            style={{ width: 80, height: 80, border: '1px solid var(--line)' }}
                          />
                          {post.image_urls.length > 1 && (
                            <div
                              className="absolute -bottom-1 -right-1 text-[10px] font-bold rounded-full px-1.5 py-0.5"
                              style={{ backgroundColor: 'var(--ink)', color: '#fff' }}
                            >
                              +{post.image_urls.length - 1}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className="rounded-lg flex items-center justify-center"
                          style={{ width: 80, height: 80, backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}
                        >
                          <ImageIcon className="h-6 w-6" style={{ color: 'var(--ink3)', opacity: 0.4 }} />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                          style={{ backgroundColor: badge.bg, color: badge.color, letterSpacing: '0.5px' }}
                        >
                          <Icon className={`h-3 w-3${post.status === 'processing' ? ' animate-spin' : ''}`} /> {badge.label}
                        </span>
                        {post.platforms?.includes('instagram') && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: 'var(--rosa-dim)', color: 'var(--rosa)' }}
                          >
                            <Instagram className="h-3 w-3" /> Instagram
                          </span>
                        )}
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            backgroundColor: post.media_type === 'story' ? 'rgba(236,72,153,0.12)' : 'var(--viola-dim)',
                            color: post.media_type === 'story' ? '#ec4899' : 'var(--viola)',
                          }}
                        >
                          {post.media_type === 'story' ? '📷 Story' : isReel ? '🎬 Reel' : '🖼 Post'}
                        </span>
                        {date && (
                          <span className="text-[11px] font-mono" style={{ color: 'var(--ink3)' }}>
                            {date.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[13px] leading-snug"
                        style={{ color: 'var(--ink)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {post.content}
                      </p>
                      {post.error_message && (
                        <div
                          className="mt-2 text-[11px] p-2 rounded"
                          style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                        >
                          ⚠ {post.error_message}
                          {post.attempts && post.attempts > 1 ? ` (tentativi: ${post.attempts})` : ''}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5">
                      {(post.status === 'scheduled' || post.status === 'failed') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(post.id)}
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {posts.find((p) => p.id === confirmDelete)?.status === 'failed' ? 'Togliere dal calendario?' : 'Annulla programmazione?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {posts.find((p) => p.id === confirmDelete)?.status === 'failed'
                ? 'Il tentativo fallito sparisce dal calendario.'
                : 'Il post non sarà più pubblicato. Questa azione è irreversibile.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Indietro</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deletePost(confirmDelete)}
              style={{ backgroundColor: '#ef4444' }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PublishReelDialog open={reelAperto} onClose={() => setReelAperto(false)} onFatto={load} />
    </div>
  );
};

export default CalendarPage;
