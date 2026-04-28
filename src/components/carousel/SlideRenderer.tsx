import React from 'react';
import type { CarouselSlideData, SlideRenderConfig } from '@/types/carousel';

interface SlideRendererProps {
  slide: CarouselSlideData;
  config: SlideRenderConfig;
  totalSlides: number;
  ctaFinale?: string;
  scale?: number;
  className?: string;
  id?: string;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  config,
  totalSlides,
  ctaFinale,
  scale = 1,
  className = '',
  id,
}) => {
  const isSquare = config.format === '1:1';
  const baseW = 1080;
  const baseH = isSquare ? 1080 : 1920;
  const w = baseW * scale;
  const h = baseH * scale;
  const fs = (px: number) => px * scale;

  const tipo = slide.tipo || (slide.numero === 1 ? 'cover' : slide.numero === totalSlides ? 'cta' : 'content');

  return (
    <div
      id={id}
      className={`relative overflow-hidden ${className}`}
      style={{ width: w, height: h, borderRadius: fs(16), fontFamily: `${config.brandFont}, sans-serif`, flexShrink: 0 }}
    >
      {/* Background */}
      {tipo === 'content' && slide.imageUrl ? (
        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{
          background: tipo === 'cover'
            ? `linear-gradient(160deg, ${config.brandColor} 0%, ${config.brandColorSecondary} 100%)`
            : tipo === 'cta'
              ? `linear-gradient(160deg, ${config.brandColorSecondary} 0%, ${config.brandColor} 100%)`
              : `linear-gradient(135deg, ${config.brandColor} 0%, ${config.brandColorSecondary} 100%)`,
        }} />
      )}

      {/* Overlay for content slides with images */}
      {tipo === 'content' && slide.imageUrl && (
        <div className="absolute inset-0" style={{ backgroundColor: config.brandColor, opacity: config.overlayOpacity }} />
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col" style={{ padding: fs(48) }}>
        {/* Logo */}
        {config.logoUrl && (
          <div style={{ marginBottom: fs(20), flexShrink: 0 }}>
            <img src={config.logoUrl} alt="Logo" style={{
              height: fs(tipo === 'cover' ? 56 : 40), width: 'auto', objectFit: 'contain',
              filter: 'brightness(0) invert(1)', opacity: 0.9,
            }} />
          </div>
        )}

        {/* ── COVER slide ── */}
        {tipo === 'cover' && (
          <div className="flex-1 flex flex-col justify-center">
            <div style={{
              fontSize: fs(56), fontWeight: 900, color: '#ffffff', lineHeight: 1.1,
              letterSpacing: fs(-2), marginBottom: fs(16),
              textShadow: `0 ${fs(2)}px ${fs(12)}px rgba(0,0,0,0.3)`,
            }}>
              {slide.titolo}
            </div>
            <div style={{
              fontSize: fs(24), color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, maxWidth: '90%',
            }}>
              {slide.testo}
            </div>
            {/* Swipe hint */}
            <div style={{ marginTop: fs(32), display: 'flex', alignItems: 'center', gap: fs(8) }}>
              <div style={{ width: fs(40), height: fs(3), backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: fs(2) }} />
              <span style={{ fontSize: fs(13), color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: fs(1) }}>
                Scorri
              </span>
            </div>
          </div>
        )}

        {/* ── CONTENT slide ── */}
        {tipo === 'content' && (
          <div className="flex-1 flex flex-col justify-center">
            <div style={{
              fontSize: fs(44), fontWeight: 900, color: '#ffffff', lineHeight: 1.15,
              letterSpacing: fs(-1.5), marginBottom: fs(20),
              textShadow: `0 ${fs(2)}px ${fs(8)}px rgba(0,0,0,0.3)`,
            }}>
              {slide.titolo}
            </div>
            <div style={{
              fontSize: fs(22), color: 'rgba(255,255,255,0.92)', lineHeight: 1.6,
              textShadow: `0 ${fs(1)}px ${fs(4)}px rgba(0,0,0,0.2)`,
              maxHeight: isSquare ? fs(320) : fs(600), overflow: 'hidden',
            }}>
              {slide.testo}
            </div>
          </div>
        )}

        {/* ── CTA slide ── */}
        {tipo === 'cta' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div style={{
              fontSize: fs(48), fontWeight: 900, color: '#ffffff', lineHeight: 1.15,
              letterSpacing: fs(-1.5), marginBottom: fs(20),
              textShadow: `0 ${fs(2)}px ${fs(8)}px rgba(0,0,0,0.3)`,
            }}>
              {slide.titolo}
            </div>
            <div style={{
              fontSize: fs(22), color: 'rgba(255,255,255,0.85)', lineHeight: 1.5,
              maxWidth: '85%', marginBottom: fs(32),
            }}>
              {slide.testo_cta || slide.testo || ctaFinale}
            </div>
            {/* CTA button */}
            <div style={{
              display: 'inline-block', padding: `${fs(18)}px ${fs(56)}px`,
              backgroundColor: '#ffffff', color: config.brandColor,
              borderRadius: fs(50), fontSize: fs(20), fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: fs(1),
            }}>
              {slide.bottone_cta || ctaFinale || 'Scopri di più'}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center justify-between" style={{ flexShrink: 0, marginTop: fs(16) }}>
          <div className="flex" style={{ gap: fs(4) }}>
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div key={i} style={{
                width: i === slide.numero - 1 ? fs(20) : fs(6), height: fs(6), borderRadius: fs(3),
                backgroundColor: i === slide.numero - 1 ? '#ffffff' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.2s',
              }} />
            ))}
          </div>
          <div style={{ fontSize: fs(14), fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
            {slide.numero}/{totalSlides}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideRenderer;
