// Controllo all'ingresso: l'utente ha almeno un brand?
// Prima un errore del server (timeout, 5xx, database che riparte) veniva letto
// come "zero brand" e l'utente gia registrato finiva nell'onboarding, che gli
// chiedeva il sito e poi spariva appena la lettura riusciva. Qui l'errore resta
// un errore: si riprova e, se il server non risponde, lo si dice all'utente.

export type BrandGate = 'has' | 'none' | 'error';

type CountResult = { count: number | null; error: unknown };

/** Traduce la risposta della query in una decisione. Solo una risposta senza errore con count 0 vale "none". */
export function decideBrandGate(res: CountResult): BrandGate {
  if (res.error) return 'error';
  if (typeof res.count !== 'number') return 'error';
  return res.count > 0 ? 'has' : 'none';
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Esegue `query` fino a `attempts` volte. Ogni tentativo ha un tempo massimo
 * (`timeoutMs`): oltre, vale come errore e si riprova. Si ferma alla prima
 * risposta certa ("has" o "none").
 */
export async function checkBrandGate(
  query: (signal: AbortSignal) => PromiseLike<CountResult>,
  { attempts = 3, timeoutMs = 10000, pauseMs = 1500 } = {},
): Promise<BrandGate> {
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let decision: BrandGate;
    try {
      decision = decideBrandGate(await query(ctrl.signal));
    } catch {
      decision = 'error';
    } finally {
      clearTimeout(timer);
    }
    if (decision !== 'error') return decision;
    if (i < attempts - 1) await wait(pauseMs);
  }
  return 'error';
}
