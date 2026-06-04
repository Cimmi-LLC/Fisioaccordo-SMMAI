/**
 * Shared Gemini API client with retry on transient errors.
 *
 * Retries on 503 (server overload), 429 (rate limit) and 5xx with
 * exponential backoff. Other errors propagate immediately.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiCallOpts {
  apiKey: string;
  model?: string;              // default: gemini-2.5-flash
  body: any;                    // full Gemini request body
  maxRetries?: number;          // default 3
  baseDelayMs?: number;         // default 1000 (1s, 2s, 4s)
}

export interface GeminiCallResult {
  ok: boolean;
  status: number;
  data?: any;
  errorBody?: string;
  attempts: number;
}

/**
 * Call Gemini's generateContent endpoint with automatic retry on 503/429/5xx.
 * Returns a structured result so the caller can inspect status before throwing.
 */
export async function callGeminiWithRetry(opts: GeminiCallOpts): Promise<GeminiCallResult> {
  const model = opts.model || "gemini-2.5-flash";
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${opts.apiKey}`;
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 1000;

  let lastStatus = 0;
  let lastErrorBody = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts.body),
      });
    } catch (e) {
      // Network error — retry
      lastErrorBody = e instanceof Error ? e.message : String(e);
      console.warn(`Gemini network error attempt ${attempt}:`, lastErrorBody);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt - 1)));
        continue;
      }
      return { ok: false, status: 0, errorBody: lastErrorBody, attempts: attempt };
    }

    if (response.ok) {
      try {
        const data = await response.json();
        return { ok: true, status: response.status, data, attempts: attempt };
      } catch (e) {
        return { ok: false, status: response.status, errorBody: "Invalid JSON", attempts: attempt };
      }
    }

    lastStatus = response.status;
    try { lastErrorBody = await response.text(); } catch { lastErrorBody = ""; }

    // Retry on 503 (overload), 429 (rate), 500/502/504 (transient)
    const isRetryable = response.status === 503
      || response.status === 429
      || response.status === 500
      || response.status === 502
      || response.status === 504;

    if (!isRetryable || attempt === maxRetries) {
      console.error(`Gemini ${response.status} (final, attempt ${attempt}):`, lastErrorBody.slice(0, 300));
      return { ok: false, status: response.status, errorBody: lastErrorBody, attempts: attempt };
    }

    // Backoff: 1s, 2s, 4s
    const delay = baseDelay * Math.pow(2, attempt - 1);
    console.warn(`Gemini ${response.status} attempt ${attempt}/${maxRetries}, retrying in ${delay}ms`);
    await new Promise(r => setTimeout(r, delay));
  }

  return { ok: false, status: lastStatus, errorBody: lastErrorBody, attempts: maxRetries };
}
