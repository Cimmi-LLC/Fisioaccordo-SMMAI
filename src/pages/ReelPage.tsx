import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import ReelScriptPreview from '@/components/reel/ReelScriptPreview';
import { useReelScript } from '@/hooks/useReelScript';

const QTY_OPTIONS = [1, 2, 5, 10] as const;

const ReelPage = () => {
  const [topic, setTopic] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const { scripts, generating, progress, generateScripts, copyScript, copyCaption } = useReelScript();

  const handleGenerate = () => {
    if (topic.trim()) generateScripts(topic.trim(), qty);
  };

  // Reset active script to first when new scripts arrive
  useEffect(() => { setActiveIndex(0); }, [scripts.length]);

  const goPrev = () => setActiveIndex(i => Math.max(0, i - 1));
  const goNext = () => setActiveIndex(i => Math.min(scripts.length - 1, i + 1));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-black mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
        Script Reel
      </h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card className="panel-card" data-tour="reel-input">
          <CardContent style={{ padding: '24px' }}>
            <label className="block text-[13px] font-bold mb-2" style={{ color: 'var(--ink)' }}>
              Di cosa vuoi parlare nel reel?
            </label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && topic.trim()) { e.preventDefault(); handleGenerate(); } }}
              placeholder="es. 3 esercizi per il mal di schiena, come prevenire la cervicale..."
              rows={3}
              style={{
                width: '100%', backgroundColor: 'var(--bg)', border: '1px solid var(--line)',
                borderRadius: '12px', color: 'var(--ink)', fontSize: '14px', fontWeight: 500,
                padding: '14px 16px', outline: 'none', fontFamily: 'Montserrat, sans-serif',
                resize: 'vertical',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--rosa)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}
            />

            {/* Quantity selector */}
            <div className="mt-4" data-tour="reel-quantity">
              <label className="block text-[12px] font-bold mb-2" style={{ color: 'var(--ink)' }}>
                Quanti script generare?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {QTY_OPTIONS.map(n => {
                  const isActive = qty === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQty(n)}
                      disabled={generating}
                      className="text-[14px] font-black py-2.5 rounded-lg transition-all disabled:opacity-50"
                      style={{
                        backgroundColor: isActive ? 'var(--rosa)' : 'var(--bg)',
                        color: isActive ? '#fff' : 'var(--ink3)',
                        border: isActive ? 'none' : '1px solid var(--line)',
                        cursor: generating ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {qty > 1 && (
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink3)' }}>
                  L'AI crea {qty} script con angoli/hook diversi sullo stesso topic. Tempo: ~10s ciascuno (in parallelo).
                </p>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="w-full mt-4 text-white text-[13px] font-black uppercase py-4 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--rosa)', borderRadius: '12px', border: 'none', cursor: generating || !topic.trim() ? 'not-allowed' : 'pointer', letterSpacing: '0.6px' }}
            >
              {generating
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {progress.total > 1 ? `${progress.done}/${progress.total} script…` : 'Generazione in corso...'}</>
                : <>{qty > 1 ? `Genera ${qty} Script Reel` : 'Genera Script Reel'}</>}
            </button>
            <p className="text-[11px] mt-2" style={{ color: 'var(--ink3)' }}>
              Lo script viene personalizzato con i dati del tuo Brand Kit.
            </p>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="space-y-4">
          {generating ? (
            <Card className="panel-card">
              <CardContent style={{ padding: '24px' }}>
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: 'var(--viola)' }} />
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                    Sto scrivendo {progress.total > 1 ? `${progress.total} script virali...` : 'il tuo script virale...'}
                  </p>
                  {progress.total > 1 && (
                    <p className="text-[11px] mt-2" style={{ color: 'var(--ink3)' }}>
                      {progress.done}/{progress.total} completati
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : scripts.length > 0 ? (
            <>
              {scripts.length > 1 && (
                <div className="flex items-center justify-between gap-2 px-1">
                  {/* Prev arrow */}
                  <button
                    onClick={goPrev}
                    disabled={activeIndex === 0}
                    className="flex items-center justify-center rounded-lg transition-all disabled:opacity-30"
                    style={{
                      width: 30, height: 30,
                      backgroundColor: 'var(--bg)', border: '1px solid var(--line)',
                      cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
                      color: 'var(--ink)',
                    }}
                    aria-label="Script precedente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Number chips */}
                  <div className="flex flex-wrap gap-1.5 justify-center flex-1">
                    {scripts.map((_, i) => {
                      const isActive = i === activeIndex;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveIndex(i)}
                          className="text-[12px] font-bold rounded-md transition-all"
                          style={{
                            width: 30, height: 30,
                            backgroundColor: isActive ? 'var(--rosa)' : 'var(--bg)',
                            color: isActive ? '#fff' : 'var(--ink3)',
                            border: isActive ? 'none' : '1px solid var(--line)',
                            cursor: 'pointer',
                          }}
                          aria-label={`Script ${i + 1}`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next arrow */}
                  <button
                    onClick={goNext}
                    disabled={activeIndex === scripts.length - 1}
                    className="flex items-center justify-center rounded-lg transition-all disabled:opacity-30"
                    style={{
                      width: 30, height: 30,
                      backgroundColor: 'var(--bg)', border: '1px solid var(--line)',
                      cursor: activeIndex === scripts.length - 1 ? 'not-allowed' : 'pointer',
                      color: 'var(--ink)',
                    }}
                    aria-label="Script successivo"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {scripts.length > 1 && (
                <div className="text-[11px] font-semibold px-1" style={{ color: 'var(--ink3)' }}>
                  Script {activeIndex + 1} di {scripts.length}
                </div>
              )}

              <ReelScriptPreview
                key={activeIndex}
                script={scripts[activeIndex]}
                generating={false}
                onRegenerate={handleGenerate}
                onCopyScript={() => copyScript(activeIndex)}
                onCopyCaption={() => copyCaption(activeIndex)}
              />
            </>
          ) : (
            <Card className="panel-card">
              <CardContent style={{ padding: '24px' }}>
                <div className="py-12 text-center">
                  <div className="text-4xl mb-4 opacity-30">🎬</div>
                  <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
                    Scrivi un argomento e clicca "Genera Script Reel"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReelPage;
