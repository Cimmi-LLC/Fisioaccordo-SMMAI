import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe, X, Plus, CheckCircle2 } from 'lucide-react';
import { BrandProfile, EMPTY_BRAND, CATEGORIE_OPTIONS, TONO_OPTIONS, PERSONA_OPTIONS } from '@/types/brand';
import logo from '@/assets/logo-fisioaccordo.png';
import SinglePhotoUpload from '@/components/brand/SinglePhotoUpload';

const LOADING_MESSAGES = [
  "Sto visitando il tuo sito...",
  "Sto leggendo i tuoi servizi...",
  "Sto analizzando il tuo target di pazienti...",
  "Sto raccogliendo l'identità del tuo brand...",
  "Sto costruendo il tuo profilo...",
];

/* ── Tag Input Component ── */
const TagInput: React.FC<{
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}> = ({ label, tags, onChange, placeholder, suggestions }) => {
  const [input, setInput] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  return (
    <div>
      <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <Badge key={i} variant="secondary" className="text-[11px] pl-2 pr-1 py-0.5 gap-1">
            {tag}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(input); } }}
          placeholder={placeholder || 'Aggiungi e premi Invio'}
          className="text-xs h-8"
          style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '8px' }}
        />
        <button
          onClick={() => addTag(input)}
          disabled={!input.trim()}
          className="px-2 h-8 rounded-lg text-xs font-bold disabled:opacity-30"
          style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)', border: 'none', cursor: 'pointer' }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {suggestions && suggestions.length > 0 && tags.length === 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {suggestions.filter(s => !tags.includes(s)).slice(0, 5).map((s, i) => (
            <button
              key={i}
              onClick={() => addTag(s)}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)', border: 'none', cursor: 'pointer' }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Main Onboarding Component ── */
