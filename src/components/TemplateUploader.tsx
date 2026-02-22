import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, FolderOpen, X, Loader2, Check, Plus, Trash2, ChevronDown, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface TemplateLayer {
  id: string;
  type: 'title' | 'number' | 'subtitle' | 'body' | 'cta' | 'banner' | 'image' | 'logo' | 'footer';
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: string;
  textTransform?: string;
  shadow?: { enabled: boolean; color: string; blur: number; offsetX: number; offsetY: number };
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  lineHeight?: number;
  letterSpacing?: number;
  opacity?: number;
  defaultText?: string;
}

interface TemplateBackground {
  type: 'solid' | 'gradient' | 'photo';
  value: string;
}

interface TemplatePhotoZone {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  objectFit: string;
}

const LAYER_TYPES = [
  { value: 'title', label: 'Titolo', icon: '📝' },
  { value: 'number', label: 'Numero Grande', icon: '🔢' },
  { value: 'subtitle', label: 'Sottotitolo', icon: '📋' },
  { value: 'body', label: 'Corpo Testo', icon: '📄' },
  { value: 'cta', label: 'Call to Action', icon: '🎯' },
  { value: 'banner', label: 'Banner', icon: '🏷️' },
  { value: 'image', label: 'Zona Immagine', icon: '🖼️' },
  { value: 'logo', label: 'Logo/Brand', icon: '⭐' },
  { value: 'footer', label: 'Footer', icon: '📌' },
] as const;

