import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeWebsiteUrl } from '@/utils/url';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, X, Plus, Pencil, Globe, Palette, Type, Upload, Image as ImageIcon, MapPin, User2 } from 'lucide-react';
import { BrandProfile, EMPTY_BRAND, CATEGORIE_OPTIONS, TONO_OPTIONS, PERSONA_OPTIONS, FONT_OPTIONS } from '@/types/brand';
import { POST_TEMPLATES, POST_TEMPLATE_NONE, POST_TEMPLATE_RANDOM } from '@/data/postTemplates';
import PostTemplateOverlay from '@/components/carousel/PostTemplateOverlay';
import SinglePhotoUpload from '@/components/brand/SinglePhotoUpload';
import BrandPhotoGallery from '@/components/brand/BrandPhotoGallery';

/* ── Editable Field wrapper ── */
const EditableField: React.FC<{ label: string; children: React.ReactNode; onEdit?: () => void }> = ({ label, children, onEdit }) => (
  <div className="group">
    <div className="flex items-center gap-2 mb-1.5">
      <label className="text-[10px] font-black uppercase" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>{label}</label>
      {onEdit && <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity cursor-pointer" style={{ color: 'var(--ink3)' }} onClick={onEdit} />}
    </div>
    <div className="group-hover:ring-1 group-hover:ring-[var(--viola)] group-hover:ring-opacity-30 rounded-lg transition-all">
      {children}
    </div>
  </div>
);

/* ── Tag Input ── */
const TagInput: React.FC<{ tags: string[]; onChange: (t: string[]) => void; placeholder?: string }> = ({ tags, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const addTag = (t: string) => { const v = t.trim(); if (v && !tags.includes(v)) onChange([...tags, v]); setInput(''); };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <Badge key={i} variant="secondary" className="text-[11px] pl-2 pr-1 py-0.5 gap-1">
            {tag}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(input); } }} placeholder={placeholder} className="text-xs h-8" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '8px' }} />
        <button onClick={() => addTag(input)} disabled={!input.trim()} className="px-2 h-8 rounded-lg text-xs font-bold disabled:opacity-30" style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)', border: 'none', cursor: 'pointer' }}><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
};

/* ── Color Picker ── */
const ColorField: React.FC<{ label: string; sublabel: string; value: string; onChange: (v: string) => void }> = ({ label, sublabel, value, onChange }) => (
  <div className="flex items-center gap-3">
    <label className="relative cursor-pointer">
      <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: value, border: '2px solid var(--line)' }} />
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
    </label>
    <div>
      <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{label}</div>
      <div className="text-[11px] font-mono" style={{ color: 'var(--ink3)' }}>{value.toUpperCase()}</div>
    </div>
  </div>
);

