CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  website_url TEXT,
  nome_business TEXT NOT NULL DEFAULT '',
  descrizione TEXT DEFAULT '',
  categorie TEXT[] DEFAULT '{}',
  servizi TEXT[] DEFAULT '{}',
  target_pazienti TEXT DEFAULT '',
  tono_voce TEXT DEFAULT 'professionale',
  vantaggi_competitivi TEXT[] DEFAULT '{}',
  mission TEXT DEFAULT '',
  temi_chiave TEXT[] DEFAULT '{}',
  cta_suggerite TEXT[] DEFAULT '{}',
  persona_scrittura TEXT DEFAULT 'noi',
  raw_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand" ON public.brands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own brand" ON public.brands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own brand" ON public.brands FOR UPDATE USING (auth.uid() = user_id);
