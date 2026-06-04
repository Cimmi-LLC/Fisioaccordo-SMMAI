
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface FormData {
  description: string;
  audience: string;
  length: string;
  tone: string;
  platform: string;
  postType: string;
  numSlides: string;
  numImages: string;
  numVariations: string;
  visualTemplate: string;
  canvaTemplate?: any;
  selectedPlatforms?: string[];
  scheduleDate?: string;
}

interface ContentFormProps {
  formData: FormData;
  onInputChange: (field: string, value: string | string[]) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  basePhoto: string | null;
  onPhotoUpload: (photo: string) => void;
  onPhotoRemove: () => void;
  onPublish?: (platforms: string[]) => void;
}

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="label-field mb-1.5">{children}</div>
);

const ContentForm: React.FC<ContentFormProps> = ({
  formData,
  onInputChange,
  isGenerating,
  onGenerate,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && formData.description.trim()) {
      e.preventDefault();
      onGenerate();
    }
  };

  return (
    <Card className="panel-card">
      <CardContent style={{ padding: '24px' }}>
        <div className="space-y-4">
          {/* Main input */}
          <div data-tour="post-input">
            <label className="block text-[13px] font-bold mb-2" style={{ color: 'var(--ink)' }}>
              Di cosa vuoi parlare?
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onInputChange('description', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="es. mal di schiena da scrivania, esercizi per la cervicale, come prevenire gli infortuni sportivi..."
              rows={3}
              style={{
                width: '100%', backgroundColor: 'var(--bg)', border: '1px solid var(--line)',
                borderRadius: '12px', color: 'var(--ink)', fontSize: '14px', fontWeight: 500,
                padding: '14px 16px', outline: 'none', fontFamily: 'Montserrat, sans-serif',
                resize: 'vertical', transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--rosa)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
            />
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink3)' }}>
              Tono, target e servizi vengono presi automaticamente dal tuo Brand Kit.
            </p>
          </div>

          {/* Variations selector */}
          <div data-tour="post-quantity">
            <label className="block text-[12px] font-bold mb-2" style={{ color: 'var(--ink)' }}>
              Quanti post diversi generare?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['1', '2', '3', '4'] as const).map((n) => {
                const isActive = (formData.numVariations || '1') === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onInputChange('numVariations', n)}
                    className="text-[14px] font-black py-2.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: isActive ? 'var(--rosa)' : 'var(--bg)',
                      color: isActive ? '#fff' : 'var(--ink3)',
                      border: isActive ? 'none' : '1px solid var(--line)',
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink3)' }}>
              Da 2+ l'AI trova angoli completamente diversi sullo stesso topic (es. esercizi, segnali, miti, errori). Tempi: ~10s a post.
            </p>
          </div>

          {/* Generate button */}
          <button
            data-tour="post-generate"
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !formData.description.trim()}
            className="w-full text-white text-[13px] font-black uppercase py-4 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--rosa)', borderRadius: '12px', letterSpacing: '0.6px',
              border: 'none', cursor: isGenerating || !formData.description.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generazione in corso...</>
            ) : (
              <>Genera {parseInt(formData.numVariations || '1') > 1 ? `${formData.numVariations} Post Diversi` : 'Contenuto'}</>
            )}
          </button>

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold py-1"
            style={{ color: 'var(--ink3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Personalizza (n. slide, tipo post)
          </button>

          {/* Advanced options — only slides and post type */}
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}>
              <div>
                <FieldLabel>Tipo</FieldLabel>
                <Select value={formData.postType} onValueChange={(v) => { onInputChange('postType', v); if (v === 'post-singolo' || v === 'reel') onInputChange('numSlides', '1'); }}>
                  <SelectTrigger className="h-9 text-xs font-medium" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '9px', color: 'var(--ink)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carosello">Carosello</SelectItem>
                    <SelectItem value="post-singolo">Post Singolo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.postType === 'carosello' && (
              <div>
                <FieldLabel>Slide</FieldLabel>
                <Select value={formData.numSlides} onValueChange={(v) => onInputChange('numSlides', v)}>
                  <SelectTrigger className="h-9 text-xs font-medium" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '9px', color: 'var(--ink)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentForm;
