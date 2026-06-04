// Centralized CORS handling.
//
// In production we whitelist exactly the domains the frontend is served from
// (Vercel, custom domain) plus localhost for dev. The whitelist is read from
// the env var ALLOWED_ORIGINS (comma-separated). If ALLOWED_ORIGINS is not
// configured we fall back to '*' to keep dev simple — but in production this
// var MUST be set.

const ALLOW_HEADERS = "authorization, x-client-info, apikey, content-type, " +
  "x-supabase-client-platform, x-supabase-client-platform-version, " +
  "x-supabase-client-runtime, x-supabase-client-runtime-version, x-cron-secret";

// Dev origins are ALWAYS allowed (Vite default 8080/5173, CRA 3000).
// This lets developers run npm run dev without having to add localhost to
// ALLOWED_ORIGINS on Supabase secrets every time.
const DEV_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

function parseAllowedOrigins(): string[] | null {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  const fromEnv = raw && raw.trim()
    ? raw.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  // Merge env-defined origins with dev origins (dev always allowed)
  const merged = [...fromEnv, ...DEV_ORIGINS];
  return merged.length > 0 ? merged : null;
}

/** Returns CORS headers tailored to the request's Origin (when whitelisted). */
export function corsHeaders(req?: Request): Record<string, string> {
  const allowed = parseAllowedOrigins();
  const origin = req?.headers.get("Origin") || "";

  let allowOrigin = "*";
  if (allowed && allowed.length > 0) {
    if (origin && allowed.includes(origin)) {
      allowOrigin = origin;
    } else if (allowed.includes("*")) {
      allowOrigin = "*";
    } else {
      // Origin not allowed: still return a valid header but pointing to the
      // first whitelisted origin (browsers will block the response anyway).
      allowOrigin = allowed[0];
    }
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  if (allowOrigin !== "*") headers["Vary"] = "Origin";
  return headers;
}

/** Quick helper for OPTIONS preflight. */
export function handlePreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { headers: corsHeaders(req) });
}

/** Build a JSON response with CORS headers applied. */
export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}
