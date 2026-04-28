import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';

interface Props {
  url: string;
  onChange: (u: string) => void;
  shape?: 'circle' | 'square';
  /** When true, attempts to strip white background and re-encode as transparent PNG */
  autoCleanBackground?: boolean;
  size?: number;
}

/**
 * Reusable single-image upload control.
 * Reads file → dataURL → optionally pipes through processLogoIfNeeded
 * (background removal) before calling `onChange`.
 */
const SinglePhotoUpload: React.FC<Props> = ({
  url,
  onChange,
  shape = 'square',
  autoCleanBackground,
  size = 100,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result !== 'string') return;
      let value = reader.result;
      if (autoCleanBackground) {
        setProcessing(true);
        try {
          const { processLogoIfNeeded } = await import('@/utils/processLogo');
          value = await processLogoIfNeeded(value);
        } catch (err) {
          console.warn('Logo cleaning failed:', err);
        }
        setProcessing(false);
      }
      onChange(value);
    };
    reader.readAsDataURL(file);
  };

  const borderRadius = shape === 'circle' ? '50%' : 12;

  return (
    <div
      className="relative group cursor-pointer"
      style={{ width: size, height: size }}
      onClick={() => !processing && inputRef.current?.click()}
    >
      {url ? (
        <img
          src={url}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius,
            objectFit: 'contain',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--line)',
          }}
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center"
          style={{
            width: size,
            height: size,
            borderRadius,
            border: '2px dashed var(--line)',
            backgroundColor: 'var(--bg)',
          }}
        >
          <Upload className="h-5 w-5 mb-1" style={{ color: 'var(--ink3)' }} />
          <span className="text-[10px]" style={{ color: 'var(--ink3)' }}>Carica</span>
        </div>
      )}
      {processing && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ borderRadius, backgroundColor: 'rgba(255,255,255,0.85)' }}
        >
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--viola)' }} />
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </div>
  );
};

export default SinglePhotoUpload;
