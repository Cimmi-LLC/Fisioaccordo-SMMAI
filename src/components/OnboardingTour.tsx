import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

interface TourStep {
  target: string;            // CSS selector OR 'body' for center modal
  title: string;
  content: string;
  placement?: 'right' | 'top' | 'bottom' | 'left' | 'center';
  route?: string;            // navigate here before showing this step
}

const TOUR_STEPS: TourStep[] = [
  { target: 'body', placement: 'center', title: 'Benvenuto', content: 'Tour rapido delle sezioni principali. Puoi saltare in qualsiasi momento.' },
  { target: '[data-tour="nav-post"]', title: 'Post', content: 'Qui generi caroselli e post singoli Instagram.', placement: 'right', route: '/posts' },
  { target: '[data-tour="post-input"]', title: 'Scrivi l\'argomento', content: 'Descrivi di cosa vuoi parlare. L\'AI prende tono, target e servizi dal tuo Brand Kit.', placement: 'right', route: '/posts' },
  { target: '[data-tour="post-quantity"]', title: 'Quanti post diversi', content: 'Da 2+ l\'AI crea angoli diversi sullo stesso topic (esercizi, miti, errori, segnali).', placement: 'right', route: '/posts' },
  { target: '[data-tour="post-generate"]', title: 'Genera', content: 'Click e attendi ~10s a post. Ogni slide avrà testi, hashtag, caption e immagine coerente.', placement: 'top', route: '/posts' },
  { target: '[data-tour="nav-storie"]', title: 'Storie', content: 'Batch di storie Instagram da topic, recensioni Google Maps o MioDottore.', placement: 'right', route: '/storie' },
  { target: 'body', placement: 'center', title: 'Cosa puoi fare nelle Storie', content: 'Genera quiz, curiosità, miti-verità. Importa recensioni e crea storie automaticamente.', route: '/storie' },
  { target: '[data-tour="nav-reel"]', title: 'Reel', content: 'Script video con hook, struttura e inquadrature.', placement: 'right', route: '/reel' },
  { target: '[data-tour="reel-input"]', title: 'Argomento Reel', content: 'L\'AI scrive script con hook nei primi 3 secondi, struttura virale e CTA.', placement: 'right', route: '/reel' },
  { target: '[data-tour="reel-quantity"]', title: 'Quanti script', content: 'Da 1 a 10. Con più script ottieni varianti diverse dello stesso topic.', placement: 'right', route: '/reel' },
  { target: '[data-tour="nav-brand"]', title: 'Brand Kit', content: 'Colori, font, target, servizi. L\'AI userà queste info in OGNI generazione.', placement: 'right', route: '/brand' },
  { target: 'body', placement: 'center', title: 'Configura il Brand', content: 'Imposta colori, font, descrizione studio, target pazienti, servizi, mission. Tutto influenza l\'output AI.', route: '/brand' },
  { target: 'body', placement: 'center', title: 'Fatto', content: 'Per rilanciare il tour: Impostazioni → Account → Rivedi tutorial.' },
];

interface Rect { top: number; left: number; width: number; height: number; }

const TOOLTIP_W = 320;
const TOOLTIP_H_EST = 170;  // approximate height for positioning
const ARROW_GAP = 14;
const MOBILE_BREAKPOINT = 768;

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function computeTooltipPos(targetRect: Rect | null, placement: TourStep['placement']): React.CSSProperties {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  // Mobile: anchor the tooltip to the bottom of the screen. Trying to
  // float it next to a target on a 390px screen always ends up partially
  // off-screen or covering the target itself.
  if (winW < MOBILE_BREAKPOINT) {
    return {
      position: 'fixed',
      left: 12,
      right: 12,
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      width: 'auto',
      maxWidth: '100%',
    };
  }
  if (!targetRect || placement === 'center') {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }
  let top = 0, left = 0;
  if (placement === 'right') {
    top = targetRect.top + targetRect.height / 2 - TOOLTIP_H_EST / 2;
    left = targetRect.left + targetRect.width + ARROW_GAP;
  } else if (placement === 'left') {
    top = targetRect.top + targetRect.height / 2 - TOOLTIP_H_EST / 2;
    left = targetRect.left - TOOLTIP_W - ARROW_GAP;
  } else if (placement === 'top') {
    top = targetRect.top - TOOLTIP_H_EST - ARROW_GAP;
    left = targetRect.left + targetRect.width / 2 - TOOLTIP_W / 2;
  } else { // bottom
    top = targetRect.top + targetRect.height + ARROW_GAP;
    left = targetRect.left + targetRect.width / 2 - TOOLTIP_W / 2;
  }
  // Clamp inside viewport
  top = clamp(top, 12, winH - TOOLTIP_H_EST - 12);
  left = clamp(left, 12, winW - TOOLTIP_W - 12);
  return { position: 'fixed', top: `${top}px`, left: `${left}px` };
}

