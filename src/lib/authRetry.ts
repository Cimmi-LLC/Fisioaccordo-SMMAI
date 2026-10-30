// Errori di autenticazione dovuti al SERVER (timeout, 5xx, rete) e non
// all'utente. Senza questa distinzione un timeout del database veniva mostrato
// come "Email o password non corretti" e il cliente finiva nel recupero
// password, che a sua volta andava in timeout.

export const SERVER_BUSY_MESSAGE =
  'Il server è momentaneamente lento. Il tuo account non è stato toccato: riprova tra un minuto.';

/** true se l'errore viene dal server o dalla rete, non da dati sbagliati. */
export function isServerError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { status?: number; name?: string; message?: string; code?: string };
  if (typeof e.status === 'number' && (e.status === 0 || e.status >= 500)) return true;
  if (e.name === 'AuthRetryableFetchError') return true;
  if (e.code === 'request_timeout') return true;
  const msg = String(e.message || '').toLowerCase();
  if (!msg || msg === '{}') return true;
  return /timeout|timed out|gateway|failed to fetch|network|load failed|fetch error|50\d|52\d/.test(msg);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Esegue una chiamata di autenticazione e, se fallisce per colpa del server,
 * la ripete una volta dopo una breve pausa. Gli errori "veri" (password
 * sbagliata, email gia usata) tornano subito al chiamante.
 */
export async function withAuthRetry<T extends { error: unknown }>(fn: () => Promise<T>, pauseMs = 2500): Promise<T> {
  let res: T;
  try {
    res = await fn();
  } catch (err) {
    if (!isServerError(err)) throw err;
    await wait(pauseMs);
    return fn();
  }
  if (res.error && isServerError(res.error)) {
    await wait(pauseMs);
    return fn();
  }
  return res;
}
