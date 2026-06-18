import React, { useEffect, useState, useMemo } from 'react';
import type { CarouselSlideData } from '@/types/carousel';
import PostTemplateOverlay from './PostTemplateOverlay';
import { getTemplateById, POST_TEMPLATE_RANDOM } from '@/data/postTemplates';

interface SlideTemplateProps {
  slide: CarouselSlideData;
  totalSlides: number;
  colorPrimary: string;
  colorSecondary: string;
  colorTerziario?: string;
  fontFamily: string;
  logoUrl: string;
  logoInitials: string;
  /** Brand display name (used in header strip + footer). Optional. */
  brandName?: string;
  scale?: number;
  id?: string;
  onRetryImage?: () => void;
  // Brand background pattern (id from POST_TEMPLATES)
  postTemplateId?: string | null;
}

function hexToPlaceholder(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) || 200;
  const g = parseInt(hex.slice(3, 5), 16) || 200;
  const b = parseInt(hex.slice(5, 7), 16) || 200;
  return `rgb(${Math.round(r * 0.62 + 200 * 0.38)}, ${Math.round(g * 0.62 + 210 * 0.38)}, ${Math.round(b * 0.62 + 195 * 0.38)})`;
}

/** Darken a hex color by `amount` (0-1). If the input is already dark
 *  (luminance < 0.3) returns it unchanged. Used to ensure CTA button is
 *  always dark enough for white text to be legible. */
