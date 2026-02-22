import React, { useEffect, useState } from 'react';
import { Label } from "@/components/ui/label";
import { Palette, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CanvaTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  background_url: string;
  text_zones: any;
  text_color: string;
  is_default: boolean;
  user_id: string | null;
}

interface CanvaTemplateSelectorProps {
  value: string | null;
  onChange: (templateId: string | null, template: CanvaTemplate | null) => void;
}

const CanvaTemplateSelector: React.FC<CanvaTemplateSelectorProps> = ({ value, onChange }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CanvaTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Load default templates (available to all)
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

      setTemplates([...(defaults as any[] || []) as CanvaTemplate[], ...userTemplates]);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === value);

  return (
    <div className="space-y-3">
      <Label className="text-foreground text-lg font-medium flex items-center">
        <Palette className="h-4 w-4 mr-2 text-primary" />
        Template Visivo
      </Label>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <Palette className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nessun template disponibile</p>
          <p className="text-xs text-muted-foreground mt-1">Carica template PNG da Canva per iniziare</p>
        </div>
      ) : (
        <>
          {/* No template option */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className={`aspect-square rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                !value
                  ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                  : 'border-border hover:border-primary/50 bg-muted/30'
              }`}
            >
              <span className="text-2xl">🎨</span>
              <span className="text-xs font-medium text-foreground">Default</span>
            </button>

            {templates.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => onChange(template.id, template)}
                className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                  value === template.id
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src={template.background_url}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <span className="text-white text-xs font-medium truncate block">
                    {template.name}
                  </span>
                </div>
                {template.user_id && (
                  <div className="absolute top-1 right-1 bg-primary/80 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    Mio
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CanvaTemplateSelector;
