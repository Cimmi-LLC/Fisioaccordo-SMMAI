// Accesso al database per «Video virali».
// Le tabelle virali_* non sono ancora nei tipi generati: si passa da `any`.

import { supabase } from '@/integrations/supabase/client';
import type { AnalisiVideo, Copione, Paese, Piattaforma, TipoCopia } from '@/lib/brand/virali';

const db = supabase as any;

export type VideoVirale = {
  id: string;
  piattaforma: Piattaforma;
  handle: string;
  external_id: string;
  shortcode: string | null;
  url: string;
  paese: Paese;
  professione: string;
  didascalia: string;
  pubblicato_il: string | null;
  durata_s: number | null;
  views: number | null;
  likes: number | null;
  commenti: number | null;
  condivisioni: number | null;
  salvataggi: number | null;
  outlier: number | null;
  engagement: number | null;
  copertina: string | null;
  analisi: AnalisiVideo | null;
};

export type InserzioneVirale = {
  id: string;
  ad_id: string;
  paese: Paese;
  professione: string;
  ricerca: string | null;
  pagina: string;
  iniziata_il: string | null;
  attiva: boolean;
  giorni: number | null;
  varianti: number;
  testo: string;
  titolo: string;
  link: string | null;
  cta: string | null;
  piattaforme: string[];
  video_url: string | null;
  copertina: string | null;
  analisi: AnalisiVideo | null;
};

export type AccountSeguito = {
  id: string;
  piattaforma: Piattaforma;
  handle: string;
  nome: string | null;
  paese: Paese;
  professione: string;
  vende: string | null;
  brand_id: string | null;
  user_id: string | null;
  attivo: boolean;
  follower: number | null;
  media_views: number | null;
  ultimo_giro: string | null;
  ultimo_errore: string | null;
};

export type RicercaInserzioni = { id: string; paese: Paese; professione: string; ricerca: string; attiva: boolean };

export type CopioneSalvato = {
  id: string;
  brand_id: string;
  video_id: string | null;
  inserzione_id: string | null;
  tipo: TipoCopia;
  copione: Copione;
  creato_il: string;
};

export type OrdineVideo = 'outlier' | 'views' | 'salvati';

export type FiltriVideo = {
  paese: Paese | 'tutti';
  piattaforma: Piattaforma | 'tutte';
  professione: string | 'tutte';
  giorni: number | null;
  ordine: OrdineVideo;
  nascondiSponsorizzate: boolean;
  soloHandle?: string[] | null;
};

export const PER_PAGINA = 48;

export function urlCopertina(percorso: string | null): string | null {
  if (!percorso) return null;
  return supabase.storage.from('virali').getPublicUrl(percorso).data.publicUrl;
}

export async function listaVideo(f: FiltriVideo, pagina: number): Promise<VideoVirale[]> {
  let q = db.from('virali_video').select('*');
  if (f.paese !== 'tutti') q = q.eq('paese', f.paese);
  if (f.piattaforma !== 'tutte') q = q.eq('piattaforma', f.piattaforma);
  if (f.professione !== 'tutte') q = q.eq('professione', f.professione);
  if (f.giorni) q = q.gte('pubblicato_il', new Date(Date.now() - f.giorni * 86400000).toISOString());
  if (f.nascondiSponsorizzate) q = q.or('engagement.gte.0.02,engagement.is.null');
  if (f.soloHandle && f.soloHandle.length) q = q.in('handle', f.soloHandle);
  if (f.ordine === 'salvati') q = q.not('salvataggi', 'is', null).order('salvataggi', { ascending: false });
  else if (f.ordine === 'views') q = q.order('views', { ascending: false, nullsFirst: false });
  else q = q.order('outlier', { ascending: false, nullsFirst: false }).order('views', { ascending: false, nullsFirst: false });
  const { data, error } = await q.range(pagina * PER_PAGINA, pagina * PER_PAGINA + PER_PAGINA - 1);
  if (error) throw error;
  return (data || []) as VideoVirale[];
}

export type FiltriInserzioni = {
  paese: Paese | 'tutti';
  professione: string | 'tutte';
  giorniMinimi: number;
  ordine: 'giorni' | 'varianti';
};

export async function listaInserzioni(f: FiltriInserzioni, pagina: number): Promise<InserzioneVirale[]> {
  let q = db.from('virali_inserzioni').select('*').eq('attiva', true);
  if (f.paese !== 'tutti') q = q.eq('paese', f.paese);
  if (f.professione !== 'tutte') q = q.eq('professione', f.professione);
  if (f.giorniMinimi > 0) q = q.gte('giorni', f.giorniMinimi);
  q = f.ordine === 'varianti'
    ? q.order('varianti', { ascending: false }).order('giorni', { ascending: false, nullsFirst: false })
    : q.order('giorni', { ascending: false, nullsFirst: false }).order('varianti', { ascending: false });
  const { data, error } = await q.range(pagina * PER_PAGINA, pagina * PER_PAGINA + PER_PAGINA - 1);
  if (error) throw error;
  return (data || []) as InserzioneVirale[];
}