const FONT_OPTIONS = ['Arial', 'Arial Black', 'Impact', 'Montserrat', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New'];

const DEFAULT_LAYER_PROPS: Record<string, Partial<TemplateLayer>> = {
  title: { x: 10, y: 20, width: 80, height: 15, fontSize: 32, fontFamily: 'Impact', fontWeight: '900', color: '#E91E63', textAlign: 'center', textTransform: 'uppercase' },
  number: { x: 20, y: 35, width: 60, height: 25, fontSize: 72, fontFamily: 'Arial Black', fontWeight: '900', color: '#000000', textAlign: 'center' },
  subtitle: { x: 10, y: 55, width: 80, height: 10, fontSize: 18, fontFamily: 'Arial', fontWeight: 'bold', color: '#333333', textAlign: 'center' },
  body: { x: 10, y: 55, width: 80, height: 20, fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', color: '#000000', textAlign: 'center' },
  cta: { x: 15, y: 85, width: 70, height: 10, fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', backgroundColor: '#E91E63', borderRadius: 8 },
  banner: { x: 10, y: 78, width: 80, height: 8, fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase', backgroundColor: '#E91E63', borderRadius: 4 },
  image: { x: 5, y: 5, width: 40, height: 40, fontSize: 0 },
  logo: { x: 30, y: 2, width: 40, height: 8, fontSize: 14, fontFamily: 'Montserrat', fontWeight: 'bold', color: '#E91E63', textAlign: 'center' },
  footer: { x: 10, y: 90, width: 80, height: 8, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', color: '#666666', textAlign: 'center' },
};

const PREVIEW_TEXTS: Record<string, string> = {
  title: 'TITOLO HOOK',
  number: '280',
  subtitle: 'Sottotitolo qui',
  body: 'Corpo del testo del post',
  cta: 'SCOPRI DI PIÙ →',
  banner: 'CLICCA IN BASSO',
  image: '📷',
  logo: 'BRAND',
  footer: 'Studio Fisioterapico',
};

interface PendingFile {
  file: File;
  preview: string;
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  layers: TemplateLayer[];
  background: TemplateBackground;
  photoZone: TemplatePhotoZone;
  overlayColor: string;
}

interface TemplateUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUploaded: () => void;
}

const TemplateUploader: React.FC<TemplateUploaderProps> = ({ open, onOpenChange, onTemplateUploaded }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [category, setCategory] = useState('carosello');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [isUploading, setIsUploading] = useState(false);
  const [isMotherAccount, setIsMotherAccount] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('account_type').eq('id', user.id).single()
      .then(({ data }) => {
        setIsMotherAccount(data?.account_type === 'mother');
      });
  }, [user]);

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files) return;
    const imgFiles = Array.from(files).filter(f => f.type === 'image/png' || f.type === 'image/jpeg' || f.type === 'image/webp');
    if (imgFiles.length === 0) {
      toast({ title: "Nessuna immagine trovata", description: "Seleziona file PNG, JPG o WebP", variant: "destructive" });
      return;
    }
    const newPending: PendingFile[] = imgFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      status: 'pending' as const,
      layers: [],
      background: { type: 'solid' as const, value: '#1a1a2e' },
      photoZone: { x: 0, y: 0, width: 100, height: 100, opacity: 0.25, objectFit: 'cover' },
      overlayColor: 'rgba(0,0,0,0.35)',
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
    if (activeFileIndex >= pendingFiles.length - 1) setActiveFileIndex(Math.max(0, pendingFiles.length - 2));
  };

  const updatePendingName = (index: number, name: string) => {
    setPendingFiles(prev => prev.map((pf, i) => i === index ? { ...pf, name } : pf));
  };

  const addLayer = (type: TemplateLayer['type']) => {
    const defaults = DEFAULT_LAYER_PROPS[type] || {};
    const newLayer: TemplateLayer = {
      id: `${type}_${Date.now()}`,
      type,
      x: 10, y: 10, width: 80, height: 15,
      fontFamily: 'Arial', fontSize: 16, fontWeight: 'normal',
      color: textColor, textAlign: 'center', textTransform: 'none',
      opacity: 1,
      ...defaults,
    };
    setPendingFiles(prev => prev.map((pf, i) => i === activeFileIndex ? { ...pf, layers: [...pf.layers, newLayer] } : pf));
  };

  const updateLayer = (layerIndex: number, field: string, value: any) => {
    setPendingFiles(prev => prev.map((pf, fi) => {
      if (fi !== activeFileIndex) return pf;
      const layers = pf.layers.map((l, li) => li === layerIndex ? { ...l, [field]: value } : l);
      return { ...pf, layers };
    }));
  };

  const updateLayerShadow = (layerIndex: number, field: string, value: any) => {
    setPendingFiles(prev => prev.map((pf, fi) => {
      if (fi !== activeFileIndex) return pf;
      const layers = pf.layers.map((l, li) => {
        if (li !== layerIndex) return l;
        const shadow = l.shadow || { enabled: false, color: '#000000', blur: 4, offsetX: 0, offsetY: 2 };
        return { ...l, shadow: { ...shadow, [field]: value } };
      });
      return { ...pf, layers };
    }));
  };

  const removeLayer = (layerIndex: number) => {
    setPendingFiles(prev => prev.map((pf, fi) => {
      if (fi !== activeFileIndex) return pf;
      return { ...pf, layers: pf.layers.filter((_, li) => li !== layerIndex) };
    }));
  };

  const copyLayersToAll = () => {
    const sourceLayers = pendingFiles[activeFileIndex]?.layers || [];
    setPendingFiles(prev => prev.map((pf, i) => i === activeFileIndex ? pf : { ...pf, layers: JSON.parse(JSON.stringify(sourceLayers)) }));
    toast({ title: "Livelli copiati!", description: `Livelli applicati a tutti i ${pendingFiles.length} template` });
  };

  const uploadAll = async () => {
    if (!user || pendingFiles.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < pendingFiles.length; i++) {
      const pf = pendingFiles[i];
      if (pf.status === 'done') continue;

      setPendingFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'uploading' } : p));

      try {
        const ext = pf.file.name.split('.').pop() || 'png';
        const filePath = `${user.id}/templates/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(filePath, pf.file, { contentType: pf.file.type });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('user-photos').getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('canva_templates')
          .insert([{
            name: pf.name || `Template ${i + 1}`,
            category,
            background_url: urlData.publicUrl, // kept as reference image only
            text_zones: {
              background: pf.background,
              photoZone: pf.photoZone,
              overlayColor: pf.overlayColor,
              layers: pf.layers,
            } as any,
            text_color: textColor,
            is_default: makeDefault && isMotherAccount,
            user_id: makeDefault && isMotherAccount ? null : user.id,
          }]);
        if (dbError) throw dbError;

        setPendingFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'done' } : p));
      } catch (err) {
        console.error('Upload error:', err);
        setPendingFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p));
      }
    }

    setIsUploading(false);
    toast({ title: `✅ Template caricati!`, description: "Ora puoi usarli nei tuoi post" });
    onTemplateUploaded();
    pendingFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setPendingFiles([]);
    onOpenChange(false);
  };

  const activePf = pendingFiles[activeFileIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carica Template con Livelli</DialogTitle>
          <DialogDescription>Carica i PNG e definisci i livelli (titolo, numeri, banner, immagine, ecc.) per ogni template.</DialogDescription>
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

        {/* File tabs */}
        {pendingFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pendingFiles.map((pf, i) => (
              <button
                key={i}
                onClick={() => setActiveFileIndex(i)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === activeFileIndex ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
              >
                <img src={pf.preview} alt={pf.name} className="w-full h-full object-cover" />
                {pf.status === 'done' && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Check className="h-4 w-4 text-green-500" /></div>}
                {pf.status === 'uploading' && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>}
                {pf.status === 'pending' && (
                  <button onClick={e => { e.stopPropagation(); removePending(i); }} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-[8px] text-center truncate px-0.5">{pf.layers.length} liv.</div>
              </button>
            ))}
          </div>
        )}

        {/* Active file editor */}
        {activePf && (
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Preview */}
            <div className="space-y-2">
              <Input
                value={activePf.name}
                onChange={e => updatePendingName(activeFileIndex, e.target.value)}
                className="text-sm h-8"
                placeholder="Nome template"
              />
              <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                <img src={activePf.preview} className="w-full h-full object-cover" alt="preview" />
                {activePf.layers.map((layer, li) => {
                  const isImageLayer = layer.type === 'image';
                  const shadow = layer.shadow?.enabled
                    ? `${layer.shadow.offsetX || 0}px ${layer.shadow.offsetY || 0}px ${layer.shadow.blur || 0}px ${layer.shadow.color || '#000'}`
                    : undefined;

                  return (
                    <div
                      key={layer.id}
                      className="absolute border border-dashed border-primary/60 flex items-center justify-center overflow-hidden"
                      style={{
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        width: `${layer.width}%`,
                        height: `${layer.height}%`,
                        backgroundColor: isImageLayer ? 'rgba(100,100,255,0.2)' : (layer.backgroundColor || 'transparent'),
                        borderRadius: layer.borderRadius ? `${layer.borderRadius}px` : undefined,
                        opacity: layer.opacity ?? 1,
                      }}
                    >
                      {!isImageLayer && (
                        <span
                          style={{
                            fontFamily: layer.fontFamily,
                            fontSize: `${Math.max(8, (layer.fontSize || 16) * 0.3)}px`,
                            fontWeight: layer.fontWeight as any,
                            color: layer.color || textColor,
                            textAlign: layer.textAlign as any,
                            textTransform: layer.textTransform as any,
                            textShadow: shadow,
                            lineHeight: layer.lineHeight ? `${layer.lineHeight}` : undefined,
                          }}
                          className="leading-tight px-1"
                        >
                          {PREVIEW_TEXTS[layer.type] || layer.type}
                        </span>
                      )}
                      {isImageLayer && <span className="text-lg">📷</span>}
                      <span className="absolute top-0 left-0 bg-primary text-primary-foreground text-[7px] px-1 rounded-br">{layer.type}</span>
                    </div>
                  );
                })}
              </div>
              {pendingFiles.length > 1 && (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={copyLayersToAll}>
                  Copia livelli a tutti i {pendingFiles.length} template
                </Button>
              )}
            </div>

            {/* Right: Settings + Layer editor */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {/* Background settings */}
              <Collapsible defaultOpen>
                <div className="border border-border rounded-lg overflow-hidden">
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 text-left">
                    <span className="text-xs">🎨</span>
                    <span className="text-xs font-medium flex-1">Sfondo & Overlay</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-2 pt-0 space-y-2 border-t border-border">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Tipo sfondo</Label>
                          <Select value={activePf.background.type} onValueChange={v => {
                            setPendingFiles(prev => prev.map((pf, i) => i === activeFileIndex ? { ...pf, background: { ...pf.background, type: v as any } } : pf));
                          }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="solid">Colore solido</SelectItem>
                              <SelectItem value="gradient">Gradiente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">
                            {activePf.background.type === 'gradient' ? 'CSS Gradient' : 'Colore'}
                          </Label>
                          {activePf.background.type === 'solid' ? (
                            <Input type="color" value={activePf.background.value} onChange={e => {
                              setPendingFiles(prev => prev.map((pf, i) => i === activeFileIndex ? { ...pf, background: { ...pf.background, value: e.target.value } } : pf));
                            }} className="h-7 w-full p-0 border-0 cursor-pointer" />
                          ) : (
                            <Input value={activePf.background.value} onChange={e => {
                              setPendingFiles(prev => prev.map((pf, i) => i === activeFileIndex ? { ...pf, background: { ...pf.background, value: e.target.value } } : pf));
                            }} className="h-7 text-xs" placeholder="linear-gradient(135deg, #0f0f0f, #1a1a2e)" />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Opacità foto ({Math.round(activePf.photoZone.opacity * 100)}%)</Label>
                          <Slider value={[activePf.photoZone.opacity * 100]} min={0} max={100} step={5} onValueChange={([v]) => {
                            setPendingFiles(prev => prev.map((pf, i) => i === activeFileIndex ? { ...pf, photoZone: { ...pf.photoZone, opacity: v / 100 } } : pf));
                          }} />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Overlay colore</Label>
                          <Input value={activePf.overlayColor} onChange={e => {
                            setPendingFiles(prev => prev.map((pf, i) => i === activeFileIndex ? { ...pf, overlayColor: e.target.value } : pf));
                          }} className="h-7 text-xs" placeholder="rgba(0,0,0,0.35)" />
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <div className="flex items-center justify-between">
                <Label className="font-semibold">Livelli ({activePf.layers.length})</Label>
                <Select onValueChange={(v) => addLayer(v as TemplateLayer['type'])}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Aggiungi livello" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYER_TYPES.map(lt => (
                      <SelectItem key={lt.value} value={lt.value}>
                        {lt.icon} {lt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activePf.layers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nessun livello. Aggiungi livelli per definire dove posizionare titoli, numeri, banner, ecc.</p>
              )}

              {activePf.layers.map((layer, li) => (
                <Collapsible key={layer.id} defaultOpen={activePf.layers.length === 1}>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 text-left">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{LAYER_TYPES.find(t => t.value === layer.type)?.icon}</span>
                      <span className="text-xs font-medium flex-1">{LAYER_TYPES.find(t => t.value === layer.type)?.label}</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={e => { e.stopPropagation(); removeLayer(li); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-2 pt-0 space-y-2 border-t border-border">
                        {/* Position */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">X ({layer.x}%)</Label>
                            <Slider value={[layer.x]} min={0} max={95} step={1} onValueChange={([v]) => updateLayer(li, 'x', v)} />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Y ({layer.y}%)</Label>
                            <Slider value={[layer.y]} min={0} max={95} step={1} onValueChange={([v]) => updateLayer(li, 'y', v)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Larghezza ({layer.width}%)</Label>
                            <Slider value={[layer.width]} min={5} max={100} step={1} onValueChange={([v]) => updateLayer(li, 'width', v)} />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Altezza ({layer.height}%)</Label>
                            <Slider value={[layer.height]} min={3} max={100} step={1} onValueChange={([v]) => updateLayer(li, 'height', v)} />
                          </div>
                        </div>

                        {layer.type !== 'image' && (
                          <>
                            {/* Font */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Font</Label>
                                <Select value={layer.fontFamily || 'Arial'} onValueChange={v => updateLayer(li, 'fontFamily', v)}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {FONT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Grandezza ({layer.fontSize}px)</Label>
                                <Slider value={[layer.fontSize || 16]} min={8} max={120} step={1} onValueChange={([v]) => updateLayer(li, 'fontSize', v)} />
                              </div>
                            </div>

                            {/* Weight + Color */}
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Peso</Label>
                                <Select value={layer.fontWeight || 'normal'} onValueChange={v => updateLayer(li, 'fontWeight', v)}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="bold">Bold</SelectItem>
                                    <SelectItem value="900">Extra Bold</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Colore</Label>
                                <Input type="color" value={layer.color || '#000000'} onChange={e => updateLayer(li, 'color', e.target.value)} className="h-7 w-full p-0 border-0 cursor-pointer" />
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Allinea</Label>
                                <Select value={layer.textAlign || 'center'} onValueChange={v => updateLayer(li, 'textAlign', v)}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="left">Sinistra</SelectItem>
                                    <SelectItem value="center">Centro</SelectItem>
                                    <SelectItem value="right">Destra</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Transform */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Trasformazione</Label>
                                <Select value={layer.textTransform || 'none'} onValueChange={v => updateLayer(li, 'textTransform', v)}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nessuna</SelectItem>
                                    <SelectItem value="uppercase">MAIUSCOLO</SelectItem>
                                    <SelectItem value="capitalize">Capitalize</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px] text-muted-foreground">Opacità ({Math.round((layer.opacity ?? 1) * 100)}%)</Label>
                                <Slider value={[(layer.opacity ?? 1) * 100]} min={0} max={100} step={5} onValueChange={([v]) => updateLayer(li, 'opacity', v / 100)} />
                              </div>
                            </div>

                            {/* Shadow */}
                            <div className="flex items-center gap-2">
                              <Switch checked={layer.shadow?.enabled || false} onCheckedChange={v => updateLayerShadow(li, 'enabled', v)} />
                              <Label className="text-[10px] text-muted-foreground">Ombra</Label>
                              {layer.shadow?.enabled && (
                                <div className="flex gap-1 items-center">
                                  <Input type="color" value={layer.shadow.color || '#000'} onChange={e => updateLayerShadow(li, 'color', e.target.value)} className="h-5 w-5 p-0 border-0" />
                                  <span className="text-[9px] text-muted-foreground">Blur:</span>
                                  <Slider value={[layer.shadow.blur || 0]} min={0} max={20} step={1} onValueChange={([v]) => updateLayerShadow(li, 'blur', v)} className="w-16" />
                                </div>
                              )}
                            </div>

                            {/* Background (for banner/cta) */}
                            {(layer.type === 'banner' || layer.type === 'cta') && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">Sfondo</Label>
                                  <Input type="color" value={layer.backgroundColor || '#E91E63'} onChange={e => updateLayer(li, 'backgroundColor', e.target.value)} className="h-7 w-full p-0 border-0 cursor-pointer" />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">Bordo ({layer.borderRadius || 0}px)</Label>
                                  <Slider value={[layer.borderRadius || 0]} min={0} max={30} step={1} onValueChange={([v]) => updateLayer(li, 'borderRadius', v)} />
                                </div>
                              </div>
                            )}

                            {/* Default Text (static text) */}
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Testo fisso (non sostituito dall'AI)</Label>
                              <Input
                                value={(layer as any).defaultText || ''}
                                onChange={e => updateLayer(li, 'defaultText', e.target.value || undefined)}
                                className="h-7 text-xs"
                                placeholder="Es: ASSUMIAMO, By partnering with..."
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        )}

        {/* Global settings */}
        {pendingFiles.length > 0 && (
          <div className="space-y-3 border-t border-border pt-3">
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
                <Label>Colore Testo Default</Label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setTextColor('#FFFFFF')} className={`w-8 h-8 rounded-full bg-white border-2 ${textColor === '#FFFFFF' ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`} />
                  <button onClick={() => setTextColor('#000000')} className={`w-8 h-8 rounded-full bg-black border-2 ${textColor === '#000000' ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`} />
                  <Input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 p-0 border-0 cursor-pointer" />
                </div>
              </div>
            </div>

            {isMotherAccount && (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="font-medium">Rendi disponibile a tutti</Label>
                  <p className="text-xs text-muted-foreground">Tutti gli utenti vedranno questi template</p>
                </div>
                <Switch checked={makeDefault} onCheckedChange={setMakeDefault} />
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
