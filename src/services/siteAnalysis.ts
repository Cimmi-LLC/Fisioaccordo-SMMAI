// Analisi del sito del cliente (scrape + analisi AI), riusabile fuori
// dall'onboarding: serve al Brand Kit per "Rianalizza il sito" quando il
// cliente cambia link o la prima analisi aveva preso dati sbagliati.
import { supabase } from '@/integrations/supabase/client';
import { cleanWebsiteUrl } from '@/utils/url';
import { siteGroundedColors } from '@/lib/siteColors';

export { siteGroundedColors };

export type SiteAnalysis = {
  url: string;
  profile: Record<string, any>;
  /** Colori trovati nel sito, dal piu caratterizzante (gia ripuliti da WordPress & co.). */
  siteColors: string[];
};

const SCRAPE_ERRORS: Record<string, string> = {
  unreachable: 'Non riusciamo a raggiungere questo sito. Controlla l\'indirizzo.',
  timeout: 'Il sito non ha risposto in tempo. Riprova tra poco.',
  empty: 'Il sito contiene pochissimo testo da analizzare.',
  invalid_url: 'L\'indirizzo inserito non è valido.',
};

export async function analyzeWebsite(rawUrl: string): Promise<SiteAnalysis> {
  const url = cleanWebsiteUrl(rawUrl);
  if (!url) throw new Error('Inserisci prima l\'indirizzo del sito.');

  const { data: scrape, error: scrapeErr } = await supabase.functions.invoke('scrape-website', { body: { url } });
  if (scrapeErr || !scrape?.success) {
    throw new Error(SCRAPE_ERRORS[scrape?.error] || 'Non sono riuscito a leggere il sito. Riprova.');
  }
  const { data: analysis, error: analyzeErr } = await supabase.functions.invoke('analyze-brand', { body: { scrapedData: scrape } });
  if (analyzeErr || analysis?.error || !analysis?.brandProfile) {
    throw new Error('Ho letto il sito ma l\'analisi non è riuscita. Riprova tra un minuto.');
  }
  const siteColors = (scrape.cssColors || []) as string[];
  const profile = { ...analysis.brandProfile };
  const fixed = siteGroundedColors(profile, siteColors, { primario: '', secondario: '', terziario: '' });
  Object.assign(profile, fixed);
  return { url, profile, siteColors };
}

