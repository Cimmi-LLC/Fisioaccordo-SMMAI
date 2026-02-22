import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, Image, Loader2, Check } from 'lucide-react';
import { useUserPhotos, UserPhoto } from '@/hooks/useUserPhotos';

interface PhotoLibraryProps {
  selectable?: boolean;
  selectedPhotos?: string[];
  onSelectPhoto?: (url: string) => void;
  onDeselectPhoto?: (url: string) => void;
}

const CATEGORIES = ['generale', 'logo', 'team', 'clinica', 'trattamento', 'prodotto', 'prima-dopo'];

const PhotoLibrary: React.FC<PhotoLibraryProps> = ({ selectable, selectedPhotos = [], onSelectPhoto, onDeselectPhoto }) => {
  const { photos, loading, uploading, uploadPhoto, deletePhoto, updateCategory } = useUserPhotos();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [uploadCategory, setUploadCategory] = useState('generale');

  const filteredPhotos = filterCategory === 'all' ? photos : photos.filter(p => p.category === filterCategory);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) continue;
      await uploadPhoto(file, uploadCategory);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelect = (photo: UserPhoto) => {
    if (!selectable) return;
    const isSelected = selectedPhotos.includes(photo.public_url);
    if (isSelected) onDeselectPhoto?.(photo.public_url);
    else onSelectPhoto?.(photo.public_url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Image className="h-5 w-5" /> Le Mie Foto
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={uploadCategory} onValueChange={setUploadCategory}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="sm">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Carica
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileSelect} />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Filtra" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredPhotos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nessuna foto. Carica le tue immagini!</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {filteredPhotos.map(photo => {
              const isSelected = selectedPhotos.includes(photo.public_url);
              return (
                <div
                  key={photo.id}
                  className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'}`}
                  onClick={() => toggleSelect(photo)}
                >
                  <img src={photo.public_url} alt={photo.filename} className="w-full aspect-square object-cover" />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <Badge className="absolute bottom-1 left-1 text-[10px] opacity-80">{photo.category}</Badge>
                  <button
                    onClick={e => { e.stopPropagation(); deletePhoto(photo); }}
                    className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhotoLibrary;