const OnboardingTour: React.FC = () => {
  const { running, markCompleted } = useOnboardingTour();
  const navigate = useNavigate();
  const location = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);

  // Reset on start
  useEffect(() => { if (running) setStepIndex(0); }, [running]);

  // For each step: navigate if needed, wait for target in DOM, then show
  useEffect(() => {
    if (!running) { setReady(false); setTargetRect(null); return; }
    const step = TOUR_STEPS[stepIndex];
    if (!step) return;

    let cancelled = false;
    setReady(false);
    setTargetRect(null);

    // Navigate if route mismatch
    if (step.route && step.route !== location.pathname) {
      navigate(step.route);
    }

    // Wait for target element to appear (poll up to 3s)
    const start = Date.now();
    const poll = () => {
      if (cancelled) return;
      if (step.target === 'body' || step.placement === 'center') {
        setTargetRect(null);
        setReady(true);
        return;
      }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        // Scroll into view for visibility
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
        setReady(true);
        return;
      }
      if (Date.now() - start > 3000) {
        // Give up — show as center modal so user isn't stuck
        console.warn('[Tour] target not found:', step.target);
        setTargetRect(null);
        setReady(true);
        return;
      }
      setTimeout(poll, 80);
    };
    // Small initial delay to let route transition mount the page
    setTimeout(poll, step.route && step.route !== location.pathname ? 200 : 30);
    return () => { cancelled = true; };
  }, [running, stepIndex, location.pathname, navigate]);

  // Re-measure on window resize / scroll
  useEffect(() => {
    if (!ready || !running) return;
    const step = TOUR_STEPS[stepIndex];
    if (!step || step.target === 'body' || step.placement === 'center') return;
    const remeasure = () => {
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [ready, running, stepIndex]);

  const goNext = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= TOUR_STEPS.length) { markCompleted(); return; }
    setStepIndex(next);
  }, [stepIndex, markCompleted]);

  const goPrev = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  if (!running || !ready) return null;
  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;

  const isCenter = step.placement === 'center' || step.target === 'body' || !targetRect;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const tooltipPos = computeTooltipPos(targetRect, step.placement);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {/* Overlay (full screen dark, with optional spotlight hole) */}
      {isCenter ? (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(15,15,30,0.45)',
          pointerEvents: 'auto',
        }} onClick={(e) => e.stopPropagation()} />
      ) : (
        // Box-shadow trick to create a "hole" in the overlay over the target
        <div style={{
          position: 'absolute',
          top: targetRect!.top - 6,
          left: targetRect!.left - 6,
          width: targetRect!.width + 12,
          height: targetRect!.height + 12,
          borderRadius: 8,
          boxShadow: '0 0 0 9999px rgba(15,15,30,0.45)',
          pointerEvents: 'none',
          transition: 'all 0.2s ease',
        }} />
      )}

      {/* Tooltip — on mobile, computeTooltipPos returns left+right so we
          don't apply a fixed width (let it fill the screen with 12px margins). */}
      <div style={{
        width: window.innerWidth < MOBILE_BREAKPOINT ? undefined : TOOLTIP_W,
        ...tooltipPos,
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.05)',
        pointerEvents: 'auto',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        overflow: 'hidden',
      }}>
        {/* Close X — marks the tour as completed so it doesn't auto-reopen */}
        <button
          onClick={markCompleted}
          aria-label="Chiudi"
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 16, color: '#a0a0a8', padding: 4, lineHeight: 1,
          }}
        >×</button>

        {/* Title */}
        <div style={{
          padding: '16px 38px 6px 18px',
          fontSize: 13, fontWeight: 600, color: '#1a1a2e',
          letterSpacing: '-0.2px',
        }}>
          {step.title}
        </div>

        {/* Content */}
        <div style={{
          padding: '0 18px 14px',
          fontSize: 12.5, color: '#5a5a6a', lineHeight: 1.5,
        }}>
          {step.content}
        </div>

        {/* Progress + Footer */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid #f0f0f4',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
        }}>
          <button
            onClick={markCompleted}
            style={{
              background: 'transparent', border: 'none',
              color: '#a0a0a8', fontSize: 11, fontWeight: 400,
              cursor: 'pointer', padding: '7px 4px',
            }}
          >Salta</button>

          <div style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#b0b0b8' }}>
            {stepIndex + 1} / {TOUR_STEPS.length}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {stepIndex > 0 && (
              <button
                onClick={goPrev}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#7a7a8a', fontSize: 11.5, fontWeight: 500,
                  cursor: 'pointer', padding: '7px 10px',
                }}
              >Indietro</button>
            )}
            <button
              onClick={goNext}
              style={{
                background: '#1a1a2e', color: '#ffffff', border: 'none',
                borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                cursor: 'pointer', padding: '7px 14px',
              }}
            >{isLast ? 'Fine' : 'Avanti'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
