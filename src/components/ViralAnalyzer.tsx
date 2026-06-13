import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Loader2, Video, X, Upload, Zap, Image as ImageIcon, Volume2, Lightbulb, ArrowLeft } from 'lucide-react';
import { useViralAnalysis } from '@/hooks/useViralAnalysis';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const MAX_VIDEO_MB = 20;

const ViralAnalyzer: React.FC = () => {
  const { analyses, analyzing, analyzePost } = useViralAnalysis();
  const { toast } = useToast();
  const { user } = useAuth();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      toast({ title: 'Formato non valido', description: 'Carica un video (MP4, MOV, WebM)', variant: 'destructive' });
      return;
    }
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast({
        title: 'Video troppo grande',
        description: `Max ${MAX_VIDEO_MB} MB. Comprimi il video o usa un reel più corto.`,
        variant: 'destructive',
      });
      return;
    }
    setVideoFile(f);
    setResult(null);
  }, [toast]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;
    if (!user) {
      toast({ title: 'Sessione scaduta', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = videoFile.name.split('.').pop() || 'mp4';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('viral-uploads')
        .upload(path, videoFile, { contentType: videoFile.type || 'video/mp4', upsert: false });
      if (upErr) {
        toast({ title: 'Errore upload', description: upErr.message, variant: 'destructive' });
        setUploading(false);
        return;
      }
      const res = await analyzePost({
        video_path: path,
        video_mime_type: videoFile.type || 'video/mp4',
        platform: 'instagram',
        postType: 'reel',
      });
      if (res) setResult(res);
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetAll = () => {
    setVideoFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const busy = analyzing || uploading;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Eye className="h-6 w-6" /> Analisi Post Virali
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload area — drag&drop + click */}
        {!videoFile ? (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            className="relative rounded-2xl text-center transition-all"
            style={{
              border: `2px dashed ${isDragging ? 'var(--rosa)' : 'var(--viola)'}`,
              backgroundColor: isDragging ? 'rgba(230,0,126,0.05)' : 'var(--viola-dim)',
              padding: '48px 24px',
              cursor: 'pointer',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={e => acceptFile(e.target.files?.[0])}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div
                className="rounded-full p-4"
                style={{ backgroundColor: 'white' }}
              >
                <Upload className="h-8 w-8" style={{ color: 'var(--viola)' }} />
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                  Trascina qui il video del reel
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--ink3)' }}>
                  oppure click per selezionare il file
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs mt-2" style={{ color: 'var(--ink3)' }}>
                <Badge variant="outline" className="text-xs">MP4</Badge>
                <Badge variant="outline" className="text-xs">MOV</Badge>
                <Badge variant="outline" className="text-xs">WebM</Badge>
                <span>· max {MAX_VIDEO_MB} MB</span>
              </div>
              <p className="text-xs mt-3 max-w-md leading-relaxed" style={{ color: 'var(--ink3)' }}>
                Scarica il reel (es. da{' '}
                <a
                  href="https://snapinsta.to/it"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ color: 'var(--rosa)' }}
                >
                  snapinsta.app
                </a>
                ) e caricalo qui. L'intelligenza artificiale analizzerà inquadrature, transizioni, audio e testo.
                Il file viene cancellato dopo l'analisi.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--viola-dim)', border: '2px solid var(--viola)' }}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-3" style={{ backgroundColor: 'white' }}>
                <Video className="h-6 w-6" style={{ color: 'var(--viola)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{videoFile.name}</div>
                <div className="text-sm" style={{ color: 'var(--ink3)' }}>
                  {(videoFile.size / 1024 / 1024).toFixed(1)} MB · {videoFile.type.replace('video/', '').toUpperCase()}
                </div>
              </div>
              <button
                onClick={removeVideo}
                disabled={busy}
                className="rounded-full p-2 hover:bg-white/50 transition-colors disabled:opacity-30"
                aria-label="Rimuovi video"
              >
                <X className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
              </button>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={busy}
              className="w-full mt-5 h-12 text-base"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {uploading ? 'Carico video…' : 'Analizzo… (30-90s)'}
                </>
              ) : (
                'Analizza video'
              )}
            </Button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-5">
            <Button
              variant="outline"
              onClick={resetAll}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Nuova analisi
            </Button>
            {/* Header score */}
            <div className="flex items-center justify-between p-5 rounded-xl" style={{ backgroundColor: 'var(--viola-dim)' }}>
              <div className="space-y-1">
                <div className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Score Viralità</div>
                <div className="text-sm" style={{ color: 'var(--ink3)' }}>Valutazione complessiva del reel</div>
              </div>
              <div className="text-center">
                <div
                  className="text-5xl font-black leading-none"
                  style={{ color: result.score >= 75 ? 'var(--rosa)' : result.score >= 50 ? 'var(--viola)' : 'var(--ink3)' }}
                >
                  {result.score}
                </div>
                <div className="text-xs font-semibold mt-1" style={{ color: 'var(--ink3)' }}>/100</div>
              </div>
            </div>

            {/* Analisi generale */}
            {result.analysis && (
              <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-5 w-5" style={{ color: 'var(--viola)' }} />
                  <span className="text-base font-bold" style={{ color: 'var(--ink)' }}>Perché funziona</span>
                </div>
                <p className="text-base leading-relaxed" style={{ color: 'var(--ink2)' }}>
                  {result.analysis}
                </p>
              </div>
            )}

            {/* Pattern + Visual + Audio side-by-side */}
            <div className="grid lg:grid-cols-2 gap-4">
              {result.patterns && (
                <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(229,38,127,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5" style={{ color: 'var(--rosa)' }} />
                    <span className="text-base font-bold" style={{ color: 'var(--rosa)' }}>Pattern trovati</span>
                  </div>
                  <div className="space-y-2 text-sm" style={{ color: 'var(--ink2)' }}>
                    {result.patterns.hook_type && (
                      <div><strong style={{ color: 'var(--ink)' }}>Hook:</strong> {result.patterns.hook_type}</div>
                    )}
                    {result.patterns.cta_style && (
                      <div><strong style={{ color: 'var(--ink)' }}>CTA:</strong> {result.patterns.cta_style}</div>
                    )}
                    {result.patterns.hashtag_strategy && (
                      <div><strong style={{ color: 'var(--ink)' }}>Hashtag:</strong> {result.patterns.hashtag_strategy}</div>
                    )}
                    {result.patterns.emotional_triggers?.length > 0 && (
                      <div className="pt-2" style={{ borderTop: '1px solid rgba(229,38,127,0.15)' }}>
                        <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--ink3)' }}>Trigger emotivi</div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.patterns.emotional_triggers.map((t: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.patterns?.structure?.length > 0 && (
                <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(85,70,151,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5" style={{ color: 'var(--viola)' }} />
                    <span className="text-base font-bold" style={{ color: 'var(--viola)' }}>Struttura narrativa</span>
                  </div>
                  <ol className="text-sm space-y-2" style={{ color: 'var(--ink2)' }}>
                    {result.patterns.structure.map((s: string, i: number) => (
                      <li key={i} className="flex gap-3">
                        <span
                          className="flex-shrink-0 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: 'var(--viola)', color: 'white' }}
                        >
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {result.visual_analysis && (
                <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(56,189,248,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="h-5 w-5" style={{ color: '#38bdf8' }} />
                    <span className="text-base font-bold" style={{ color: '#38bdf8' }}>Analisi visiva</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink2)' }}>
                    {result.visual_analysis}
                  </p>
                </div>
              )}

              {result.audio_analysis && (
                <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Volume2 className="h-5 w-5" style={{ color: '#f59e0b' }} />
                    <span className="text-base font-bold" style={{ color: '#f59e0b' }}>Analisi audio</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink2)' }}>
                    {result.audio_analysis}
                  </p>
                </div>
              )}
            </div>

            {/* Takeaway */}
            {result.takeaways?.length > 0 && (
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5" style={{ color: '#22c55e' }} />
                  <span className="text-base font-bold" style={{ color: '#22c55e' }}>Takeaway per i tuoi reel</span>
                </div>
                <ul className="space-y-2.5">
                  {result.takeaways.map((t: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm" style={{ color: 'var(--ink2)' }}>
                      <span
                        className="flex-shrink-0 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ backgroundColor: '#22c55e', color: 'white' }}
                      >
                        {i + 1}
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {analyses.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink3)' }}>
              Storico analisi ({analyses.length})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {analyses.slice(0, 10).map(a => {
                const eng = (a as any).engagement_data || {};
                const score = eng.score;
                return (
                  <button
                    key={a.id}
                    onClick={() => setResult({
                      score: eng.score,
                      analysis: eng.analysis || a.analysis_text,
                      patterns: a.patterns,
                      visual_analysis: eng.visual_analysis,
                      audio_analysis: eng.audio_analysis,
                      takeaways: eng.takeaways || [],
                    })}
                    className="flex items-center gap-3 text-sm p-3 rounded-lg w-full text-left transition-colors"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', cursor: 'pointer' }}
                  >
                    <Badge variant="outline" className="text-xs">{a.platform}</Badge>
                    <span className="truncate flex-1 font-medium" style={{ color: 'var(--ink)' }}>
                      {a.post_url || a.analysis_text?.substring(0, 60) || 'Analisi video'}
                    </span>
                    {typeof score === 'number' && (
                      <span
                        className="font-bold text-xs"
                        style={{ color: score >= 75 ? 'var(--rosa)' : score >= 50 ? 'var(--viola)' : 'var(--ink3)' }}
                      >
                        {score}/100
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--ink3)' }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ViralAnalyzer;
