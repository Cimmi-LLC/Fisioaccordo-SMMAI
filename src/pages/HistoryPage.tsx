import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  History as HistoryIcon,
  Search,
  Trash2,
  LayoutGrid,
  BookImage,
  Video,
  Users,
  BarChart3,
  Image,
  Sparkles,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useGenerationHistory } from '@/hooks/useGenerationHistory';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { GENERATION_TYPE_LABELS, type GenerationType, type HistoryEntry } from '@/types/history';

const TYPE_ICONS: Record<GenerationType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  post: LayoutGrid,
  carousel: LayoutGrid,
  story: BookImage,
  reel: Video,
  competitor: Users,
  viral_analysis: BarChart3,
  image_swap: Image,
  expand_topic: Sparkles,
};

const TYPE_COLOR: Record<GenerationType, string> = {
  post: '#3b82f6',
  carousel: '#8b5cf6',
  story: '#ec4899',
  reel: '#ef4444',
  competitor: '#10b981',
  viral_analysis: '#f59e0b',
  image_swap: '#6b7280',
  expand_topic: '#06b6d4',
};

const HistoryPage: React.FC = () => {
  const { entries, rawEntries, loading, filters, setFilters, remove } = useGenerationHistory();
  const { brands } = useActiveBrand();
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = React.useState<HistoryEntry | null>(null);

  const stats = {
    total: rawEntries.length,
    success: rawEntries.filter((e) => e.status === 'success').length,
    failed: rawEntries.filter((e) => e.status === 'failed').length,
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-black mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
          Storico generazioni
        </h1>
        <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
          Tutto quello che hai generato con l'AI: post, caroselli, reel, storie, analisi.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Totali', value: stats.total, color: 'var(--viola)' },
          { label: 'Riuscite', value: stats.success, color: '#10b981' },
          { label: 'Fallite', value: stats.failed, color: '#ef4444' },
        ].map((s) => (
          <Card key={s.label} className="panel-card">
            <CardContent style={{ padding: '14px 18px' }}>
              <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                {s.label}
              </div>
              <div className="text-[24px] font-black mt-1" style={{ color: s.color }}>
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="panel-card mb-4">
        <CardContent style={{ padding: '14px 16px' }}>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search
                className="h-3.5 w-3.5 absolute"
                style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink3)' }}
              />
              <Input
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Cerca per titolo o topic..."
                style={{ paddingLeft: 32 }}
              />
            </div>
            <Select
              value={filters.type || 'all'}
              onValueChange={(v) => setFilters({ ...filters, type: v as GenerationType | 'all' })}
            >
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                {(Object.keys(GENERATION_TYPE_LABELS) as GenerationType[]).map((t) => (
                  <SelectItem key={t} value={t}>{GENERATION_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {brands.length > 1 && (
              <Select
                value={filters.brandId || 'all'}
                onValueChange={(v) => setFilters({ ...filters, brandId: v })}
              >
                <SelectTrigger className="md:w-48">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i brand</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id || ''}>{b.nome_business || 'Senza nome'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      {loading ? (
        <Card className="panel-card">
          <CardContent style={{ padding: '40px', textAlign: 'center' }}>
            <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>Caricamento...</p>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card className="panel-card">
          <CardContent style={{ padding: '60px 40px', textAlign: 'center' }}>
            <HistoryIcon className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--ink3)', opacity: 0.4 }} />
            <p className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
              {rawEntries.length === 0 ? 'Nessuna generazione ancora' : 'Nessun risultato per i filtri'}
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--ink3)' }}>
              {rawEntries.length === 0
                ? 'Genera il tuo primo contenuto e lo vedrai apparire qui.'
                : 'Modifica i filtri per vedere altre voci.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const Icon = TYPE_ICONS[e.generation_type] || HistoryIcon;
            const color = TYPE_COLOR[e.generation_type] || 'var(--ink3)';
            const brand = brands.find((b) => b.id === e.brand_id);
            const date = new Date(e.created_at);
            const isFailed = e.status === 'failed';
            const hasPreview = e.preview && Object.keys(e.preview).length > 0;
            return (
              <Card
                key={e.id}
                className="panel-card"
                onClick={() => hasPreview && setPreviewEntry(e)}
                style={{ cursor: hasPreview ? 'pointer' : 'default' }}
              >
                <CardContent style={{ padding: '14px 18px' }}>
                  <div className="flex items-start gap-3">
                    <div
                      style={{
                        width: 38, height: 38, borderRadius: 10,
                        backgroundColor: color + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-[10px] font-bold uppercase"
                          style={{ color, letterSpacing: '0.5px' }}
                        >
                          {GENERATION_TYPE_LABELS[e.generation_type]}
                        </span>
                        {brand && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--rosa-dim)', color: 'var(--rosa)' }}
                          >
                            <Briefcase className="h-2.5 w-2.5" />
                            {brand.nome_business}
                          </span>
                        )}
                        {e.status === 'success' ? (
                          <CheckCircle2 className="h-3 w-3" style={{ color: '#10b981' }} />
                        ) : isFailed ? (
                          <XCircle className="h-3 w-3" style={{ color: '#ef4444' }} />
                        ) : (
                          <AlertCircle className="h-3 w-3" style={{ color: '#f59e0b' }} />
                        )}
                        <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--ink3)' }}>
                          {date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="text-[14px] font-semibold leading-snug" style={{ color: 'var(--ink)' }}>
                        {e.title || e.topic || '(senza titolo)'}
                      </div>
                      {e.topic && e.title && e.topic !== e.title && (
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink3)' }}>
                          Topic: {e.topic}
                        </div>
                      )}
                      {isFailed && e.error_message && (
                        <div className="text-[11px] mt-1.5 p-1.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                          ⚠ {e.error_message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasPreview && (
                        <Eye
                          className="h-4 w-4"
                          style={{ color: 'var(--ink3)' }}
                          aria-label="Vedi anteprima"
                        />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(ev) => { ev.stopPropagation(); setConfirmDelete(e.id); }}
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      <Dialog open={!!previewEntry} onOpenChange={(v) => !v && setPreviewEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {previewEntry && (() => {
            const p = (previewEntry.preview || {}) as Record<string, any>;
            const m = (previewEntry.metadata || {}) as Record<string, any>;
            const type = previewEntry.generation_type;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: (TYPE_COLOR[type] || '#888') + '22', color: TYPE_COLOR[type] }}>
                      {GENERATION_TYPE_LABELS[type]}
                    </Badge>
                    <span>{previewEntry.title || previewEntry.topic || 'Anteprima'}</span>
                  </DialogTitle>
                  <DialogDescription>
                    Generato il {new Date(previewEntry.created_at).toLocaleString('it-IT')}
                    {m.postType && ` · ${m.postType}`}
                    {m.numSlides && ` · ${m.numSlides} slide`}
                    {p.slides_count && ` · ${p.slides_count} slide`}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {/* Carosello / post: cover + caption */}
                  {(type === 'carousel' || type === 'post') && (
                    <>
                      {p.first_title && (
                        <div>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                            Cover (slide 1)
                          </div>
                          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--viola-dim)', border: '1px solid rgba(85,70,151,0.18)' }}>
                            <div className="text-base font-bold mb-1" style={{ color: 'var(--ink)' }}>{p.first_title}</div>
                            {p.first_text && <div className="text-sm" style={{ color: 'var(--ink2)' }}>{p.first_text}</div>}
                          </div>
                        </div>
                      )}
                      {p.caption_preview && (
                        <div>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                            Caption
                          </div>
                          <div className="rounded-xl p-4 text-sm whitespace-pre-wrap" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink2)' }}>
                            {p.caption_preview}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Reel */}
                  {type === 'reel' && (
                    <>
                      {p.script_preview && (
                        <div>
                          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                            Script
                          </div>
                          <div className="rounded-xl p-4 text-sm whitespace-pre-wrap" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink2)' }}>
                            {p.script_preview}
                          </div>
                        </div>
                      )}
                      {p.durata_stimata && (
                        <div className="text-xs" style={{ color: 'var(--ink3)' }}>
                          Durata stimata: <strong>{p.durata_stimata}</strong>
                        </div>
                      )}
                    </>
                  )}

                  {/* Hashtag (carousel, post, reel) */}
                  {Array.isArray(p.hashtags) && p.hashtags.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase mb-1.5" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                        Hashtag
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.hashtags.map((h: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">#{String(h).replace(/^#/, '')}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error message for failed generations */}
                  {previewEntry.status === 'failed' && previewEntry.error_message && (
                    <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                      ⚠ {previewEntry.error_message}
                    </div>
                  )}

                  {!p.first_title && !p.caption_preview && !p.script_preview && (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--ink3)' }}>
                      Nessuna anteprima salvata per questo tipo di generazione.
                    </p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa voce?</AlertDialogTitle>
            <AlertDialogDescription>
              Verrà rimossa solo dallo storico. I contenuti già pubblicati o programmati restano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && remove(confirmDelete).then(() => setConfirmDelete(null))}
              style={{ backgroundColor: '#ef4444' }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HistoryPage;
