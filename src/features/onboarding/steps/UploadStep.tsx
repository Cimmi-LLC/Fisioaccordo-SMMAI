// Step 1: caricamento logo (obbligatorio) e fino a 6 post esistenti.
// Se il brand ha gia un logo nel kit, viene proposto precaricato: l'utente
// puo tenerlo o sostituirlo.
import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, RefreshCw } from 'lucide-react';

interface UploadStepProps {
  busy: boolean;
  /** Logo gia presente nel kit del brand (brands.logo_url), se esiste. */
  existingLogoUrl?: string | null;
  /** logo === null significa: usa il logo esistente del kit. */
  onSubmit: (logo: File | null, posts: File[]) => void;
}

const MAX_POSTS = 6;

const UploadStep: React.FC<UploadStepProps> = ({ busy, existingLogoUrl, onSubmit }) => {
  const [logo, setLogo] = useState<File | null>(null);
  const [useExisting, setUseExisting] = useState(!!existingLogoUrl);
  const [posts, setPosts] = useState<File[]>([]);
  const logoRef = useRef<HTMLInputElement>(null);
  const postsRef = useRef<HTMLInputElement>(null);

  // Il logo del kit arriva in modo asincrono dopo il mount: appena c'e,
  // diventa la scelta di default (finche l'utente non carica un file suo).
  React.useEffect(() => {
    if (existingLogoUrl && !logo) setUseExisting(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingLogoUrl]);

  const previews = (files: File[]) => files.map((f) => URL.createObjectURL(f));
  const hasLogo = !!logo || (useExisting && !!existingLogoUrl);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-black mb-1" style={{ color: 'var(--ink)' }}>
          Carica i materiali del tuo brand
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
          {existingLogoUrl
            ? `Uso il logo gia salvato nel tuo brand. I post esistenti aiutano l'AI a capire il tuo stile (fino a ${MAX_POSTS}).`
            : `Il logo e obbligatorio. I post esistenti aiutano l'AI a capire il tuo stile (fino a ${MAX_POSTS}).`}
        </p>
      </div>

      {/* Logo */}
      {useExisting && existingLogoUrl && !logo ? (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ border: '2px solid var(--viola)', backgroundColor: 'var(--viola-dim)' }}
        >
          <div className="flex items-center justify-center gap-3">
            <img src={existingLogoUrl} alt="logo" style={{ height: 64, objectFit: 'contain' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Logo del tuo brand</span>
          </div>
          <button
            onClick={() => { setUseExisting(false); logoRef.current?.click(); }}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: 'var(--viola)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            <RefreshCw className="h-3 w-3" /> Sostituisci
          </button>
          <input
            ref={logoRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogo(f); else setUseExisting(!!existingLogoUrl); }}
          />
        </div>
      ) : (
        <div
          onClick={() => logoRef.current?.click()}
          className="rounded-2xl p-6 text-center cursor-pointer"
          style={{ border: '2px dashed var(--viola)', backgroundColor: 'var(--viola-dim)' }}
        >
          <input
            ref={logoRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogo(f); }}
          />
          {logo ? (
            <div className="flex items-center justify-center gap-3">
              <img src={URL.createObjectURL(logo)} alt="logo" style={{ height: 64, objectFit: 'contain' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{logo.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLogo(null);
                  setUseExisting(!!existingLogoUrl);
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8" style={{ color: 'var(--viola)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--viola)' }}>Logo del tuo studio *</span>
              <span className="text-[11px]" style={{ color: 'var(--ink3)' }}>PNG o JPG, meglio se su sfondo trasparente</span>
            </div>
          )}
        </div>
      )}

      {/* Post esistenti */}
      <div
        onClick={() => postsRef.current?.click()}
        className="rounded-2xl p-6 text-center cursor-pointer"
        style={{ border: '2px dashed var(--line)', backgroundColor: 'var(--bg)' }}
      >
        <input
          ref={postsRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setPosts((prev) => [...prev, ...files].slice(0, MAX_POSTS));
          }}
        />
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-6 w-6" style={{ color: 'var(--ink3)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--ink2)' }}>
            Post Instagram esistenti (opzionale, {posts.length}/{MAX_POSTS})
          </span>
        </div>
        {posts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {previews(posts).map((src, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={src} alt={`post ${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10 }} />
                <button
                  onClick={(e) => { e.stopPropagation(); setPosts((p) => p.filter((_, j) => j !== i)); }}
                  style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                    borderRadius: '50%', background: 'var(--ink)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontSize: 11, lineHeight: 1,
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => hasLogo && onSubmit(logo, posts)}
        disabled={!hasLogo || busy}
        className="w-full text-white text-[13px] font-black uppercase py-3.5 rounded-xl disabled:opacity-50"
        style={{ backgroundColor: 'var(--viola)', border: 'none', cursor: hasLogo && !busy ? 'pointer' : 'not-allowed', letterSpacing: '0.5px' }}
      >
        {busy ? 'Caricamento…' : 'Continua'}
      </button>
    </div>
  );
};

export default UploadStep;
