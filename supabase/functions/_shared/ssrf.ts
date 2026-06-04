// SSRF (Server-Side Request Forgery) guard for user-controlled URLs.
//
// When an Edge Function fetches a URL provided by the client, an attacker can
// supply http://169.254.169.254/ (AWS metadata), http://localhost/, or a
// private IP and force the server to make requests on its behalf. We allow
// only a small set of trusted hosts (Freepik CDN, Supabase storage, Picsum)
// plus generic public HTTPS. Internal/loopback/private addresses are blocked.

const ALLOWED_HOSTS_SUFFIXES = [
  // Freepik CDN (legacy, kept for back-compat)
  "freepik.com",
  ".freepik.com",
  // Pixabay CDN (current stock provider)
  "pixabay.com",
  ".pixabay.com",
  "cdn.pixabay.com",
  // Supabase storage (this project + generic supabase.co)
  ".supabase.co",
  ".supabase.in",
  // Stock image fallbacks we already use
  "picsum.photos",
  "images.unsplash.com",
  // Instagram CDN
  "cdninstagram.com",
  ".cdninstagram.com",
  "fbcdn.net",
  ".fbcdn.net",
];

const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^10\./,
  /^127\./,
  /^169\.254\./,           // link-local / metadata
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
];

function isPrivateIpv4(host: string): boolean {
  for (const re of PRIVATE_IPV4_PATTERNS) {
    if (re.test(host)) return true;
  }
  return false;
}

function isPrivateIpv6(host: string): boolean {
  // ::1, fc00::/7, fe80::/10 — quick string checks
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::1" || h === "0:0:0:0:0:0:0:1") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("fe80")) return true;
  return false;
}

function hostMatchesWhitelist(host: string): boolean {
  const lower = host.toLowerCase();
  for (const suffix of ALLOWED_HOSTS_SUFFIXES) {
    if (suffix.startsWith(".")) {
      if (lower.endsWith(suffix) || lower === suffix.slice(1)) return true;
    } else if (lower === suffix) {
      return true;
    }
  }
  return false;
}

/**
 * Validate a URL provided by the client before fetching it.
 * Returns null if safe, or an error string otherwise.
 *
 * Policy:
 *   - Must be HTTP or HTTPS (no file://, gopher://, etc.)
 *   - Must NOT point to localhost / private IPs / metadata service
 *   - Must match the whitelist of trusted external CDNs
 */
export function validateExternalUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: "URL malformato" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: `Protocollo non consentito: ${parsed.protocol}` };
  }

  const host = parsed.hostname;
  if (!host) return { ok: false, error: "Hostname mancante" };

  // Block direct IP literals (private + metadata)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (isPrivateIpv4(host)) return { ok: false, error: "IP privato/loopback non consentito" };
  }
  if (host.includes(":")) {
    if (isPrivateIpv6(host)) return { ok: false, error: "IPv6 privato non consentito" };
  }
  if (host === "localhost" || host.endsWith(".local")) {
    return { ok: false, error: "Host locale non consentito" };
  }

  // Enforce whitelist of trusted external hosts
  if (!hostMatchesWhitelist(host)) {
    return { ok: false, error: `Host non consentito: ${host}` };
  }

  return { ok: true, url: parsed };
}

/** Convenience: fetch with SSRF guard + size cap. */
export async function safeFetch(
  rawUrl: string,
  opts: { maxBytes?: number; timeoutMs?: number } = {}
): Promise<{ ok: true; bytes: Uint8Array; contentType: string } | { ok: false; error: string }> {
  const v = validateExternalUrl(rawUrl);
  if (!v.ok) return v;

  const maxBytes = opts.maxBytes ?? 10 * 1024 * 1024; // 10 MB hard cap
  const timeoutMs = opts.timeoutMs ?? 15_000;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(v.url.toString(), {
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };

    const ct = resp.headers.get("content-type") || "application/octet-stream";
    const buf = await resp.arrayBuffer();
    if (buf.byteLength > maxBytes) {
      return { ok: false, error: `Risposta troppo grande: ${buf.byteLength} bytes` };
    }
    return { ok: true, bytes: new Uint8Array(buf), contentType: ct };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore fetch" };
  } finally {
    clearTimeout(timer);
  }
}
