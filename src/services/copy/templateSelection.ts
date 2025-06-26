
import { CopyTemplate, AudienceProfile } from './types';
import { ADVANCED_TEMPLATES } from './templates';

export const selectOptimalTemplate = (
  text: string, 
  selectedTemplates: string[], 
  audience: AudienceProfile, 
  awarenessLevel: number
): CopyTemplate | null => {
  
  // Se ci sono template selezionati, usa il più appropriato
  if (selectedTemplates.length > 0) {
    const available = ADVANCED_TEMPLATES.filter(t => selectedTemplates.includes(t.id));
    return available.find(t => isTemplateOptimal(t, audience, awarenessLevel)) || available[0];
  }
  
  // Selezione automatica intelligente
  const optimalTemplates = ADVANCED_TEMPLATES.filter(t => 
    isTemplateOptimal(t, audience, awarenessLevel)
  ).sort((a, b) => (b.effectiveness_score || 0) - (a.effectiveness_score || 0));
  
  return optimalTemplates[0] || ADVANCED_TEMPLATES.find(t => t.id === 'pas-professional');
};

export const isTemplateOptimal = (
  template: CopyTemplate, 
  audience: AudienceProfile, 
  awarenessLevel: number
): boolean => {
  // Template per livello di consapevolezza
  if (awarenessLevel <= 2 && template.category === 'hook') return true;
  if (awarenessLevel === 3 && template.category === 'storytelling') return true;
  if (awarenessLevel >= 4 && template.category === 'cta') return true;
  
  // Template per settore
  if (audience.type === 'health' && template.id.includes('health')) return true;
  if (audience.type === 'business' && template.id.includes('business')) return true;
  
  return template.effectiveness_score && template.effectiveness_score >= 90;
};
