import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, RefreshCw, Loader2, Hash, Clock } from 'lucide-react';
import type { ReelScript } from '@/types/reel';
import { SECTION_COLORS } from '@/types/reel';

interface ReelScriptPreviewProps {
  script: ReelScript | null;
  generating: boolean;
  onRegenerate: () => void;
  onCopyScript: () => void;
  onCopyCaption: () => void;
}

const ReelScriptPreview: React.FC<ReelScriptPreviewProps> = ({
  script,
  generating,
  onRegenerate,
  onCopyScript,
  onCopyCaption,
}) => {
  if (generating) {
    return (
      <Card className="panel-card">
        <CardContent style={{ padding: '24px' }}>
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: 'var(--viola)' }} />
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
              Sto scrivendo il tuo script virale...
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--ink3)' }}>
              Ci vorrà qualche secondo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!script) return null;

  return (
    <div className="space-y-4">
      {/* Header: titolo + durata */}
      <Card className="panel-card">
        <CardContent style={{ padding: '20px 24px' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>{script.titolo_reel}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="h-3 w-3" style={{ color: 'var(--ink3)' }} />
                <span className="text-[11px]" style={{ color: 'var(--ink3)' }}>{script.durata_stimata}</span>
              </div>
            </div>
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg"
              style={{ border: '1px solid var(--line)', color: 'var(--ink3)', background: 'transparent', cursor: 'pointer' }}
            >
              <RefreshCw className="h-3 w-3" /> Rigenera
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Sezioni dello script */}
      {script.sezioni.map((sezione, i) => {
        const color = SECTION_COLORS[sezione.nome] || SECTION_COLORS['CONTENUTO'];
        return (
          <Card key={i} className="panel-card" style={{ borderLeft: `4px solid ${color}` }}>
            <CardContent style={{ padding: '16px 20px' }}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-bold uppercase px-2 py-1 rounded-md"
                  style={{ backgroundColor: color + '18', color, letterSpacing: '0.5px' }}
                >
                  {sezione.nome}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--ink3)' }}>{sezione.timing}</span>
              </div>
              <div className="text-[14px] leading-relaxed mb-2" style={{ color: 'var(--ink)' }}>
                {sezione.testo}
              </div>
              <div className="text-[11px] italic" style={{ color: 'var(--ink3)' }}>
                📹 {sezione.inquadratura}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Script completo */}
      <Card className="panel-card">
        <CardContent style={{ padding: '16px 20px' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              Script completo
            </span>
          </div>
          <div className="p-3 rounded-xl text-[13px] leading-relaxed" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {script.script_completo}
          </div>
        </CardContent>
      </Card>

      {/* Caption */}
      <Card className="panel-card">
        <CardContent style={{ padding: '16px 20px' }}>
          <div className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
            Caption Instagram
          </div>
          <div className="p-3 rounded-xl text-xs leading-relaxed mb-3" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
            {script.caption_instagram.split('\\n\\n').join('\n\n').split('\n\n').map((para, i) => (
              <p key={i} style={{ marginBottom: 10 }}>
                {para.split('\\n').join('\n').split('\n').map((line, j) => (
                  <React.Fragment key={j}>{j > 0 && <br />}{line}</React.Fragment>
                ))}
              </p>
            ))}
          </div>

          {script.hashtag_suggeriti.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2">
                <Hash className="h-3 w-3" style={{ color: 'var(--ink3)' }} />
                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--ink3)' }}>Hashtag</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {script.hashtag_suggeriti.map((h, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)' }}>
                    #{h.replace('#', '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onCopyScript}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-black uppercase rounded-xl"
              style={{ backgroundColor: 'var(--rosa)', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              <Copy className="h-4 w-4" /> Copia Script
            </button>
            <button
              onClick={onCopyCaption}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-black uppercase rounded-xl"
              style={{ backgroundColor: 'var(--viola)', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              <Copy className="h-4 w-4" /> Copia Caption
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReelScriptPreview;
