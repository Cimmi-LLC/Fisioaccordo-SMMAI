import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, Tag as TagIcon } from 'lucide-react';
import { useBrandPhotos, type BrandPhoto } from '@/hooks/useBrandPhotos';

interface Props {
  brandId: string | null;
}

/**
 * Brand photo pool — uploaded photos used preferentially over Freepik stock
 * when generating post/story images. Each photo can have a caption + tags
 * for keyword matching against the slide's photoQuery.
 */
const BrandPhotoGallery: React.FC<Props> = ({ brandId }) => {
  const { photos, loading, busy, addFromFile, remove, updateMeta } = useBrandPhotos(brandId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState('');
  const [draftTags, setDraftTags] = useState('');

  if (!brandId) {
    return (
      <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
        Seleziona prima un brand per gestire le foto.
      </p>
    );
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (f.size > 8 * 1024 * 1024) {
        // 8MB limit per photo
        console.warn(`Skipping ${f.name}: too large (${f.size} bytes)`);
        continue;
      }
      await addFromFile(f);
    }
  };

  const startEdit = (photo: BrandPhoto) => {
    setEditingId(photo.id);
    setDraftCaption(photo.caption || '');
    setDraftTags(photo.tags.join(', '));
  };
  const saveEdit = async (photo: BrandPhoto) => {
    const tags = draftTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    await updateMeta(photo, { caption: draftCaption.trim() || null, tags });
    setEditingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[14px] font-black" style={{ color: 'var(--ink)' }}>
            Foto del brand <span className="text-[11px] font-normal" style={{ color: 'var(--ink3)' }}>({photos.length})</span>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink3)' }}>
            Le tue foto vengono usate prima di Freepik. Aggiungi tag e didascalia per matching migliore con i contenuti.
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg disabled:opacity-50"
          style={{ background: 'var(--rosa)', color: '#fff', border: 'none', cursor: busy ? 'wait' : 'pointer', letterSpacing: '0.4px' }}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {busy ? 'Carico…' : 'Aggiungi foto'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--viola)' }} />
        </div>
      ) : photos.length === 0 ? (
        <div
          className="text-center py-10 rounded-xl"
          style={{ border: '2px dashed var(--line)', background: 'var(--bg)' }}
        >
          <Upload className="h-6 w-6 mx-auto mb-2 opacity-30" style={{ color: 'var(--ink3)' }} />
          <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
            Nessuna foto. Aggiungi 5-15 foto del tuo studio (esercizi, trattamenti, ambienti) per usarle nei post.
          </p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {photos.map(photo => {
            const isEditing = editingId === photo.id;
            return (
              <div
                key={photo.id}
                className="relative rounded-xl overflow-hidden group"
                style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
              >
                <div className="relative" style={{ aspectRatio: '1 / 1' }}>
                  <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
                  <button
                    onClick={() => remove(photo)}
                    disabled={busy}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer' }}
                    title="Elimina foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {isEditing ? (
                  <div className="p-2 flex flex-col gap-1.5">
                    <input
                      value={draftCaption}
                      onChange={e => setDraftCaption(e.target.value)}
                      placeholder="Didascalia"
                      className="text-[10px] rounded px-1.5 py-1 outline-none"
                      style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
                    />
                    <input
                      value={draftTags}
                      onChange={e => setDraftTags(e.target.value)}
                      placeholder="tag1, tag2 (inglese)"
                      className="text-[10px] rounded px-1.5 py-1 outline-none"
                      style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => saveEdit(photo)}
                        className="flex-1 text-[10px] font-bold py-1 rounded"
                        style={{ background: 'var(--viola)', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        Salva
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 text-[10px] py-1 rounded"
                        style={{ background: 'transparent', color: 'var(--ink3)', border: '1px solid var(--line)', cursor: 'pointer' }}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 flex flex-col gap-1 cursor-pointer" onClick={() => startEdit(photo)} title="Click per modificare">
                    <div className="text-[10px] truncate" style={{ color: photo.caption ? 'var(--ink)' : 'var(--ink3)', fontStyle: photo.caption ? 'normal' : 'italic' }}>
                      {photo.caption || '+ aggiungi didascalia'}
                    </div>
                    <div className="flex flex-wrap gap-0.5 items-center min-h-[14px]">
                      {photo.tags.length > 0 ? (
                        photo.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'var(--viola-dim)', color: 'var(--viola)' }}>{t}</span>
                        ))
                      ) : (
                        <span className="text-[8px] flex items-center gap-0.5" style={{ color: 'var(--ink3)' }}>
                          <TagIcon className="h-2 w-2" /> nessun tag
                        </span>
                      )}
                      {photo.tags.length > 3 && (
                        <span className="text-[8px]" style={{ color: 'var(--ink3)' }}>+{photo.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BrandPhotoGallery;
