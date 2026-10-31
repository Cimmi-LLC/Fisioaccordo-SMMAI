/**
 * Normalize a user-typed website URL by ensuring it has http(s):// scheme.
 * Without this, `<a href="www.foo.com">` is treated as a relative path by
 * the browser and produces a 404 on the current domain.
 */
export function normalizeWebsiteUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}

/** Parametri di tracciamento che finiscono nei link copiati da Instagram, Facebook, newsletter. */
const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|gbraid|wbraid|igshid|igsh|mc_cid|mc_eid|_ga|_gl|ref|ref_src|si|mibextid)$/i;

/**
 * Link del sito pulito: schema https, niente parametri di tracciamento
 * (?utm_source=ig&fbclid=... copiato dalla bio di Instagram) e niente #ancora.
 * Il percorso resta: a volte il cliente indica apposta una pagina interna.
 */
export function cleanWebsiteUrl(url?: string | null): string {
  const normalized = normalizeWebsiteUrl(url);
  if (!normalized) return '';
  try {
    const u = new URL(normalized);
    for (const key of Array.from(u.searchParams.keys())) {
      if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    }
    u.hash = '';
    return u.toString();
  } catch {
    return normalized;
  }
}
