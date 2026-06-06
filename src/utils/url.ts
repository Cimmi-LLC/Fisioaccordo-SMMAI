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
