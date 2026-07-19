import React, { useEffect, useState } from 'react';
import type { CarouselSlideData } from '@/types/carousel';

/**
 * Template "Notturno neon" — stile FisioAccordo:
 * fondo nero, titolo bianco con seconda riga turchese, arco luminoso,
 * griglia di puntini, doppia freccia e contatore slide.
 * Non sostituisce SlideTemplate: e uno stile alternativo selezionabile.
 */

interface Props {
  slide: CarouselSlideData;
  totalSlides: number;
  accent?: string;
  fontFamily?: string;
  scale?: number;
  id?: string;
  onRetryImage?: () => void;
}

const W = 1080;
const H = 1350;
const DEFAULT_ACCENT = '#00E5C8';

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

/** Divide il titolo: la seconda meta va in turchese, come nel format originale. */
function splitTitolo(testo: string): { bianco: string; accento: string } {
  const pulito = (testo || '').trim();
  if (!pulito) return { bianco: '', accento: '' };
  const parole = pulito.split(/\s+/);
  if (parole.length < 4) return { bianco: pulito, accento: '' };
  const taglio = Math.ceil(parole.length / 2);
  return { bianco: parole.slice(0, taglio).join(' '), accento: parole.slice(taglio).join(' ') };
}

/** Griglia di puntini decorativa. */
const Puntini: React.FC<{ accent: string; top?: number; left?: number; right?: number; bottom?: number }> = ({ accent, top, left, right, bottom }) => (
  <div style={{ position: 'absolute', top, left, right, bottom, display: 'grid', gridTemplateColumns: 'repeat(7, 14px)', gap: 10, opacity: 0.55, zIndex: 1 }}>
    {Array.from({ length: 35 }).map((_, i) => (
      <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'block' }} />
    ))}
  </div>
);

/** Arco luminoso sfocato sul lato destro. */
const ArcoLuminoso: React.FC<{ accent: string }> = ({ accent }) => (
  <div style={{ position: 'absolute', right: -260, bottom: -180, width: 900, height: 900, borderRadius: '50%', border: '18px solid ' + accent, filter: 'blur(26px)', opacity: 0.75, zIndex: 1, pointerEvents: 'none' }} />
);

/** Doppia freccia in basso a destra. */
const Frecce: React.FC<{ accent: string }> = ({ accent }) => (
  <div style={{ position: 'absolute', right: 64, bottom: 56, display: 'flex', gap: 2, zIndex: 4, filter: 'drop-shadow(0 0 14px ' + accent + ')' }}>
    {[0, 1, 2].map((i) => (
      <svg key={i} width="34" height="46" viewBox="0 0 24 32" fill="none">
        <path d="M6 4 L18 16 L6 28" stroke={accent} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ))}
  </div>
);

const SlideTemplateNeon: React.FC<Props> = ({ slide, totalSlides, accent = DEFAULT_ACCENT, fontFamily = 'Poppins', scale = 1, id, onRetryImage }) => {
  useEffect(() => { loadGoogleFont(fontFamily); }, [fontFamily]);
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [slide.imageUrl]);

  const font = fontFamily.includes(',') ? fontFamily : "'" + fontFamily + "', sans-serif";
  const tipo = slide.tipo || 'content';
  const haImmagine = Boolean(slide.imageUrl) && !imgError;

  const titoloGrezzo = tipo === 'cover' ? (slide.hook || slide.titolo || '') : (slide.titolo || '');
  const { bianco, accento } = splitTitolo(titoloGrezzo);
  const corpo = tipo === 'cta' ? (slide.testo_cta || slide.testo || '') : (slide.sottotitolo || slide.testo || '');
  const numero = String(slide.numero || 1).padStart(2, '0');
  const totale = String(totalSlides || 1).padStart(2, '0');

  return (
    <div id={id} style={{ width: W * scale, height: H * scale, overflow: 'hidden' }}>
      <div style={{
        width: W,
        height: H,
        transform: scale !== 1 ? 'scale(' + scale + ')' : undefined,
        transformOrigin: 'top left',
        position: 'relative',
        overflow: 'hidden',
        background: '#000000',
        fontFamily: font,
        boxSizing: 'border-box',
      }}>

        <ArcoLuminoso accent={accent} />
        <Puntini accent={accent} top={70} right={70} />
        <Puntini accent={accent} bottom={150} left={70} />

        {totalSlides > 1 && (
          <div style={{ position: 'absolute', top: 66, right: 84, fontSize: 30, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', zIndex: 4 }}>
            {numero}/{totale}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 3, height: '100%', display: 'flex', flexDirection: 'column', padding: '150px 88px 120px' }}>

          <div style={{ fontSize: 82, fontWeight: 900, lineHeight: 1.06, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: 34 }}>
            {bianco}
            {accento && <><br /><span style={{ color: accent }}>{accento}</span></>}
          </div>

          {corpo && (
            <div style={{ fontSize: 36, fontWeight: 400, lineHeight: 1.42, color: 'rgba(255,255,255,0.92)', marginBottom: 30, maxWidth: '86%' }}>
              {corpo}
            </div>
          )}

          {tipo === 'cta' && (
            <div style={{ fontSize: 38, fontWeight: 800, color: accent, marginBottom: 10 }}>
              {slide.bottone_cta || 'Scopri di piu'}
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginTop: 20 }}>
            {haImmagine ? (
              <img
                src={slide.imageUrl}
                alt="slide"
                onError={() => setImgError(true)}
                style={{ maxWidth: '96%', maxHeight: '100%', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 0 60px ' + accent + '55)' }}
              />
            ) : (
              <div style={{ width: '100%', height: '70%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, border: '1px dashed rgba(255,255,255,0.18)', borderRadius: 24 }}>
                <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.45)' }}>Immagine non disponibile</span>
                {onRetryImage && (
                  <div onClick={onRetryImage} style={{ padding: '10px 28px', borderRadius: 50, border: '2px solid ' + accent, color: accent, fontSize: 20, fontWeight: 700, cursor: 'pointer' }}>
                    Riprova
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Frecce accent={accent} />
      </div>
    </div>
  );
};

export default SlideTemplateNeon;