function ensureDark(hex: string, amount = 0.25): string {
  if (!hex || hex.length < 7) return '#1a1a2e';
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#1a1a2e';
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < 0.35) return hex; // already dark enough
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function loadGoogleFont(font: string) {
  const family = font.replace(/'/g, '').split(',')[0].trim();
  const elId = `gfont-${family.replace(/\s+/g, '-')}`;
  if (document.getElementById(elId)) return;
  const link = document.createElement('link');
  link.id = elId;
  link.rel = 'stylesheet';
  // Load 4 weights so we can use 400/500/700/800/900 across the slide
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;700;800;900&display=swap`;
  document.head.appendChild(link);
}

const W = 1080;
const H = 1350;

/** Brand header strip — shows logo + name in a slim band at the top.
 *  Used on content/cta slides; cover keeps its big centered logo. */
const BrandHeader: React.FC<{ logoUrl: string; logoInitials: string; brandName?: string }> = ({
  logoUrl, logoInitials, brandName,
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '36px 60px 0',
    flexShrink: 0,
  }}>
    {logoUrl ? (
      <img src={logoUrl} alt="logo" style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
    ) : (
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: '#1a1a2e', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, fontWeight: 800, letterSpacing: '0.02em',
      }}>{logoInitials.slice(0, 2)}</div>
    )}
    {brandName && (
      <span style={{
        fontSize: 24, fontWeight: 700, color: '#1a1a2e',
        letterSpacing: '-0.01em',
      }}>{brandName}</span>
    )}
  </div>
);

/** Brand color progress bar — segments fill up to current slide.
 *  Replaces the bland "1 / 5" text. */
const ProgressBar: React.FC<{ current: number; total: number; color: string }> = ({
  current, total, color,
}) => {
  if (total <= 1) return null;
  const segments = Array.from({ length: total }, (_, i) => i);
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '0 60px',
      marginTop: 24,
      flexShrink: 0,
    }}>
      {segments.map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: i < current ? color : '#e5e5ec',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
};

/** Accent stripe down the left edge — adds brand presence on every slide
 *  without competing with the content. */
const AccentStripe: React.FC<{ color: string }> = ({ color }) => (
  <div style={{
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: 8,
    background: color,
    zIndex: 4,
  }} />
);

const BrandFooter: React.FC<{ brandName?: string; color: string }> = ({ brandName, color }) => {
  if (!brandName) return null;
  return (
    <div style={{
      position: 'absolute',
      bottom: 18,
      right: 60,
      fontSize: 16,
      fontWeight: 600,
      color: '#9a9aa8',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      zIndex: 4,
      pointerEvents: 'none',
    }}>
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 8, verticalAlign: 'middle' }} />
      {brandName}
    </div>
  );
};

const SlideTemplate: React.FC<SlideTemplateProps> = ({
  slide,
  totalSlides,
  colorPrimary,
  colorSecondary,
  colorTerziario,
  fontFamily,
  logoUrl,
  logoInitials,
  brandName,
  scale = 1,
  id,
  onRetryImage,
  postTemplateId,
}) => {
  useEffect(() => { loadGoogleFont(fontFamily); }, [fontFamily]);

  // Resolve template once per slide instance (so "random" stays stable across re-renders)
  const resolvedTemplateId = useMemo(() => {
    if (postTemplateId !== POST_TEMPLATE_RANDOM) return postTemplateId;
    const tpl = getTemplateById(POST_TEMPLATE_RANDOM);
    return tpl?.id || null;
  }, [postTemplateId, slide.numero]);

  const [imgError, setImgError] = useState(false);
  const tipo = slide.tipo || 'content';
  const placeholderBg = hexToPlaceholder(colorPrimary);
  const font = fontFamily.includes(',') ? fontFamily : `'${fontFamily}', sans-serif`;
  const hasValidImage = slide.imageUrl && !imgError;
  const accentColor = ensureDark(colorPrimary, 0.15);

  useEffect(() => { setImgError(false); }, [slide.imageUrl]);

  return (
    <div id={id} style={{ width: W * scale, height: H * scale, overflow: 'hidden' }}>
      <div style={{
        width: W,
        height: H,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: font,
        boxSizing: 'border-box',
      }}>

        {/* Background */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#ffffff' }} />
        <PostTemplateOverlay
          templateId={resolvedTemplateId}
          colors={{
            primary: colorPrimary,
            secondary: colorSecondary,
            terziario: colorTerziario || '#1a1a2e',
          }}
        />

        {/* Vertical brand accent stripe (always visible, subtle) */}
        <AccentStripe color={accentColor} />

        {/* Content layer */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 3,
        }}>

          {/* ════════ COVER ════════ */}
          {tipo === 'cover' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Logo big and centered */}
              <div style={{
                paddingTop: '6%',
                display: 'flex',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" style={{ maxWidth: '50%', maxHeight: 120, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 64, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                    {logoInitials}
                  </span>
                )}
              </div>

              {/* Hero image */}
              <div style={{
                flex: 1,
                margin: '4% 6% 0%',
                borderRadius: 28,
                overflow: 'hidden',
                minHeight: 0,
                background: hasValidImage ? undefined : placeholderBg,
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
              }}>
                {hasValidImage ? (
                  <img
                    src={slide.imageUrl}
                    alt="cover"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, color: 'rgba(255,255,255,0.5)',
                  }}>
                    caricamento...
                  </div>
                )}
              </div>

              {/* Hook — big editorial display */}
              <div style={{
                padding: '4% 8% 0',
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: '#0e0e1e',
                  lineHeight: 1.08,
                  letterSpacing: '-0.03em',
                  marginBottom: 14,
                }}>
                  {slide.hook || slide.titolo || ''}
                </div>
                {slide.sottotitolo && (
                  <div style={{
                    fontSize: 32,
                    fontWeight: 500,
                    color: '#5a5a6a',
                    lineHeight: 1.35,
                    letterSpacing: '-0.01em',
                  }}>
                    {slide.sottotitolo}
                  </div>
                )}
              </div>

              {/* Swipe affordance — only when it's actually a carousel */}
              {totalSlides > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  gap: 14, padding: '4% 8% 5%', flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: 22, fontWeight: 700,
                    color: accentColor, letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}>scorri</span>
                  <span style={{ fontSize: 36, color: accentColor, lineHeight: 1 }}>→</span>
                </div>
              )}
            </div>
          )}

          {/* ════════ CONTENT ════════ */}
          {tipo === 'content' && (
            <>
              <BrandHeader logoUrl={logoUrl} logoInitials={logoInitials} brandName={brandName} />
              <ProgressBar current={slide.numero} total={totalSlides} color={accentColor} />

              {/* Text area */}
              <div style={{ padding: '36px 60px 24px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 22 }}>
                {/* Big numbered badge — visual rhythm + tells you where you are */}
                {totalSlides > 1 && (
                  <div style={{
                    flexShrink: 0,
                    width: 76, height: 76,
                    borderRadius: 18,
                    background: accentColor,
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 40, fontWeight: 900,
                    letterSpacing: '-0.02em',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                  }}>
                    {slide.numero - 1}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 68,
                    fontWeight: 900,
                    lineHeight: 1.12,
                    color: '#0e0e1e',
                    letterSpacing: '-0.03em',
                    marginBottom: 18,
                  }}>
                    {slide.titolo}
                  </div>
                  <div style={{
                    fontSize: 36,
                    fontWeight: 500,
                    lineHeight: 1.5,
                    color: '#3a3a4a',
                    letterSpacing: '-0.005em',
                  }}>
                    {slide.testo}
                  </div>
                </div>
              </div>

              {/* Image area */}
              <div style={{
                flex: 1,
                padding: '12px 50px 60px',
                display: 'flex',
                alignItems: 'stretch',
                minHeight: 0,
              }}>
                <div style={{
                  width: '100%',
                  borderRadius: 32,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
                  background: hasValidImage ? undefined : placeholderBg,
                  position: 'relative',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
                }}>
                  {hasValidImage ? (
                    <img
                      src={slide.imageUrl}
                      alt="slide"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                      <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
                        Immagine non disponibile
                      </span>
                      {onRetryImage && (
                        <div
                          onClick={onRetryImage}
                          style={{
                            marginTop: 8,
                            padding: '10px 28px',
                            borderRadius: 50,
                            border: '2px solid rgba(255,255,255,0.5)',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 20,
                            fontWeight: 600,
                            cursor: 'pointer',
                            letterSpacing: '0.03em',
                          }}
                        >
                          Riprova
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Single-post CTA button (when not a multi-slide carousel) */}
              {totalSlides === 1 && (
                <div style={{ padding: '0 50px 60px', flexShrink: 0, position: 'relative', zIndex: 3 }}>
                  <div style={{
                    width: '100%',
                    padding: '26px 0',
                    borderRadius: 100,
                    backgroundColor: accentColor,
                    color: '#ffffff',
                    fontSize: 30,
                    fontWeight: 800,
                    textAlign: 'center',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                  }}>
                    LEGGI LA DESCRIZIONE
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════ CTA ════════ */}
          {tipo === 'cta' && (
            <>
              <BrandHeader logoUrl={logoUrl} logoInitials={logoInitials} brandName={brandName} />
              <ProgressBar current={slide.numero} total={totalSlides} color={accentColor} />

              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6% 8% 8%',
                textAlign: 'center',
                gap: 36,
              }}>
                {/* Quote-mark decorative accent */}
                <div style={{
                  fontSize: 120,
                  lineHeight: 0.6,
                  color: accentColor,
                  opacity: 0.18,
                  fontWeight: 900,
                  marginBottom: -20,
                  letterSpacing: '-0.05em',
                }}>
                  →
                </div>

                <div style={{
                  fontSize: 86,
                  fontWeight: 900,
                  lineHeight: 1.06,
                  color: '#0e0e1e',
                  letterSpacing: '-0.035em',
                }}>
                  {slide.titolo}
                </div>
                <div style={{
                  fontSize: 38,
                  fontWeight: 500,
                  color: '#4a4a5a',
                  lineHeight: 1.45,
                  letterSpacing: '-0.005em',
                  maxWidth: '85%',
                }}>
                  {slide.testo_cta || slide.testo}
                </div>
                <div style={{
                  marginTop: 8,
                  padding: '30px 70px',
                  borderRadius: 100,
                  background: accentColor,
                  color: '#ffffff',
                  fontSize: 38,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                }}>
                  {slide.bottone_cta || 'Scopri di più'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Brand footer (subtle, all slides) */}
        <BrandFooter brandName={brandName} color={accentColor} />
      </div>
    </div>
  );
};

export default SlideTemplate;
