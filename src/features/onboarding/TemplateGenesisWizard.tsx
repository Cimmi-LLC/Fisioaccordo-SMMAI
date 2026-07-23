// Wizard Template Genesis: 4 step, entrato dopo il salvataggio del brand
// nell'onboarding classico (route /onboarding/template?brand=<id>).
// Riprende dallo stato giusto in base a brands.genesis_status.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo-full.png';
import UploadStep from './steps/UploadStep.tsx';
import BrandConfirmStep from './steps/BrandConfirmStep.tsx';
import CandidateGridStep from './steps/CandidateGridStep.tsx';
import SummaryStep from './steps/SummaryStep.tsx';
import { useGenesis } from './hooks/useGenesis.ts';
import { useTemplateCandidates } from './hooks/useTemplateCandidates.ts';
import type { SlideRole } from '@/lib/brand/archetypes.ts';
import type { VisualStyle, SlideFormat } from '@/lib/brand/genome.ts';

type WizardStep = 0 | 1 | 2 | 3;

const STEP_LABELS = ['Materiali', 'Brand', 'Template', 'Conferma'];

const TemplateGenesisWizard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const brandId = searchParams.get('brand');

  const [step, setStep] = useState<WizardStep>(0);
  const [selection, setSelection] = useState<Partial<Record<SlideRole, string>>>({});
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('flat_icon');
  const [format, setFormat] = useState<SlideFormat>('4:5');

  const genesis = useGenesis(brandId);
  const { candidates, genesisStatus } = useTemplateCandidates(
    step >= 2 ? brandId : null,
    genesis.genomeVersion
  );

  // Guard: senza login o senza brand si torna indietro.
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!brandId) navigate('/brand');
  }, [authLoading, user, brandId, navigate]);

  // Se il brand e gia locked, il wizard non serve. Nel frattempo recupera
  // il logo gia salvato nel kit per non richiederlo.
  useEffect(() => {
    if (!brandId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('brands')
        .select('genesis_status, logo_url')
        .eq('id', brandId)
        .maybeSingle();
      if (data?.genesis_status === 'locked') navigate('/posts');
      if (data?.logo_url) setExistingLogoUrl(data.logo_url as string);
    })();
  }, [brandId, navigate]);

  const progress = useMemo(() => ((step + 1) / 4) * 100, [step]);

  const handleUpload = async (logoFile: File | null, posts: File[]) => {
    const ok = await genesis.uploadSources(logoFile, posts, existingLogoUrl);
    if (!ok) return;
    // Analisi semantica subito dopo l'upload (se ci sono post).
    if (posts.length > 0) await genesis.analyze();
    setStep(1);
  };

  const handleGenerate = async () => {
    const ok = await genesis.generate(undefined, visualStyle, format);
    if (ok) { setSelection({}); setStep(2); }
  };

  const handleRegenerate = async (feedback: string) => {
    const ok = await genesis.generate(feedback, visualStyle, format);
    if (ok) setSelection({});
  };

  const handleApprove = async () => {
    const ids = Object.values(selection).filter((v): v is string => !!v);
    if (ids.length < 3) return;
    const ok = await genesis.approveAll(ids);
    if (ok) navigate('/posts');
  };

  if (authLoading || !brandId) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <img src={logo} alt="Logo" className="h-10 w-auto mx-auto mb-4" />
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-1">
            {STEP_LABELS.map((label, i) => (
              <React.Fragment key={label}>
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color: i <= step ? 'var(--rosa)' : 'var(--ink3)', letterSpacing: '0.5px' }}
                >
                  {label}
                </span>
                {i < 3 && <span style={{ color: 'var(--line)' }}>·</span>}
              </React.Fragment>
            ))}
          </div>
          <div style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--rosa)', transition: 'width 0.3s' }} />
          </div>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 2px 12px rgba(85,70,151,0.07)' }}
        >
          {step === 0 && (
            <UploadStep busy={genesis.busy} existingLogoUrl={existingLogoUrl} onSubmit={handleUpload} />
          )}

          {step === 1 && genesis.palette && (
            <BrandConfirmStep
              busy={genesis.busy}
              palette={genesis.palette}
              semantics={genesis.semantics}
              visualStyle={visualStyle}
              format={format}
              onPaletteChange={genesis.setPalette}
              onVisualStyleChange={setVisualStyle}
              onFormatChange={setFormat}
              onConfirm={handleGenerate}
            />
          )}

          {step === 2 && (
            <CandidateGridStep
              busy={genesis.busy}
              candidates={candidates}
              selection={selection}
              onSelect={(role, id) => setSelection((s) => ({ ...s, [role]: id }))}
              onRegenerate={handleRegenerate}
              onContinue={() => setStep(3)}
            />
          )}

          {step === 3 && genesis.genome && (
            <SummaryStep
              busy={genesis.busy}
              genome={genesis.genome}
              candidates={candidates}
              selection={selection}
              onApprove={handleApprove}
            />
          )}

          {/* Stato failed dalla edge fn */}
          {genesisStatus === 'failed' && step === 2 && (
            <p className="text-[12px] text-center mt-4" style={{ color: '#ef4444' }}>
              La generazione e fallita. Riprova con "Rigenera tutto" o torna piu tardi.
            </p>
          )}
        </div>

        {step > 0 && step < 3 && (
          <div className="text-center mt-4">
            <button
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              className="text-[12px] font-semibold"
              style={{ color: 'var(--ink3)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Torna indietro
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGenesisWizard;