const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [url, setUrl] = useState('');
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [brand, setBrand] = useState<BrandProfile>({ ...EMPTY_BRAND });
  const [saving, setSaving] = useState(false);

  // ?new=1 → adding a secondary brand (skip "already has brand" redirect)
  const isNewBrandMode = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('new') === '1';

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // First-onboarding redirect: skip if we're explicitly adding a new brand
  useEffect(() => {
    if (!user || isNewBrandMode) return;
    supabase.from('brands').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => { if (count && count > 0) navigate('/'); });
  }, [user, navigate, isNewBrandMode]);

  // Loading messages rotation
  useEffect(() => {
    if (step !== 1) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex(i => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [step]);

  // Step 1: Scrape + Analyze
  const handleAnalyze = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    // Basic URL validation
    try {
      new URL(trimmedUrl.startsWith('http') ? trimmedUrl : 'https://' + trimmedUrl);
    } catch {
      toast({ title: 'URL non valido', description: 'Inserisci un URL valido (es. https://www.tuostudio.it)', variant: 'destructive' });
      return;
    }

    setStep(1);
    setLoadingMsgIndex(0);

    try {
      // Scrape
      const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke('scrape-website', {
        body: { url: trimmedUrl.startsWith('http') ? trimmedUrl : 'https://' + trimmedUrl }
      });

      if (scrapeErr || !scrapeData?.success) {
        const errorMessages: Record<string, string> = {
          unreachable: 'Non riusciamo a raggiungere questo sito. Controlla l\'indirizzo.',
          timeout: 'Il sito non ha risposto in tempo. Riprova.',
          empty: 'Il sito contiene pochissimo testo.',
          invalid_url: 'L\'URL inserito non è valido.',
        };
        toast({
          title: 'Problema con il sito',
          description: errorMessages[scrapeData?.error] || 'Errore nello scraping. Puoi compilare manualmente.',
          variant: 'destructive',
        });
        setStep(0);
        return;
      }

      // Analyze
      const { data: analyzeData, error: analyzeErr } = await supabase.functions.invoke('analyze-brand', {
        body: { scrapedData: scrapeData }
      });

      if (analyzeErr || analyzeData?.error || !analyzeData?.brandProfile) {
        toast({
          title: 'Analisi parziale',
          description: 'Abbiamo trovato poche informazioni. Completa i campi manualmente.',
        });
        setBrand({ ...EMPTY_BRAND, website_url: trimmedUrl.startsWith('http') ? trimmedUrl : 'https://' + trimmedUrl });
        setStep(2);
        return;
      }

      // Success — populate brand (preserve EMPTY_BRAND defaults for unset fields)
      const profile = analyzeData.brandProfile;
      // Process logo: if it has a white background, strip it and re-upload as PNG
      let processedLogo = profile.logo_url || '';
      if (processedLogo) {
        try {
          const { processLogoIfNeeded } = await import('@/utils/processLogo');
          processedLogo = await processLogoIfNeeded(processedLogo, user?.id);
        } catch (err) {
          console.warn('Logo processing failed, using original:', err);
        }
      }
      setBrand(prev => ({
        ...prev,
        nome_business: profile.nome_business || '',
        descrizione: profile.descrizione || '',
        categorie: profile.categorie || [],
        servizi: profile.servizi || [],
        target_pazienti: profile.target_pazienti || '',
        tono_voce: profile.tono_voce || 'professionale',
        vantaggi_competitivi: profile.vantaggi_competitivi || [],
        mission: profile.mission || '',
        temi_chiave: profile.temi_chiave || [],
        cta_suggerite: profile.cta_suggerite || [],
        persona_scrittura: profile.persona_scrittura || 'noi',
        colore_primario: profile.colore_primario || '#554697',
        colore_secondario: profile.colore_secondario || '#E6007E',
        colore_terziario: profile.colore_terziario || '#1a1a2e',
        logo_url: processedLogo,
        website_url: trimmedUrl.startsWith('http') ? trimmedUrl : 'https://' + trimmedUrl,
        raw_analysis: profile,
      }));
      setStep(2);
    } catch (err: any) {
      toast({ title: 'Errore', description: err.message || 'Errore imprevisto', variant: 'destructive' });
      setStep(0);
    }
  };

  // Step 3: Save brand
  const handleSave = async () => {
    if (!user) return;
    if (!brand.nome_business.trim()) {
      toast({ title: 'Nome richiesto', description: 'Inserisci il nome del tuo studio.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    setStep(3);

    try {
      const { data: inserted, error } = await supabase.from('brands').insert({
        user_id: user.id,
        website_url: brand.website_url || null,
        nome_business: brand.nome_business,
        descrizione: brand.descrizione,
        categorie: brand.categorie,
        servizi: brand.servizi,
        target_pazienti: brand.target_pazienti,
        citta: brand.citta || '',
        tono_voce: brand.tono_voce,
        vantaggi_competitivi: brand.vantaggi_competitivi,
        mission: brand.mission,
        temi_chiave: brand.temi_chiave,
        cta_suggerite: brand.cta_suggerite,
        persona_scrittura: brand.persona_scrittura,
        identita_core: brand.identita_core || '',
        colore_primario: brand.colore_primario,
        colore_secondario: brand.colore_secondario,
        colore_terziario: brand.colore_terziario,
        font_intestazioni: brand.font_intestazioni,
        font_body: brand.font_body,
        logo_url: brand.logo_url || '',
        raw_analysis: brand.raw_analysis || {},
      } as any).select().single();

      if (error) throw error;

      // Set this brand as active (so generation/preview pick it up immediately)
      if (inserted?.id) {
        await supabase
          .from('user_settings')
          .upsert(
            { user_id: user.id, active_brand_id: inserted.id, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );
        if (typeof window !== 'undefined') {
          localStorage.setItem('fisioaccordo:active_brand_id', inserted.id);
        }
      }

      toast({
        title: isNewBrandMode ? 'Brand aggiunto!' : 'Profilo salvato!',
        description: isNewBrandMode
          ? 'Il nuovo brand è ora attivo. Puoi generare contenuti per questo cliente.'
          : 'Il tuo brand è pronto. Iniziamo a creare contenuti!',
      });
      navigate(isNewBrandMode ? '/brands' : '/posts');
    } catch (err: any) {
      toast({ title: 'Errore nel salvataggio', description: err.message, variant: 'destructive' });
      setStep(2);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--viola)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
        {/* Logo */}
        <div className="text-center mb-10">
          <img src={logo} alt="Logo" className="h-12 w-auto mx-auto mb-4" />
        </div>

        {/* ── STEP 0: URL Input ── */}
        {step === 0 && (
          <div className="text-center" style={{ animation: 'fadeSlideUp .4s ease' }}>
            <div
              className="rounded-2xl p-8"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 2px 12px rgba(85,70,151,0.07)' }}
            >
              <div className="mb-6">
                <Globe className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--viola)' }} />
                <h1 className="text-xl font-black mb-2" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
                  Analizziamo il tuo sito web
                </h1>
                <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
                  Incolla il link del tuo sito. Ci pensiamo noi a scoprire tutto quello che c'è da sapere sul tuo studio.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAnalyze(); }}
                  placeholder="https://www.tuostudio.it"
                  className="text-center text-sm h-12"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', fontSize: '14px' }}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={!url.trim()}
                  className="w-full text-white text-[13px] font-black uppercase py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--viola)', border: 'none', cursor: url.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.5px' }}
                >
                  Analizza il mio sito
                </button>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => { setBrand({ ...EMPTY_BRAND }); setStep(2); }}
                  className="text-[12px] font-semibold"
                  style={{ color: 'var(--ink3)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Non hai un sito? Compila il profilo manualmente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Loading ── */}
        {step === 1 && (
          <div className="text-center py-12" style={{ animation: 'fadeSlideUp .4s ease' }}>
            {/* Animated scanning visual */}
            <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 32px' }}>
              {/* Outer ring */}
              <div className="onb-ring" style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid var(--line)',
              }} />
              {/* Spinning arc */}
              <div className="onb-spin" style={{
                position: 'absolute', inset: -2, borderRadius: '50%',
                border: '3px solid transparent',
                borderTopColor: 'var(--viola)',
                borderRightColor: 'var(--rosa)',
              }} />
              {/* Pulsing inner circle */}
              <div className="onb-pulse" style={{
                position: 'absolute', inset: 30, borderRadius: '50%',
                backgroundColor: 'var(--viola-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Icon that changes with message */}
                <span style={{ fontSize: 40, lineHeight: 1 }}>
                  {['🔍', '📖', '🎯', '🎨', '✨'][loadingMsgIndex]}
                </span>
              </div>
              {/* Floating dots */}
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="onb-dot" style={{
                  position: 'absolute',
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: i % 2 === 0 ? 'var(--viola)' : 'var(--rosa)',
                  top: `${20 + Math.sin(i * 1.05) * 40}%`,
                  left: `${20 + Math.cos(i * 1.05) * 40}%`,
                  opacity: 0.5,
                  animationDelay: `${i * 0.3}s`,
                }} />
              ))}
              {/* Scan line */}
              <div className="onb-scan" style={{
                position: 'absolute', left: '15%', right: '15%', height: 2,
                background: 'linear-gradient(90deg, transparent, var(--viola), var(--rosa), transparent)',
                borderRadius: 1,
              }} />
            </div>

            {/* Message with fade transition */}
            <div style={{ minHeight: 50 }}>
              <p key={loadingMsgIndex} className="onb-msg text-[16px] font-bold mb-2" style={{ color: 'var(--ink)' }}>
                {LOADING_MESSAGES[loadingMsgIndex]}
              </p>
              <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
                Stiamo analizzando il tuo sito web...
              </p>
            </div>

            {/* Progress bar */}
            <div style={{ maxWidth: 300, margin: '20px auto 0', height: 4, backgroundColor: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
              <div className="onb-progress" style={{
                height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, var(--viola), var(--rosa))',
                width: `${((loadingMsgIndex + 1) / LOADING_MESSAGES.length) * 100}%`,
                transition: 'width 0.8s ease',
              }} />
            </div>
          </div>
        )}

        {/* ── STEP 2: Review & Edit ── */}
        {step === 2 && (
          <div style={{ animation: 'fadeSlideUp .4s ease' }}>
            <div className="text-center mb-6">
              <h1 className="text-xl font-black mb-2" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
                Controlla quello che abbiamo trovato
              </h1>
              <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
                I contenuti social che genereremo si baseranno su queste informazioni. Modifica quello che vuoi.
              </p>
            </div>

            {brand.raw_analysis && (
              <div className="flex items-center gap-2 p-3 rounded-xl mb-6" style={{ backgroundColor: 'var(--viola-dim)', border: '1px solid rgba(85,70,151,0.15)' }}>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--viola)' }} />
                <p className="text-[11px]" style={{ color: 'var(--ink2)' }}>
                  Abbiamo analizzato il tuo sito e trovato queste informazioni. Puoi modificare qualsiasi campo.
                </p>
              </div>
            )}

            <div
              className="rounded-2xl p-6 space-y-5"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}
            >
              {/* Logo */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
                  Logo {brand.logo_url ? '' : '(consigliato)'}
                </label>
                <div className="flex items-center gap-3">
                  <SinglePhotoUpload
                    url={brand.logo_url}
                    onChange={v => setBrand({ ...brand, logo_url: v })}
                    autoCleanBackground
                  />
                  <p className="text-[11px] flex-1" style={{ color: 'var(--ink3)' }}>
                    {brand.logo_url
                      ? 'Logo estratto automaticamente. Sostituiscilo se necessario — sfondo bianco rimosso in automatico, esportato come PNG trasparente.'
                      : 'Carica il logo (PNG/JPG). Lo useremo nelle storie e nei post; lo sfondo bianco viene rimosso in automatico.'}
                  </p>
                </div>
              </div>

              {/* Nome business */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
                  Nome dello studio *
                </label>
                <Input
                  value={brand.nome_business}
                  onChange={e => setBrand({ ...brand, nome_business: e.target.value })}
                  placeholder="Es. Studio Fisioterapico Rossi"
                  className="text-sm"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}
                />
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
                  Descrizione
                </label>
                <Textarea
                  value={brand.descrizione}
                  onChange={e => setBrand({ ...brand, descrizione: e.target.value })}
                  placeholder="Breve descrizione del tuo studio..."
                  rows={3}
                  className="text-sm"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}
                />
              </div>

              {/* Categorie */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
                  Categorie
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIE_OPTIONS.map(cat => {
                    const active = brand.categorie.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => setBrand({
                          ...brand,
                          categorie: active ? brand.categorie.filter(c => c !== cat) : [...brand.categorie, cat],
                        })}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{
                          border: active ? '1px solid var(--viola)' : '1px solid var(--line)',
                          backgroundColor: active ? 'var(--viola-dim)' : 'var(--bg)',
                          color: active ? 'var(--viola)' : 'var(--ink3)',
                          cursor: 'pointer',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Servizi */}
              <TagInput
                label="Servizi offerti"
                tags={brand.servizi}
                onChange={servizi => setBrand({ ...brand, servizi })}
                placeholder="Es. Fisioterapia sportiva"
              />

              {/* Target */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
                  Target pazienti
                </label>
                <Input
                  value={brand.target_pazienti}
                  onChange={e => setBrand({ ...brand, target_pazienti: e.target.value })}
                  placeholder="Es. Sportivi, anziani, lavoratori in ufficio"
                  className="text-sm"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}
                />
              </div>

              {/* Tono + Persona row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
                    Tono di voce
                  </label>
                  <Select value={brand.tono_voce} onValueChange={v => setBrand({ ...brand, tono_voce: v })}>
                    <SelectTrigger className="h-9 text-xs" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
                    Persona di scrittura
                  </label>
                  <Select value={brand.persona_scrittura} onValueChange={v => setBrand({ ...brand, persona_scrittura: v })}>
                    <SelectTrigger className="h-9 text-xs" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vantaggi */}
              <TagInput
                label="Vantaggi competitivi"
                tags={brand.vantaggi_competitivi}
                onChange={v => setBrand({ ...brand, vantaggi_competitivi: v })}
                placeholder="Es. Tecnologia all'avanguardia"
              />

              {/* Mission */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
                  Mission / Valori
                </label>
                <Textarea
                  value={brand.mission}
                  onChange={e => setBrand({ ...brand, mission: e.target.value })}
                  placeholder="La mission del tuo studio..."
                  rows={2}
                  className="text-sm"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}
                />
              </div>

              {/* Temi chiave */}
              <TagInput
                label="Temi chiave per i post"
                tags={brand.temi_chiave}
                onChange={t => setBrand({ ...brand, temi_chiave: t })}
                placeholder="Es. Prevenzione infortuni"
              />

              {/* CTA */}
              <TagInput
                label="Call to action suggerite"
                tags={brand.cta_suggerite}
                onChange={c => setBrand({ ...brand, cta_suggerite: c })}
                placeholder="Es. Prenota una visita gratuita"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(0)}
                className="flex-shrink-0 text-[12px] font-semibold py-3 px-5 rounded-xl"
                style={{ border: '1px solid var(--line)', color: 'var(--ink3)', background: 'transparent', cursor: 'pointer' }}
              >
                Analizza un altro sito
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !brand.nome_business.trim()}
                className="flex-1 text-white text-[13px] font-black uppercase py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Tutto corretto, iniziamo!
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Saving ── */}
        {step === 3 && (
          <div className="text-center py-20" style={{ animation: 'fadeSlideUp .4s ease' }}>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6" style={{ color: 'var(--rosa)' }} />
            <p className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>
              Stiamo salvando il tuo profilo...
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes onbSpin { to { transform: rotate(360deg); } }
        @keyframes onbPulse { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.06); opacity: 1; } }
        @keyframes onbDot { 0%, 100% { transform: scale(0.5); opacity: 0.2; } 50% { transform: scale(1.4); opacity: 0.7; } }
        @keyframes onbScan { 0% { top: 15%; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { top: 85%; opacity: 0; } }
        @keyframes onbMsg { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .onb-spin { animation: onbSpin 2s linear infinite; }
        .onb-pulse { animation: onbPulse 2.5s ease-in-out infinite; }
        .onb-dot { animation: onbDot 2s ease-in-out infinite; }
        .onb-scan { animation: onbScan 2.5s ease-in-out infinite; }
        .onb-msg { animation: onbMsg 0.5s ease; }
      `}</style>
    </div>
  );
};

export default Onboarding;
