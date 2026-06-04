// Shared authentication helpers for Edge Functions.
// Centralizes JWT validation, ownership checks (IDOR prevention) and
// cron-secret validation so each function doesn't reinvent the wheel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthSuccess {
  ok: true;
  userId: string;
  authHeader: string;
}
export interface AuthFailure {
  ok: false;
  status: number;
  error: string;
}
export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Validate JWT from Authorization header. Returns the verified user.id
 * (NEVER trust client-supplied user_id parameters).
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Non autorizzato: header Authorization mancante" };
  }
  const token = authHeader.replace("Bearer ", "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, error: "Configurazione Supabase mancante" };
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) {
    return { ok: false, status: 401, error: "Non autorizzato: JWT invalido" };
  }
  return { ok: true, userId: user.id, authHeader };
}

/**
 * Verify that the given brandId belongs to the authenticated user.
 * Prevents IDOR — a user passing a brandId of another user.
 */
export async function assertBrandOwnership(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  brandId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!brandId || typeof brandId !== "string") {
    return { ok: false, status: 400, error: "brandId mancante o invalido" };
  }
  const { data, error } = await supabaseAdmin
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, error: "Errore validazione brand" };
  if (!data) return { ok: false, status: 403, error: "Brand non trovato o non autorizzato" };
  return { ok: true };
}

/**
 * Verify that a Meta connection belongs to the authenticated user.
 */
export async function assertConnectionOwnership(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  connectionId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!connectionId || typeof connectionId !== "string") {
    return { ok: false, status: 400, error: "connection_id mancante o invalido" };
  }
  const { data, error } = await supabaseAdmin
    .from("meta_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: "Errore validazione connessione" };
  if (!data) return { ok: false, status: 403, error: "Connessione non trovata o non autorizzata" };
  return { ok: true };
}

/**
 * Validate the cron secret for scheduled jobs (no JWT, server-to-server).
 * The caller must include header `x-cron-secret: <CRON_SECRET>`.
 * If CRON_SECRET is not configured server-side, the call is rejected
 * (fail closed). This prevents anonymous abuse of expensive endpoints.
 */
export function requireCronSecret(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || expected.length < 16) {
    return { ok: false, status: 500, error: "CRON_SECRET non configurato sul server" };
  }
  const provided = req.headers.get("x-cron-secret");
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: "Cron secret invalido o mancante" };
  }
  return { ok: true };
}

/** Build a stable admin client (service role). */
export function adminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Configurazione Supabase mancante");
  }
  return createClient(supabaseUrl, serviceKey);
}

/**
 * Sliding-window rate limit. Counts rows for (user_id, endpoint) in the last
 * `windowSecs` seconds. If >= maxCalls, returns 429. Otherwise inserts a row
 * for this call and allows.
 *
 * Fail-OPEN strategy: if the check itself errors (DB down, network), we
 * allow the call rather than blocking the user — better UX than false 429s.
 */
export async function requireWithinRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  endpoint: string,
  maxCalls: number,
  windowSecs: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string; retryAfter?: number }> {
  const since = new Date(Date.now() - windowSecs * 1000).toISOString();
  try {
    const { count, error } = await supabaseAdmin
      .from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .gte("created_at", since);
    if (error) {
      console.warn(`rate-limit check failed for ${endpoint}, allowing:`, error.message);
      return { ok: true };
    }
    const used = count ?? 0;
    if (used >= maxCalls) {
      return {
        ok: false,
        status: 429,
        error: `Hai raggiunto il limite di ${maxCalls} chiamate ogni ${windowSecs}s su ${endpoint}. Riprova tra poco.`,
        retryAfter: windowSecs,
      };
    }
    // Insert this call (fire-and-forget log)
    void supabaseAdmin.from("api_rate_limits").insert({ user_id: userId, endpoint });
    return { ok: true };
  } catch (e) {
    console.warn(`rate-limit exception, allowing:`, e);
    return { ok: true };
  }
}
