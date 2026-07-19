import React, { useCallback, useEffect, useState } from 'react';
import { Archive, CheckCircle2, Clock, Copy, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { listArchive, deleteArchived, markPublished, syncPublishedFromScheduler } from '@/services/archiveService';
import type { ArchiveRow } from '@/services/archiveService';
import { useToast } from '@/hooks/use-toast';

const KIND_LABEL: Record<string, string> = {
  post: 'Post',
  carosello: 'Carosello',
  storia: 'Storia',
  reel: 'Reel',
};

const smallBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 11,
  fontWeight: 700,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  backgroundColor: 'transparent',
  color: 'var(--ink3)',
  cursor: 'pointer',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function firstImage(images: any): string | null {
  if (!Array.isArray(images)) return null;
  for (const item of images) {
    if (typeof item === 'string' && item.length > 8) return item;
    if (item && typeof item === 'object' && typeof item.url === 'string') return item.url;
  }
  return null;
}

const ArchivePage: React.FC = () => {
  const { toast } = useToast();
  const [published, setPublished] = useState(false);
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (isPublished: boolean) => {
    setLoading(true);
    const data = await listArchive(isPublished);
    setRows(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    syncPublishedFromScheduler().finally(() => { if (alive) load(published); });
    return () => { alive = false; };
  }, [published, load]);

  const handleSync = async () => {
    setSyncing(true);
    const moved = await syncPublishedFromScheduler();
    await load(published);
    setSyncing(false);
    toast({ title: moved > 0 ? 'Spostati in Pubblicato: ' + moved : 'Archivio gia aggiornato' });
  };

  const handlePublishFlag = async (row: ArchiveRow) => {
    await markPublished({
      id: row.id,
      title: row.title,
      contentText: row.content_text,
      kind: (row.post_type as any) || 'post',
    });
    toast({ title: 'Spostato in Pubblicato' });
    load(published);
  };

  const handleDelete = async (row: ArchiveRow) => {
    const ok = await deleteArchived(row.id);
    if (ok) {
      toast({ title: 'Eliminato' });
      load(published);
    } else {
      toast({ title: 'Eliminazione non riuscita', variant: 'destructive' });
    }
  };

  const handleCopy = async (row: ArchiveRow) => {
    try {
      await navigator.clipboard.writeText(row.content_text || '');
      toast({ title: 'Testo copiato' });
    } catch {
      toast({ title: 'Copia non riuscita', variant: 'destructive' });
    }
  };

  const TABS = [
    { key: false, label: 'Non pubblicato', icon: Clock },
    { key: true, label: 'Pubblicato', icon: CheckCircle2 },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1240 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Archive style={{ width: 22, height: 22, color: 'var(--viola)' }} />
            Archivio
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '6px 0 0', maxWidth: 640 }}>
            Tutto quello che generi finisce qui. Quando un contenuto viene pubblicato, si sposta da solo in Pubblicato con data e ora.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{ ...smallBtn, padding: '9px 14px', fontSize: 12, cursor: syncing ? 'wait' : 'pointer' }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} className={syncing ? 'animate-spin' : ''} />
          Aggiorna
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map((t) => {
          const active = published === t.key;
          const Icon = t.icon;
          return (
            <button
              key={String(t.key)}
              onClick={() => setPublished(t.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 16px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: active ? 800 : 600,
                cursor: 'pointer',
                border: active ? '1px solid var(--viola)' : '1px solid var(--line)',
                backgroundColor: active ? 'var(--viola-dim)' : 'transparent',
                color: active ? 'var(--viola)' : 'var(--ink3)',
                transition: 'all 0.15s',
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: 70, display: 'flex', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" style={{ width: 26, height: 26, color: 'var(--rosa)' }} />
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '64px 20px', textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 14, color: 'var(--ink3)', fontSize: 13 }}>
          {published
            ? 'Non hai ancora pubblicato niente da qui.'
            : 'Non c e ancora niente in attesa. Genera un post, un carosello o una storia e lo ritrovi qui.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))', gap: 16 }}>
          {rows.map((row) => {
            const img = firstImage(row.images);
            return (
              <div
                key={row.id}
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {img && (
                  <img src={img} alt="" style={{ width: '100%', height: 152, objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'var(--viola)',
                        backgroundColor: 'var(--viola-dim)',
                        padding: '3px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {KIND_LABEL[row.post_type || 'post'] || row.post_type}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ink3)' }}>
                      {formatDate(row.is_published ? row.published_at : row.created_at)}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.35 }}>
                    {row.title}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 78, overflow: 'hidden' }}>
                    {(row.content_text || '').slice(0, 180)}
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => handleCopy(row)} style={smallBtn}>
                      <Copy style={{ width: 13, height: 13 }} />
                      Copia
                    </button>
                    {!row.is_published && (
                      <button
                        onClick={() => handlePublishFlag(row)}
                        style={{ ...smallBtn, borderColor: 'var(--rosa)', color: 'var(--rosa)' }}
                      >
                        <CheckCircle2 style={{ width: 13, height: 13 }} />
                        Segna pubblicato
                      </button>
                    )}
                    <button onClick={() => handleDelete(row)} style={{ ...smallBtn, marginLeft: 'auto' }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
