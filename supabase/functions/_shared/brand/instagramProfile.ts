// Onboarding da Instagram, per chi non ha un sito (o non lo vuole dare):
// riconosce il profilo da quello che si incolla e trasforma la scheda
// Apify (instagram-scraper, resultsType "details") nello stesso formato
// di scrape-website, cosi analyze-brand lavora uguale. Funzioni pure,
// specchiate in supabase/functions/_shared/brand (vedi mirrorSync.test).

const HANDLE = /^[a-z0-9._]{1,30}$/i;
// Percorsi di instagram.com che non sono profili.
const NON_PROFILI = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'tv', 'accounts', 'direct', 'about', 'legal']);

/** Vero se chi incolla sta chiaramente indicando Instagram (link o @nome). */
export function sembraInstagram(input: string): boolean {
  const s = (input || '').trim();
  return s.startsWith('@') || /(^|\/\/|\.)instagram\.com(\/|$)/i.test(s) || /^instagr\.am\//i.test(s);
}

/**
 * Nome utente da «@nome», «nome», «instagram.com/nome» o dal link copiato
 * dall'app (con ?igsh=...). Null se non e un profilo (post, reel, storie).
 */
export function nomeUtenteInstagram(input: string): string | null {
  let s = (input || '').trim();
  if (!s) return null;
  if (sembraInstagram(s) && !s.startsWith('@')) {
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
      const primo = u.pathname.split('/').filter(Boolean)[0] || '';
      if (!primo || NON_PROFILI.has(primo.toLowerCase())) return null;
      s = primo;
    } catch {
      return null;
    }
  }
  s = s.replace(/^@/, '').trim();
  return HANDLE.test(s) && !/^\.|\.$/.test(s) ? s.toLowerCase() : null;
}

export interface InstagramDettagli {
  username?: string;
  fullName?: string;
  biography?: string;
  externalUrl?: string | null;
  businessCategoryName?: string | null;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  private?: boolean;
  latestPosts?: Array<{ caption?: string | null; displayUrl?: string | null }>;
}

export interface ProfiloLetto {
  title: string;
  description: string;
  headings: string[];
  bodyText: string;
  logoUrl: string | null;
  externalUrl: string | null;
  postImages: string[];
}

/** Scheda Apify → dati nel formato di scrape-website (testo da bio e didascalie). */
export function profiloDaInstagram(d: InstagramDettagli, nomeUtente: string): ProfiloLetto {
  const didascalie = (d.latestPosts || [])
    .map((p) => (p?.caption || '').trim())
    .filter(Boolean)
    .slice(0, 12);
  const righe = [
    `PROFILO INSTAGRAM: @${d.username || nomeUtente}`,
    d.fullName ? `NOME: ${d.fullName}` : '',
    d.businessCategoryName ? `CATEGORIA: ${d.businessCategoryName}` : '',
    d.biography ? `BIO: ${d.biography}` : '',
    d.externalUrl ? `LINK IN BIO: ${d.externalUrl}` : '',
    didascalie.length ? `\nDIDASCALIE DEGLI ULTIMI POST:\n${didascalie.map((c, i) => `${i + 1}. ${c}`).join('\n\n')}` : '',
  ].filter(Boolean);
  return {
    title: d.fullName || `@${d.username || nomeUtente}`,
    description: d.biography || '',
    headings: d.businessCategoryName ? [d.businessCategoryName] : [],
    bodyText: righe.join('\n').substring(0, 8000),
    logoUrl: d.profilePicUrlHD || d.profilePicUrl || null,
    externalUrl: d.externalUrl || null,
    postImages: (d.latestPosts || [])
      .map((p) => p?.displayUrl || '')
      .filter((u) => /^https:\/\//.test(u))
      .slice(0, 6),
  };
}
