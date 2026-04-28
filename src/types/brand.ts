export interface BrandProfile {
  id?: string;
  user_id?: string;
  website_url?: string;
  nome_business: string;
  descrizione: string;
  categorie: string[];
  servizi: string[];
  target_pazienti: string;
  citta: string;
  tono_voce: string;
  vantaggi_competitivi: string[];
  mission: string;
  temi_chiave: string[];
  cta_suggerite: string[];
  persona_scrittura: string;
  // Visual identity
  colore_primario: string;
  colore_secondario: string;
  colore_terziario: string;
  font_intestazioni: string;
  font_body: string;
  logo_url: string;
  avatar_url: string;
  location_photos: string[];
  gallery_photos: string[];
  // Content preferences
  parole_da_evitare: string[];
  pubblicazione_automatica: boolean;
  identita_core: string;
  story_templates?: string[];
  // Post template (decorative SVG overlay)
  post_template_id?: string | null;
  post_template_color_role?: 'primary' | 'secondary' | 'terziario';
  post_template_opacity?: number;
  raw_analysis?: any;
}

export const EMPTY_BRAND: BrandProfile = {
  nome_business: '',
  descrizione: '',
  categorie: [],
  servizi: [],
  target_pazienti: '',
  citta: '',
  tono_voce: 'professionale',
  vantaggi_competitivi: [],
  mission: '',
  temi_chiave: [],
  cta_suggerite: [],
  persona_scrittura: 'noi',
  colore_primario: '#554697',
  colore_secondario: '#E6007E',
  colore_terziario: '#1a1a2e',
  font_intestazioni: 'Montserrat',
  font_body: 'Montserrat',
  logo_url: '',
  avatar_url: '',
  location_photos: [],
  gallery_photos: [],
  parole_da_evitare: [],
  pubblicazione_automatica: false,
  identita_core: '',
};

export const CATEGORIE_OPTIONS = [
  'Fisioterapia',
  'Osteopatia',
  'Poliambulatorio',
  'Riabilitazione',
  'Medicina dello Sport',
  'Fisioterapia Pediatrica',
  'Fisioterapia in Gravidanza',
  'Posturologia',
  'Studio Professionale',
  'Salute e Benessere',
];

export const TONO_OPTIONS = [
  { value: 'professionale', label: 'Professionale' },
  { value: 'empatico', label: 'Empatico' },
  { value: 'informale', label: 'Informale' },
  { value: 'tecnico', label: 'Tecnico' },
];

export const PERSONA_OPTIONS = [
  { value: 'io', label: 'Io — prima persona singolare' },
  { value: 'noi', label: 'Noi — prima persona plurale' },
];

export const FONT_OPTIONS = [
  'Montserrat', 'Poppins', 'Inter', 'Raleway', 'Playfair Display',
  'Nunito', 'Lato', 'Oswald', 'Merriweather', 'Roboto',
  'DM Sans', 'Quicksand', 'Josefin Sans', 'Ubuntu', 'Bebas Neue',
];
