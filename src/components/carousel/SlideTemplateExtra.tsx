import React, { useEffect, useState } from 'react';
import type { CarouselSlideData } from '@/types/carousel';

/**
 * Due template di base aggiuntivi:
 *  - Referto: chiaro, editoriale, autorevole. Per contenuti educativi.
 *  - Copertina: immagine a tutta slide con testo grande sovrapposto. Per campagne e cover.
 */

interface Props {
  slide: CarouselSlideData;
  totalSlides: number;
  colorPrimary?: string;
  colorSecondary?: string;
  fontFamily?: string;
  logoUrl?: string;
  logoInitials?: string;
  scale?: number;
  id?: string;
  onRetryImage?: () => void;
}

const W = 1080;
const H = 1350;

function loadGoogleFont(font: string) {
  const family = font.replace(/'/g, '').split(',')[0].trim();
  const elId = 'gfont-' + family.replace(/\s+/g, '-');
  if (document.getElementById(elId)) return;
  const link = document.createElement('link');
  link.id = elId;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family) + ':wght@400;600;800;900&display=swap';
  document.head.appendChild(link);
}

function usaFont(fontFamily: string) {
  return fontFamily.includes(',') ? fontFamily : "'" + fontFamily + "', sans-serif";
}

function testiDellaSlide(slide: CarouselSlideData) {
  const tipo = slide.tipo || 'content';
  const titolo = tipo === 'cover' ? (slide.hook || slide.titolo || '') : (slide.titolo || '');
  const corpo = tipo === 'cta' ? (slide.testo_cta || slide.testo || '') : (slide.sottotitolo || slide.testo || '');
  return { tipo, titolo, corpo };
}

/* ═══════════ TEMPLATE "REFERTO" — chiaro ed editoriale ═══════════ */
export const SlideTemplateReferto: React.FC<Props> = ({ slide, totalSlides, colorPrimary = '#554697', fontFamily = 'Poppins', scale = 1, id, onRetryImage }) => {
  useEffect(() => { loadGoogleFont(fontFamily); }, [fontFamily]);
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [slide.imageUrl]);
  const { tipo, titolo, corpo } = testiDellaSlide(slide);
  const haImmagine = Boolean(slide.imageUrl) && !imgError;
  const numero = String(slide.numero || 1).padStart(2, '0');

  return (
    <div id={id} style={{ width: W * scale, height: H * scale, overflow: 'hidden' }}>
      <div style={{ width: W, height: H, transform: scale !== 1 ? 'scale(' + scale + ')' : undefined, transformOrigin: 'top left', position: 'relative', overflow: 'hidden', background: '#FBFAF7', fontFamily: usaFont(fontFamily), boxSizing: 'border-box' }}>

        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 18, background: colorPrimary }} />

        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '110px 92px 96px 118px' }}>

          {totalSlides > 1 && (
            <div style={{ fontSize: 88, fontWeight: 900, color: colorPrimary, opacity: 0.18, lineHeight: 1, marginBottom: 18 }}>
              {numero}
            </div>
          )}

          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, color: '#141414', letterSpacing: '-0.02em', marginBottom: 26 }}>
            {titolo}
          </div>

          <div style={{ width: 120, height: 6, background: colorPrimary, marginBottom: 26 }} />

          {corpo && (
            <div style={{ fontSize: 36, lineHeight: 1.5, color: '#3d3d3d', maxWidth: '92%' }}>
              {corpo}
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, marginTop: 40, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: haImmagine ? undefined : '#ECE9E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {haImmagine ? (
                <img src={slide.imageUrl} alt="slide" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 24, color: '#9a9a9a' }}>Immagine non disponibile</span>
                  {onRetryImage && (
                    <div onClick={onRetryImage} style={{ padding: '10px 26px', borderRadius: 6, border: '2px solid ' + colorPrimary, color: colorPrimary, fontSize: 20, fontWeight: 700, cursor: 'pointer' }}>Riprova</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {tipo === 'cta' && (
            <div style={{ marginTop: 28, fontSize: 34, fontWeight: 800, color: colorPrimary }}>
              {slide.bottone_cta || 'Scopri di piu'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════ TEMPLATE "COPERTINA" — immagine piena e testo sopra ═══════════ */
export const SlideTemplateCopertina: React.FC<Props> = ({ slide, totalSlides, colorPrimary = '#E6007E', fontFamily = 'Poppins', scale = 1, id, onRetryImage }) => {
  useEffect(() => { loadGoogleFont(fontFamily); }, [fontFamily]);
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [slide.imageUrl]);
  const { tipo, titolo, corpo } = testiDellaSlide(slide);
  const haImmagine = Boolean(slide.imageUrl) && !imgError;
  const numero = String(slide.numero || 1).padStart(2, '0');
  const totale = String(totalSlides || 1).padStart(2, '0');

  return (
    <div id={id} style={{ width: W * scale, height: H * scale, overflow: 'hidden' }}>
      <div style={{ width: W, height: H, transform: scale !== 1 ? 'scale(' + scale + ')' : undefined, transformOrigin: 'top left', position: 'relative', overflow: 'hidden', background: '#111111', fontFamily: usaFont(fontFamily), boxSizing: 'border-box' }}>

        {haImmagine ? (
          <img src={slide.imageUrl} alt="slide" onError={() => setImgError(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#1c1c1c' }}>
            <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.45)' }}>Immagine non disponibile</span>
            {onRetryImage && (
              <div onClick={onRetryImage} style={{ padding: '10px 26px', borderRadius: 40, border: '2px solid ' + colorPrimary, color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}>Riprova</div>
            )}
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.72) 34%, rgba(0,0,0,0.12) 66%, rgba(0,0,0,0.35) 100%)' }} />

        {totalSlides > 1 && (
          <div style={{ position: 'absolute', top: 64, right: 78, fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em' }}>
            {numero}/{totale}
          </div>
        )}

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 84px 104px' }}>
          <div style={{ width: 96, height: 8, background: colorPrimary, marginBottom: 30 }} />
          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.025em', color: '#ffffff', marginBottom: 22, textShadow: '0 4px 30px rgba(0,0,0,0.55)' }}>
            {titolo}
          </div>
          {corpo && (
            <div style={{ fontSize: 36, lineHeight: 1.45, color: 'rgba(255,255,255,0.93)', maxWidth: '88%' }}>
              {corpo}
            </div>
          )}
          {tipo === 'cta' && (
            <div style={{ marginTop: 34, display: 'inline-block', padding: '22px 52px', borderRadius: 100, background: colorPrimary, color: '#fff', fontSize: 34, fontWeight: 800 }}>
              {slide.bottone_cta || 'Scopri di piu'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlideTemplateReferto;
