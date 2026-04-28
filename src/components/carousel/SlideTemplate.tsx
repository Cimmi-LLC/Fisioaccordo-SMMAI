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

function loadGoogleFont(font: string) {
  const family = font.replace(/'/g, '').split(',')[0].trim();
  const elId = `gfont-${family.replace(/\s+/g, '-')}`;
  if (document.getElementById(elId)) return;
  const link = document.createElement('link');
  link.id = elId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;700&display=swap`;
  document.head.appendChild(link);
}

const W = 1080;
const H = 1350;

const SlideTemplate: React.FC<SlideTemplateProps> = ({
  slide,
  totalSlides,
  colorPrimary,
  colorSecondary,
  colorTerziario,
  fontFamily,
  logoUrl,
  logoInitials,
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
    // Note: include slide.numero in deps so each slide gets its own random template
  }, [postTemplateId, slide.numero]);

  const [imgError, setImgError] = useState(false);
  const tipo = slide.tipo || 'content';
  const placeholderBg = hexToPlaceholder(colorPrimary);
  const font = fontFamily.includes(',') ? fontFamily : `'${fontFamily}', sans-serif`;
  const hasValidImage = slide.imageUrl && !imgError;

  // Reset error when imageUrl changes
  useEffect(() => { setImgError(false); }, [slide.imageUrl]);

  return (
    <div
      id={id}
      style={{
        width: W * scale,
        height: H * scale,
        overflow: 'hidden',
      }}
    >
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

        {/* ── Background: pattern brand-colored (or plain white if no template) ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#ffffff',
        }} />
        <PostTemplateOverlay
          templateId={resolvedTemplateId}
          colors={{
            primary: colorPrimary,
            secondary: colorSecondary,
            terziario: colorTerziario || '#1a1a2e',
          }}
        />

        {/* ── Content layer (above SVG overlay z=2) ── */}
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
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}>
              {/* 1. Logo in alto */}
              <div style={{
                paddingTop: '6%',
                display: 'flex',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" style={{ maxWidth: '50%', maxHeight: 120, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 64, fontWeight: 500, color: '#1a1a1a', letterSpacing: '0.05em' }}>
                    {logoInitials}
                  </span>
                )}
              </div>

              {/* 2. Immagine stock centrale */}
              <div style={{
                flex: 1,
                margin: '4% 6% 0%',
                borderRadius: 28,
                overflow: 'hidden',
                minHeight: 0,
                background: hasValidImage ? undefined : placeholderBg,
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

              {/* 3. Testo in basso */}
              <div style={{
                padding: '4% 8% 7%',
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 52,
                  fontWeight: 700,
                  color: '#1a1a1a',
                  lineHeight: 1.2,
                  marginBottom: 12,
                }}>
                  {slide.hook || slide.titolo || ''}
                </div>
                {slide.sottotitolo && (
                  <div style={{
                    fontSize: 32,
                    fontWeight: 400,
                    color: '#444',
                    lineHeight: 1.4,
                  }}>
                    {slide.sottotitolo}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ CONTENT ════════ */}
          {tipo === 'content' && (
            <>
              {/* Text area */}
              <div style={{ padding: '7% 8% 3%', flexShrink: 0 }}>
                {totalSlides > 1 && (
                  <div style={{ fontSize: 28, color: '#999', marginBottom: 24, letterSpacing: '0.05em' }}>
                    {slide.numero} / {totalSlides}
                  </div>
                )}
                <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.25, color: '#1a1a1a', marginBottom: 20 }}>
                  {slide.titolo}
                </div>
                <div style={{ fontSize: 38, lineHeight: 1.6, color: '#444' }}>
                  {slide.testo}
                </div>
              </div>

              {/* Image area */}
              <div style={{
                flex: 1,
                padding: '3% 6% 6%',
                display: 'flex',
                alignItems: 'stretch',
                minHeight: 0,
              }}>
                <div style={{
                  width: '100%',
                  borderRadius: 40,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
                  background: hasValidImage ? undefined : placeholderBg,
                  position: 'relative',
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

              {/* Bottone "LEGGI LA DESCRIZIONE" per post singolo —
                  usa colore terziario (scuro) per contrasto sicuro contro
                  l'overlay SVG e gli sfondi colorati. */}
              {totalSlides === 1 && (
                <div style={{ padding: '0 6% 6%', flexShrink: 0, position: 'relative', zIndex: 3 }}>
                  <div style={{
                    width: '100%',
                    padding: '24px 0',
                    borderRadius: 100,
                    backgroundColor: colorTerziario || '#1a1a2e',
                    color: '#ffffff',
                    fontSize: 30,
                    fontWeight: 700,
                    textAlign: 'center',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
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
              <div style={{ padding: '7% 8% 0%', flexShrink: 0 }}>
                <div style={{ fontSize: 28, color: '#999', marginBottom: 24, letterSpacing: '0.05em' }}>
                  {slide.numero} / {totalSlides}
                </div>
              </div>
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8%',
                textAlign: 'center',
                gap: 40,
              }}>
                <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1.2, color: '#1a1a1a' }}>
                  {slide.titolo}
                </div>
                <div style={{ fontSize: 40, color: '#555', lineHeight: 1.5 }}>
                  {slide.testo_cta || slide.testo}
                </div>
                <div style={{
                  padding: '28px 64px',
                  borderRadius: 100,
                  border: '4px solid #1a1a1a',
                  fontSize: 38,
                  fontWeight: 500,
                  color: '#1a1a1a',
                  background: 'transparent',
                  letterSpacing: '0.03em',
                }}>
                  {slide.bottone_cta || 'Scopri di più'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlideTemplate;
