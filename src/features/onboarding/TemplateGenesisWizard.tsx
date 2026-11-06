// Wizard Template Genesis: 4 step, entrato dopo il salvataggio del brand
// nell'onboarding classico (route /onboarding/template?brand=<id>).
// Riprende dallo stato giusto in base a brands.genesis_status.

import React, { useEffect, useMemo, useState } from 'react';
import AccountStrip from '@/components/AccountStrip';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo-full.png';
import UploadStep from './steps/UploadStep.tsx';
import BrandConfirmStep from './steps/BrandConfirmStep.tsx';
import CandidateGridStep from './steps/CandidateGridStep.tsx';
import SummaryStep from './steps/SummaryStep.tsx';
import { useGenesis } from './hooks/useGenesis.ts';
import { useTemplateCandidates } from './hooks/useTemplateCandidates.ts';
import { coloriDaCompletare } from '@/lib/brand/skipGenesis.ts';
import type { SlideRole } from '@/lib/brand/archetypes.ts';

type WizardStep = 0 | 1 | 2 | 3;

const STEP_LABELS = ['Materiali', 'Brand', 'Template', 'Conferma'];

const TemplateGenesisWizard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const brandId = searchParams.get('brand');

  const [step, setStep] = useState<WizardStep>(0);
  const [selection, setSelection] = useState<Partial<Record<SlideRole, string>>>({});
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

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
      if (data?.genesis_status === 'locked') { navigate('/posts'); return; }
      if (data?.logo_url) setExistingLogoUrl(data.logo_url as string);
      // Riprende dalla scelta delle varianti se la generazione era gia partita.
      if (await genesis.resume()) setStep(2);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, navigate]);

  const progress = useMemo(() => ((step + 1) / 4) * 100, [step]);

  const handleUpload = async (logoFile: File | null, posts: File[]) => {
    const ok = await genesis.uploadSources(logoFile, posts, existingLogoUrl);
    if (!ok) return;
    // Analisi semantica SEMPRE: senza post lavora su logo, foto dello studio
    // e testi del brand. Saltarla era la causa dei template tutti uguali.
    await genesis.analyze();
    setStep(1);
  };

  const handleGenerate = async () => {
    const ok = await genesis.generate(undefined);
    if (ok) { setSelection({}); setStep(2); }
  };

  const handleRegenerate = async (feedback: string) => {
    const ok = await genesis.generate(feedback);
    if (ok) setSelection({});
  };

  // Salta tutto: il brand entra subito nell'app. Logo e template si fanno
  // dopo (Brand Kit e pagina Post); qui si completano solo i colori mancanti.
  const handleSkip = async () => {
    if (!brandId || skipping) return;
    setSkipping(true);
    try {
      const { data } = await (supabase as any)
        .from('brands')
        .select('colore_primario, colore_secondario, colore_terziario')
        .eq('id', brandId)
        .maybeSingle();
      const patch = coloriDaCompletare(data);
      if (Object.keys(patch).length > 0) {
        await (supabase as any).from('brands').update(patch).eq('id', brandId);
      }
    } catch {
      // I colori di partenza sono un di piu: se non si salvano si entra lo stesso.
    }
    toast({
      title: 'Configurazione rimandata',
      description: 'Il logo lo aggiungi dal Brand Kit, il template dalla pagina Post quando vuoi.',
    });
    navigate('/posts');
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
      <AccountStrip />
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
            <UploadStep busy={genesis.busy} progress={genesis.progress} existingLogoUrl={existingLogoUrl} onSubmit={handleUpload} />
          )}

          {step === 1 && genesis.palette && (
            <BrandConfirmStep
              busy={genesis.busy}
              palette={genesis.palette}
              semantics={genesis.semantics}
              onPaletteChange={genesis.setPalette}
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
              consigliato={genesis.genome?.layout ?? null}
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

        {step < 3 && (
          <div className="text-center mt-4 space-y-3">
            <button
              onClick={handleSkip}
              disabled={skipping}
              className="text-[12px] font-black uppercase px-6 py-3 rounded-xl"
              style={{ color: 'var(--viola)', background: 'transparent', border: '1.5px solid var(--viola)', cursor: skipping ? 'wait' : 'pointer', letterSpacing: '0.5px' }}
            >
              {skipping ? 'Un attimo…' : 'Salta e configura dopo'}
            </button>
            <p className="text-[11px]" style={{ color: 'var(--ink3)' }}>
              Entri subito nell'app. Logo e template li aggiungi quando vuoi.
            </p>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => (s - 1) as WizardStep)}
                className="text-[12px] font-semibold"
                style={{ color: 'var(--ink3)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Torna indietro
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGenesisWizard;
