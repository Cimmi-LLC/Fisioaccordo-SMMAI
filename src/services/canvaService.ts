import { supabase } from "@/integrations/supabase/client";

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

export const canvaService = {
  async getTemplates(): Promise<CanvaTemplate[]> {
    const { data, error } = await supabase
      .from('canva_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data as any[]) as CanvaTemplate[];
  },

  async getDefaultTemplates(): Promise<CanvaTemplate[]> {
    const { data, error } = await supabase
      .from('canva_templates')
      .select('*')
      .eq('is_default', true)
      .order('name');
    
    if (error) throw error;
    return (data as any[]) as CanvaTemplate[];
  },

  async getUserTemplates(userId: string): Promise<CanvaTemplate[]> {
    const { data, error } = await supabase
      .from('canva_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data as any[]) as CanvaTemplate[];
  },

  async createTemplate(template: Omit<CanvaTemplate, 'id'>): Promise<CanvaTemplate> {
    const { data, error } = await supabase
      .from('canva_templates')
      .insert(template as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as any as CanvaTemplate;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('canva_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