export async function listaAccount(): Promise<AccountSeguito[]> {
  const { data, error } = await db
    .from('virali_account')
    .select('*')
    .order('paese', { ascending: true })
    .order('professione', { ascending: true })
    .order('handle', { ascending: true });
  if (error) throw error;
  return (data || []) as AccountSeguito[];
}

export async function aggiungiAccount(riga: {
  piattaforma: Piattaforma;
  handle: string;
  paese: Paese;
  professione: string;
  nome?: string | null;
  vende?: string | null;
  brand_id: string | null;
  user_id: string | null;
}): Promise<AccountSeguito> {
  const { data, error } = await db.from('virali_account').insert(riga).select('*').single();
  if (error) throw error;
  return data as AccountSeguito;
}

export async function modificaAccount(id: string, patch: Partial<Pick<AccountSeguito, 'attivo' | 'paese' | 'professione' | 'vende' | 'nome'>>) {
  const { error } = await db.from('virali_account').update(patch).eq('id', id);
  if (error) throw error;
}

export async function eliminaAccount(id: string) {
  const { error } = await db.from('virali_account').delete().eq('id', id);
  if (error) throw error;
}

export async function listaRicerche(): Promise<RicercaInserzioni[]> {
  const { data, error } = await db.from('virali_ricerche').select('*').order('paese').order('professione').order('ricerca');
  if (error) throw error;
  return (data || []) as RicercaInserzioni[];
}

export async function aggiungiRicerca(riga: Omit<RicercaInserzioni, 'id' | 'attiva'>) {
  const { error } = await db.from('virali_ricerche').insert(riga);
  if (error) throw error;
}

export async function accendiRicerca(id: string, attiva: boolean) {
  const { error } = await db.from('virali_ricerche').update({ attiva }).eq('id', id);
  if (error) throw error;
}

export async function eliminaRicerca(id: string) {
  const { error } = await db.from('virali_ricerche').delete().eq('id', id);
  if (error) throw error;
}

export async function listaCopioni(brandId: string): Promise<CopioneSalvato[]> {
  const { data, error } = await db
    .from('virali_copioni')
    .select('*')
    .eq('brand_id', brandId)
    .order('creato_il', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []) as CopioneSalvato[];
}

export async function eliminaCopione(id: string) {
  const { error } = await db.from('virali_copioni').delete().eq('id', id);
  if (error) throw error;
}

export async function videoPerId(id: string): Promise<VideoVirale | null> {
  const { data } = await db.from('virali_video').select('*').eq('id', id).maybeSingle();
  return (data as VideoVirale) || null;
}

export async function inserzionePerId(id: string): Promise<InserzioneVirale | null> {
  const { data } = await db.from('virali_inserzioni').select('*').eq('id', id).maybeSingle();
  return (data as InserzioneVirale) || null;
}

/** Errore leggibile da una chiamata a una funzione (corpo JSON con "error"). */
async function messaggioErrore(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch { /* corpo non JSON */ }
  }
  return error instanceof Error ? error.message : 'Errore sconosciuto';
}

async function chiama<T>(funzione: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(funzione, { body });
  if (error) throw new Error(await messaggioErrore(error));
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export type Sorgente = { videoId: string } | { inserzioneId: string };

export function analizzaVideo(sorgente: Sorgente) {
  return chiama<{ analisi: AnalisiVideo }>('duplica-video', { azione: 'analizza', ...sorgente });
}

export function scriviCopione(sorgente: Sorgente, brandId: string, tipo: TipoCopia) {
  return chiama<{ analisi: AnalisiVideo; copione: Copione; copioneId: string | null }>('duplica-video', {
    azione: 'copione', ...sorgente, brandId, tipo,
  });
}

export function raccogliAccount(accountId: string) {
  return chiama<{ ok: boolean; video?: number; errore?: string | null; error?: string }>('virali-raccolta', { azione: 'account', accountId });
}

export type ContoApify = {
  ok: boolean;
  utente?: string | null;
  email?: string | null;
  piano?: string | null;
  usato_usd?: number | null;
  tetto_usd?: number | null;
  ciclo_fine?: string | null;
  error?: string;
};

export function contoApify() {
  return chiama<ContoApify>('virali-raccolta', { azione: 'conto' });
}

export function aggiornaLibreria() {
  return chiama<{ ok: boolean; giri?: number; avviati?: number; messaggio?: string }>('virali-raccolta', { azione: 'avvia' });
}