/* ── Photo Upload Grid ── */
const PhotoGrid: React.FC<{ photos: string[]; onChange: (p: string[]) => void; max?: number }> = ({ photos, onChange, max = 20 }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && photos.length < max) {
        onChange([...photos, reader.result]);
      }
    };
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = '';
  };
  return (
    <div className="flex flex-wrap gap-3">
      {photos.length < max && (
        <label className="flex flex-col items-center justify-center cursor-pointer" style={{ width: 100, height: 100, border: '2px dashed var(--line)', borderRadius: 12 }}>
          <Upload className="h-5 w-5 mb-1" style={{ color: 'var(--ink3)' }} />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--ink3)' }}>Carica</span>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
      )}
      {photos.map((url, i) => (
        <div key={i} className="relative group" style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <img src={url} alt="" className="w-full h-full object-cover" />
          <button onClick={() => onChange(photos.filter((_, j) => j !== i))} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-0.5 transition-opacity"><X className="h-3 w-3" /></button>
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════ */
/* ── MAIN COMPONENT ── */
/* ════════════════════════════════════════════════ */
const BrandPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [brand, setBrand] = useState<BrandProfile>({ ...EMPTY_BRAND });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'gallery' | 'preferences'>('brand');

  useEffect(() => {
    if (!user) return;
    // Load user_settings to find active_brand_id, then load that brand.
    // Fallback to first brand of user if no active set.
    (async () => {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('active_brand_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const activeId = (settings as any)?.active_brand_id;

      let query = supabase.from('brands').select('*').eq('user_id', user.id);
      if (activeId) query = query.eq('id', activeId);
      const { data } = await query.order('created_at', { ascending: true }).limit(1).maybeSingle();

      if (data) {
        setBrand(prev => ({
          ...prev,
          ...Object.fromEntries(Object.entries(data).filter(([_, v]) => v != null)),
        }));
      }
      setLoading(false);
    })();
  }, [user]);

  const update = (field: string, value: any) => {
    setBrand(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user || !brand.id) return;
    setSaving(true);
    try {
      const { raw_analysis, id, user_id, ...saveData } = brand;
      // Update by brand id (not user_id) to avoid touching other brands of the same user
      const { error } = await supabase.from('brands').update({
        ...saveData,
        updated_at: new Date().toISOString(),
      } as any).eq('id', brand.id);
      if (error) throw error;
      setHasChanges(false);
      toast({ title: 'Salvato!', description: 'Profilo brand aggiornato.' });
    } catch (err: any) {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--viola)' }} /></div>;
  }

  const tabs = [
    { id: 'brand' as const, label: 'Brand Kit' },
    { id: 'gallery' as const, label: 'Galleria' },
    { id: 'preferences' as const, label: 'Preferenze' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Tab bar */}
      <div className="flex gap-0 mb-8" style={{ borderBottom: '1.5px solid var(--line)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="px-5 pb-3 pt-1 text-[13px] font-semibold relative"
            style={{
              color: activeTab === t.id ? 'var(--viola)' : 'var(--ink3)',
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            {t.label}
            {activeTab === t.id && <span className="absolute bottom-[-1.5px] left-0 right-0 h-[2px] rounded-t" style={{ backgroundColor: 'var(--viola)' }} />}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* TAB: Brand Kit */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'brand' && (
        <div className="space-y-8">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
              Profilo del Brand di {brand.nome_business || 'Il tuo Studio'}
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
              Mantieni questa sezione aggiornata per ricevere post sempre coerenti con la tua identità, servizi e clienti.
            </p>
          </div>

          {/* Panoramica */}
          <div className="rounded-2xl p-6 space-y-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <h2 className="text-lg font-black" style={{ color: 'var(--ink)' }}>Panoramica del Brand</h2>

            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <SinglePhotoUpload url={brand.logo_url} onChange={v => update('logo_url', v)} autoCleanBackground />
                <p className="text-[10px] text-center mt-1" style={{ color: 'var(--ink3)' }}>Logo</p>
              </div>
              <div className="flex-1 space-y-4">
                <EditableField label="Nome Business">
                  <Input value={brand.nome_business} onChange={e => update('nome_business', e.target.value)} className="text-sm font-semibold" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
                </EditableField>

                {brand.website_url && (
                  <EditableField label="Sito Web">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" style={{ color: 'var(--viola)' }} />
                      <a href={normalizeWebsiteUrl(brand.website_url)} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: 'var(--viola)' }}>{brand.website_url}</a>
                    </div>
                  </EditableField>
                )}

                <EditableField label="Descrizione">
                  <Textarea value={brand.descrizione} onChange={e => update('descrizione', e.target.value)} rows={3} className="text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
                </EditableField>
              </div>
            </div>

            {/* Categorie */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {CATEGORIE_OPTIONS.map(cat => {
                const active = brand.categorie.includes(cat);
                return (
                  <button key={cat} onClick={() => update('categorie', active ? brand.categorie.filter(c => c !== cat) : [...brand.categorie, cat])}
                    className="text-[11px] font-medium px-3 py-1 rounded-full transition-all"
                    style={{ border: active ? '1px solid var(--viola)' : '1px solid var(--line)', backgroundColor: active ? 'var(--viola-dim)' : 'transparent', color: active ? 'var(--viola)' : 'var(--ink3)', cursor: 'pointer' }}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colori + Tipografia */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
                <h2 className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>Colori del Brand</h2>
              </div>
              <ColorField label="Primario" sublabel="Colore principale" value={brand.colore_primario} onChange={v => update('colore_primario', v)} />
              <ColorField label="Secondario" sublabel="Accento" value={brand.colore_secondario} onChange={v => update('colore_secondario', v)} />
              <ColorField label="Terziario" sublabel="Sfondo/testo" value={brand.colore_terziario} onChange={v => update('colore_terziario', v)} />
            </div>

            <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
                <h2 className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>Tipografia</h2>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase mb-1.5 block" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>Font Intestazioni</label>
                <Select value={brand.font_intestazioni} onValueChange={v => update('font_intestazioni', v)}>
                  <SelectTrigger className="h-12 text-base" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, fontFamily: brand.font_intestazioni }}><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase mb-1.5 block" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>Font Body</label>
                <Select value={brand.font_body} onValueChange={v => update('font_body', v)}>
                  <SelectTrigger className="h-12 text-base" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, fontFamily: brand.font_body }}><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stile sfondo post */}
          <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>Stile sfondo post</h2>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
              Sfondo grafico professionale applicato a ogni post di questo brand.
            </p>

            <div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {/* None */}
                <button
                  onClick={() => update('post_template_id', POST_TEMPLATE_NONE)}
                  className="aspect-[1080/1350] rounded-md flex items-center justify-center transition-all"
                  style={{
                    border: (!brand.post_template_id || brand.post_template_id === POST_TEMPLATE_NONE) ? '2px solid var(--rosa)' : '1px solid var(--line)',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <span className="text-[10px]" style={{ color: 'var(--ink3)' }}>Nessuno</span>
                </button>
                {/* Random */}
                <button
                  onClick={() => update('post_template_id', POST_TEMPLATE_RANDOM)}
                  className="aspect-[1080/1350] rounded-md flex items-center justify-center transition-all"
                  style={{
                    border: brand.post_template_id === POST_TEMPLATE_RANDOM ? '2px solid var(--rosa)' : '1px solid var(--line)',
                    backgroundColor: 'var(--viola-dim)',
                    cursor: 'pointer',
                  }}
                >
                  <span className="text-[10px] font-bold" style={{ color: 'var(--viola)' }}>🎲<br />Casuale</span>
                </button>
                {/* Templates */}
                {POST_TEMPLATES.map((tpl) => {
                  const active = brand.post_template_id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => update('post_template_id', tpl.id)}
                      title={`${tpl.name} — ${tpl.description}`}
                      className="aspect-[1080/1350] rounded-md overflow-hidden relative transition-all"
                      style={{
                        border: active ? '2px solid var(--rosa)' : '1px solid var(--line)',
                        cursor: 'pointer',
                      }}
                    >
                      <PostTemplateOverlay
                        templateId={tpl.id}
                        colors={{
                          primary: brand.colore_primario || '#554697',
                          secondary: brand.colore_secondario || '#E6007E',
                          terziario: brand.colore_terziario || '#1a1a2e',
                        }}
                      />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '4px 6px', fontSize: 9, fontWeight: 700,
                        background: 'rgba(255,255,255,0.85)',
                        color: 'var(--ink)',
                        textAlign: 'center',
                        zIndex: 2,
                      }}>
                        {tpl.name}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] mt-2" style={{ color: 'var(--ink3)' }}>
                "Casuale" sceglie un template diverso a ogni slide. "Nessuno" lascia lo sfondo bianco.
              </p>
            </div>
          </div>

          {/* Posizionamento e Identità */}
          <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black" style={{ color: 'var(--ink)' }}>Posizionamento e Identità</h2>
              <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--ink3)' }} />
            </div>
            <EditableField label="Identità Core">
              <Textarea value={brand.identita_core || brand.mission} onChange={e => update('identita_core', e.target.value)} rows={4} className="text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} placeholder="Descrivi cosa rende unico il tuo studio..." />
            </EditableField>
            <EditableField label="Servizi offerti">
              <TagInput tags={brand.servizi} onChange={v => update('servizi', v)} placeholder="Aggiungi servizio" />
            </EditableField>
            <EditableField label="Target pazienti">
              <Input value={brand.target_pazienti} onChange={e => update('target_pazienti', e.target.value)} className="text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
            </EditableField>
            <EditableField label="Città / Località">
              <Input value={brand.citta || ''} onChange={e => update('citta', e.target.value)} placeholder="es. Milano" className="text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
            </EditableField>
            <EditableField label="Vantaggi competitivi">
              <TagInput tags={brand.vantaggi_competitivi} onChange={v => update('vantaggi_competitivi', v)} placeholder="Aggiungi vantaggio" />
            </EditableField>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* TAB: Galleria */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'gallery' && (
        <div className="space-y-8">
          <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
            Le tue immagini vengono usate per creare post social. I media vengono usati solo quando rilevanti per il contenuto.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Totale', value: brand.gallery_photos.length, color: 'var(--ink)' },
              { label: 'Disponibili', value: brand.gallery_photos.length, color: 'var(--viola)' },
              { label: 'Usate', value: 0, color: 'var(--rosa)' },
            ].map(s => (
              <div key={s.label} className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px] font-medium" style={{ color: 'var(--ink3)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Gallery photos */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>Le tue immagini ({brand.gallery_photos.length})</h2>
            </div>
            <PhotoGrid photos={brand.gallery_photos} onChange={v => update('gallery_photos', v)} />
          </div>

          {/* Brand photo pool — used as priority source over Freepik in posts/storie */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>Pool foto per post e storie</h2>
            </div>
            <BrandPhotoGallery brandId={brand.id || null} />
          </div>

          {/* Avatar */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-2">
              <User2 className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>Avatar</h2>
            </div>
            <p className="text-[12px] mb-4" style={{ color: 'var(--ink3)' }}>
              Carica una foto idealmente a mezzo busto dove è ben visibile il volto. Verrà utilizzata come reference per creare contenuti social più autentici e personalizzati.
            </p>
            <SinglePhotoUpload url={brand.avatar_url} onChange={v => update('avatar_url', v)} shape="circle" />
          </div>

          {/* Location */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>Location</h2>
            </div>
            <p className="text-[12px] mb-4" style={{ color: 'var(--ink3)' }}>
              Carica foto degli interni della tua location. Preferibilmente solo gli ambienti, senza persone, per permetterci di riprodurre al meglio i tuoi spazi nei contenuti. (max 3)
            </p>
            <PhotoGrid photos={brand.location_photos} onChange={v => update('location_photos', v)} max={3} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* TAB: Preferenze */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'preferences' && (
        <div className="space-y-8">
          {/* Preferenze contenuti */}
          <div className="rounded-2xl p-6 space-y-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black" style={{ color: 'var(--ink)' }}>Preferenze per i Contenuti</h2>
              <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--ink3)' }} />
            </div>

            <EditableField label="Temi Chiave">
              <TagInput tags={brand.temi_chiave} onChange={v => update('temi_chiave', v)} placeholder="Aggiungi tema" />
            </EditableField>

            <EditableField label="Call to Action">
              <TagInput tags={brand.cta_suggerite} onChange={v => update('cta_suggerite', v)} placeholder="Aggiungi CTA" />
            </EditableField>

            <EditableField label="Parole da evitare">
              <TagInput tags={brand.parole_da_evitare} onChange={v => update('parole_da_evitare', v)} placeholder="Aggiungi parola" />
            </EditableField>
          </div>

          {/* Tono di voce */}
          <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <h2 className="text-lg font-black" style={{ color: 'var(--ink)' }}>Tono di voce</h2>
            <Select value={brand.tono_voce} onValueChange={v => update('tono_voce', v)}>
              <SelectTrigger className="h-10 text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }}><SelectValue /></SelectTrigger>
              <SelectContent>{TONO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Persona di scrittura */}
          <div className="rounded-2xl p-6 space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <h2 className="text-lg font-black" style={{ color: 'var(--ink)' }}>Persona di scrittura</h2>
            {PERSONA_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => update('persona_scrittura', o.value)}
                className="w-full text-left p-3 rounded-xl text-sm transition-all"
                style={{
                  border: brand.persona_scrittura === o.value ? '2px solid var(--viola)' : '1px solid var(--line)',
                  backgroundColor: brand.persona_scrittura === o.value ? 'var(--viola-dim)' : 'var(--bg)',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  fontWeight: brand.persona_scrittura === o.value ? 600 : 400,
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: brand.persona_scrittura === o.value ? '5px solid var(--viola)' : '2px solid var(--line)',
                    display: 'inline-block',
                  }} />
                  {o.label}
                </span>
              </button>
            ))}
          </div>

          {/* Pubblicazione automatica */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <h2 className="text-lg font-black mb-2" style={{ color: 'var(--ink)' }}>Pubblicazione</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-bold" style={{ color: 'var(--ink)' }}>Pubblicazione automatica</div>
                <div className="text-[12px]" style={{ color: 'var(--ink3)' }}>Connetti almeno un account social per abilitare.</div>
              </div>
              <button
                onClick={() => update('pubblicazione_automatica', !brand.pubblicazione_automatica)}
                style={{
                  width: 44, height: 24, borderRadius: 12, padding: 2,
                  backgroundColor: brand.pubblicazione_automatica ? 'var(--viola)' : 'var(--line)',
                  border: 'none', cursor: 'pointer', transition: 'background-color 0.2s',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff',
                  transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transform: brand.pubblicazione_automatica ? 'translateX(20px)' : 'translateX(0)',
                }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating save button */}
      {hasChanges && (
        <div className="sticky bottom-4 mt-6 z-10">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 text-[13px] font-black uppercase py-3.5 rounded-xl text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: 'pointer', letterSpacing: '0.5px', boxShadow: '0 4px 20px rgba(230,0,126,0.3)' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salva modifiche
          </button>
        </div>
      )}
    </div>
  );
};

export default BrandPage;
