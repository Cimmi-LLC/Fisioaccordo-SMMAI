import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Upload, FolderOpen, X, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface TextZone {
  id: string;
  y: number;
  height: number;
  align: string;
  fontSize: string;
}

interface PendingFile {
  file: File;
  preview: string;
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

interface TemplateUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUploaded: () => void;
}

const DEFAULT_ZONES: TextZone[] = [
  { id: 'top', y: 5, height: 20, align: 'center', fontSize: 'lg' },
  { id: 'center', y: 35, height: 40, align: 'center', fontSize: 'sm' },
  { id: 'bottom', y: 80, height: 15, align: 'center', fontSize: 'xs' },
];

const TemplateUploader: React.FC<TemplateUploaderProps> = ({ open, onOpenChange, onTemplateUploaded }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [category, setCategory] = useState('carosello');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textZones, setTextZones] = useState<TextZone[]>(DEFAULT_ZONES);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files) return;
    const pngFiles = Array.from(files).filter(f => f.type === 'image/png' || f.type === 'image/jpeg' || f.type === 'image/webp');
    if (pngFiles.length === 0) {
      toast({ title: "Nessuna immagine trovata", description: "Seleziona file PNG, JPG o WebP", variant: "destructive" });
      return;
    }

    const newPending: PendingFile[] = pngFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      status: 'pending' as const,
    }));

    setPendingFiles(prev => [...prev, ...newPending]);
  }, [toast]);

  const removePending = (index: number) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updatePendingName = (index: number, name: string) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name };
      return updated;
    });
  };

  const updateZone = (zoneId: string, field: string, value: number | string) => {
    setTextZones(prev => prev.map(z => z.id === zoneId ? { ...z, [field]: value } : z));
  };

  const uploadAll = async () => {
    if (!user || pendingFiles.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < pendingFiles.length; i++) {
      const pf = pendingFiles[i];
      if (pf.status === 'done') continue;

      setPendingFiles(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: 'uploading' };
        return updated;
      });

      try {
        const ext = pf.file.name.split('.').pop() || 'png';
        const filePath = `templates/${user.id}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(filePath, pf.file, { contentType: pf.file.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('user-photos')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('canva_templates')
          .insert([{
            name: pf.name || `Template ${i + 1}`,
            category,
            background_url: urlData.publicUrl,
            text_zones: { zones: textZones } as any,
            text_color: textColor,
            is_default: false,
            user_id: user.id,
          }]);

        if (dbError) throw dbError;

        setPendingFiles(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'done' };
          return updated;
        });
      } catch (err) {
        console.error('Upload error:', err);
        setPendingFiles(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'error' };
          return updated;
        });
      }
    }

    setIsUploading(false);
    const doneCount = pendingFiles.filter(f => f.status !== 'error').length;
    toast({ title: `✅ ${doneCount} template caricati!`, description: "Ora puoi usarli nei tuoi post" });
    onTemplateUploaded();
    // cleanup
    pendingFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setPendingFiles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carica Template</DialogTitle>
          <DialogDescription>Carica uno o più PNG esportati da Canva (1080×1080). Puoi anche caricare un'intera cartella.</DialogDescription>
        </DialogHeader>

        {/* Upload buttons */}
        <div className="flex gap-3">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={e => handleFilesSelected(e.target.files)} />
          <input ref={folderInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" {...{ webkitdirectory: '', directory: '' } as any} onChange={e => handleFilesSelected(e.target.files)} />
          
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
            <Upload className="mr-2 h-4 w-4" /> File singoli
          </Button>
          <Button variant="outline" onClick={() => folderInputRef.current?.click()} className="flex-1">
            <FolderOpen className="mr-2 h-4 w-4" /> Cartella intera
          </Button>
        </div>

        {/* Pending files grid */}
        {pendingFiles.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">{pendingFiles.length} file selezionati</Label>
            <div className="grid grid-cols-3 gap-3 max-h-[250px] overflow-y-auto">
              {pendingFiles.map((pf, i) => (
                <div key={i} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={pf.preview} alt={pf.name} className="w-full h-full object-cover" />
                  </div>
                  {pf.status === 'uploading' && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  {pf.status === 'done' && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
                      <Check className="h-6 w-6 text-green-500" />
                    </div>
                  )}
                  {pf.status === 'pending' && (
                    <button onClick={() => removePending(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <Input
                    value={pf.name}
                    onChange={e => updatePendingName(i, e.target.value)}
                    className="mt-1 text-xs h-7"
                    placeholder="Nome template"
                    disabled={pf.status !== 'pending'}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {pendingFiles.length > 0 && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carosello">Carosello</SelectItem>
                    <SelectItem value="post">Post Singolo</SelectItem>
                    <SelectItem value="storia">Storia</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="all">Tutti i formati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Colore Testo</Label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setTextColor('#FFFFFF')} className={`w-8 h-8 rounded-full bg-white border-2 ${textColor === '#FFFFFF' ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`} />
                  <button onClick={() => setTextColor('#000000')} className={`w-8 h-8 rounded-full bg-black border-2 ${textColor === '#000000' ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`} />
                  <Input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 p-0 border-0 cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Text zone editor */}
            <div className="space-y-3">
              <Label className="font-medium">Zone di Testo</Label>
              {textZones.map(zone => (
                <div key={zone.id} className="flex items-center gap-3 text-sm">
                  <span className="w-16 capitalize font-medium text-muted-foreground">{zone.id}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6">Y</span>
                      <Slider value={[zone.y]} min={0} max={90} step={1} onValueChange={([v]) => updateZone(zone.id, 'y', v)} />
                      <span className="text-xs text-muted-foreground w-8">{zone.y}%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground w-6">H</span>
                      <Slider value={[zone.height]} min={5} max={50} step={1} onValueChange={([v]) => updateZone(zone.id, 'height', v)} />
                      <span className="text-xs text-muted-foreground w-8">{zone.height}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live preview */}
            {pendingFiles[0] && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Anteprima zone di testo</Label>
                <div className="relative aspect-square w-48 mx-auto rounded-lg overflow-hidden border border-border">
                  <img src={pendingFiles[0].preview} className="w-full h-full object-cover" alt="preview" />
                  {textZones.map(zone => (
                    <div
                      key={zone.id}
                      className="absolute left-0 right-0 border border-dashed border-primary/50 flex items-center justify-center"
                      style={{ top: `${zone.y}%`, height: `${zone.height}%` }}
                    >
                      <span className="text-[8px] font-bold px-1 rounded bg-primary/20" style={{ color: textColor }}>
                        {zone.id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={uploadAll} disabled={isUploading || pendingFiles.length === 0}>
            {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento...</> : `Carica ${pendingFiles.length} template`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateUploader;
