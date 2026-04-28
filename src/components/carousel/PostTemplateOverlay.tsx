/**
 * PostTemplateOverlay — full-cover SVG background tinted with the brand colors.
 *
 * Approach:
 *  1. Render the SVG design as background image (preserves all gradients/shapes).
 *  2. Overlay a solid brand-primary layer with `mix-blend-mode: color` →
 *     replaces hue+saturation of the SVG with the brand, preserves luminosity
 *     (the structure of the design stays intact, but it's tinted brand color).
 *  3. Add a soft multiply pass to reinforce saturation in light areas.
 *  4. Add radial accents in secondary + tertiary colors for depth.
 *
 * `isolation: isolate` confines all blend modes to this overlay (they don't
 * affect content above or the white background underneath).
 */
import React from 'react';
import { getTemplateById } from '@/data/postTemplates';

interface Props {
  templateId: string | null | undefined;
  colors?: {
    primary: string;
    secondary: string;
    terziario: string;
  };
}

const PostTemplateOverlay: React.FC<Props> = ({ templateId, colors }) => {
  const tpl = React.useMemo(() => getTemplateById(templateId), [templateId]);
  if (!tpl) return null;

  // Fallback: no brand colors → show the original SVG as-is
  if (!colors) {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          backgroundImage: `url("${tpl.src}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      {/* 1. SVG design as background — keeps all shapes, gradients, structure */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${tpl.src}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* 2. Brand primary tint — `color` blend transfers hue+saturation,
             keeps luminosity → the design becomes a brand-colored version */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: colors.primary,
          mixBlendMode: 'color',
        }}
      />

      {/* 3. Reinforce brand color in light areas with a soft multiply pass */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: colors.primary,
          mixBlendMode: 'multiply',
          opacity: 0.18,
        }}
      />

      {/* 4. Secondary brand accent — radial highlight in upper-right */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 78% 22%, ${colors.secondary} 0%, transparent 55%)`,
          mixBlendMode: 'multiply',
          opacity: 0.35,
        }}
      />

      {/* 5. Tertiary accent in the opposite corner for visual balance */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 15% 90%, ${colors.terziario} 0%, transparent 38%)`,
          mixBlendMode: 'multiply',
          opacity: 0.22,
        }}
      />
    </div>
  );
};

export default PostTemplateOverlay;
