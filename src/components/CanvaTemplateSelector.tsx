import React, { useEffect, useState } from 'react';
import { Label } from "@/components/ui/label";
import { Palette, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { signedUrl } from "@/lib/storage";
import TemplateUploader from "./TemplateUploader";

export interface CanvaTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  /**
   * Legacy column. For new rows it's null and the actual file is referenced
   * via `storage_path`. The display URL is minted on read into this field.
   */
  background_url: string;
  storage_path?: string | null;
  text_zones: any;
  text_color: string;
  is_default: boolean;
  user_id: string | null;
}

interface CanvaTemplateSelectorProps {
  value: string | null;
  onChange: (templateId: string | null, template: CanvaTemplate | null) => void;
  postType?: string;
}

const POST_TYPE_TO_CATEGORY: Record<string, string> = {
  'carosello': 'carosello',
  'post-singolo': 'post',
  'storia': 'storia',
  'reel': 'reel',
};

const CanvaTemplateSelector: React.FC<CanvaTemplateSelectorProps> = ({ value, onChange, postType }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CanvaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data: defaults } = await supabase
        .from('canva_templates')
        .select('*')
        .eq('is_default', true);

      let userTemplates: CanvaTemplate[] = [];
      if (user) {
        const { data } = await supabase
          .from('canva_templates')
          .select('*')
          .eq('user_id', user.id);
        userTemplates = (data as any[] || []) as CanvaTemplate[];
      }

      const raw = [...(defaults as any[] || []) as CanvaTemplate[], ...userTemplates];
      // Mint signed URL for rows that use storage_path (new). Keep legacy
      // background_url string for rows that still hold a full URL.
      const enriched = await Promise.all(raw.map(async (t) => {
        if (t.storage_path) {
          return { ...t, background_url: await signedUrl('user-photos', t.storage_path) };
        }
        return t;
      }));
      setTemplates(enriched);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, [user]);

  const targetCategory = postType ? POST_TYPE_TO_CATEGORY[postType] : null;
  const filteredTemplates = targetCategory
    ? templates.filter(t => t.category === targetCategory || t.category === 'all')
    : templates;

  const deleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('canva_templates').delete().eq('id', templateId);
      if (error) throw error;
      if (value === templateId) onChange(null, null);
      toast({ title: "Template eliminato 🗑️" });
      loadTemplates();
    } catch (err) {
      toast({ title: "Errore", description: "Impossibile eliminare il template", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-foreground text-lg font-medium flex items-center">
        <Palette className="h-4 w-4 mr-2 text-primary" />
        Template Visivo
        <span className="ml-auto text-xs text-muted-foreground font-normal">
          {filteredTemplates.length} disponibil{filteredTemplates.length === 1 ? 'e' : 'i'}
        </span>
      </Label>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {/* Default option */}
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className={`aspect-square rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
              !value ? 'border-primary ring-2 ring-primary/30 bg-primary/10' : 'border-border hover:border-primary/50 bg-muted/30'
            }`}
          >
            <span className="text-2xl">🎨</span>
            <span className="text-xs font-medium text-foreground">Default</span>
          </button>

          {/* Templates */}
          {filteredTemplates.length === 0 && (
            <div className="col-span-2 flex items-center justify-center p-4 text-sm text-muted-foreground">
              Nessun template per questo formato
            </div>
          )}
          {filteredTemplates.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => onChange(template.id, template)}
              className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all group ${
                value === template.id ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
              }`}
            >
              <img src={template.background_url} alt={template.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="text-white text-xs font-medium truncate block">{template.name}</span>
              </div>
              {template.user_id && (
                <>
                  <div className="absolute top-1 right-1 bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">Mio</div>
                  <button
                    onClick={(e) => deleteTemplate(template.id, e)}
                    className="absolute top-1 left-1 bg-destructive/80 text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </button>
          ))}

          {/* Add button */}
          <button
            type="button"
            onClick={() => setShowUploader(true)}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-1 bg-muted/20 hover:bg-muted/40"
          >
            <Plus className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Aggiungi</span>
          </button>
        </div>
      )}

      <TemplateUploader
        open={showUploader}
        onOpenChange={setShowUploader}
        onTemplateUploaded={loadTemplates}
      />
    </div>
  );
};

export default CanvaTemplateSelector;
