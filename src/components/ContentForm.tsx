
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Loader2, Sparkles, Plus, Trash2 } from "lucide-react";
import PhotoUpload from './PhotoUpload';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import TemplateUploader from "./TemplateUploader";
import type { CanvaTemplate } from './CanvaTemplateSelector';
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
  onShowHookGenerator?: () => void;
}

/* ── Shared field label ─────────────────────────────────────── */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="label-field mb-1.5">{children}</div>
);

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

/* ── Compact Template Chips ─────────────────────────────────── */
const TemplateChips: React.FC<{
  value: string;
  postType: string;
  onInputChange: (field: string, value: string | string[]) => void;
}> = ({ value, postType, onInputChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CanvaTemplate[]>([]);
  const [showUploader, setShowUploader] = useState(false);

  const POST_TYPE_TO_CATEGORY: Record<string, string> = {
    'carosello': 'carosello', 'post-singolo': 'post', 'storia': 'storia', 'reel': 'reel',
  };

  const loadTemplates = async () => {
    const { data: defaults } = await supabase.from('canva_templates').select('*').eq('is_default', true);
    let userTemplates: CanvaTemplate[] = [];
    if (user) {
      const { data } = await supabase.from('canva_templates').select('*').eq('user_id', user.id);
      userTemplates = (data as any[] || []) as CanvaTemplate[];
    }
    setTemplates([...(defaults as any[] || []) as CanvaTemplate[], ...userTemplates]);
  };

  React.useEffect(() => { loadTemplates(); }, [user]);

  const targetCategory = postType ? POST_TYPE_TO_CATEGORY[postType] : null;
  const filtered = targetCategory
    ? templates.filter(t => t.category === targetCategory || t.category === 'all')
    : templates;

  const deleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('canva_templates').delete().eq('id', templateId);
    if (value === templateId) onInputChange('visualTemplate', 'default');
    toast({ title: "Template eliminato" });
    loadTemplates();
  };

  const selectTemplate = (tmpl: CanvaTemplate | null) => {
    onInputChange('visualTemplate', tmpl ? tmpl.id : 'default');
    onInputChange('canvaTemplate', tmpl as any);
  };

  const isDefault = value === 'default' || !value;

  return (
    <div>
      <FieldLabel>Template visivo</FieldLabel>
      <div className="flex flex-wrap gap-2 mt-1">
        {/* Default chip */}
        <button
          type="button"
          onClick={() => selectTemplate(null)}
          className="text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all"
          style={{
            border: isDefault ? '1px solid var(--rosa)' : '1px solid var(--line)',
            backgroundColor: isDefault ? 'var(--rosa-dim)' : 'var(--bg)',
            color: isDefault ? 'var(--rosa)' : 'var(--ink3)',
            borderRadius: '6px',
            letterSpacing: '0.5px',
          }}
        >
          Default
        </button>

        {filtered.map(t => {
          const isActive = value === t.id;
          return (
            <div key={t.id} className="relative group flex items-center">
              <button
                type="button"
                onClick={() => selectTemplate(t)}
                className="text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all"
                style={{
                  border: isActive ? '1px solid var(--rosa)' : '1px solid var(--line)',
                  backgroundColor: isActive ? 'var(--rosa-dim)' : 'var(--bg)',
                  color: isActive ? 'var(--rosa)' : 'var(--ink3)',
                  borderRadius: '6px',
                  letterSpacing: '0.5px',
                  paddingRight: t.user_id ? '20px' : undefined,
                }}
              >
                {t.name}
              </button>
              {t.user_id && (
                <button
                  onClick={(e) => deleteTemplate(t.id, e)}
                  className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--rosa)' }}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add chip */}
        <button
          type="button"
          onClick={() => setShowUploader(true)}
          className="text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all flex items-center gap-1"
          style={{
            border: '1px dashed var(--line)',
            backgroundColor: 'var(--bg)',
            color: 'var(--ink3)',
            borderRadius: '6px',
            letterSpacing: '0.5px',
          }}
        >
          <Plus className="h-2.5 w-2.5" /> Aggiungi
        </button>
      </div>

      <TemplateUploader open={showUploader} onOpenChange={setShowUploader} onTemplateUploaded={loadTemplates} />
    </div>
  );
};

/* ── Platform chips (4 visible + expand) ───────────────────── */
const PRIMARY_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'tiktok'];
const SECONDARY_PLATFORMS = ['pinterest', 'threads', 'bluesky', 'x', 'youtube'];

const PlatformChips: React.FC<{
  selectedPlatforms: string[];
  onToggle: (id: string) => void;
}> = ({ selectedPlatforms, onToggle }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? [...PRIMARY_PLATFORMS, ...SECONDARY_PLATFORMS] : PRIMARY_PLATFORMS;

  return (
    <div>
      <FieldLabel>Piattaforme di pubblicazione</FieldLabel>
      <div className="flex flex-wrap gap-2 mt-1">
        {visible.map(id => {
          const isActive = selectedPlatforms.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className="text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all capitalize"
              style={{
                border: isActive ? '1px solid var(--rosa)' : '1px solid var(--line)',
                backgroundColor: isActive ? 'var(--rosa-dim)' : 'var(--bg)',
                color: isActive ? 'var(--rosa)' : 'var(--ink3)',
                borderRadius: '6px',
                letterSpacing: '0.5px',
              }}
            >
              {id}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="text-[10px] font-semibold px-2 py-1.5"
          style={{ color: 'var(--viola)', letterSpacing: '0.3px' }}
        >
          {expanded ? '− meno' : `+ altri ${SECONDARY_PLATFORMS.length}`}
        </button>
      </div>
    </div>
  );
};

/* ── Progress bar ───────────────────────────────────────────── */
const steps = [
  { n: 1, label: 'Contenuto' },
  { n: 2, label: 'Formato' },
  { n: 3, label: 'Pubblica' },
];

const ProgressBar: React.FC<{ current: number }> = ({ current }) => (
  <div className="mb-6">
    <div className="flex gap-1 mb-2">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div
            className="h-1 rounded-full flex-1 transition-all duration-300"
            style={{ backgroundColor: s.n <= current ? 'var(--rosa)' : 'var(--line)' }}
          />
          {i < steps.length - 1 && <div className="w-px" />}
        </React.Fragment>
      ))}
    </div>
    <div className="flex justify-between">
      {steps.map(s => (
        <span
          key={s.n}
          className="text-[9px] font-black uppercase"
          style={{
            color: s.n === current ? 'var(--ink)' : 'var(--ink3)',
            letterSpacing: '0.5px',
          }}
        >
          {s.n}. {s.label}
        </span>
      ))}
    </div>
  </div>
);

/* ── Main component ─────────────────────────────────────────── */
const ContentForm: React.FC<ContentFormProps> = ({
  formData,
  onInputChange,
  isGenerating,
  onGenerate,
  basePhoto,
  onPhotoUpload,
  onPhotoRemove,
  onShowHookGenerator,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const handlePlatformToggle = (platformId: string) => {
    const current = formData.selectedPlatforms || [];
    const isActive = current.includes(platformId);
    onInputChange(
      'selectedPlatforms',
      isActive ? current.filter(id => id !== platformId) : [...current, platformId]
    );
  };

  const canAdvance = currentStep === 1 ? formData.description.trim().length > 0 : true;

  return (
    <Card className="panel-card">
      <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between">
          <CardTitle style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
            Crea il Tuo Contenuto
          </CardTitle>
          <span
            className="text-[9px] font-black uppercase px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--ink3)', letterSpacing: '0.6px' }}
          >
            AI
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5" style={{ padding: '22px 24px' }}>
        <ProgressBar current={currentStep} />

        {/* ── STEP 1: Contenuto ─────────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <FieldLabel>1. Descrivi il tuo post</FieldLabel>
              <TextareaField
                value={formData.description}
                onChange={(e) => onInputChange('description', e.target.value)}
                placeholder="es. mal di schiena da scrivania"
              />
            </div>
            <div>
              <FieldLabel>2. Definisci il tuo pubblico (opzionale)</FieldLabel>
              <InputField
                value={formData.audience}
                onChange={(e) => onInputChange('audience', e.target.value)}
                placeholder="es. lavoratori in ufficio"
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Formato ───────────────────────────────── */}
        {currentStep === 2 && (
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Lunghezza', field: 'length', options: [
                  { value: 'corto', label: 'Corto' },
                  { value: 'medio', label: 'Medio' },
                  { value: 'lungo', label: 'Lungo' },
                ]
              },
              {
                label: 'Tono', field: 'tone', options: [
                  { value: 'professionale', label: 'Professionale' },
                  { value: 'informale', label: 'Informale' },
                  { value: 'divertente', label: 'Divertente' },
                  { value: 'motivazionale', label: 'Motivazionale' },
                ]
              },
              {
                label: 'Piattaforma', field: 'platform', options: [
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'linkedin', label: 'LinkedIn' },
                  { value: 'facebook', label: 'Facebook' },
                ]
              },
              {
                label: 'Tipo di post', field: 'postType', options: [
                  { value: 'carosello', label: 'Carosello' },
                  { value: 'post-singolo', label: 'Post Singolo' },
                  { value: 'storia', label: 'Storia' },
                  { value: 'reel', label: 'Reel' },
                ]
              },
              {
                label: 'Numero di slide', field: 'numSlides', options: [
                  { value: '3', label: '3 Slide' },
                  { value: '5', label: '5 Slide' },
                  { value: '7', label: '7 Slide' },
                  { value: '10', label: '10 Slide' },
                ]
              },
              {
                label: 'Immagini', field: 'numImages', options: [
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                  { value: '4', label: '4' },
                  { value: '5', label: '5' },
                ]
              },
            ].map(({ label, field, options }) => (
              <div key={field}>
                <FieldLabel>{label}</FieldLabel>
                <Select value={(formData as any)[field]} onValueChange={(v) => onInputChange(field, v)}>
                  <SelectTrigger
                    className="h-10 text-xs font-medium"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px', color: 'var(--ink)' }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 3: Pubblica ──────────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <TemplateChips
              value={formData.visualTemplate}
              postType={formData.postType}
              onInputChange={onInputChange}
            />

            <PhotoUpload
              basePhoto={basePhoto}
              onPhotoUpload={onPhotoUpload}
              onPhotoRemove={onPhotoRemove}
            />

            <PlatformChips
              selectedPlatforms={formData.selectedPlatforms || []}
              onToggle={handlePlatformToggle}
            />

            <div>
              <FieldLabel>Pianifica pubblicazione (opzionale)</FieldLabel>
              <InputField
                type="datetime-local"
                value={formData.scheduleDate || ''}
                onChange={(e) => onInputChange('scheduleDate', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Hook AI link */}
            {onShowHookGenerator && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={onShowHookGenerator}
                  className="text-[11px] font-semibold transition-colors"
                  style={{ color: 'var(--viola)' }}
                >
                  Genera Hook AI per questo contenuto →
                </button>
              </div>
            )}

            {/* Generate button */}
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
                <><Loader2 className="h-4 w-4 animate-spin" /> Generazione in corso...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Genera Contenuto</>
              )}
            </button>
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setCurrentStep(s => Math.max(1, s - 1) as 1 | 2 | 3)}
            disabled={currentStep === 1}
            className="text-[11px] font-black uppercase flex items-center gap-1 transition-opacity disabled:opacity-30"
            style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Indietro
          </button>

          <span className="text-[9px] font-bold" style={{ color: 'var(--ink3)' }}>
            {currentStep} / 3
          </span>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => { if (canAdvance) setCurrentStep(s => Math.min(3, s + 1) as 1 | 2 | 3); }}
              disabled={!canAdvance}
              className="text-[11px] font-black uppercase flex items-center gap-1 transition-opacity disabled:opacity-30"
              style={{ color: 'var(--rosa)', letterSpacing: '0.5px' }}
            >
              Avanti <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentForm;
