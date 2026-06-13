/**
 * Pull a human-readable message out of anything that can be thrown / returned
 * as an error: Error instance, Supabase FunctionsError, plain object, string.
 * Use this in toast `description` so the user sees the REAL reason — not a
 * generic "Errore. Riprova." that hides the diagnosis.
 */
export function extractErrorMessage(err: unknown, fallback = 'Errore sconosciuto'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err.length > 300 ? err.slice(0, 300) + '…' : err;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'object') {
    const e = err as Record<string, any>;
    // Supabase functions: error.context?.body sometimes carries the real msg
    if (e.message) return String(e.message);
    if (e.error_description) return String(e.error_description);
    if (e.error) return typeof e.error === 'string' ? e.error : (e.error.message || JSON.stringify(e.error).slice(0, 200));
    if (e.msg) return String(e.msg);
    try {
      return JSON.stringify(e).slice(0, 300);
    } catch {
      return fallback;
    }
  }
  return String(err);
}
