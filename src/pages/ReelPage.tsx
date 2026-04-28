import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import ReelScriptPreview from '@/components/reel/ReelScriptPreview';
import { useReelScript } from '@/hooks/useReelScript';

const ReelPage = () => {
  const [topic, setTopic] = useState('');
  const { script, generating, generateScript, copyScript, copyCaption } = useReelScript();

  const handleGenerate = () => {
    if (topic.trim()) generateScript(topic.trim());
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-black mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
        Script Reel
      </h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card className="panel-card">
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
            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="w-full mt-4 text-white text-[13px] font-black uppercase py-4 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--rosa)', borderRadius: '12px', border: 'none', cursor: generating || !topic.trim() ? 'not-allowed' : 'pointer', letterSpacing: '0.6px' }}
            >
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generazione in corso...</> : <><Sparkles className="h-4 w-4" /> Genera Script Reel</>}
            </button>
            <p className="text-[11px] mt-2" style={{ color: 'var(--ink3)' }}>
              Lo script viene personalizzato con i dati del tuo Brand Kit.
            </p>
          </CardContent>
        </Card>

        {/* Preview */}
        <div>
          {script || generating ? (
            <ReelScriptPreview
              script={script}
              generating={generating}
              onRegenerate={handleGenerate}
              onCopyScript={copyScript}
              onCopyCaption={copyCaption}
            />
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
