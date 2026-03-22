
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import PhotoUpload from './PhotoUpload';
import CanvaTemplateSelector, { CanvaTemplate } from './CanvaTemplateSelector';
import { BlotatoService } from '@/services/blotatoService';

interface FormData {
  description: string;
  audience: string;
  length: string;
  tone: string;
  platform: string;
  postType: string;
  numSlides: string;
  numImages: string;
  visualTemplate: string;
  canvaTemplate?: CanvaTemplate | null;
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

/* ── Shared field label ─────────────────────────────────────── */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="label-field mb-1.5">{children}</div>
);

/* ── Styled input / textarea base classes ───────────────────── */
const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg)',
  border: '1px solid var(--line)',
  borderRadius: '9px',
  color: 'var(--ink)',
  fontSize: '12px',
  fontWeight: 500,
  width: '100%',
  padding: '8px 12px',
  outline: 'none',
  fontFamily: 'Montserrat, sans-serif',
  transition: 'border-color 0.15s, background-color 0.15s',
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    style={inputStyle}
    className={`min-h-[40px] ${props.className || ''}`}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(230,0,126,0.35)'; e.currentTarget.style.backgroundColor = 'var(--surface)'; }}
    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
  />
);

const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(230,0,126,0.35)'; e.currentTarget.style.backgroundColor = 'var(--surface)'; }}
    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
  />
);

const ContentForm: React.FC<ContentFormProps> = ({
  formData,
  onInputChange,
  isGenerating,
  onGenerate,
  basePhoto,
  onPhotoUpload,
  onPhotoRemove,
  onPublish
}) => {
  const supportedPlatforms = BlotatoService.getSupportedPlatforms();

  const handlePlatformToggle = (platformId: string) => {
    const current = formData.selectedPlatforms || [];
    const isActive = current.includes(platformId);
    if (isActive) {
      onInputChange('selectedPlatforms', current.filter(id => id !== platformId));
    } else {
      onInputChange('selectedPlatforms', [...current, platformId]);
    }
  };

  return (
    <Card className="panel-card">
      <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between">
          <CardTitle style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
            Crea il Tuo Contenuto
          </CardTitle>
          <span
            className="text-[9px] font-black uppercase px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--viola-dim)',
              color: 'var(--ink3)',
              letterSpacing: '0.6px',
            }}
          >
            AI
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5" style={{ padding: '22px 24px' }}>

        {/* 1. Descrizione */}
        <div>
          <FieldLabel>1. Descrivi il tuo post</FieldLabel>
          <TextareaField
            value={formData.description}
            onChange={(e) => onInputChange('description', e.target.value)}
            placeholder="es. mal di schiena da scrivania"
          />
        </div>

        {/* 2. Pubblico */}
        <div>
          <FieldLabel>2. Definisci il tuo pubblico (opzionale)</FieldLabel>
          <InputField
            value={formData.audience}
            onChange={(e) => onInputChange('audience', e.target.value)}
            placeholder="es. lavoratori in ufficio"
          />
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Lunghezza</FieldLabel>
            <Select value={formData.length} onValueChange={(v) => onInputChange('length', v)}>
              <SelectTrigger className="h-10 text-xs font-medium" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px', color: 'var(--ink)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corto">Corto</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="lungo">Lungo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel>Tono</FieldLabel>
            <Select value={formData.tone} onValueChange={(v) => onInputChange('tone', v)}>
              <SelectTrigger className="h-10 text-xs font-medium" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px', color: 'var(--ink)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professionale">Professionale</SelectItem>
                <SelectItem value="informale">Informale</SelectItem>
                <SelectItem value="divertente">Divertente</SelectItem>
                <SelectItem value="motivazionale">Motivazionale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel>Piattaforma</FieldLabel>
            <Select value={formData.platform} onValueChange={(v) => onInputChange('platform', v)}>
              <SelectTrigger className="h-10 text-xs font-medium" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px', color: 'var(--ink)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel>Tipo di post</FieldLabel>
            <Select value={formData.postType} onValueChange={(v) => onInputChange('postType', v)}>
              <SelectTrigger className="h-10 text-xs font-medium" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px', color: 'var(--ink)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="carosello">Carosello</SelectItem>
                <SelectItem value="post-singolo">Post Singolo</SelectItem>
                <SelectItem value="storia">Storia</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel>Numero di slide</FieldLabel>
            <Select value={formData.numSlides} onValueChange={(v) => onInputChange('numSlides', v)}>
              <SelectTrigger className="h-10 text-xs font-medium" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px', color: 'var(--ink)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Slide</SelectItem>
                <SelectItem value="5">5 Slide</SelectItem>
                <SelectItem value="7">7 Slide</SelectItem>
                <SelectItem value="10">10 Slide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel>Numero di immagini</FieldLabel>
            <Select value={formData.numImages} onValueChange={(v) => onInputChange('numImages', v)}>
              <SelectTrigger className="h-10 text-xs font-medium" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px', color: 'var(--ink)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Immagine</SelectItem>
                <SelectItem value="2">2 Immagini</SelectItem>
                <SelectItem value="3">3 Immagini</SelectItem>
                <SelectItem value="4">4 Immagini</SelectItem>
                <SelectItem value="5">5 Immagini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Canva Template */}
        <CanvaTemplateSelector
          value={formData.visualTemplate === 'default' ? null : formData.visualTemplate}
          postType={formData.postType}
          onChange={(templateId, template) => {
            onInputChange('visualTemplate', templateId || 'default');
            if (template) {
              onInputChange('canvaTemplate', template as any);
            }
          }}
        />

        {/* Base photo */}
        <PhotoUpload
          basePhoto={basePhoto}
          onPhotoUpload={onPhotoUpload}
          onPhotoRemove={onPhotoRemove}
        />

        {/* Piattaforme di pubblicazione */}
        <div>
          <FieldLabel>Piattaforme di pubblicazione</FieldLabel>
          <div className="flex flex-wrap gap-2 mt-2">
            {supportedPlatforms.map((platform) => {
              const isActive = formData.selectedPlatforms?.includes(platform.id) || false;
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handlePlatformToggle(platform.id)}
                  className="text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all"
                  style={{
                    border: isActive ? '1px solid var(--rosa)' : '1px solid var(--line)',
                    backgroundColor: isActive ? 'var(--rosa-dim)' : 'var(--bg)',
                    color: isActive ? 'var(--rosa)' : 'var(--ink3)',
                    borderRadius: '6px',
                    letterSpacing: '0.5px',
                  }}
                >
                  {platform.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pianifica pubblicazione */}
        <div>
          <FieldLabel>Pianifica pubblicazione (opzionale)</FieldLabel>
          <InputField
            type="datetime-local"
            value={formData.scheduleDate || ''}
            onChange={(e) => onInputChange('scheduleDate', e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        {/* Generate button */}
        <div className="relative">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full text-white text-[12px] font-black uppercase py-3.5 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--ink)',
              borderRadius: '10px',
              letterSpacing: '0.6px',
              paddingLeft: '20px',
              borderLeft: '3px solid var(--rosa)',
            }}
            onMouseEnter={(e) => { if (!isGenerating) (e.currentTarget as HTMLElement).style.backgroundColor = '#2d2a44'; }}
            onMouseLeave={(e) => { if (!isGenerating) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ink)'; }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generazione in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                3. Genera Contenuto
              </>
            )}
          </button>
        </div>

      </CardContent>
    </Card>
  );
};

export default ContentForm;
